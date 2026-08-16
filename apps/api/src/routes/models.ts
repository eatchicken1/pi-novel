import type { FastifyInstance } from "fastify";
import { builtinProviders } from "../../../../packages/ai/src/providers/all.ts";
import type { ModelCatalog, ModelCatalogEntry, ProviderCatalogEntry } from "@earendil-works/pi-novel-contracts";

export function registerModelRoutes(app: FastifyInstance): void {
	app.get("/api/models/catalog", async (): Promise<ModelCatalog> => ({
		providers: buildProviderCatalog(),
		defaultModelId: "openai-codex/gpt-5.3-codex",
	}));
}

function buildProviderCatalog(): ProviderCatalogEntry[] {
	return builtinProviders()
		.filter((provider) => provider.auth.oauth !== undefined)
		.map((provider) => ({
			providerId: provider.id,
			name: provider.name,
			authLabel: provider.auth.oauth?.name ?? "OAuth",
			isSubscription: provider.auth.oauth?.isSubscription ?? false,
			status: "not_connected",
			cliLoginCommand: `npx @earendil-works/pi-ai login ${provider.id}`,
			models: provider.getModels().map((model): ModelCatalogEntry => ({
				providerId: provider.id,
				modelId: model.id,
				name: model.name,
				reasoning: model.reasoning,
				contextWindow: model.contextWindow,
				maxTokens: model.maxTokens,
				input: model.input,
			})),
		}));
}
