export type ProviderConnectionStatus = "connected" | "not_connected";

export interface ModelCatalogEntry {
	providerId: string;
	modelId: string;
	name: string;
	reasoning: boolean;
	contextWindow: number;
	maxTokens: number;
	input: Array<"text" | "image">;
}

export interface ProviderCatalogEntry {
	providerId: string;
	name: string;
	authLabel: string;
	isSubscription: boolean;
	status: ProviderConnectionStatus;
	cliLoginCommand: string;
	models: ModelCatalogEntry[];
}

export interface ModelCatalog {
	providers: ProviderCatalogEntry[];
	defaultModelId: string | null;
}
