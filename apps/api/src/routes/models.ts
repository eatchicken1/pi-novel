import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ModelCatalogSchema, type ModelCatalog } from "@earendil-works/pi-novel-contracts";
import {
	ApiErrorResponseSchema,
	ConfigureModelApiKeyInputSchema,
	type ConfigureModelApiKeyInput,
} from "@earendil-works/pi-novel-contracts";
import { type ModelCatalogService, WorkspaceService } from "@earendil-works/pi-novel-application";

const ProviderParamsSchema = Type.Object({ providerId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
type ProviderParams = { providerId: string };

export function registerModelRoutes(app: FastifyInstance, service: ModelCatalogService, workspaceService: WorkspaceService): void {
	app.get(
		"/api/models/catalog",
		{ schema: { response: { 200: ModelCatalogSchema } } },
		async (): Promise<ModelCatalog> => service.getCatalog(workspaceService.getWorkspacePaths()?.root),
	);
	app.post<{ Params: ProviderParams; Body: ConfigureModelApiKeyInput }>(
		"/api/models/providers/:providerId/api-key",
		{
			schema: {
				params: ProviderParamsSchema,
				body: ConfigureModelApiKeyInputSchema,
				response: { 200: ModelCatalogSchema, 400: ApiErrorResponseSchema, 409: ApiErrorResponseSchema },
			},
		},
		async (request, reply) => {
			const root = workspaceService.getWorkspacePaths()?.root;
			if (!root) return reply.code(409).send({ error: { code: "WORKSPACE_NOT_OPEN", message: "Open a workspace before configuring a provider" } });
			if (request.params.providerId !== request.body.providerId) {
				return reply.code(400).send({ error: { code: "INVALID_REQUEST", message: "Provider id does not match the route" } });
			}
			try {
				return await service.configureApiKey(root, request.body);
			} catch (error) {
				return reply.code(400).send({ error: { code: errorCode(error), message: errorMessage(error) } });
			}
		},
	);
	app.delete<{ Params: ProviderParams }>(
		"/api/models/providers/:providerId/api-key",
		{ schema: { params: ProviderParamsSchema, response: { 200: ModelCatalogSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			const root = workspaceService.getWorkspacePaths()?.root;
			if (!root) return reply.code(409).send({ error: { code: "WORKSPACE_NOT_OPEN", message: "Open a workspace before clearing a provider" } });
			return service.clearApiKey(root, request.params.providerId);
		},
	);
}

function errorCode(error: unknown): string {
	return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "MODEL_CONFIGURATION_FAILED";
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Model provider configuration failed";
}
