import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { resolveWorkspacePath } from "../filesystem/workspace-path.ts";

export class ForgeArtifactStore {
	private readonly sessionsRoot: string;

	constructor(workspaceRoot: string) {
		this.sessionsRoot = resolveWorkspacePath(workspaceRoot, ".pi-novel", "sessions");
	}

	async writeJson(sessionId: string, relativePath: string, value: unknown): Promise<void> {
		const path = this.resolve(sessionId, relativePath);
		await mkdir(dirname(path), { recursive: true });
		const temporaryPath = `${path}.${randomUUID()}.tmp`;
		await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
		await rename(temporaryPath, path);
	}

	async readJson(sessionId: string, relativePath: string): Promise<unknown | null> {
		try {
			return JSON.parse(await readFile(this.resolve(sessionId, relativePath), "utf8")) as unknown;
		} catch (error) {
			if (isMissingFile(error)) return null;
			throw error;
		}
	}

	private resolve(sessionId: string, relativePath: string): string {
		const sessionRoot = resolveWorkspacePath(this.sessionsRoot, sessionId);
		return resolveWorkspacePath(sessionRoot, relativePath);
	}
}

function isMissingFile(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
