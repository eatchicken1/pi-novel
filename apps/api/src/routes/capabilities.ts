import type { FastifyInstance } from "fastify";
import { ApiErrorResponseSchema, ProjectCapabilitiesSchema } from "@earendil-works/pi-novel-contracts";
import type { NovelEnginePort, WorkspaceService } from "@earendil-works/pi-novel-application";
import { Type } from "typebox";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });

export function registerCapabilitiesRoute(app: FastifyInstance, workspace: WorkspaceService, engine: NovelEnginePort): void {
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/capabilities",
		{ schema: { params: ParamsSchema, response: { 200: ProjectCapabilitiesSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			const overview = await workspace.getOverview();
			const project = overview?.projects.find((candidate) => candidate.projectId === request.params.projectId);
			if (overview === null || project === undefined) {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
			const capabilities = await engine.getCapabilities(overview.manifest.rootPath, project.projectId);
			if (capabilities === null) return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			return capabilities;
		},
	);
}
