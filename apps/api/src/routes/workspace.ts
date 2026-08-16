import type { FastifyInstance } from "fastify";
import { isRecord, stringValue } from "@earendil-works/pi-novel-contracts";
import type { WorkspaceService } from "@earendil-works/pi-novel-application";

export function registerWorkspaceRoutes(app: FastifyInstance, service: WorkspaceService): void {
	app.get("/api/workspace", async () => ({ workspace: await service.getOverview() }));

	app.post("/api/workspace/initialize", async (request, reply) => {
		const body = isRecord(request.body) ? request.body : {};
		const path = stringValue(body.path);
		if (!path) return reply.code(400).send({ error: { code: "INVALID_PATH", message: "Workspace path is required" } });
		return { workspace: await service.initialize(path) };
	});

	app.post("/api/workspace/rescan", async (_request, reply) => {
		try {
			return { workspace: await service.rescan() };
		} catch (error) {
			return reply.code(409).send({ error: { code: "WORKSPACE_NOT_OPEN", message: errorMessage(error) } });
		}
	});
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Workspace is not open";
}
