import { existsSync } from "node:fs";
import { join } from "node:path";
import type { NovelEnginePort } from "@earendil-works/pi-novel-application";

type ProjectKind = "native" | "legacy";

function projectKind(root: string, projectId: string): ProjectKind | null {
	if (existsSync(join(root, "novel.yaml"))) return "native";
	if (existsSync(join(root, "project.json"))) return "legacy";
	if (existsSync(join(root, projectId, "novel.yaml"))) return "native";
	if (existsSync(join(root, projectId, "project.json"))) return "legacy";
	if (existsSync(join(root, "novels", projectId, "project.json"))) return "legacy";
	return null;
}

/**
 * Routes read/analyze requests to the adapter that owns the on-disk project format.
 * The kind argument is only a fallback for callers that already resolved a project;
 * the marker files remain authoritative when they are available.
 */
export class NovelEngineRouter implements NovelEnginePort {
	private readonly native: NovelEnginePort;
	private readonly legacy: NovelEnginePort;

	constructor(native: NovelEnginePort, legacy: NovelEnginePort) {
		this.native = native;
		this.legacy = legacy;
	}

	private adapter(root: string, projectId: string, fallback?: ProjectKind): NovelEnginePort {
		const kind = projectKind(root, projectId) ?? fallback;
		if (kind === "native") return this.native;
		if (kind === "legacy") return this.legacy;
		throw new Error("PROJECT_NOT_FOUND");
	}

	getCapabilities(root: string, projectId: string) {
		return this.adapter(root, projectId).getCapabilities(root, projectId);
	}

	getStatus(root: string, projectId: string) {
		return this.adapter(root, projectId).getStatus(root, projectId);
	}

	listChapters(root: string, projectId: string, kind: ProjectKind) {
		return this.adapter(root, projectId, kind).listChapters(root, projectId, kind);
	}

	readChapter(root: string, projectId: string, kind: ProjectKind, chapter: number) {
		return this.adapter(root, projectId, kind).readChapter(root, projectId, kind, chapter);
	}

	analyzeRevisionImpact(
		root: string,
		projectId: string,
		input: Parameters<NovelEnginePort["analyzeRevisionImpact"]>[2],
	) {
		return this.adapter(root, projectId).analyzeRevisionImpact(root, projectId, input);
	}

	reviewSources(root: string, projectId: string) {
		return this.adapter(root, projectId).reviewSources(root, projectId);
	}

	storyGraphSources(root: string, projectId: string) {
		return this.adapter(root, projectId).storyGraphSources(root, projectId);
	}

	invalidateDerived(root: string, projectId: string) {
		return this.adapter(root, projectId).invalidateDerived(root, projectId);
	}
}
