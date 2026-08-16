import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ApiErrorResponseSchema, CommitResponseSchema, HistoryListResponseSchema } from "@earendil-works/pi-novel-contracts";
import type { HistoryService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const CommitParamsSchema = Type.Object(
	{ projectId: Type.String({ minLength: 1 }), commitId: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);

export function registerHistoryRoutes(app: FastifyInstance, service: HistoryService): void {
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/history",
		{ schema: { params: ParamsSchema, response: { 200: HistoryListResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { entries: await service.list(request.params.projectId) };
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
	app.get<{ Params: { projectId: string; commitId: string } }>(
		"/api/projects/:projectId/history/:commitId",
		{ schema: { params: CommitParamsSchema, response: { 200: CommitResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { commit: await service.get(request.params.projectId, request.params.commitId) };
			} catch {
				return reply.code(404).send({ error: { code: "COMMIT_NOT_FOUND", message: "Commit not found" } });
			}
		},
	);
}
