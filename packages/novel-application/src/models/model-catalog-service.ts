import type { ConfigureModelApiKeyInput, ModelCatalog } from "@earendil-works/pi-novel-contracts";
import type { ModelRuntimePort } from "../ports.ts";

export class ModelCatalogService {
	private readonly runtime: ModelRuntimePort;

	constructor(runtime: ModelRuntimePort) {
		this.runtime = runtime;
	}

	getCatalog(workspaceRoot?: string): Promise<ModelCatalog> {
		return this.runtime.getCatalog(workspaceRoot);
	}

	configureApiKey(workspaceRoot: string, input: ConfigureModelApiKeyInput): Promise<ModelCatalog> {
		return this.runtime.configureApiKey(workspaceRoot, input);
	}

	clearApiKey(workspaceRoot: string, providerId: string): Promise<ModelCatalog> {
		return this.runtime.clearApiKey(workspaceRoot, providerId);
	}
}
