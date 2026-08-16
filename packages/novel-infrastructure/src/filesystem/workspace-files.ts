import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { WorkspaceManifest } from "@earendil-works/pi-novel-contracts";
import { resolveWorkspacePaths, type WorkspacePaths } from "./workspace-path.ts";

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
			return JSON.parse(content) as WorkspaceManifest;
		} catch (error) {
			if (isMissingFile(error)) return null;
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
