import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ApiErrorResponseSchema, ChangeSetListResponseSchema, PatchGenerationInputSchema, TaskResponseSchema, type PatchGenerationInput } from "@earendil-works/pi-novel-contracts";
import type { ManuscriptPatchService, ChangeSetService, TaskService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }), chapter: Type.String({ pattern: "^[0-9]+$" }) }, { additionalProperties: false });

function mapError(error: unknown): { status: number; code: string; message: string } {
	const code =
		typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
			? error.code
			: error instanceof Error
				? error.message
				: "INTERNAL_ERROR";
	const messages: Record<string, { status: number; message: string }> = {
		PROJECT_NOT_FOUND: { status: 404, message: "Project not found" },
		CHAPTER_NOT_FOUND: { status: 404, message: "Chapter not found" },
		NARRATIVE_PATCH_UNSUPPORTED: { status: 409, message: "This project does not support narrative patches" },
		RUNTIME_PROFILE_NOT_CONFIGURED: { status: 409, message: "Configure the chapter reviser runtime before generating a patch" },
		RUNTIME_PROFILE_INVALID: { status: 409, message: "The chapter reviser runtime is no longer available" },
		MODEL_AUTH_REQUIRED: { status: 409, message: "Configure model credentials before generating a patch" },
		CHAPTER_REOPEN_REQUIRED: { status: 409, message: "继续修改会重新开启章节修订。" },
		PATCH_BASE_STALE: { status: 409, message: "The selected text is stale; reload the chapter and select it again" },
		PATCH_TARGET_CONFLICT: { status: 409, message: "The selected text could not be located uniquely; reload and select it again" },
	};
	return { status: messages[code]?.status ?? 500, code: messages[code] === undefined ? "INTERNAL_ERROR" : code, message: messages[code]?.message ?? "Internal server error" };
}

export function registerPatchRoutes(app: FastifyInstance, patches: ManuscriptPatchService, changeSets: ChangeSetService, tasks: TaskService, workspaceRoot: () => string | null): void {
	app.post<{ Params: { projectId: string; chapter: string }; Body: PatchGenerationInput; Headers: { "x-idempotency-key"?: string } }>(
		"/api/projects/:projectId/chapters/:chapter/patches",
		{ schema: { params: ParamsSchema, body: PatchGenerationInputSchema, headers: Type.Object({ "x-idempotency-key": Type.Optional(Type.String({ minLength: 1 })) }, { additionalProperties: true }), response: { 202: TaskResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				await patches.validate(request.params.projectId, Number(request.params.chapter), request.body);
				const root = workspaceRoot();
				if (root === null) throw new Error("WORKSPACE_NOT_OPEN");
				const task = await tasks.createWithRunner(
					{ projectId: request.params.projectId, forgeSessionId: null, type: "narrative-patch", intent: request.body.goal },
					root,
					async () => ({ resultRef: (await patches.generate(request.params.projectId, Number(request.params.chapter), request.body)).changeSetId }),
					request.headers["x-idempotency-key"],
				);
				return reply.code(202).send({ task });
			}
			catch (error) { const mapped = mapError(error); return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } }); }
		},
	);
	app.get<{ Params: { projectId: string; chapter: string } }>(
		"/api/projects/:projectId/chapters/:chapter/patches",
		{ schema: { params: ParamsSchema, response: { 200: ChangeSetListResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const chapter = Number(request.params.chapter);
				const target = `chapter-${String(chapter).padStart(3, "0")}`;
				const entries = (await changeSetsList(changeSets, request.params.projectId)).filter((entry) => entry.kind === "MANUSCRIPT_PATCH" && entry.operations.some((operation) => operation.target.includes(target)));
				return { changeSets: entries };
			} catch (error) { const mapped = mapError(error); return reply.code(mapped.status).send({ error: { code: mapped.code, message: mapped.message } }); }
		},
	);
}

async function changeSetsList(service: ChangeSetService, projectId: string) { return service.list(projectId); }
