import {
	type AgentRuntimeProfile,
	IMPLEMENTED_RUNTIME_AGENTS,
	type ModelCatalog,
	type ModelCatalogEntry,
	type ModelThinkingLevel,
	nowIso,
	type RuntimeAgentId,
	type RuntimeInvocation,
	type SetRuntimeProfileInput,
} from "@earendil-works/pi-novel-contracts";
import type { ModelRuntimePort, RuntimeProfileStorePort } from "../ports.ts";

/**
 * Agent Runtime Profiles: per-agent model + thinking level, persisted in
 * workspace.sqlite. The runtime model candidate gate only admits models from
 * connected providers; unsupported thinking levels are rejected up front.
 */
export class AgentRuntimeService {
	private readonly storeFor: () => RuntimeProfileStorePort | null;
	private readonly rootFor: () => string | null;
	private readonly runtime: ModelRuntimePort;

	constructor(input: {
		storeFor: () => RuntimeProfileStorePort | null;
		rootFor: () => string | null;
		runtime: ModelRuntimePort;
	}) {
		this.storeFor = input.storeFor;
		this.rootFor = input.rootFor;
		this.runtime = input.runtime;
	}

	listProfiles(): AgentRuntimeProfile[] {
		return this.requireStore().listProfiles();
	}

	getProfile(agentId: RuntimeAgentId): AgentRuntimeProfile | null {
		return this.requireStore().getProfile(agentId);
	}

	async setProfile(agentId: RuntimeAgentId, input: SetRuntimeProfileInput): Promise<AgentRuntimeProfile> {
		const catalog = await this.runtime.getCatalog(this.requireRoot());
		const model = this.findSelectableModel(catalog, input.modelId);
		if (!model)
			throw new RuntimeProfileError(
				"RUNTIME_MODEL_NOT_SELECTABLE",
				`Model ${input.modelId} is not selectable: the provider must be connected`,
				409,
			);
		if (!model.thinkingLevels.includes(input.thinkingLevel)) {
			throw new RuntimeProfileError(
				"RUNTIME_THINKING_UNSUPPORTED",
				`${model.name} does not support thinking level ${input.thinkingLevel}`,
				409,
			);
		}
		const profile: AgentRuntimeProfile = {
			agentId,
			modelId: input.modelId,
			thinkingLevel: input.thinkingLevel,
			updatedAt: nowIso(),
		};
		this.requireStore().setProfile(profile);
		return profile;
	}

	/**
	 * Resolve the saved profile for an agent into a runnable invocation.
	 * Re-validates against the live catalog so a provider that was
	 * disconnected after configuration invalidates the profile instead of
	 * silently running an unavailable model.
	 */
	async resolveInvocation(agentId: RuntimeAgentId): Promise<RuntimeInvocation> {
		const profile = this.requireStore().getProfile(agentId);
		if (!profile)
			throw new RuntimeProfileError(
				"RUNTIME_PROFILE_NOT_CONFIGURED",
				`Agent ${agentId} has no runtime profile; configure a model first`,
				409,
			);
		const catalog = await this.runtime.getCatalog(this.requireRoot());
		const model = this.findSelectableModel(catalog, profile.modelId);
		if (!model)
			throw new RuntimeProfileError(
				"RUNTIME_PROFILE_INVALID",
				`Agent ${agentId} points at ${profile.modelId}, which is not available from a connected provider`,
				409,
			);
		const thinkingLevel: ModelThinkingLevel = model.thinkingLevels.includes(profile.thinkingLevel)
			? profile.thinkingLevel
			: "off";
		return { agentId, modelId: profile.modelId, thinkingLevel };
	}

	implementedAgents(): readonly RuntimeAgentId[] {
		return IMPLEMENTED_RUNTIME_AGENTS;
	}

	private requireRoot(): string {
		const root = this.rootFor();
		if (!root)
			throw new RuntimeProfileError(
				"WORKSPACE_NOT_OPEN",
				"Open a workspace before configuring runtime profiles",
				409,
			);
		return root;
	}

	private requireStore(): RuntimeProfileStorePort {
		const store = this.storeFor();
		if (!store)
			throw new RuntimeProfileError(
				"WORKSPACE_NOT_OPEN",
				"Open a workspace before configuring runtime profiles",
				409,
			);
		return store;
	}

	private findSelectableModel(catalog: ModelCatalog, modelId: string): ModelCatalogEntry | null {
		const providerId = modelId.split("/", 1)[0];
		const target = catalog.providers.find((entry) => entry.providerId === providerId);
		if (!target || target.status !== "connected") return null;
		return target.models.find((entry) => `${entry.providerId}/${entry.modelId}` === modelId) ?? null;
	}
}

export class RuntimeProfileError extends Error {
	readonly code:
		| "RUNTIME_MODEL_NOT_SELECTABLE"
		| "RUNTIME_THINKING_UNSUPPORTED"
		| "RUNTIME_PROFILE_NOT_CONFIGURED"
		| "RUNTIME_PROFILE_INVALID"
		| "WORKSPACE_NOT_OPEN";
	readonly statusCode: number;

	constructor(code: RuntimeProfileError["code"], message: string, statusCode: number) {
		super(message);
		this.name = "RuntimeProfileError";
		this.code = code;
		this.statusCode = statusCode;
	}
}
