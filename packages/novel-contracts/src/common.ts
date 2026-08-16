export type ISODateString = string;

export interface ApiError {
	code: string;
	message: string;
}

export function nowIso(): ISODateString {
	return new Date().toISOString();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function stringValue(value: unknown, fallback = ""): string {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
