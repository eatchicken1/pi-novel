import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import {
	ApiErrorResponseSchema,
	CommitForgeInputSchema,
	CreateForgeSessionInputSchema,
	CritiqueDirectionInputSchema,
	ForgeArtifactsResponseSchema,
	ForgeSessionResponseSchema,
	ForgeTaskResponseSchema,
	GenerateDirectionsInputSchema,
	MaterializeForgeInputSchema,
	SelectDirectionInputSchema,
	UpdateForgeSessionInputSchema,
	type CommitForgeInput,
	type CreateForgeSessionInput,
	type CritiqueDirectionInput,
	type GenerateDirectionsInput,
	type MaterializeForgeInput,
	type SelectDirectionInput,
	type UpdateForgeSessionInput,
} from "@earendil-works/pi-novel-contracts";
import { ForgeError, ForgeService } from "@earendil-works/pi-novel-application";

const SessionParamsSchema = Type.Object({ sessionId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const TaskParamsSchema = Type.Object({ taskId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
type SessionParams = { sessionId: string };
type TaskParams = { taskId: string };

export function registerForgeRoutes(app: FastifyInstance, service: ForgeService): void {
	app.post<{ Body: CreateForgeSessionInput }>("/api/forge/sessions", { schema: { body: CreateForgeSessionInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ session: service.createSession(request.body) })));
	app.get<{ Params: SessionParams }>("/api/forge/sessions/:sessionId", { schema: { params: SessionParamsSchema, response: { 200: ForgeSessionResponseSchema, 404: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ session: service.getSession(request.params.sessionId) })));
	app.patch<{ Params: SessionParams; Body: UpdateForgeSessionInput }>("/api/forge/sessions/:sessionId", { schema: { params: SessionParamsSchema, body: UpdateForgeSessionInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ session: service.updateSession(request.params.sessionId, request.body) })));
	app.post<{ Params: SessionParams; Body: GenerateDirectionsInput }>("/api/forge/sessions/:sessionId/directions", { schema: { params: SessionParamsSchema, body: GenerateDirectionsInputSchema, response: { 200: ForgeTaskResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ task: service.startDirectionGeneration(request.params.sessionId, request.body) })));
	app.post<{ Params: SessionParams; Body: GenerateDirectionsInput }>("/api/forge/sessions/:sessionId/regenerate", { schema: { params: SessionParamsSchema, body: GenerateDirectionsInputSchema, response: { 200: ForgeTaskResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ task: service.startRegeneration(request.params.sessionId, request.body) })));
	app.get<{ Params: SessionParams }>("/api/forge/sessions/:sessionId/artifacts", { schema: { params: SessionParamsSchema, response: { 200: ForgeArtifactsResponseSchema, 404: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.getArtifacts(request.params.sessionId)));
	app.post<{ Params: SessionParams }>("/api/forge/sessions/:sessionId/compare", { schema: { params: SessionParamsSchema, response: { 200: ForgeArtifactsResponseSchema, 404: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.compare(request.params.sessionId)));
	app.post<{ Params: SessionParams; Body: CritiqueDirectionInput }>("/api/forge/sessions/:sessionId/candidate/critique", { schema: { params: SessionParamsSchema, body: CritiqueDirectionInputSchema, response: { 200: ForgeArtifactsResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.critique(request.params.sessionId, request.body)));
	app.post<{ Params: SessionParams; Body: SelectDirectionInput }>("/api/forge/sessions/:sessionId/selection", { schema: { params: SessionParamsSchema, body: SelectDirectionInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.select(request.params.sessionId, request.body).then((session) => ({ session }))));
	app.post<{ Params: SessionParams; Body: CommitForgeInput }>("/api/forge/sessions/:sessionId/commit", { schema: { params: SessionParamsSchema, body: CommitForgeInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.commit(request.params.sessionId, request.body).then((session) => ({ session }))));
	app.post<{ Params: SessionParams; Body: MaterializeForgeInput }>("/api/forge/sessions/:sessionId/materialize", { schema: { params: SessionParamsSchema, body: MaterializeForgeInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.materialize(request.params.sessionId, request.body).then((session) => ({ session }))));
	app.get<{ Params: TaskParams }>("/api/tasks/:taskId", { schema: { params: TaskParamsSchema, response: { 200: ForgeTaskResponseSchema, 404: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ task: service.getTask(request.params.taskId) })));
	app.get<{ Params: TaskParams }>("/api/tasks/:taskId/events", { schema: { params: TaskParamsSchema } }, async (request, reply) => streamTaskEvents(request.params.taskId, service, request, reply));
}

async function run<T>(reply: { code(statusCode: number): { send(payload: unknown): unknown } }, action: () => T | Promise<T>): Promise<T | unknown> {
	try {
		return await action();
	} catch (error) {
		if (error instanceof ForgeError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
		if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") return reply.code(400).send({ error: { code: error.code, message: error instanceof Error ? error.message : "Forge operation failed" } });
		throw error;
	}
}

async function streamTaskEvents(taskId: string, service: ForgeService, request: { raw: { on(event: string, listener: () => void): void } }, reply: { hijack(): void; raw: { writeHead(statusCode: number, headers: Record<string, string>): void; write(chunk: string): void; end(): void } }): Promise<void> {
	reply.hijack();
	reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
	let closed = false;
	const close = () => { closed = true; };
	request.raw.on("close", close);
	const send = () => {
		if (closed) return;
		try {
			const task = service.getTask(taskId);
			reply.raw.write(`event: task\ndata: ${JSON.stringify(task)}\n\n`);
			if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
				closed = true;
				reply.raw.end();
			}
		} catch (error) {
			closed = true;
			reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Task not found" })}\n\n`);
			reply.raw.end();
		}
	};
	send();
	if (closed) return;
	await new Promise<void>((resolve) => {
		const timer = setInterval(() => {
			if (closed) { clearInterval(timer); resolve(); return; }
			send();
		}, 500);
	});
}
