import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
	ChapterDocumentView,
	ChapterSummaryView,
	NovelEnginePort,
	NovelEngineStatus,
	ReviewIssueSource,
	RevisionImpactInput,
	StoryGraphSourceEvent,
	StoryGraphSources,
} from "@earendil-works/pi-novel-application";
import type { ChangeSetImpact, ProjectCapabilities } from "@earendil-works/pi-novel-contracts";
import { NovelProjectStore } from "../../../../.pi/extensions/novel-agent/services/project-store.ts";

function sha256(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function chapterFileName(chapter: number): string {
	return `chapter-${String(chapter).padStart(3, "0")}.md`;
}

function legacyProjectRoot(root: string, projectId: string): string {
	if (existsSync(join(root, "project.json"))) return root;
	if (existsSync(join(root, projectId, "project.json"))) return join(root, projectId);
	return join(root, "novels", projectId);
}

function legacyWorkspaceRoot(root: string, _projectId: string): string {
	if (!existsSync(join(root, "project.json"))) return root;
	return dirname(root).endsWith("novels") ? dirname(dirname(root)) : dirname(root);
}

function isDirectLegacyProjectRoot(root: string): boolean {
	return existsSync(join(root, "project.json")) && !dirname(root).endsWith("novels");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeParse(filePath: string): unknown {
	try {
		const content = readFileSync(filePath, "utf8");
		return JSON.parse(content);
	} catch {
		return null;
	}
}

// landing chapter 启发式（与 diagnoseChapter 的 fairnessLandingChapter 一致）：
function fairnessLandingChapter(
	message: string,
	proofCoverage: Record<string, { revealChapter?: number }>,
	unsupported: Array<{ claimId: string; reason: string }>,
): number | null {
	const revealMatch = message.match(/claim (\w+) is actually revealed in chapter (\d+)/u);
	if (revealMatch !== null) return Number(revealMatch[2]);
	const clueMatch = message.match(/clue (\w+) is required by path (\w+)/u);
	if (clueMatch === null) return null;
	const pathId = clueMatch[2];
	const entry = unsupported.find((candidate) => candidate.reason.includes(`: ${pathId}:`));
	if (entry === undefined) return null;
	const coverage = proofCoverage[`${entry.claimId}:heroine`] ?? proofCoverage[`${entry.claimId}:reader`];
	return coverage?.revealChapter ?? null;
}

// NovelEnginePort：legacy NovelProjectStore 的 read/analyze 意图封装。
// 写路径一律走 ChangeSet → Commit（invalidateDerived 只做派生重建）。
export class LegacyNovelEngineAdapter implements NovelEnginePort {
	private readonly stores = new Map<string, NovelProjectStore>();

	async getCapabilities(workspaceRoot: string, projectId: string): Promise<ProjectCapabilities | null> {
		if (!(await this.projectExists(workspaceRoot, projectId))) return null;
		return {
			manuscriptRead: "supported",
			manuscriptWrite: "read_only",
			chapterWorkflow: "unsupported",
			chapterReview: "supported",
			manuscriptReview: "supported",
			storyGraph: "supported",
			revisionImpact: "supported",
			narrativePatch: "unsupported",
			canon: "supported",
			history: "supported",
		};
	}

	private storeFor(workspaceRoot: string): NovelProjectStore {
		const existing = this.stores.get(workspaceRoot);
		if (existing !== undefined) return existing;
		const store = new NovelProjectStore(workspaceRoot);
		this.stores.set(workspaceRoot, store);
		return store;
	}

	private async projectExists(workspaceRoot: string, projectId: string): Promise<boolean> {
		return existsSync(join(legacyProjectRoot(workspaceRoot, projectId), "project.json"));
	}

	async getStatus(workspaceRoot: string, projectId: string): Promise<NovelEngineStatus | null> {
		if (isDirectLegacyProjectRoot(workspaceRoot)) return this.fallbackStatus(workspaceRoot, projectId);
		workspaceRoot = legacyWorkspaceRoot(workspaceRoot, projectId);
		if (!(await this.projectExists(workspaceRoot, projectId))) return null;
		try {
			const status = await this.storeFor(workspaceRoot).getNovelStatus({ projectId });
			return {
				nextChapter: status.nextChapter > 0 ? status.nextChapter : null,
				finalizedChapters: status.finalizedChapters ?? [],
				memoryStatus: status.memoryStatus ?? null,
				continuityStatus: status.continuityStatus ?? null,
				openThreads: status.openThreads ?? null,
				overdueThreads: status.overdueThreads ?? null,
				unresolvedSetups: status.unresolvedSetups ?? null,
				downstreamReviewRequired: status.downstreamReviewRequired ?? null,
				currentMovement: status.currentMovement ?? null,
			};
		} catch {
			// store 不可用时降级：从 project.json 读基础字段（legacy 兼容，规格 106 节）。
			return this.fallbackStatus(workspaceRoot, projectId);
		}
	}

	private fallbackStatus(workspaceRoot: string, projectId: string): NovelEngineStatus | null {
		try {
			const project = safeParse(join(legacyProjectRoot(workspaceRoot, projectId), "project.json"));
			if (!isRecord(project)) return null;
			const nextChapter = typeof project.nextChapter === "number" ? project.nextChapter : null;
			const finalizedChapters = Array.isArray(project.finalizedChapters)
				? project.finalizedChapters.filter((value): value is number => typeof value === "number")
				: [];
			const memory = project.memoryStatus;
			const continuity = project.continuityStatus;
			const movement = project.currentMovement;
			const threads = project.openThreads;
			return {
				nextChapter,
				finalizedChapters,
				memoryStatus: memory === "missing" || memory === "current" || memory === "stale" ? memory : null,
				continuityStatus:
					continuity === "ok" || continuity === "warning" || continuity === "error" ? continuity : null,
				openThreads: typeof threads === "number" ? threads : null,
				overdueThreads: typeof project.overdueThreads === "number" ? project.overdueThreads : null,
				unresolvedSetups: typeof project.unresolvedSetups === "number" ? project.unresolvedSetups : null,
				downstreamReviewRequired:
					typeof project.downstreamReviewRequired === "boolean" ? project.downstreamReviewRequired : null,
				currentMovement: typeof movement === "string" ? movement : null,
			};
		} catch {
			return null;
		}
	}

	async listChapters(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
	): Promise<ChapterSummaryView[]> {
		if (kind !== "legacy") return [];
		const directory = join(legacyProjectRoot(workspaceRoot, projectId), "chapters");
		let files: string[] = [];
		try {
			files = readdirSync(directory);
		} catch {
			return [];
		}
		const chapters: ChapterSummaryView[] = [];
		for (const file of files.filter((entry) => /^chapter-\d{3}\.md$/u.test(entry)).sort()) {
			const match = file.match(/chapter-(\d{3})\.md$/u);
			if (match === null) continue;
			const chapter = Number(match[1]);
			const path = join(directory, file);
			const text = readFileSync(path, "utf8");
			let title: string | null = null;
			let revision = 1;
			let updatedAt = new Date(0).toISOString();
			if (kind === "legacy") {
				const summary = safeParse(
					join(
						legacyProjectRoot(workspaceRoot, projectId),
						"summaries",
						`chapter-${String(chapter).padStart(3, "0")}.json`,
					),
				);
				if (isRecord(summary)) {
					title = typeof summary.title === "string" ? summary.title : null;
					revision = typeof summary.draftRevision === "number" ? summary.draftRevision : 1;
					updatedAt = typeof summary.finalizedAt === "string" ? summary.finalizedAt : new Date(0).toISOString();
				}
			}
			chapters.push({
				chapter,
				title,
				wordCount: [...text].length,
				contentHash: sha256(text),
				revision,
				finalized: true,
				updatedAt,
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
		if (kind !== "legacy") return null;
		const path = join(legacyProjectRoot(workspaceRoot, projectId), "chapters", chapterFileName(chapter));
		if (!existsSync(path)) return null;
		const text = readFileSync(path, "utf8");
		let title: string | null = null;
		let revision = 1;
		if (kind === "legacy") {
			const summary = safeParse(
				join(
					legacyProjectRoot(workspaceRoot, projectId),
					"summaries",
					`chapter-${String(chapter).padStart(3, "0")}.json`,
				),
			);
			if (isRecord(summary)) {
				title = typeof summary.title === "string" ? summary.title : null;
				revision = typeof summary.draftRevision === "number" ? summary.draftRevision : 1;
			}
		}
		const metadata = await stat(path).catch(() => null);
		return {
			projectId,
			chapter,
			title,
			text,
			contentHash: sha256(text),
			revision,
			updatedAt: metadata?.mtime.toISOString() ?? new Date(0).toISOString(),
		};
	}

	async analyzeRevisionImpact(
		workspaceRoot: string,
		projectId: string,
		input: RevisionImpactInput,
	): Promise<ChangeSetImpact | null> {
		if (!(await this.projectExists(workspaceRoot, projectId))) return null;
		try {
			const report = await this.storeFor(workspaceRoot).analyzeRevisionImpact({ projectId, ...input });
			return {
				severity: report.severity as ChangeSetImpact["severity"],
				affectedChapters: report.affectedChapters ?? [],
				affectedCharacters: report.affectedCharacters ?? [],
				affectedThreads: report.affectedThreads ?? [],
				affectedClues: report.affectedClues ?? [],
				affectedPromises: report.affectedPromises ?? [],
				summary: report.summary ?? "revision impact analyzed",
				analyzedAt: new Date().toISOString(),
			};
		} catch {
			return null;
		}
	}

	async reviewSources(workspaceRoot: string, projectId: string): Promise<ReviewIssueSource[]> {
		const projectRoot = legacyProjectRoot(workspaceRoot, projectId);
		if (!existsSync(join(projectRoot, "project.json"))) return [];
		const sources: ReviewIssueSource[] = [];
		const now = new Date().toISOString();
		// 1. realized fairness（持久化报告，不重跑 checker）
		const fairness = safeParse(join(projectRoot, "continuity", "reports", "mystery-realized-fairness.json"));
		if (isRecord(fairness) && Array.isArray(fairness.issues)) {
			const proofCoverage = isRecord(fairness.proofCoverage)
				? (fairness.proofCoverage as Record<string, { revealChapter?: number }>)
				: {};
			const unsupported = Array.isArray(fairness.unsupportedFinalClaims)
				? (fairness.unsupportedFinalClaims as Array<{ claimId: string; reason: string }>)
				: [];
			for (const issue of fairness.issues as Array<{ code: string; severity: string; message: string }>) {
				const landing = fairnessLandingChapter(issue.message, proofCoverage, unsupported);
				const scope = landing === null || landing === undefined ? "manuscript" : "future-chapter";
				sources.push({
					sourceCode: issue.code,
					severity: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warning" : "info",
					priority: issue.severity === "error" ? "P0" : "P1",
					scope,
					repairScope: "event-graph",
					blockingForCurrentAction: false,
					chapter: null,
					scene: null,
					landingChapter: landing ?? null,
					message: issue.message,
					evidence: null,
				});
			}
		}
		// 2. 每章诊断（持久化报告）
		const diagnosisDirectory = join(projectRoot, "work", "diagnosis");
		let diagnosisFiles: string[] = [];
		try {
			diagnosisFiles = readdirSync(diagnosisDirectory).filter((entry) => entry.endsWith(".json"));
		} catch {}
		for (const file of diagnosisFiles) {
			const match = file.match(/chapter-(\d{3})\.json$/u);
			if (match === null) continue;
			const chapter = Number(match[1]);
			const diagnosis = safeParse(join(diagnosisDirectory, file));
			if (!isRecord(diagnosis) || !Array.isArray(diagnosis.findings)) continue;
			for (const finding of diagnosis.findings as Array<{
				priority: string;
				problem: string;
				sourceIssues?: string[];
			}>) {
				const priority = typeof finding.priority === "string" ? finding.priority : "P3";
				const sourceCode =
					Array.isArray(finding.sourceIssues) && finding.sourceIssues.length > 0
						? String(finding.sourceIssues[0])
						: "DIAGNOSIS";
				const landingMatch =
					typeof finding.problem === "string" ? finding.problem.match(/修复落点 ch(\d+)/u) : null;
				const landing = landingMatch === null ? null : Number(landingMatch[1]);
				const scope = landing !== null && landing !== chapter ? "future-chapter" : "chapter";
				sources.push({
					sourceCode,
					severity: priority === "P0" ? "error" : priority === "P1" || priority === "P2" ? "warning" : "info",
					priority: priority as ReviewIssueSource["priority"],
					scope,
					repairScope: "chapter-plan",
					blockingForCurrentAction: priority === "P0" && scope === "chapter",
					chapter,
					scene: null,
					landingChapter: landing,
					message: String(finding.problem ?? sourceCode),
					evidence: null,
				});
			}
		}
		// 3. vertical design 报告
		const vertical = safeParse(join(projectRoot, "continuity", "reports", "female-social-suspense-design.json"));
		if (isRecord(vertical) && Array.isArray(vertical.issues)) {
			for (const issue of vertical.issues as Array<{ code: string; severity: string; message: string }>) {
				sources.push({
					sourceCode: issue.code,
					severity: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warning" : "info",
					priority: issue.severity === "error" ? "P0" : "P1",
					scope: "story-design",
					repairScope: "architecture",
					blockingForCurrentAction: false,
					chapter: null,
					scene: null,
					landingChapter: null,
					message: issue.message,
					evidence: null,
				});
			}
		}
		void now;
		return sources;
	}

	async storyGraphSources(workspaceRoot: string, projectId: string): Promise<StoryGraphSources | null> {
		const projectRoot = legacyProjectRoot(workspaceRoot, projectId);
		if (!existsSync(join(projectRoot, "project.json"))) return null;
		const events: StoryGraphSourceEvent[] = [];
		const map = safeParse(join(projectRoot, "outline", "unified", "event-map.json"));
		if (isRecord(map) && Array.isArray(map.events)) {
			for (const event of map.events as Array<Record<string, unknown>>) {
				const characterRefs = new Set<string>();
				if (Array.isArray(event.characterDeltas)) {
					for (const delta of event.characterDeltas as Array<Record<string, unknown>>) {
						if (typeof delta.characterId === "string") characterRefs.add(delta.characterId);
					}
				}
				const mystery = isRecord(event.mysteryDelta) ? event.mysteryDelta : {};
				const professional = isRecord(event.professionalDelta) ? event.professionalDelta : {};
				const marriage = isRecord(event.marriageDelta) ? event.marriageDelta : {};
				events.push({
					eventId: typeof event.eventId === "number" ? event.eventId : 0,
					chapter: typeof event.chapter === "number" ? event.chapter : 0,
					action: typeof event.action === "string" ? event.action : "",
					causes: Array.isArray(event.causes)
						? event.causes.filter((value): value is number => typeof value === "number")
						: [],
					characterRefs: [...characterRefs],
					clueRefs: Array.isArray(mystery.discoveredClueIds)
						? mystery.discoveredClueIds.filter((value): value is string => typeof value === "string")
						: [],
					claimRefs: Array.isArray(mystery.revealClaimIds)
						? mystery.revealClaimIds.filter((value): value is string => typeof value === "string")
						: [],
					professionalActionRefs: Array.isArray(professional.actionIds)
						? professional.actionIds.filter((value): value is string => typeof value === "string")
						: [],
					marriageRefs: Array.isArray(marriage.economicItemChanges)
						? marriage.economicItemChanges.filter((value): value is string => typeof value === "string")
						: [],
					irreversible: event.irreversible === true,
				});
			}
		}
		const characters: Array<{ characterId: string; label: string | null }> = [];
		const characterDirectory = join(projectRoot, "characters");
		let characterFiles: string[] = [];
		try {
			characterFiles = readdirSync(characterDirectory).filter((entry) => entry.endsWith(".json"));
		} catch {}
		for (const file of characterFiles) {
			const record = safeParse(join(characterDirectory, file));
			if (isRecord(record)) {
				const characterId =
					typeof record.characterId === "string" ? record.characterId : file.replace(/\.json$/u, "");
				characters.push({ characterId, label: typeof record.name === "string" ? record.name : null });
			}
		}
		const clues: Array<{ clueId: string; label: string | null; chapter: number | null }> = [];
		const clueLedger = safeParse(join(projectRoot, "outline", "mystery", "clue-ledger.json"));
		if (Array.isArray(clueLedger)) {
			for (const clue of clueLedger as Array<Record<string, unknown>>) {
				clues.push({
					clueId: typeof clue.id === "string" ? clue.id : "",
					label: typeof clue.observableFact === "string" ? clue.observableFact : null,
					chapter: typeof clue.plannedRealizationChapter === "number" ? clue.plannedRealizationChapter : null,
				});
			}
		}
		const claims: Array<{ claimId: string; label: string | null; revealChapter: number | null }> = [];
		const truthModel = safeParse(join(projectRoot, "work", "mystery", "truth-model-proposed.json"));
		if (isRecord(truthModel) && isRecord(truthModel.case) && Array.isArray(truthModel.case.truthClaims)) {
			for (const claim of truthModel.case.truthClaims as Array<Record<string, unknown>>) {
				claims.push({
					claimId: typeof claim.id === "string" ? claim.id : "",
					label: typeof claim.statement === "string" ? claim.statement : null,
					revealChapter: typeof claim.plannedRevealChapter === "number" ? claim.plannedRevealChapter : null,
				});
			}
		}
		const promises: Array<{ promiseId: string; label: string | null }> = [];
		const promiseLedger = safeParse(join(projectRoot, "work", "authoring", "story-promises.json"));
		if (isRecord(promiseLedger) && Array.isArray(promiseLedger.promises)) {
			for (const promise of promiseLedger.promises as Array<Record<string, unknown>>) {
				promises.push({
					promiseId: typeof promise.id === "string" ? promise.id : "",
					label: typeof promise.promise === "string" ? promise.promise : null,
				});
			}
		}
		const sources: StoryGraphSources = {
			events,
			characters,
			clues,
			claims,
			promises,
			sourceHash: sha256(JSON.stringify({ events, characters, clues, claims, promises })),
		};
		return sources;
	}

	async invalidateDerived(workspaceRoot: string, projectId: string): Promise<void> {
		if (isDirectLegacyProjectRoot(workspaceRoot)) return;
		workspaceRoot = legacyWorkspaceRoot(workspaceRoot, projectId);
		if (!(await this.projectExists(workspaceRoot, projectId))) return;
		try {
			await this.storeFor(workspaceRoot).repairNarrativeMemory({ projectId });
		} catch {}
	}
}
