import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import {
	ApiErrorResponseSchema,
	ChapterDocumentSchema,
	ChapterSummarySchema,
	ProjectDetailSchema,
	ProjectStatusSnapshotSchema,
	StudioSnapshotSchema,
} from "@earendil-works/pi-novel-contracts";
import type { ProjectReadService, StudioService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ projectId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const ChapterParamsSchema = Type.Object(
	{ projectId: Type.String({ minLength: 1 }), chapter: Type.String({ pattern: "^[0-9]+$" }) },
	{ additionalProperties: false },
);

// Product read routes：detail/status/chapters/studio 全部从 registry resolve，不暴露任意路径。
export function registerProductProjectRoutes(
	app: FastifyInstance,
	reads: ProjectReadService,
	studio: StudioService,
): void {
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/detail",
		{ schema: { params: ParamsSchema, response: { 200: Type.Object({ project: ProjectDetailSchema }, { additionalProperties: false }), 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { project: await reads.detail(request.params.projectId) };
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/status",
		{ schema: { params: ParamsSchema, response: { 200: Type.Object({ status: ProjectStatusSnapshotSchema }, { additionalProperties: false }), 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { status: await reads.status(request.params.projectId) };
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
	app.get<{ Params: { projectId: string } }>(
		"/api/projects/:projectId/chapters",
		{ schema: { params: ParamsSchema, response: { 200: Type.Object({ chapters: Type.Array(ChapterSummarySchema) }, { additionalProperties: false }), 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { chapters: await reads.chapters(request.params.projectId) };
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
	app.get<{ Params: { projectId: string; chapter: string } }>(
		"/api/projects/:projectId/chapters/:chapter",
		{ schema: { params: ChapterParamsSchema, response: { 200: Type.Object({ chapter: ChapterDocumentSchema }, { additionalProperties: false }), 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { chapter: await reads.chapter(request.params.projectId, Number(request.params.chapter)) };
			} catch (error) {
				const code = error instanceof Error && error.message === "CHAPTER_NOT_FOUND" ? "CHAPTER_NOT_FOUND" : "PROJECT_NOT_FOUND";
				return reply.code(404).send({ error: { code, message: code === "CHAPTER_NOT_FOUND" ? "Chapter not found" : "Project not found" } });
			}
		},
	);
	app.get<{ Params: { projectId: string }; Querystring: { chapter?: string } }>(
		"/api/projects/:projectId/studio",
		{ schema: { params: ParamsSchema, querystring: Type.Object({ chapter: Type.Optional(Type.String({ pattern: "^[0-9]+$" })) }, { additionalProperties: false }), response: { 200: StudioSnapshotSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				const activeChapter = request.query.chapter === undefined ? undefined : Number(request.query.chapter);
				return await studio.getSnapshot(request.params.projectId, activeChapter);
			} catch {
				return reply.code(404).send({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
			}
		},
	);
}
