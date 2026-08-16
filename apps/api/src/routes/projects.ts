import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import {
	ApiErrorResponseSchema,
	ProjectListResponseSchema,
	ProjectResponseSchema,
} from "@earendil-works/pi-novel-contracts";
import type { ProjectQueryService } from "@earendil-works/pi-novel-application";

const ProjectParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
type ProjectParams = { projectId: string };

export function registerProjectRoutes(app: FastifyInstance, service: ProjectQueryService): void {
	app.get("/api/projects", { schema: { response: { 200: ProjectListResponseSchema } } }, async () => ({ projects: await service.list() }));
	app.get<{ Params: ProjectParams }>(
		"/api/projects/:projectId",
		{ schema: { params: ProjectParamsSchema, response: { 200: ProjectResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
		const project = await service.get(request.params.projectId);
		if (!project) return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
		return { project };
		},
	);
}
