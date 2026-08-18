import { join } from "node:path";
import type {
	ConfigureModelApiKeyInput,
	ModelCatalog,
	ModelCatalogEntry,
	ModelThinkingLevel,
	ProviderCatalogEntry,
	RuntimeInvocation,
} from "@earendil-works/pi-novel-contracts";
import type {
	AuthOperationOptions,
	Credential,
	CredentialInfo,
	CredentialStore,
} from "../../../../packages/ai/src/auth/types.ts";
import {
	clampThinkingLevel,
	createModels,
	getSupportedThinkingLevels,
	ModelsError,
} from "../../../../packages/ai/src/models.ts";
import { builtinProviders } from "../../../../packages/ai/src/providers/all.ts";
import type { Api, Model, TextContent } from "../../../../packages/ai/src/types.ts";
import { ReadOnlyAuthStorage } from "../../../../packages/coding-agent/src/core/auth-storage.ts";
import { ModelCredentialStore } from "./model-credential-store.ts";

/**
 * Credential resolution chain:
 *   1. Workspace API Key store (.pi-novel/model-credentials.json)
 *   2. Pi CLI AuthStorage (~/.pi/agent/auth.json, OAuth + API keys from
 *      `pi-ai login <provider>`)
 *   3. Existing provider/environment resolution inside pi-ai (env vars,
 *      ambient config)
 *
 * Writes always land in the workspace store; the CLI store is read-only here.
 */
export class ChainedCredentialStore implements CredentialStore {
	private readonly primary: CredentialStore;
	private readonly fallback: CredentialStore;

	constructor(primary: CredentialStore, fallback: CredentialStore) {
		this.primary = primary;
		this.fallback = fallback;
	}

	async read(providerId: string, options?: AuthOperationOptions): Promise<Credential | undefined> {
		const workspaceCredential = await this.primary.read(providerId, options);
		if (workspaceCredential !== undefined) return workspaceCredential;
		return this.fallback.read(providerId, options);
	}

	async list(options?: AuthOperationOptions): Promise<readonly CredentialInfo[]> {
		const primary = await this.primary.list(options);
		const fallback = await this.fallback.list(options);
		const seen = new Set(primary.map((entry) => entry.providerId));
		return [...primary, ...fallback.filter((entry) => !seen.has(entry.providerId))];
	}

	modify(
		providerId: string,
		fn: (current: Credential | undefined) => Promise<Credential | undefined>,
		options?: AuthOperationOptions,
	): Promise<Credential | undefined> {
		return this.primary.modify(providerId, fn, options);
	}

	delete(providerId: string, options?: AuthOperationOptions): Promise<void> {
		return this.primary.delete(providerId, options);
	}
}

export class PiModelRuntimeAdapter {
	private readonly cliAuthPath: string | undefined;

	constructor(options?: { cliAuthPath?: string }) {
		this.cliAuthPath = options?.cliAuthPath;
	}

	async getCatalog(workspaceRoot?: string): Promise<ModelCatalog> {
		const providers = builtinProviders().filter((provider) => provider.auth.apiKey || provider.auth.oauth);
		const workspaceStore = this.createCredentialStore(workspaceRoot);
		const credentialStore = this.createChainedStore(workspaceRoot);
		const models = createModels({ credentials: credentialStore });
		for (const provider of providers) models.setProvider(provider);

		return {
			providers: await Promise.all(
				providers.map(async (provider) => this.toCatalogEntry(provider, models, workspaceStore)),
			),
		};
	}

	async configureApiKey(workspaceRoot: string, input: ConfigureModelApiKeyInput): Promise<ModelCatalog> {
		const provider = builtinProviders().find((entry) => entry.id === input.providerId);
		if (!provider)
			throw new ModelRuntimeError("MODEL_PROVIDER_NOT_FOUND", `Unknown model provider: ${input.providerId}`);
		if (!provider.auth.apiKey)
			throw new ModelRuntimeError("MODEL_API_KEY_UNSUPPORTED", `${provider.name} does not support API keys`);
		const store = this.createCredentialStore(workspaceRoot);
		await store.configure(input.providerId, {
			apiKey: input.apiKey,
			...(input.baseUrl ? { baseUrl: input.baseUrl } : {}),
		});
		return this.getCatalog(workspaceRoot);
	}

	async clearApiKey(workspaceRoot: string, providerId: string): Promise<ModelCatalog> {
		await this.createCredentialStore(workspaceRoot).clear(providerId);
		return this.getCatalog(workspaceRoot);
	}

	async generateText(
		workspaceRoot: string,
		invocation: RuntimeInvocation,
		prompt: string,
		signal?: AbortSignal,
	): Promise<string> {
		const separator = invocation.modelId.indexOf("/");
		if (separator <= 0 || separator === invocation.modelId.length - 1) {
			throw new ModelRuntimeError("MODEL_NOT_AVAILABLE", `Invalid model id: ${invocation.modelId}`);
		}
		const providerId = invocation.modelId.slice(0, separator);
		const runtimeModelId = invocation.modelId.slice(separator + 1);
		const workspaceStore = this.createCredentialStore(workspaceRoot);
		const credentialStore = this.createChainedStore(workspaceRoot);
		const models = createModels({ credentials: credentialStore });
		for (const provider of builtinProviders()) models.setProvider(provider);
		const model = models.getModel(providerId, runtimeModelId);
		if (!model) throw new ModelRuntimeError("MODEL_NOT_AVAILABLE", `Model is not available: ${invocation.modelId}`);
		const auth = await models.checkAuth(providerId, { signal });
		if (!auth) throw new ModelRuntimeError("MODEL_AUTH_REQUIRED", `Configure a credential for ${providerId}`);
		const configuration = await workspaceStore.getConfiguration(providerId);
		const requestModel = configuration?.baseUrl ? { ...model, baseUrl: configuration.baseUrl } : model;
		const clamped = clampThinkingLevel(model, invocation.thinkingLevel);
		const reasoning = clamped === "off" ? undefined : clamped;
		try {
			const response = await models.completeSimple(
				requestModel,
				{
					messages: [{ role: "user", content: prompt, timestamp: Date.now() }],
				},
				{ signal, maxTokens: 4_000, ...(reasoning ? { reasoning } : {}) },
			);
			return response.content
				.filter(isTextContent)
				.map((entry) => entry.text)
				.join("\n")
				.trim();
		} catch (error) {
			if (error instanceof ModelRuntimeError) throw error;
			if (error instanceof ModelsError && error.code === "auth") {
				throw new ModelRuntimeError("MODEL_AUTH_REQUIRED", error.message, { cause: error });
			}
			throw error;
		}
	}

	private async toCatalogEntry(
		provider: ReturnType<typeof builtinProviders>[number],
		models: ReturnType<typeof createModels>,
		credentialStore: ModelCredentialStore,
	): Promise<ProviderCatalogEntry> {
		const apiKey = provider.auth.apiKey;
		const oauth = provider.auth.oauth;
		const authMethods = [...(apiKey ? (["api_key"] as const) : []), ...(oauth ? (["oauth"] as const) : [])];
		const configuration = await credentialStore.getConfiguration(provider.id);
		const connected = await models
			.checkAuth(provider.id)
			.then((value) => value !== undefined)
			.catch(() => false);
		return {
			providerId: provider.id,
			name: provider.name,
			authLabel: apiKey?.name ?? oauth?.name ?? "Provider credential",
			authMethods: [...authMethods],
			isSubscription: oauth?.isSubscription ?? false,
			status: connected ? "connected" : "not_connected",
			apiKeyConfigured: configuration !== undefined,
			...(apiKey?.name ? { apiKeyLabel: apiKey.name } : {}),
			...(configuration?.baseUrl ? { baseUrl: configuration.baseUrl } : {}),
			...(oauth ? { cliLoginCommand: `npx @earendil-works/pi-ai login ${provider.id}` } : {}),
			models: provider.getModels().map((model) => this.toCatalogModel(provider.id, model)),
		};
	}

	private toCatalogModel(providerId: string, model: Model<Api>): ModelCatalogEntry {
		const thinkingLevels = [...getSupportedThinkingLevels(model)] as ModelThinkingLevel[];
		return {
			providerId,
			modelId: model.id,
			name: model.name,
			reasoning: model.reasoning,
			thinkingLevels,
			contextWindow: model.contextWindow,
			maxTokens: model.maxTokens,
			input: model.input,
		};
	}

	private createCredentialStore(workspaceRoot?: string): ModelCredentialStore {
		return new ModelCredentialStore(
			workspaceRoot ? join(workspaceRoot, ".pi-novel", "model-credentials.json") : undefined,
		);
	}

	private createChainedStore(workspaceRoot?: string): ChainedCredentialStore {
		return new ChainedCredentialStore(
			this.createCredentialStore(workspaceRoot),
			this.cliAuthPath ? new ReadOnlyAuthStorage(this.cliAuthPath) : new ReadOnlyAuthStorage(),
		);
	}
}

export class ModelRuntimeError extends Error {
	readonly code:
		| "MODEL_PROVIDER_NOT_FOUND"
		| "MODEL_API_KEY_UNSUPPORTED"
		| "MODEL_NOT_AVAILABLE"
		| "MODEL_AUTH_REQUIRED";

	constructor(code: ModelRuntimeError["code"], message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ModelRuntimeError";
		this.code = code;
	}
}

function isTextContent(value: TextContent | { type: "thinking" } | { type: "toolCall" }): value is TextContent {
	return value.type === "text";
}
