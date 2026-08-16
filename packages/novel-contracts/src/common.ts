import { type Static, Type } from "typebox";

export const ISODateStringSchema = Type.String({ format: "date-time" });
export type ISODateString = Static<typeof ISODateStringSchema>;

export const ApiErrorSchema = Type.Object(
	{
		code: Type.String({ minLength: 1 }),
		message: Type.String({ minLength: 1 }),
		details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
	},
	{ additionalProperties: false },
);
export type ApiError = Static<typeof ApiErrorSchema>;

export const ApiErrorResponseSchema = Type.Object({ error: ApiErrorSchema }, { additionalProperties: false });

export type ApiErrorResponse = Static<typeof ApiErrorResponseSchema>;

export function nowIso(): ISODateString {
	return new Date().toISOString();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function stringValue(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
