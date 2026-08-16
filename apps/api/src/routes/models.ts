import type { FastifyInstance } from "fastify";
import { ModelCatalogSchema, type ModelCatalog } from "@earendil-works/pi-novel-contracts";
import type { ModelCatalogService } from "@earendil-works/pi-novel-application";

export function registerModelRoutes(app: FastifyInstance, service: ModelCatalogService): void {
	app.get(
		"/api/models/catalog",
		{ schema: { response: { 200: ModelCatalogSchema } } },
		async (): Promise<ModelCatalog> => service.getCatalog(),
	);
}
