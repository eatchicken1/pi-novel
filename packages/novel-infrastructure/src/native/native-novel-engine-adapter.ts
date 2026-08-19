import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type {
	ChapterDocumentView,
	ChapterSummaryView,
	NovelEnginePort,
	NovelEngineStatus,
	ProjectDatabaseRegistryPort,
	ReviewIssueSource,
	RevisionImpactInput,
	StoryGraphSources,
} from "@earendil-works/pi-novel-application";
import type { ProjectCapabilities } from "@earendil-works/pi-novel-contracts";

function hash(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function projectRoot(root: string, projectId: string): string {
	return existsSync(join(root, "novel.yaml")) ? root : join(root, projectId);
}

function chapterFile(chapter: number): string {
	return `chapter-${String(chapter).padStart(3, "0")}.md`;
}

function chapterTitle(content: string): string | null {
	return content.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? null;
}

export class NativeNovelEngineAdapter implements NovelEnginePort {
	private readonly registry: ProjectDatabaseRegistryPort;

	constructor(registry: ProjectDatabaseRegistryPort) {
		this.registry = registry;
	}

	async getCapabilities(workspaceRoot: string, projectId: string): Promise<ProjectCapabilities | null> {
		const root = projectRoot(workspaceRoot, projectId);
		if (!existsSync(join(root, "novel.yaml"))) return null;
		return {
			manuscriptRead: "supported",
			manuscriptWrite: "supported",
			chapterWorkflow: "supported",
			chapterReview: "supported",
			manuscriptReview: "coming_later",
			storyGraph: "unsupported",
			revisionImpact: "unsupported",
			narrativePatch: "unsupported",
			canon: "coming_later",
			history: "supported",
		};
	}

	async getStatus(workspaceRoot: string, projectId: string): Promise<NovelEngineStatus | null> {
		const root = projectRoot(workspaceRoot, projectId);
		if (!existsSync(join(root, "novel.yaml"))) return null;
		const chapters = await this.listChapters(workspaceRoot, projectId, "native");
		const finalizedChapters = this.registry
			.open(projectId, root)
			.chapterMetadata.list(projectId)
			.filter((entry) => entry.workflowStatus === "finalized")
			.map((entry) => entry.chapter);
		return {
			nextChapter: (chapters.at(-1)?.chapter ?? 0) + 1,
			finalizedChapters,
			memoryStatus: null,
			continuityStatus: null,
			openThreads: null,
			overdueThreads: null,
			unresolvedSetups: null,
			downstreamReviewRequired: null,
			currentMovement: null,
		};
	}

	async listChapters(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
	): Promise<ChapterSummaryView[]> {
		if (kind !== "native") return [];
		const root = projectRoot(workspaceRoot, projectId);
		const directory = join(root, "manuscript");
		let files: string[];
		try {
			files = readdirSync(directory)
				.filter((entry) => /^chapter-\d{3}\.md$/u.test(entry))
				.sort();
		} catch {
			return [];
		}
		const metadata = this.registry.open(projectId, root).chapterMetadata;
		const chapters: ChapterSummaryView[] = [];
		for (const file of files) {
			const match = file.match(/chapter-(\d{3})\.md$/u);
			if (match === null) continue;
			const chapter = Number(match[1]);
			const path = join(directory, file);
			const content = readFileSync(path, "utf8");
			const fileMetadata = await stat(path).catch(() => null);
			const stored = metadata.get(projectId, chapter);
			chapters.push({
				chapter,
				title: stored?.title ?? chapterTitle(content),
				wordCount: [...content].length,
				contentHash: hash(content),
				revision: stored?.draftRevision ?? 1,
				finalized: stored?.workflowStatus === "finalized",
				updatedAt: fileMetadata?.mtime.toISOString() ?? new Date(0).toISOString(),
			});
		}
		return chapters;
	}

	async readChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
	): Promise<ChapterDocumentView | null> {
		if (kind !== "native") return null;
		const root = projectRoot(workspaceRoot, projectId);
		const path = join(root, "manuscript", chapterFile(chapter));
		if (!existsSync(path)) return null;
		const content = readFileSync(path, "utf8");
		const fileMetadata = await stat(path).catch(() => null);
		const stored = this.registry.open(projectId, root).chapterMetadata.get(projectId, chapter);
		return {
			projectId,
			chapter,
			title: stored?.title ?? chapterTitle(content),
			text: content,
			contentHash: hash(content),
			revision: stored?.draftRevision ?? 1,
			updatedAt: fileMetadata?.mtime.toISOString() ?? new Date(0).toISOString(),
		};
	}

	async analyzeRevisionImpact(_workspaceRoot: string, _projectId: string, _input: RevisionImpactInput): Promise<null> {
		return null;
	}

	async reviewSources(workspaceRoot: string, projectId: string): Promise<ReviewIssueSource[]> {
		const chapters = await this.listChapters(workspaceRoot, projectId, "native");
		const issues: ReviewIssueSource[] = [];
		for (const chapter of chapters) {
			const document = await this.readChapter(workspaceRoot, projectId, "native", chapter.chapter);
			if (document === null) continue;
			if (document.text.trim().length === 0) {
				issues.push({
					sourceCode: "NATIVE_CHAPTER_EMPTY",
					severity: "error",
					priority: "P0",
					scope: "chapter",
					repairScope: "prose",
					blockingForCurrentAction: true,
					chapter: chapter.chapter,
					scene: null,
					landingChapter: chapter.chapter,
					message: `第 ${chapter.chapter} 章还没有正文。`,
					evidence: null,
				});
			} else if (!/^#\s+.+$/mu.test(document.text)) {
				issues.push({
					sourceCode: "NATIVE_CHAPTER_TITLE_MISSING",
					severity: "warning",
					priority: "P1",
					scope: "chapter",
					repairScope: "prose",
					blockingForCurrentAction: true,
					chapter: chapter.chapter,
					scene: null,
					landingChapter: chapter.chapter,
					message: `第 ${chapter.chapter} 章缺少 Markdown 标题。`,
					evidence: document.text.slice(0, 120),
				});
			}
		}
		return issues;
	}

	async storyGraphSources(_workspaceRoot: string, _projectId: string): Promise<StoryGraphSources | null> {
		return null;
	}

	async invalidateDerived(_workspaceRoot: string, _projectId: string): Promise<void> {
		return undefined;
	}
}
