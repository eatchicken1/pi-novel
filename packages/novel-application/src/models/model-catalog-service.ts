import type { ModelCatalog } from "@earendil-works/pi-novel-contracts";
import type { ModelRuntimePort } from "../ports.ts";

export class ModelCatalogService {
	private readonly runtime: ModelRuntimePort;

	constructor(runtime: ModelRuntimePort) {
		this.runtime = runtime;
	}

	getCatalog(): Promise<ModelCatalog> {
		return this.runtime.getCatalog();
	}
}
