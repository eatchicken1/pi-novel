import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type WorkspaceManifest, WorkspaceManifestSchema } from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import { resolveWorkspacePaths, type WorkspacePaths } from "./workspace-path.ts";

export class WorkspaceManifestValidationError extends Error {
	readonly code = "WORKSPACE_MANIFEST_INVALID" as const;

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "WorkspaceManifestValidationError";
	}
}

export class WorkspaceFiles {
	readonly paths: WorkspacePaths;

	constructor(rootPath: string) {
		this.paths = resolveWorkspacePaths(rootPath);
	}

	async ensureWorkspaceDirectory(): Promise<void> {
		await mkdir(this.paths.root, { recursive: true });
		await mkdir(this.paths.controlDirectory, { recursive: true });
	}

	async readManifest(): Promise<WorkspaceManifest | null> {
		try {
			const content = await readFile(this.paths.manifest, "utf8");
			const parsed: unknown = JSON.parse(content);
			if (!Check(WorkspaceManifestSchema, parsed)) {
				throw new WorkspaceManifestValidationError(`Workspace manifest is invalid: ${this.paths.manifest}`);
			}
			return parsed;
		} catch (error) {
			if (isMissingFile(error)) return null;
			if (error instanceof WorkspaceManifestValidationError) throw error;
			if (error instanceof SyntaxError) {
				throw new WorkspaceManifestValidationError(`Workspace manifest is not valid JSON: ${this.paths.manifest}`, {
					cause: error,
				});
			}
			throw error;
		}
	}

	async writeManifest(manifest: WorkspaceManifest): Promise<void> {
		await this.ensureWorkspaceDirectory();
		const temporaryPath = `${this.paths.manifest}.${randomUUID()}.tmp`;
		await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
		await rename(temporaryPath, this.paths.manifest);
	}
}

function isMissingFile(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function ensureDirectory(path: string): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
}
