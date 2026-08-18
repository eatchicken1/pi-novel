import type { FastifyInstance } from "fastify";
import { Type } from "typebox";
import {
	ApiErrorResponseSchema,
	RuntimeAgentIdSchema,
	RuntimeProfileListResponseSchema,
	SetRuntimeProfileInputSchema,
	type RuntimeAgentId,
	type SetRuntimeProfileInput,
} from "@earendil-works/pi-novel-contracts";
import { AgentRuntimeService, RuntimeProfileError } from "@earendil-works/pi-novel-application";

const AgentParamsSchema = Type.Object({ agentId: RuntimeAgentIdSchema }, { additionalProperties: false });
type AgentParams = { agentId: RuntimeAgentId };

export function registerRuntimeRoutes(app: FastifyInstance, service: AgentRuntimeService): void {
	app.get(
		"/api/runtime/profiles",
		{ schema: { response: { 200: RuntimeProfileListResponseSchema, 409: ApiErrorResponseSchema } } },
		async (_request, reply) => run(() => ({ profiles: service.listProfiles() }), reply),
	);
	app.put<{ Params: AgentParams; Body: SetRuntimeProfileInput }>(
		"/api/runtime/profiles/:agentId",
		{
			schema: {
				params: AgentParamsSchema,
				body: SetRuntimeProfileInputSchema,
				response: { 200: RuntimeProfileListResponseSchema, 400: ApiErrorResponseSchema, 409: ApiErrorResponseSchema },
			},
		},
		async (request, reply) =>
			run(
				async () => {
					await service.setProfile(request.params.agentId, request.body);
					return { profiles: service.listProfiles() };
				},
				reply,
			),
	);
}

async function run<T>(
	action: () => Promise<T> | T,
	reply?: { code(statusCode: number): { send(payload: unknown): unknown } },
): Promise<T | unknown> {
	try {
		return await action();
	} catch (error) {
		if (reply && error instanceof RuntimeProfileError)
			return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
		if (reply && typeof error === "object" && error !== null && "code" in error && typeof error.code === "string")
			return reply.code(400).send({ error: { code: String(error.code), message: error instanceof Error ? error.message : "Runtime profile operation failed" } });
		throw error;
	}
}
