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
	TaskResponseSchema,
	GenerateDirectionsInputSchema,
	MaterializeForgeInputSchema,
	SelectDirectionInputSchema,
	TaskEventListResponseSchema,
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
import type { TaskService } from "@earendil-works/pi-novel-application";

const SessionParamsSchema = Type.Object({ sessionId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const TaskParamsSchema = Type.Object({ taskId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
type SessionParams = { sessionId: string };
type TaskParams = { taskId: string };

export function registerForgeRoutes(app: FastifyInstance, service: ForgeService, taskService: TaskService): void {
	app.post<{ Body: CreateForgeSessionInput }>("/api/forge/sessions", { schema: { body: CreateForgeSessionInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ session: service.createSession(request.body) })));
	app.get<{ Params: SessionParams }>("/api/forge/sessions/:sessionId", { schema: { params: SessionParamsSchema, response: { 200: ForgeSessionResponseSchema, 404: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ session: service.getSession(request.params.sessionId) })));
	app.patch<{ Params: SessionParams; Body: UpdateForgeSessionInput }>("/api/forge/sessions/:sessionId", { schema: { params: SessionParamsSchema, body: UpdateForgeSessionInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => ({ session: service.updateSession(request.params.sessionId, request.body) })));
	app.post<{ Params: SessionParams; Body: GenerateDirectionsInput }>("/api/forge/sessions/:sessionId/directions", { schema: { params: SessionParamsSchema, body: GenerateDirectionsInputSchema, response: { 200: ForgeTaskResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.startDirectionGeneration(request.params.sessionId, request.body).then((task) => ({ task }))));
	app.post<{ Params: SessionParams; Body: GenerateDirectionsInput }>("/api/forge/sessions/:sessionId/regenerate", { schema: { params: SessionParamsSchema, body: GenerateDirectionsInputSchema, response: { 200: ForgeTaskResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.startRegeneration(request.params.sessionId, request.body).then((task) => ({ task }))));
	app.get<{ Params: SessionParams }>("/api/forge/sessions/:sessionId/artifacts", { schema: { params: SessionParamsSchema, response: { 200: ForgeArtifactsResponseSchema, 404: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.getArtifacts(request.params.sessionId)));
	app.post<{ Params: SessionParams }>("/api/forge/sessions/:sessionId/compare", { schema: { params: SessionParamsSchema, response: { 200: ForgeTaskResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.startComparison(request.params.sessionId).then((task) => ({ task }))));
	app.post<{ Params: SessionParams; Body: CritiqueDirectionInput }>("/api/forge/sessions/:sessionId/candidate/critique", { schema: { params: SessionParamsSchema, body: CritiqueDirectionInputSchema, response: { 200: ForgeTaskResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.startCritique(request.params.sessionId, request.body).then((task) => ({ task }))));
	app.post<{ Params: SessionParams; Body: SelectDirectionInput }>("/api/forge/sessions/:sessionId/selection", { schema: { params: SessionParamsSchema, body: SelectDirectionInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.select(request.params.sessionId, request.body).then((session) => ({ session }))));
	app.post<{ Params: SessionParams; Body: CommitForgeInput }>("/api/forge/sessions/:sessionId/commit", { schema: { params: SessionParamsSchema, body: CommitForgeInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.commit(request.params.sessionId, request.body).then((session) => ({ session }))));
	app.post<{ Params: SessionParams; Body: MaterializeForgeInput }>("/api/forge/sessions/:sessionId/materialize", { schema: { params: SessionParamsSchema, body: MaterializeForgeInputSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.materialize(request.params.sessionId, request.body).then((session) => ({ session }))));
	app.post<{ Params: SessionParams }>("/api/forge/sessions/:sessionId/materialize/recover", { schema: { params: SessionParamsSchema, response: { 200: ForgeSessionResponseSchema, 400: ApiErrorResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } }, async (request, reply) => run(reply, () => service.recoverMaterialization(request.params.sessionId).then((session) => ({ session }))));
	app.get<{ Params: TaskParams }>(
		"/api/tasks/:taskId",
		{ schema: { params: TaskParamsSchema, response: { 200: Type.Union([ForgeTaskResponseSchema, TaskResponseSchema]), 404: ApiErrorResponseSchema } } },
		async (request, reply) => run(reply, async () => ({ task: await getTask(request.params.taskId, service, taskService) })),
	);
	app.get<{ Params: TaskParams }>(
		"/api/tasks/:taskId/events",
		{ schema: { params: TaskParamsSchema, response: { 200: TaskEventListResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) =>
			run(reply, async () => {
				await getTask(request.params.taskId, service, taskService);
				return { events: await listTaskEvents(request.params.taskId, 0, service, taskService) };
			}),
	);
	app.get<{ Params: TaskParams }>("/api/tasks/:taskId/events/stream", { schema: { params: TaskParamsSchema } }, async (request, reply) => streamTaskEvents(request.params.taskId, service, taskService, request, reply));
}

async function getTask(taskId: string, forge: ForgeService, generic: TaskService) {
	try {
		const task = forge.getTask(taskId);
		return typeof task.forgeSessionId === "string" ? task : await generic.get(taskId);
	} catch (error) {
		if (error instanceof ForgeError && error.code === "TASK_NOT_FOUND") return generic.get(taskId);
		throw error;
	}
}

async function run<T>(reply: { code(statusCode: number): { send(payload: unknown): unknown } }, action: () => T | Promise<T>): Promise<T | unknown> {
	try {
		return await action();
	} catch (error) {
		if (error instanceof ForgeError) return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
		if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "string") {
			const statusCode = "statusCode" in error && typeof error.statusCode === "number" ? error.statusCode : 400;
			return reply.code(statusCode).send({ error: { code: String(error.code), message: error instanceof Error ? error.message : "Forge operation failed" } });
		}
		throw error;
	}
}

// Server-sent events for a Forge task: emits the current task on connect and on
// every poll tick, and ends once the task reaches a terminal status. The Web
// uses this as its primary update channel with a slow polling fallback.
async function streamTaskEvents(
		taskId: string,
		service: ForgeService,
		taskService: TaskService,
		request: {
			raw: { on(event: string, listener: () => void): void };
			headers: Record<string, string | string[] | undefined>;
		},
		reply: {
			code(statusCode: number): { send(payload: unknown): unknown };
			hijack(): void;
			raw: { writeHead(statusCode: number, headers: Record<string, string>): void; write(chunk: string): void; end(): void };
		},
): Promise<void> {
	try {
		await getTask(taskId, service, taskService);
	} catch (error) {
		const statusCode = error instanceof ForgeError ? error.statusCode : 404;
		return void reply.code(statusCode).send({ error: { code: "TASK_NOT_FOUND", message: "Forge task not found" } });
	}
	reply.hijack();
	reply.raw.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
	let closed = false;
	let sending = false;
	let lastSequence = parseLastEventId(request.headers["last-event-id"]);
	const close = () => { closed = true; };
	request.raw.on("close", close);
	const send = async () => {
		if (closed || sending) return;
		sending = true;
		try {
			const task = await getTask(taskId, service, taskService);
			reply.raw.write(`event: task\ndata: ${JSON.stringify(task)}\n\n`);
			const events = await listTaskEvents(taskId, lastSequence, service, taskService);
			for (const event of events) {
				reply.raw.write(`id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
				lastSequence = event.sequence;
			}
			if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
				closed = true;
				reply.raw.end();
			}
		} catch (error) {
			closed = true;
			reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Task not found" })}\n\n`);
			reply.raw.end();
		} finally {
			sending = false;
		}
	};
	await send();
	if (closed) return;
	await new Promise<void>((resolve) => {
		const timer = setInterval(() => {
			if (closed) { clearInterval(timer); resolve(); return; }
			void send();
		}, 500);
	});
}

async function listTaskEvents(
	taskId: string,
	afterSequence: number,
	forge: ForgeService,
	generic: TaskService,
): Promise<ReturnType<ForgeService["listTaskEvents"]>> {
	try {
		const forgeTask = forge.getTask(taskId);
		if (typeof forgeTask.forgeSessionId === "string") return forge.listTaskEvents(taskId, afterSequence);
	} catch (error) {
		if (!(error instanceof ForgeError) || error.code !== "TASK_NOT_FOUND") throw error;
	}
	await generic.get(taskId);
	return generic.listEvents(taskId, afterSequence);
}

function parseLastEventId(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value;
	if (raw === undefined) return 0;
	const parsed = Number.parseInt(raw, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}
