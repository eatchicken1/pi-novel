import type { FastifyInstance } from "fastify";
import {
	ApiErrorResponseSchema,
	InitializeWorkspaceInputSchema,
	WorkspaceResponseSchema,
	type InitializeWorkspaceInput,
} from "@earendil-works/pi-novel-contracts";
import type { WorkspaceService } from "@earendil-works/pi-novel-application";

export function registerWorkspaceRoutes(app: FastifyInstance, service: WorkspaceService): void {
	app.get("/api/workspace", { schema: { response: { 200: WorkspaceResponseSchema } } }, async () => ({ workspace: await service.getOverview() }));

	app.post<{ Body: InitializeWorkspaceInput }>(
		"/api/workspace/initialize",
		{
			schema: {
				body: InitializeWorkspaceInputSchema,
				response: { 200: WorkspaceResponseSchema, 400: ApiErrorResponseSchema },
			},
		},
		async (request) => {
			request.log.info({ event: "workspace.initialize" }, "workspace.initialize");
			const overview = await service.initialize(request.body.path);
			logScanWarnings(request, overview.warnings);
			return { workspace: overview };
		},
	);

	app.post("/api/workspace/rescan", { schema: { response: { 200: WorkspaceResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => {
		try {
			const overview = await service.rescan();
			logScanWarnings(request, overview.warnings);
			return { workspace: overview };
		} catch (error) {
			return reply.code(409).send({ error: { code: "WORKSPACE_NOT_OPEN", message: errorMessage(error) } });
		}
	});
}

function logScanWarnings(request: { log: { warn: (data: unknown, message: string) => void } }, warnings: readonly unknown[]): void {
	if (warnings.length > 0) request.log.warn({ event: "workspace.scan.warning", warningCount: warnings.length }, "workspace.scan.warning");
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Workspace is not open";
}
