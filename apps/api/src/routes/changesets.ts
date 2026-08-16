import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import {
	ApiErrorResponseSchema,
	ChangeSetListResponseSchema,
	ChangeSetResponseSchema,
	CreateChangeSetInputSchema,
	type ChangeSet,
	type CreateChangeSetInput,
} from "@earendil-works/pi-novel-contracts";
import type { ChangeSetService } from "@earendil-works/pi-novel-application";

const ProjectParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const ChangeSetParamsSchema = Type.Object(
	{ projectId: Type.String({ minLength: 1 }), changeSetId: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
const CommitBodySchema = Type.Object(
	{ actor: Type.Union([Type.Literal("user"), Type.Literal("agent"), Type.Literal("system")]) },
	{ additionalProperties: false },
);

function errorCode(error: unknown): { code: string; status: number; message: string } {
	if (error instanceof Error) {
		if (error.message === "CHANGESET_NOT_FOUND") return { code: "CHANGESET_NOT_FOUND", status: 404, message: "ChangeSet not found" };
		if (error.message === "CHANGESET_BASE_STALE") return { code: "CHANGESET_BASE_STALE", status: 409, message: "ChangeSet base is stale; the document changed after the proposal" };
		if (error.message === "CHANGESET_INVALID_STATE") return { code: "CHANGESET_INVALID_STATE", status: 409, message: "ChangeSet state does not allow this transition" };
		if (error.message === "IDEMPOTENT_REPLAY") return { code: "IDEMPOTENT_REPLAY", status: 409, message: "Idempotent replay: this idempotency key already produced a result" };
		if (error.message === "PROJECT_NOT_FOUND") return { code: "PROJECT_NOT_FOUND", status: 404, message: "Project not found" };
	}
	return { code: "INTERNAL_ERROR", status: 500, message: "Internal server error" };
}

export function registerChangeSetRoutes(app: FastifyInstance, service: ChangeSetService): void {
	app.post<{ Params: { projectId: string }; Body: CreateChangeSetInput }>(
		"/api/projects/:projectId/changesets",
		{ schema: { params: ProjectParamsSchema, body: CreateChangeSetInputSchema, response: { 201: ChangeSetResponseSchema, 404: ApiErrorResponseSchema, 400: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const changeSet = await service.create(request.body);
				return reply.code(201).send({ changeSet });
			} catch (error) {
				const mapped = errorCode(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/changesets",
		{ schema: { params: ProjectParamsSchema, response: { 200: ChangeSetListResponseSchema } } },
		async (request, reply) => {
			try {
				return { changeSets: await service.list(request.params.projectId) };
			} catch (error) {
				const mapped = errorCode(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.get<{ Params: { projectId: string; changeSetId: string } }>(
		"/api/projects/:projectId/changesets/:changeSetId",
		{ schema: { params: ChangeSetParamsSchema, response: { 200: ChangeSetResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { changeSet: await service.get(request.params.projectId, request.params.changeSetId) };
			} catch (error) {
				const mapped = errorCode(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.post<{ Params: { projectId: string; changeSetId: string } }>(
		"/api/projects/:projectId/changesets/:changeSetId/accept",
		{ schema: { params: ChangeSetParamsSchema, response: { 200: ChangeSetResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { changeSet: await service.accept(request.params.projectId, request.params.changeSetId) };
			} catch (error) {
				const mapped = errorCode(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.post<{ Params: { projectId: string; changeSetId: string } }>(
		"/api/projects/:projectId/changesets/:changeSetId/reject",
		{ schema: { params: ChangeSetParamsSchema, response: { 200: ChangeSetResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { changeSet: await service.reject(request.params.projectId, request.params.changeSetId) };
			} catch (error) {
				const mapped = errorCode(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.post<{ Params: { projectId: string; changeSetId: string }; Body: { actor: ChangeSet["source"] }; Headers: { "x-idempotency-key"?: string } }>(
		"/api/projects/:projectId/changesets/:changeSetId/commit",
		{ schema: { params: ChangeSetParamsSchema, body: CommitBodySchema, headers: Type.Object({ "x-idempotency-key": Type.Optional(Type.String({ minLength: 1 })) }, { additionalProperties: true }), response: { 201: Type.Object({ changeSet: ChangeSetResponseSchema, commit: Type.Object({ commitId: Type.String({ minLength: 1 }) }) }, { additionalProperties: false }), 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const result = await service.commit(request.params.projectId, request.params.changeSetId, request.body.actor, request.headers["x-idempotency-key"]);
				return reply.code(201).send({ changeSet: { changeSet: result.changeSet }, commit: { commitId: result.commit.commitId } });
			} catch (error) {
				const mapped = errorCode(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
}
