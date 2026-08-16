import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isRecord, stringValue } from "@earendil-works/pi-novel-contracts";

export interface LegacyProjectSnapshot {
	projectId: string;
	title: string;
	rootPath: string;
	metadata: Record<string, unknown>;
}

export async function readLegacyProject(rootPath: string, fallbackProjectId: string): Promise<LegacyProjectSnapshot> {
	const parsed: unknown = JSON.parse(await readFile(join(rootPath, "project.json"), "utf8"));
	const metadata = isRecord(parsed) ? parsed : {};
	return {
		projectId: stringValue(metadata.projectId ?? metadata.project_id, fallbackProjectId),
		title: stringValue(metadata.title ?? metadata.name, fallbackProjectId),
		rootPath,
		metadata,
	};
}
