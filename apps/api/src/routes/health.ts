import type { FastifyInstance } from "fastify";
import { Type } from "typebox";

const HealthResponseSchema = Type.Object(
	{
		status: Type.Literal("ok"),
		service: Type.Literal("pi-novel-api"),
	},
	{ additionalProperties: false },
);

export function registerHealthRoute(app: FastifyInstance): void {
	app.get("/api/health", { schema: { response: { 200: HealthResponseSchema } } }, async () => ({ status: "ok", service: "pi-novel-api" }));
}
