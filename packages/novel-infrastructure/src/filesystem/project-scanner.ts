import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
	isRecord,
	type ProjectRecord,
	type ProjectScanResult,
	type ProjectScanWarning,
	stringValue,
} from "@earendil-works/pi-novel-contracts";
import { readNativeProjectManifest } from "./novel-manifest.ts";

export class ProjectScanner {
	async scan(rootPath: string): Promise<ProjectScanResult> {
		const entries = await readdir(rootPath, { withFileTypes: true });
		const candidates: ProjectRecord[] = [];
		const warnings: ProjectScanWarning[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
			const projectPath = join(rootPath, entry.name);
			const nativeManifestPath = join(projectPath, "novel.yaml");
			const legacyManifestPath = join(projectPath, "project.json");
			let metadata: Awaited<ReturnType<typeof stat>>;
			try {
				metadata = await stat(projectPath);
			} catch (error) {
				warnings.push(unreadableWarning(projectPath, error));
				continue;
			}

			let hasNativeManifest = false;
			let hasLegacyManifest = false;
			try {
				hasNativeManifest = await fileExists(nativeManifestPath);
				hasLegacyManifest = await fileExists(legacyManifestPath);
			} catch (error) {
				warnings.push(unreadableWarning(projectPath, error));
				continue;
			}

			if (hasNativeManifest && hasLegacyManifest) {
				warnings.push({
					code: "LEGACY_METADATA_PRESENT",
					rootPath: projectPath,
					message: "novel.yaml is authoritative; project.json was ignored",
				});
			}

			if (hasNativeManifest) {
				try {
					const manifest = await readNativeProjectManifest(nativeManifestPath);
					candidates.push({
						projectId: manifest.projectId,
						title: manifest.title,
						rootPath: projectPath,
						kind: "native",
						status: "ready",
						wordCount: 0,
						lastModifiedAt: metadata.mtime.toISOString(),
						manifest,
					});
				} catch (error) {
					warnings.push({
						code: "INVALID_MANIFEST",
						rootPath: projectPath,
						message: errorMessage(error, "Native project manifest is invalid"),
					});
				}
				continue;
			}

			if (hasLegacyManifest) {
				try {
					const legacy = await readLegacyMetadata(legacyManifestPath, entry.name);
					candidates.push({
						projectId: legacy.projectId,
						title: legacy.title,
						rootPath: projectPath,
						kind: "legacy",
						status: "needs_migration",
						wordCount: 0,
						lastModifiedAt: metadata.mtime.toISOString(),
						manifest: null,
					});
				} catch (error) {
					warnings.push({
						code: "INVALID_LEGACY_METADATA",
						rootPath: projectPath,
						message: errorMessage(error, "Legacy project metadata is invalid"),
					});
				}
			}
		}

		const counts = new Map<string, number>();
		for (const project of candidates) counts.set(project.projectId, (counts.get(project.projectId) ?? 0) + 1);
		const projects = candidates.filter((project) => {
			if ((counts.get(project.projectId) ?? 0) < 2) return true;
			warnings.push({
				code: "DUPLICATE_PROJECT_ID",
				rootPath: project.rootPath,
				projectId: project.projectId,
				message: `Project ID is used by multiple directories: ${project.projectId}`,
			});
			return false;
		});

		return {
			projects: projects.sort((left, right) => right.lastModifiedAt.localeCompare(left.lastModifiedAt)),
			warnings,
		};
	}
}

export async function scanProjects(rootPath: string): Promise<ProjectScanResult> {
	return new ProjectScanner().scan(rootPath);
}

async function readLegacyMetadata(
	path: string,
	fallbackProjectId: string,
): Promise<{ projectId: string; title: string }> {
	const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
	if (!isRecord(parsed)) throw new Error("Legacy project metadata must be an object");
	const record = parsed;
	return {
		projectId: stringValue(record.projectId ?? record.project_id, fallbackProjectId),
		title: stringValue(record.title ?? record.name, fallbackProjectId),
	};
}

function unreadableWarning(rootPath: string, error: unknown): ProjectScanWarning {
	return {
		code: "UNREADABLE_DIRECTORY",
		rootPath,
		message: errorMessage(error, "Project directory could not be read"),
	};
}

function errorMessage(error: unknown, fallback: string): string {
	return error instanceof Error && error.message.length > 0 ? error.message : fallback;
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
