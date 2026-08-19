import { Type } from "typebox";
import type { FastifyInstance } from "fastify";
import {
	ApiErrorResponseSchema,
	ChapterSettlementSchema,
	ChapterWorkflowSnapshotSchema,
	FinalizeChapterInputSchema,
	ReconcileDecisionInputSchema,
	ReconcileInputSchema,
	ReconcileReportSchema,
	SaveDraftInputSchema,
	ChapterDraftSchema,
	type SaveDraftInput,
	SettlementInputSchema,
	type FinalizeChapterInput,
	type ReconcileDecisionInput,
	type ReconcileInput,
	type SettlementInput,
} from "@earendil-works/pi-novel-contracts";
import type { ChapterWorkflowService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }), chapter: Type.String({ pattern: "^[0-9]+$" }) }, { additionalProperties: false });

function mapError(error: unknown): { status: number; code: string; message: string } {
	const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
	const messages: Record<string, string> = {
		PROJECT_NOT_FOUND: "Project not found",
		CHAPTER_NOT_FOUND: "Chapter not found",
		DRAFT_STALE: "The draft changed; refresh the chapter and try again",
		RECONCILIATION_REQUIRED: "Reconciliation must be completed before this action",
		RECONCILIATION_NOT_DIVERGENT: "The draft has no detected divergence to accept",
		CHANGESET_REQUIRED: "Accepting a creative discovery requires a story ChangeSet",
		SETTLEMENT_REQUIRED: "Chapter settlement must be confirmed before finalization",
		FINALIZATION_BLOCKED: "Current blocking issues must be resolved before finalization",
		AUTHORING_UNSUPPORTED: "This project type does not support chapter authoring yet",
		CHANGESET_NOT_ALLOWED: "A prose correction does not accept a story ChangeSet",
		CHANGESET_NOT_COMMITTED: "Commit the accepted story change before settling this chapter",
		CHAPTER_EXTERNAL_MODIFICATION: "The chapter changed outside Pi-Novel; refresh before saving",
		CHAPTER_BASE_HASH_REQUIRED: "Refresh the chapter before saving a draft",
		CHAPTER_ALREADY_EXISTS: "Chapter already exists",
		CHAPTER_REVISION_STALE: "The draft revision is stale; refresh the chapter and try again",
	};
	return { status: messages[code] === undefined ? 500 : code === "PROJECT_NOT_FOUND" || code === "CHAPTER_NOT_FOUND" ? 404 : 409, code: messages[code] === undefined ? "INTERNAL_ERROR" : code, message: messages[code] ?? "Internal server error" };
}

export function registerChapterWorkflowRoutes(app: FastifyInstance, service: ChapterWorkflowService): void {
	app.put<{ Params: { projectId: string; chapter: string }; Body: SaveDraftInput }>(
		"/api/projects/:projectId/chapters/:chapter/draft",
		{ schema: { params: ParamsSchema, body: SaveDraftInputSchema, response: { 200: ChapterDraftSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return await service.saveDraft(request.params.projectId, Number(request.params.chapter), request.body);
			} catch (error) {
				const mapped = mapError(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.get<{ Params: { projectId: string; chapter: string } }>(
		"/api/projects/:projectId/chapters/:chapter/workflow",
		{ schema: { params: ParamsSchema, response: { 200: ChapterWorkflowSnapshotSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return await service.getSnapshot(request.params.projectId, Number(request.params.chapter));
			} catch (error) {
				const mapped = mapError(error);
				return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } });
			}
		},
	);
	app.post<{ Params: { projectId: string; chapter: string }; Body: ReconcileInput }>(
		"/api/projects/:projectId/chapters/:chapter/reconcile",
		{ schema: { params: ParamsSchema, body: ReconcileInputSchema, response: { 200: ReconcileReportSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try { return await service.reconcile(request.params.projectId, Number(request.params.chapter), request.body); }
			catch (error) { const mapped = mapError(error); return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } }); }
		},
	);
	app.post<{ Params: { projectId: string; chapter: string }; Body: ReconcileDecisionInput }>(
		"/api/projects/:projectId/chapters/:chapter/reconcile/decision",
		{ schema: { params: ParamsSchema, body: ReconcileDecisionInputSchema, response: { 200: Type.Object({ report: ReconcileReportSchema, changeSetId: Type.Union([Type.Null(), Type.String()]) }, { additionalProperties: false }), 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try { return await service.decideReconcile(request.params.projectId, Number(request.params.chapter), request.body); }
			catch (error) { const mapped = mapError(error); return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } }); }
		},
	);
	app.post<{ Params: { projectId: string; chapter: string }; Body: SettlementInput }>(
		"/api/projects/:projectId/chapters/:chapter/settlement",
		{ schema: { params: ParamsSchema, body: SettlementInputSchema, response: { 200: ChapterSettlementSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try { return await service.settle(request.params.projectId, Number(request.params.chapter), request.body); }
			catch (error) { const mapped = mapError(error); return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } }); }
		},
	);
	app.post<{ Params: { projectId: string; chapter: string }; Body: FinalizeChapterInput }>(
		"/api/projects/:projectId/chapters/:chapter/finalize",
		{ schema: { params: ParamsSchema, body: FinalizeChapterInputSchema, response: { 200: Type.Object({ projectId: Type.String(), chapter: Type.Integer(), memoryCommitted: Type.Boolean(), transactionId: Type.String() }, { additionalProperties: false }), 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try { return await service.finalize(request.params.projectId, Number(request.params.chapter), request.body); }
			catch (error) { const mapped = mapError(error); return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } }); }
		},
	);
}
