import type { FastifyInstance } from "fastify";
import type { ProjectQueryService } from "@earendil-works/pi-novel-application";

interface ProjectParams {
	projectId: string;
}

export function registerProjectRoutes(app: FastifyInstance, service: ProjectQueryService): void {
	app.get("/api/projects", async () => ({ projects: await service.list() }));
	app.get<{ Params: ProjectParams }>("/api/projects/:projectId", async (request, reply) => {
		const project = await service.get(request.params.projectId);
		if (!project) return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
		return { project };
	});
}
