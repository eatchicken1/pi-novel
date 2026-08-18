import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import { ApiErrorResponseSchema, CreateTaskInputSchema, TaskResponseSchema } from "@earendil-works/pi-novel-contracts";
import type { TaskService } from "@earendil-works/pi-novel-application";

const ParamsSchema = Type.Object({ taskId: Type.String({ minLength: 1 }) }, { additionalProperties: false });

export function registerTaskRoutes(app: FastifyInstance, service: TaskService, workspaceRoot: () => string | null): void {
	app.post<{ Params: { taskId: string } }>(
		"/api/tasks/:taskId/cancel",
		{ schema: { params: ParamsSchema, response: { 200: TaskResponseSchema, 404: ApiErrorResponseSchema, 409: ApiErrorResponseSchema } } },
		async (request, reply) => {
			try {
				return { task: await service.cancel(request.params.taskId) };
			} catch (error) {
				const errorCode = error instanceof Error ? error.message : "TASK_NOT_FOUND";
				if (errorCode === "TASK_INVALID_STATE" || errorCode === "TASK_NOT_CANCELLABLE") {
					return reply.code(409).send({
						error: {
							code: errorCode,
							message:
								errorCode === "TASK_NOT_CANCELLABLE"
									? "Forge tasks must be cancelled by the Forge operation that created them"
									: "Task cannot be cancelled in its current state",
						},
					});
				}
				return reply.code(404).send({ error: { code: "TASK_NOT_FOUND", message: "Task not found" } });
			}
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
