import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ApiErrorResponseSchema, StoryGraphSchema } from "@earendil-works/pi-novel-contracts";
import type { StoryGraphQuery } from "@earendil-works/pi-novel-contracts";
import type { StoryGraphService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });

export function registerGraphRoutes(app: FastifyInstance, service: StoryGraphService): void {
	app.get<{ Params: { projectId: string }; Querystring: { chapterFrom?: string; chapterTo?: string; nodeTypes?: string; characterId?: string } }>(
		"/api/projects/:projectId/story-graph",
		{
			schema: {
				params: ParamsSchema,
				querystring: Type.Object(
					{
						chapterFrom: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
						chapterTo: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
						nodeTypes: Type.Optional(Type.String()),
						characterId: Type.Optional(Type.String({ minLength: 1 })),
					},
					{ additionalProperties: false },
				),
				response: { 200: StoryGraphSchema, 404: ApiErrorResponseSchema },
			},
		},
		async (request, reply) => {
			try {
				const nodeTypes = request.query.nodeTypes?.split(",").map((value) => value.trim()).filter(Boolean) as StoryGraphQuery["nodeTypes"];
				const graph = await service.getGraph(request.params.projectId, {
					...(request.query.chapterFrom === undefined ? {} : { chapterFrom: Number(request.query.chapterFrom) }),
					...(request.query.chapterTo === undefined ? {} : { chapterTo: Number(request.query.chapterTo) }),
					...(nodeTypes === undefined || nodeTypes.length === 0 ? {} : { nodeTypes }),
					...(request.query.characterId === undefined ? {} : { characterId: request.query.characterId }),
				});
				return graph;
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
}
