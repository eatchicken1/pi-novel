import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ApiErrorResponseSchema, CreateTaskInputSchema, TaskEventListResponseSchema, TaskResponseSchema } from "@earendil-works/pi-novel-contracts";
import type { TaskService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ taskId: Type.String({ minLength: 1 }) }, { additionalProperties: false });
const TaskQuerySchema = Type.Object({ afterSequence: Type.Optional(Type.String({ pattern: "^[0-9]+$" })) }, { additionalProperties: false });

export function registerTaskRoutes(app: FastifyInstance, service: TaskService, workspaceRoot: () => string | null): void {
	app.get<{ Params: { taskId: string } }>(
		"/api/tasks/:taskId",
		{ schema: { params: ParamsSchema, response: { 200: TaskResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { task: await service.get(request.params.taskId) };
			} catch {
				return reply.code(404).send({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } });
			}
		},
	);
	app.post<{ Params: { taskId: string } }>(
		"/api/tasks/:taskId/cancel",
		{ schema: { params: ParamsSchema, response: { 200: TaskResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { task: await service.cancel(request.params.taskId) };
			} catch (error) {
				const code = error instanceof Error && error.message === "TASK_INVALID_STATE" ? "TASK_INVALID_STATE" : "TASK_NOT_FOUND";
				return reply.code(code === "TASK_INVALID_STATE" ? 409 : 404).send({ error: { code, message: code === "TASK_INVALID_STATE" ? "Task cannot be cancelled in its current state" : "Task not found" } });
			}
		},
	);
	app.get<{ Params: { taskId: string }; Querystring: { afterSequence?: string } }>(
		"/api/tasks/:taskId/events",
		{ schema: { params: ParamsSchema, querystring: TaskQuerySchema, response: { 200: TaskEventListResponseSchema, 404: ApiErrorResponseSchema } } },
		async (request, reply) => {
			const afterSequence = request.query.afterSequence === undefined ? 0 : Number(request.query.afterSequence);
			try {
				await service.get(request.params.taskId);
			} catch {
				return reply.code(404).send({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } });
			}
			// 持久化事件 + Last-Event-ID（afterSequence）恢复；SSE 流式升级随 AgentRuntime 提供。
			return { events: service.listEvents(request.params.taskId, afterSequence) };
		},
	);
	app.post<{ Body: { projectId?: string; forgeSessionId?: string; type: string; intent: string; modelId?: string }; Headers: { "x-idempotency-key"?: string } }>(
		"/api/tasks",
		{ schema: { body: CreateTaskInputSchema, headers: Type.Object({ "x-idempotency-key": Type.Optional(Type.String({ minLength: 1 })) }, { additionalProperties: true }), response: { 202: TaskResponseSchema, 400: ApiErrorResponseSchema } } },
		async (request, reply) => {
			const root = workspaceRoot();
			if (root === null) return reply.code(400).send({ error: { code: "WORKSPACE_NOT_OPEN", message: "Workspace is not open" } });
			const task = await service.create({ projectId: request.body.projectId ?? null, forgeSessionId: request.body.forgeSessionId ?? null, type: request.body.type, intent: request.body.intent, modelId: request.body.modelId }, root, request.headers["x-idempotency-key"]);
			return reply.code(202).send({ task });
		},
	);
}
