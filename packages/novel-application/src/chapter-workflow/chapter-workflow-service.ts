import type {
	ChapterSettlement,
	ChapterWorkflowSnapshot,
	CreateChapterInput,
	FinalizeChapterInput,
	ReconcileDecisionInput,
	ReconcileInput,
	ReconcileReport,
	SaveDraftInput,
	SettlementInput,
} from "@earendil-works/pi-novel-contracts";
import type { ChangeSetService } from "../changesets/change-set-service.ts";
import type {
	ChapterAuthoringPort,
	ChapterWorkflowReadiness,
	NovelEnginePort,
	ProjectDatabaseRegistryPort,
} from "../ports.ts";
import type { ReviewService } from "../review/review-service.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

function ensureChapter(chapter: number): void {
	if (!Number.isInteger(chapter) || chapter < 1) throw new Error("CHAPTER_NOT_FOUND");
}

function readinessForIssues(
	issues: Array<{ blockingForCurrentAction: boolean; priority: string | null; scope: string }>,
	chapter: number,
): ChapterWorkflowReadiness {
	const current = issues.filter(
		(issue) =>
			(issue.scope === "scene" || issue.scope === "chapter") &&
			(issue as { chapter?: number | null }).chapter === chapter,
	);
	const blocking = current.filter((issue) => issue.blockingForCurrentAction);
	const majorLocal = current.filter((issue) => issue.priority === "P0" || issue.priority === "P1");
	return {
		canFinalize: blocking.length === 0 && majorLocal.length === 0,
		blockingCount: blocking.length,
		majorLocalCount: majorLocal.length,
	};
}

export class ChapterWorkflowService {
	private readonly workspace: WorkspaceService;
	private readonly registry: ProjectDatabaseRegistryPort;
	private readonly engine: NovelEnginePort;
	private readonly authoring: ChapterAuthoringPort;
	private readonly review: ReviewService;
	private readonly changeSets: ChangeSetService;
	private readonly clock: { now(): string };

	constructor(dependencies: {
		workspace: WorkspaceService;
		registry: ProjectDatabaseRegistryPort;
		engine: NovelEnginePort;
		authoring?: ChapterAuthoringPort;
		review: ReviewService;
		changeSets: ChangeSetService;
		clock: { now(): string };
	}) {
		this.workspace = dependencies.workspace;
		this.registry = dependencies.registry;
		this.engine = dependencies.engine;
		this.authoring = dependencies.authoring ?? (dependencies.engine as unknown as ChapterAuthoringPort);
		this.review = dependencies.review;
		this.changeSets = dependencies.changeSets;
		this.clock = dependencies.clock;
	}

	private async project(
		projectId: string,
	): Promise<{ project: { rootPath: string; kind: "native" | "legacy" }; workspaceRoot: string }> {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (overview === null || project === undefined) throw new Error("PROJECT_NOT_FOUND");
		return { project, workspaceRoot: overview.manifest.rootPath };
	}

	private repository(projectId: string, projectRoot: string) {
		return this.registry.open(projectId, projectRoot).chapterWorkflow;
	}

	async saveDraft(projectId: string, chapter: number, input: SaveDraftInput) {
		ensureChapter(chapter);
		const { project, workspaceRoot } = await this.project(projectId);
		const draft = await this.authoring.saveDraft(workspaceRoot, projectId, project.kind, chapter, input);
		const now = this.clock.now();
		const metadataRepository = this.registry.open(projectId, project.rootPath).chapterMetadata;
		const metadata = metadataRepository.get(projectId, chapter);
		if (metadata !== null) {
			metadataRepository.update({
				...metadata,
				draftRevision: draft.draftRevision,
				contentHash: draft.contentHash,
				mtime: draft.updatedAt,
				workflowStatus: "draft",
				updatedAt: now,
			});
		} else {
			metadataRepository.create({
				projectId,
				chapter,
				orderIndex: chapter,
				title: `Chapter ${chapter}`,
				filePath: `manuscript/chapter-${String(chapter).padStart(3, "0")}.md`,
				draftRevision: draft.draftRevision,
				contentHash: draft.contentHash,
				mtime: draft.updatedAt,
				workflowStatus: "draft",
				createdAt: now,
				updatedAt: now,
			});
		}
		this.repository(projectId, project.rootPath).upsert({
			projectId,
			chapter,
			phase: "draft",
			reconcile: this.repository(projectId, project.rootPath).get(projectId, chapter)?.reconcile ?? null,
			settlement: this.repository(projectId, project.rootPath).get(projectId, chapter)?.settlement ?? null,
			updatedAt: now,
		});
		return draft;
	}

	private async readiness(projectId: string, chapter: number): Promise<ChapterWorkflowReadiness> {
		const listed = await this.review.list(projectId);
		return readinessForIssues(
			listed.issues.filter((issue) => issue.status === "open" || issue.status === "acknowledged"),
			chapter,
		);
	}

	private async hasBlockingChangeSet(projectId: string, chapter: number): Promise<boolean> {
		const pending = await this.changeSets.list(projectId);
		return pending.some(
			(changeSet) =>
				(changeSet.status === "proposed" ||
					changeSet.status === "reviewing" ||
					changeSet.status === "accepted" ||
					changeSet.status === "committing") &&
				(changeSet.impact?.affectedChapters.includes(chapter) === true ||
					changeSet.operations.some((operation) =>
						operation.target.includes(`chapter-${String(chapter).padStart(3, "0")}`),
					)),
		);
	}

	private async draft(projectId: string, chapter: number) {
		const { project, workspaceRoot } = await this.project(projectId);
		const draft = await this.authoring.readDraft(workspaceRoot, projectId, project.kind, chapter);
		return { project, workspaceRoot, draft };
	}

	async getSnapshot(projectId: string, chapter: number): Promise<ChapterWorkflowSnapshot> {
		ensureChapter(chapter);
		const { project, workspaceRoot, draft } = await this.draft(projectId, chapter);
		const stored = this.repository(projectId, project.rootPath).get(projectId, chapter);
		const reconcile =
			stored?.reconcile !== null &&
			stored?.reconcile !== undefined &&
			draft !== null &&
			stored.reconcile.draftRevision === draft.draftRevision &&
			stored.reconcile.contentHash === draft.contentHash
				? stored.reconcile
				: null;
		const settlement =
			stored?.settlement !== null &&
			stored?.settlement !== undefined &&
			draft !== null &&
			stored.settlement.draftRevision === draft.draftRevision &&
			stored.settlement.contentHash === draft.contentHash
				? stored.settlement
				: null;
		const settlementStale = stored?.settlement !== null && stored?.settlement !== undefined && settlement === null;
		const readiness = await this.readiness(projectId, chapter);
		const finalized =
			(await this.engine.getStatus(workspaceRoot, projectId).catch(() => null))?.finalizedChapters.includes(
				chapter,
			) === true ||
			this.registry.open(projectId, project.rootPath).chapterMetadata.get(projectId, chapter)?.workflowStatus ===
				"finalized";
		const phase = finalized
			? "finalized"
			: draft === null
				? "draft"
				: reconcile === null
					? "reconciling"
					: (stored?.phase ?? (draft === null ? "draft" : "reconciling"));
		const canSettle =
			draft !== null &&
			reconcile !== null &&
			(reconcile.status === "aligned" ||
				(reconcile.status === "creative-discovery-accepted" &&
					reconcile.changeSetId !== null &&
					(await this.changeSetCommitted(projectId, reconcile.changeSetId))));
		const canFinalize =
			canSettle &&
			readiness.canFinalize &&
			settlement !== null &&
			!(await this.hasBlockingChangeSet(projectId, chapter));
		const blockingReasons: Array<{ code: string; message: string }> = [];
		if (!readiness.canFinalize) {
			if (readiness.blockingCount > 0)
				blockingReasons.push({
					code: "CURRENT_REVIEW_BLOCKING",
					message: `还有 ${readiness.blockingCount} 个当前问题需要处理。`,
				});
			if (readiness.majorLocalCount > 0)
				blockingReasons.push({
					code: "CURRENT_REVIEW_MAJOR",
					message: `还有 ${readiness.majorLocalCount} 个当前章节的重要问题。`,
				});
		}
		if (!canSettle) {
			if (reconcile === null)
				blockingReasons.push({ code: "RECONCILIATION_REQUIRED", message: "请先检查正文与当前故事状态。" });
			if (
				reconcile?.status === "creative-discovery-accepted" &&
				reconcile.changeSetId !== null &&
				!(await this.changeSetCommitted(projectId, reconcile.changeSetId))
			)
				blockingReasons.push({ code: "CHANGESET_NOT_COMMITTED", message: "有一项故事变化等待确认。" });
		}
		if (settlementStale)
			blockingReasons.push({
				code: "SETTLEMENT_STALE",
				message: "正文在确认本章状态后又被修改，需要重新检查本章变化。",
			});
		if (settlement === null && canSettle)
			blockingReasons.push({ code: "SETTLEMENT_REQUIRED", message: "请确认本章产生的故事变化。" });
		if (await this.hasBlockingChangeSet(projectId, chapter))
			blockingReasons.push({ code: "CHANGESET_PENDING", message: "有一项影响本章的故事变化尚未完成。" });
		const nextAction = finalized ? "本章已完成" : (blockingReasons[0]?.message ?? "本章已经准备完成，可以正式定稿。");
		const recommendation = finalized
			? "finished"
			: draft === null
				? "draft"
				: !canSettle
					? "reconcile"
					: !readiness.canFinalize
						? "revise"
						: !canFinalize
							? "settle"
							: "finalize";
		return {
			projectId,
			chapter,
			phase,
			draft,
			reconcile,
			settlement,
			canSettle,
			canFinalize,
			settlementStale,
			nextAction,
			blockingReasons,
			recommendation,
			updatedAt: stored?.updatedAt ?? this.clock.now(),
		};
	}

	async reconcile(projectId: string, chapter: number, input: ReconcileInput): Promise<ReconcileReport> {
		ensureChapter(chapter);
		const { project, workspaceRoot } = await this.project(projectId);
		const report = await this.authoring.reconcileChapter(workspaceRoot, projectId, project.kind, chapter, input);
		this.repository(projectId, project.rootPath).upsert({
			projectId,
			chapter,
			phase: report.divergences.length > 0 ? "reconciling" : "diagnosing",
			reconcile: report,
			settlement: null,
			updatedAt: report.updatedAt,
		});
		return report;
	}

	async decideReconcile(
		projectId: string,
		chapter: number,
		input: ReconcileDecisionInput,
	): Promise<{ report: ReconcileReport; changeSetId: string | null }> {
		ensureChapter(chapter);
		const { project, workspaceRoot } = await this.project(projectId);
		const draft = await this.authoring.readDraft(workspaceRoot, projectId, project.kind, chapter);
		const repository = this.repository(projectId, project.rootPath);
		const stored = repository.get(projectId, chapter);
		if (stored?.reconcile === null || stored?.reconcile === undefined) throw new Error("RECONCILIATION_REQUIRED");
		if (draft === null || draft.draftRevision !== input.draftRevision || draft.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		if (stored.reconcile.draftRevision !== input.draftRevision || stored.reconcile.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		if (stored.reconcile.divergences.length === 0 && input.decision === "accept-creative-discovery")
			throw new Error("RECONCILIATION_NOT_DIVERGENT");
		if (stored.reconcile.divergences.length === 0 && input.decision === "prose-was-wrong")
			throw new Error("RECONCILIATION_NOT_DIVERGENT");
		if (input.decision === "prose-was-wrong" && input.changeSet !== undefined)
			throw new Error("CHANGESET_NOT_ALLOWED");
		if (input.decision === "accept-creative-discovery" && input.changeSet === undefined)
			throw new Error("CHANGESET_REQUIRED");
		let changeSetId: string | null = null;
		if (input.changeSet !== undefined) {
			const changeSet = await this.changeSets.create({
				projectId,
				title: input.changeSet.title,
				kind: input.changeSet.kind,
				source: "user",
				intent: input.changeSet.intent,
				baseRevision: input.changeSet.baseRevision,
				operations: input.changeSet.operations,
			});
			changeSetId = changeSet.changeSetId;
		}
		const now = this.clock.now();
		const report: ReconcileReport = {
			...stored.reconcile,
			status: input.decision === "prose-was-wrong" ? "prose-correction-required" : "creative-discovery-accepted",
			authorDecision: input.decision,
			changeSetId,
			updatedAt: now,
		};
		repository.upsert({
			...stored,
			phase: input.decision === "prose-was-wrong" ? "revising" : "diagnosing",
			reconcile: report,
			updatedAt: now,
		});
		return { report, changeSetId };
	}

	private async changeSetCommitted(projectId: string, changeSetId: string): Promise<boolean> {
		try {
			return (await this.changeSets.get(projectId, changeSetId)).status === "committed";
		} catch (error) {
			if (error instanceof Error && error.message === "CHANGESET_NOT_FOUND") return false;
			throw error;
		}
	}

	async settle(projectId: string, chapter: number, input: SettlementInput): Promise<ChapterSettlement> {
		ensureChapter(chapter);
		const { project, draft } = await this.draft(projectId, chapter);
		const repository = this.repository(projectId, project.rootPath);
		const stored = repository.get(projectId, chapter);
		if (stored?.reconcile === null || stored?.reconcile === undefined) throw new Error("RECONCILIATION_REQUIRED");
		if (draft === null || draft.draftRevision !== input.draftRevision || draft.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		if (stored.reconcile.draftRevision !== input.draftRevision || stored.reconcile.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		if (stored.reconcile.status !== "aligned" && stored.reconcile.status !== "creative-discovery-accepted")
			throw new Error("RECONCILIATION_REQUIRED");
		if (
			stored.reconcile.status === "creative-discovery-accepted" &&
			(stored.reconcile.changeSetId === null ||
				!(await this.changeSetCommitted(projectId, stored.reconcile.changeSetId)))
		)
			throw new Error("CHANGESET_NOT_COMMITTED");
		const now = this.clock.now();
		const settlement: ChapterSettlement = {
			...input,
			projectId,
			chapter,
			summary: { ...input.summary, chapter },
			createdAt: now,
			updatedAt: now,
		};
		repository.upsert({ ...stored, phase: "ready-to-finalize", settlement, updatedAt: now });
		return settlement;
	}

	async finalize(
		projectId: string,
		chapter: number,
		input: FinalizeChapterInput,
	): Promise<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }> {
		ensureChapter(chapter);
		const { project, workspaceRoot, draft } = await this.draft(projectId, chapter);
		const repository = this.repository(projectId, project.rootPath);
		const stored = repository.get(projectId, chapter);
		if (stored?.settlement === null || stored?.settlement === undefined) throw new Error("SETTLEMENT_REQUIRED");
		if (draft === null || draft.draftRevision !== input.draftRevision || draft.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		if (
			stored.settlement.draftRevision !== input.draftRevision ||
			stored.settlement.contentHash !== input.contentHash
		)
			throw new Error("SETTLEMENT_REQUIRED");
		if (input.contentHash !== draft.contentHash) throw new Error("DRAFT_STALE");
		const readiness = await this.readiness(projectId, chapter);
		if (!readiness.canFinalize) throw new Error("FINALIZATION_BLOCKED");
		if (await this.hasBlockingChangeSet(projectId, chapter)) throw new Error("FINALIZATION_BLOCKED");
		const result = await this.authoring.finalizeChapter(
			workspaceRoot,
			projectId,
			project.kind,
			chapter,
			input,
			stored.settlement,
		);
		const now = this.clock.now();
		const metadataRepository = this.registry.open(projectId, project.rootPath).chapterMetadata;
		const metadata = metadataRepository.get(projectId, chapter);
		if (metadata !== null) metadataRepository.update({ ...metadata, workflowStatus: "finalized", updatedAt: now });
		repository.upsert({ ...stored, phase: "finalized", updatedAt: now });
		return result;
	}

	async createChapter(projectId: string, input: CreateChapterInput) {
		const { project, workspaceRoot } = await this.project(projectId);
		const document = await this.authoring.createChapter(workspaceRoot, projectId, project.kind, input);
		const now = this.clock.now();
		const metadataRepository = this.registry.open(projectId, project.rootPath).chapterMetadata;
		if (metadataRepository.get(projectId, document.chapter) === null) {
			metadataRepository.create({
				projectId,
				chapter: document.chapter,
				orderIndex: document.chapter,
				title: document.title ?? input.title,
				filePath: `manuscript/chapter-${String(document.chapter).padStart(3, "0")}.md`,
				draftRevision: document.revision,
				contentHash: document.contentHash,
				mtime: document.updatedAt,
				workflowStatus: "draft",
				createdAt: now,
				updatedAt: now,
			});
		}
		return document;
	}
}
