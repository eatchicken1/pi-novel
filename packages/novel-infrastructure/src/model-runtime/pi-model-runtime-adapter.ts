import type { ModelCatalog, ModelCatalogEntry, ProviderCatalogEntry } from "@earendil-works/pi-novel-contracts";
import { builtinProviders } from "../../../../packages/ai/src/providers/all.ts";

export class PiModelRuntimeAdapter {
	async getCatalog(): Promise<ModelCatalog> {
		return {
			providers: builtinProviders()
				.filter((provider) => provider.auth.oauth !== undefined)
				.map(
					(provider): ProviderCatalogEntry => ({
						providerId: provider.id,
						name: provider.name,
						authLabel: provider.auth.oauth?.name ?? "OAuth",
						isSubscription: provider.auth.oauth?.isSubscription ?? false,
						status: "not_connected",
						cliLoginCommand: `npx @earendil-works/pi-ai login ${provider.id}`,
						models: provider.getModels().map(
							(model): ModelCatalogEntry => ({
								providerId: provider.id,
								modelId: model.id,
								name: model.name,
								reasoning: model.reasoning,
								contextWindow: model.contextWindow,
								maxTokens: model.maxTokens,
								input: model.input,
							}),
						),
					}),
				),
			defaultModelId: "openai-codex/gpt-5.3-codex",
		};
	}
}
