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
import type { ChapterSettlement, ProjectCapabilities, RevisionImpact } from "@earendil-works/pi-novel-contracts";

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

function appendSettlementImpact(
	settlement: ChapterSettlement,
	items: RevisionImpact["items"],
	characters: Set<string>,
	threads: Set<string>,
	clues: Set<string>,
	promises: Set<string>,
): void {
	for (const change of settlement.knowledgeChanges) {
		characters.add(change.characterId);
		items.push({
			category: "CHARACTER_KNOWLEDGE",
			certainty: "KNOWN",
			description: change.change,
			evidence: {
				sourceType: "chapter-settlement",
				sourceId: `${settlement.projectId}:${settlement.chapter}:knowledge`,
				chapterId: String(settlement.chapter),
				description: "当前章节已确认的人物认知变化。",
			},
		});
	}
	for (const change of settlement.relationshipChanges)
		items.push({
			category: "RELATIONSHIP",
			certainty: "KNOWN",
			description: change.change,
			evidence: {
				sourceType: "chapter-settlement",
				sourceId: `${settlement.projectId}:${settlement.chapter}:relationship`,
				chapterId: String(settlement.chapter),
				description: "当前章节已确认的人物关系变化。",
			},
		});
	for (const thread of settlement.threads) {
		threads.add(thread);
		items.push({
			category: "THREAD",
			certainty: "KNOWN",
			description: thread,
			evidence: {
				sourceType: "chapter-settlement",
				sourceId: `${settlement.projectId}:${settlement.chapter}:thread`,
				chapterId: String(settlement.chapter),
				description: "当前章节已确认的线程变化。",
			},
		});
	}
	for (const clue of settlement.clues) {
		clues.add(clue);
		items.push({
			category: "CLUE",
			certainty: "KNOWN",
			description: clue,
			evidence: {
				sourceType: "chapter-settlement",
				sourceId: `${settlement.projectId}:${settlement.chapter}:clue`,
				chapterId: String(settlement.chapter),
				description: "当前章节已确认的线索变化。",
			},
		});
	}
	for (const promise of settlement.promises) {
		promises.add(promise);
		items.push({
			category: "PROMISE",
			certainty: "KNOWN",
			description: promise,
			evidence: {
				sourceType: "chapter-settlement",
				sourceId: `${settlement.projectId}:${settlement.chapter}:promise`,
				chapterId: String(settlement.chapter),
				description: "当前章节已确认的 Promise 变化。",
			},
		});
	}
	for (const timeline of settlement.timelineChanges)
		items.push({
			category: "TIMELINE",
			certainty: "KNOWN",
			description: timeline,
			evidence: {
				sourceType: "chapter-settlement",
				sourceId: `${settlement.projectId}:${settlement.chapter}:timeline`,
				chapterId: String(settlement.chapter),
				description: "当前章节已确认的时间线变化。",
			},
		});
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
			revisionImpact: "supported",
			narrativePatch: "supported",
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

	async analyzeRevisionImpact(
		workspaceRoot: string,
		projectId: string,
		input: RevisionImpactInput,
	): Promise<RevisionImpact | null> {
		const root = projectRoot(workspaceRoot, projectId);
		if (!existsSync(join(root, "novel.yaml"))) return null;
		const chapter = input.changedChapter;
		const metadata = this.registry.open(projectId, root).chapterMetadata;
		const workflow = this.registry.open(projectId, root).chapterWorkflow;
		const items: RevisionImpact["items"] = [];
		const affectedChapters = new Set<number>();
		const affectedCharacters = new Set<string>();
		const affectedThreads = new Set<string>();
		const affectedClues = new Set<string>();
		const affectedPromises = new Set<string>();
		if (chapter !== undefined) {
			affectedChapters.add(chapter);
			items.push({
				category: "CURRENT_CHAPTER",
				certainty: "KNOWN",
				description: `正文修改发生在第 ${chapter} 章。`,
				evidence: {
					sourceType: "chapter",
					sourceId: String(chapter),
					chapterId: String(chapter),
					description: "ChangeSet 的正文目标章节。",
				},
			});
			const current = workflow.get(projectId, chapter)?.settlement;
			if (current !== null && current !== undefined)
				appendSettlementImpact(
					current,
					items,
					affectedCharacters,
					affectedThreads,
					affectedClues,
					affectedPromises,
				);
			for (const future of metadata.list(projectId).filter((entry) => entry.chapter > chapter)) {
				const futureSettlement = workflow.get(projectId, future.chapter)?.settlement;
				if (futureSettlement === null || futureSettlement === undefined) continue;
				affectedChapters.add(future.chapter);
				items.push({
					category: "FUTURE_CHAPTER",
					certainty: "POSSIBLE",
					description: `第 ${future.chapter} 章已有确认状态，修改后需要下游复查。`,
					evidence: {
						sourceType: "chapter-settlement",
						sourceId: `${projectId}:${future.chapter}`,
						chapterId: String(future.chapter),
						description: "下游章节存在已确认结算。",
					},
				});
			}
		}
		if (chapter !== undefined && items.every((item) => item.certainty !== "UNKNOWN") && items.length > 0) {
			items.push({
				category: "FUTURE_CHAPTER",
				certainty: "UNKNOWN",
				description: "Story Graph 尚未建立，无法确认完整的因果传播。",
			});
		}
		if (chapter !== undefined) {
			const reviewSources = await this.reviewSources(workspaceRoot, projectId).catch(() => []);
			for (const source of reviewSources) {
				if (source.chapter !== null && source.chapter < chapter) continue;
				const future = source.chapter !== null && source.chapter > chapter;
				if (source.chapter !== null) affectedChapters.add(source.chapter);
				const evidence =
					source.evidence === null
						? undefined
						: {
								sourceType: "review",
								sourceId: `${source.sourceCode}:${source.chapter ?? "story"}`,
								...(source.chapter === null ? {} : { chapterId: String(source.chapter) }),
								description: source.evidence,
							};
				items.push({
					category: future ? "FUTURE_CHAPTER" : source.scope === "chapter" ? "CURRENT_CHAPTER" : "STORY_FACT",
					certainty: evidence === undefined ? "POSSIBLE" : "KNOWN",
					description: source.message,
					...(evidence === undefined ? {} : { evidence }),
				});
			}
		}
		for (const change of input.knowledgeChanges ?? []) {
			affectedCharacters.add(change.characterId);
			items.push({
				category: "CHARACTER_KNOWLEDGE",
				certainty: "KNOWN",
				description: `${change.characterId} 的认知将从“${change.from}”变为“${change.to}”。`,
				evidence: {
					sourceType: "input",
					sourceId: change.factRef,
					chapterId: chapter === undefined ? undefined : String(chapter),
					description: "作者提交的知识变化。",
				},
			});
		}
		for (const truth of input.truthChanges ?? [])
			items.push({
				category: "STORY_FACT",
				certainty: "POSSIBLE",
				description: `故事事实 ${truth} 可能需要复查。`,
				evidence: { sourceType: "input", sourceId: truth, description: "作者提交的事实变化。" },
			});
		if (items.length === 0)
			items.push({
				category: "STORY_FACT",
				certainty: "UNKNOWN",
				description: "没有足够的已确认状态证据判断下游影响。",
			});
		return {
			severity: affectedChapters.size > 1 ? "downstream-review" : "safe-local",
			causalCoverage: "partial",
			items,
			affectedChapters: [...affectedChapters].sort((a, b) => a - b),
			affectedCharacters: [...affectedCharacters],
			affectedThreads: [...affectedThreads],
			affectedClues: [...affectedClues],
			affectedPromises: [...affectedPromises],
			summary: "当前影响分析基于已确认故事状态；完整因果传播将在 Story Graph 建立后增强。",
			analyzedAt: new Date().toISOString(),
		};
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
