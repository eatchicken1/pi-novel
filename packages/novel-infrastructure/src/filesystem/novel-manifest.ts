import { readFile } from "node:fs/promises";
import { isRecord, type ProjectManifest, ProjectManifestSchema } from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import { parse } from "yaml";

export class ProjectManifestValidationError extends Error {
	readonly code = "INVALID_MANIFEST" as const;

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "ProjectManifestValidationError";
	}
}

export async function readNativeProjectManifest(path: string): Promise<ProjectManifest> {
	try {
		const source = await readFile(path, "utf8");
		const parsed: unknown = parse(source);
		const record = isRecord(parsed) ? parsed : {};
		const manifest: unknown = {
			schemaVersion: record.schema_version ?? record.schemaVersion ?? 1,
			projectId: record.project_id ?? record.projectId,
			title: record.title,
			language:
				typeof record.language === "string" && record.language.trim().length > 0 ? record.language.trim() : "zh-CN",
			createdAt: record.created_at ?? record.createdAt ?? null,
			updatedAt: record.updated_at ?? record.updatedAt ?? null,
		};
		if (!Check(ProjectManifestSchema, manifest)) {
			throw new ProjectManifestValidationError(`Native project manifest is invalid: ${path}`);
		}
		return manifest;
	} catch (error) {
		if (error instanceof ProjectManifestValidationError) throw error;
		throw new ProjectManifestValidationError(`Native project manifest could not be parsed: ${path}`, {
			cause: error,
		});
	}
}
