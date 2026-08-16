import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { isRecord, type ProjectRecord, stringValue } from "@earendil-works/pi-novel-contracts";
import { readNativeProjectManifest } from "./novel-manifest.ts";

export async function scanProjects(rootPath: string): Promise<ProjectRecord[]> {
	const entries = await readdir(rootPath, { withFileTypes: true });
	const projects: ProjectRecord[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
		const projectPath = join(rootPath, entry.name);
		const nativeManifestPath = join(projectPath, "novel.yaml");
		const legacyManifestPath = join(projectPath, "project.json");
		const metadata = await stat(projectPath);

		if (await fileExists(nativeManifestPath)) {
			const manifest = await readNativeProjectManifest(nativeManifestPath, entry.name, entry.name);
			projects.push({
				projectId: manifest.projectId,
				title: manifest.title,
				rootPath: projectPath,
				kind: "native",
				status: "ready",
				wordCount: 0,
				lastModifiedAt: metadata.mtime.toISOString(),
				manifest,
			});
			continue;
		}

		if (await fileExists(legacyManifestPath)) {
			const legacy = await readLegacyMetadata(legacyManifestPath, entry.name);
			projects.push({
				projectId: legacy.projectId,
				title: legacy.title,
				rootPath: projectPath,
				kind: "legacy",
				status: "needs_migration",
				wordCount: 0,
				lastModifiedAt: metadata.mtime.toISOString(),
				manifest: null,
			});
		}
	}

	return projects.sort((left, right) => right.lastModifiedAt.localeCompare(left.lastModifiedAt));
}

async function readLegacyMetadata(
	path: string,
	fallbackProjectId: string,
): Promise<{ projectId: string; title: string }> {
	const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
	const record = isRecord(parsed) ? parsed : {};
	return {
		projectId: stringValue(record.projectId ?? record.project_id, fallbackProjectId),
		title: stringValue(record.title ?? record.name, fallbackProjectId),
	};
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch (error) {
		return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT"
			? false
			: Promise.reject(error);
	}
}
