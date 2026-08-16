import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ApiErrorResponseSchema, ReviewListResponseSchema } from "@earendil-works/pi-novel-contracts";
import type { ReviewService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const IssueParamsSchema = Type.Object(
	{ projectId: Type.String({ minLength: 1 }), issueId: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
const QuerySchema = Type.Object(
	{
		severity: Type.Optional(Type.String()),
		scope: Type.Optional(Type.String()),
		chapter: Type.Optional(Type.String({ pattern: "^[0-9]+$" })),
		status: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

export function registerReviewRoutes(app: FastifyInstance, service: ReviewService): void {
	app.get<{ Params: { projectId: string }; Querystring: { severity?: string; scope?: string; chapter?: string; status?: string } }>(
		"/api/projects/:projectId/review",
		{ schema: { params: ParamsSchema, querystring: QuerySchema, response: { 200: ReviewListResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const filter = {
					...(request.query.severity === undefined ? {} : { severity: request.query.severity }),
					...(request.query.scope === undefined ? {} : { scope: request.query.scope }),
					...(request.query.chapter === undefined ? {} : { chapter: Number(request.query.chapter) }),
					...(request.query.status === undefined ? {} : { status: request.query.status }),
				};
				return await service.list(request.params.projectId, filter);
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
	app.post<{ Params: { projectId: string; issueId: string } }>(
		"/api/projects/:projectId/review/:issueId/acknowledge",
		{ schema: { params: IssueParamsSchema, response: { 200: Type.Object({ issue: Type.Object({ issueId: Type.String({ minLength: 1 }), status: Type.String() }) }, { additionalProperties: false }), 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const issue = await service.acknowledge(request.params.projectId, request.params.issueId);
				return { issue: { issueId: issue.issueId, status: issue.status } };
			} catch {
				return reply.code(404).send({ error: { code: "ISSUE_NOT_FOUND", message: "Issue not found" } });
			}
		},
	);
	app.post<{ Params: { projectId: string; issueId: string } }>(
		"/api/projects/:projectId/review/:issueId/dismiss",
		{ schema: { params: IssueParamsSchema, response: { 200: Type.Object({ issue: Type.Object({ issueId: Type.String({ minLength: 1 }), status: Type.String() }) }, { additionalProperties: false }), 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const issue = await service.dismiss(request.params.projectId, request.params.issueId);
				return { issue: { issueId: issue.issueId, status: issue.status } };
			} catch {
				return reply.code(404).send({ error: { code: "ISSUE_NOT_FOUND", message: "Issue not found" } });
			}
		},
	);
}
