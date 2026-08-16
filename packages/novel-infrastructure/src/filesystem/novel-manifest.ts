import { readFile } from "node:fs/promises";
import { isRecord, type ProjectManifest, stringValue } from "@earendil-works/pi-novel-contracts";
import { parse } from "yaml";

export async function readNativeProjectManifest(
	path: string,
	fallbackProjectId: string,
	fallbackTitle: string,
): Promise<ProjectManifest> {
	const source = await readFile(path, "utf8");
	const parsed: unknown = parse(source);
	const record = isRecord(parsed) ? parsed : {};
	return {
		schemaVersion: numberValue(record.schema_version ?? record.schemaVersion, 1),
		projectId: stringValue(record.project_id ?? record.projectId, fallbackProjectId),
		title: stringValue(record.title, fallbackTitle),
		language: stringValue(record.language, "zh-CN"),
		createdAt: nullableString(record.created_at ?? record.createdAt),
		updatedAt: nullableString(record.updated_at ?? record.updatedAt),
	};
}

function numberValue(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}
