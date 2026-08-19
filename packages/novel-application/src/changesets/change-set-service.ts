import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ChangeSet, CommitRecord, CreateChangeSetInput, ReviewSummary } from "@earendil-works/pi-novel-contracts";
import { operationWithResolvedAnchor } from "../patch/text-anchor.ts";
import type {
	ClockPort,
	CommitJournalCommit,
	CommitJournalEntry,
	FileTransactionPort,
	IdempotencyPort,
	IdGeneratorPort,
	NovelEnginePort,
	ProjectDatabaseRegistryPort,
	StagedFileChange,
} from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

export class ChangeSetService {
	private readonly workspace: WorkspaceService;
	private readonly engine: NovelEnginePort;
	private readonly registry: ProjectDatabaseRegistryPort;
	private readonly files: FileTransactionPort;
	private readonly idempotency: IdempotencyPort;
	private readonly id: IdGeneratorPort;
	private readonly clock: ClockPort;
	private readonly reviewProjector?: { refresh(projectId: string): Promise<ReviewSummary> };

	constructor(dependencies: {
		workspace: WorkspaceService;
		engine: NovelEnginePort;
		registry: ProjectDatabaseRegistryPort;
		files: FileTransactionPort;
		idempotency: IdempotencyPort;
		id: IdGeneratorPort;
		clock: ClockPort;
		// commit 完成后重新投影 review（spec：被修复的 issue 从 open → resolved）
		reviewProjector?: { refresh(projectId: string): Promise<ReviewSummary> };
	}) {
		this.workspace = dependencies.workspace;
		this.engine = dependencies.engine;
		this.registry = dependencies.registry;
		this.files = dependencies.files;
		this.idempotency = dependencies.idempotency;
		this.id = dependencies.id;
		this.clock = dependencies.clock;
		this.reviewProjector = dependencies.reviewProjector;
	}

	private async roots(projectId: string): Promise<{ workspaceRoot: string; projectRoot: string }> {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined || overview === null) throw new Error("PROJECT_NOT_FOUND");
		return { workspaceRoot: overview.manifest.rootPath, projectRoot: project.rootPath };
	}

	private async projectRoot(projectId: string): Promise<string> {
		return (await this.roots(projectId)).projectRoot;
	}

	private async load(projectId: string, changeSetId: string): Promise<{ changeSet: ChangeSet; root: string }> {
		const root = await this.projectRoot(projectId);
		const changeSet = this.registry.open(projectId, root).changesets.get(changeSetId);
		if (changeSet === null || changeSet.projectId !== projectId) throw new Error("CHANGESET_NOT_FOUND");
		return { changeSet, root };
	}

	async create(input: CreateChangeSetInput): Promise<ChangeSet> {
		const root = await this.projectRoot(input.projectId);
		const now = this.clock.now();
		const changeSet: ChangeSet = {
			changeSetId: this.id.id(),
			projectId: input.projectId,
			title: input.title,
			status: "proposed",
			kind: input.kind,
			source: input.source,
			intent: input.intent,
			baseRevision: input.baseRevision,
			operations: input.operations,
			createdAt: now,
			updatedAt: now,
			...(input.patch === undefined ? {} : { patch: input.patch }),
		};
		const repository = this.registry.open(input.projectId, root).changesets;
		repository.create(changeSet);
		// 自动影响分析（analyze_revision_impact 意图接入）
		const knowledgeChanges = input.operations
			.filter(
				(operation) => operation.kind === "structured-artifact-update" && operation.target.includes("knowledge"),
			)
			.map((operation) => ({
				characterId: "unknown",
				factRef: String(operation.metadataKey ?? operation.target),
				from: "",
				to: "",
			}));
		const { workspaceRoot } = await this.roots(input.projectId);
		const impact = await this.engine.analyzeRevisionImpact(workspaceRoot, input.projectId, {
			changedChapter:
				input.patch === undefined
					? undefined
					: Number(input.patch.anchor.chapterId.replace(/\D/gu, "")) || undefined,
			changedEventIds: [],
			knowledgeChanges: knowledgeChanges.length > 0 ? knowledgeChanges : undefined,
		});
		if (impact !== null) {
			const updated: ChangeSet = { ...changeSet, impact, updatedAt: this.clock.now() };
			repository.update(updated);
			return updated;
		}
		return changeSet;
	}

	async get(projectId: string, changeSetId: string): Promise<ChangeSet> {
		const { changeSet } = await this.load(projectId, changeSetId);
		return changeSet;
	}

	async list(projectId: string): Promise<ChangeSet[]> {
		const root = await this.projectRoot(projectId);
		return this.registry.open(projectId, root).changesets.listByProject(projectId);
	}

	// 全量 accept / reject（第一版不支持 partial accept——不做假实现）
	async accept(projectId: string, changeSetId: string, selectedCandidateId?: string): Promise<ChangeSet> {
		const { changeSet, root } = await this.load(projectId, changeSetId);
		if (changeSet.status !== "proposed" && changeSet.status !== "reviewing") {
			throw new Error("CHANGESET_INVALID_STATE");
		}
		let updated: ChangeSet = { ...changeSet, status: "accepted", updatedAt: this.clock.now() };
		if (selectedCandidateId !== undefined && changeSet.patch !== undefined) {
			const candidate = changeSet.patch.candidates.find((entry) => entry.candidateId === selectedCandidateId);
			if (candidate === undefined) throw new Error("PATCH_CANDIDATE_NOT_FOUND");
			updated = {
				...updated,
				selectedCandidateId,
				operations: updated.operations.map((operation, index) =>
					index === 0 ? { ...operation, text: candidate.replacement } : operation,
				),
			};
		}
		this.registry.open(projectId, root).changesets.update(updated);
		return updated;
	}

	async reject(projectId: string, changeSetId: string): Promise<ChangeSet> {
		const { changeSet, root } = await this.load(projectId, changeSetId);
		if (changeSet.status === "committed") throw new Error("CHANGESET_INVALID_STATE");
		const updated: ChangeSet = { ...changeSet, status: "rejected", updatedAt: this.clock.now() };
		this.registry.open(projectId, root).changesets.update(updated);
		return updated;
	}

	// 幂等 commit：同一 idempotencyKey 重试不产生第二个 commit。
	async commit(
		projectId: string,
		changeSetId: string,
		actor: CommitRecord["actor"],
		idempotencyKey?: string,
	): Promise<{ changeSet: ChangeSet; commit: CommitRecord }> {
		if (idempotencyKey !== undefined && idempotencyKey.length > 0) {
			const stored = this.idempotency.hasResult(`commit:${projectId}:${idempotencyKey}`);
			if (stored) throw new Error("IDEMPOTENT_REPLAY");
		}
		const { changeSet, root } = await this.load(projectId, changeSetId);
		if (changeSet.status !== "accepted") {
			throw new Error("CHANGESET_INVALID_STATE: commit requires accepted");
		}
		const now = this.clock.now();
		const repository = this.registry.open(projectId, root);
		// 1. base hash 校验（外部编辑检测）
		const targets = [...new Set(changeSet.operations.map((operation) => operation.target))];
		const currentHashes = await this.files.currentHashes(root, targets);
		let operations = changeSet.operations;
		if (changeSet.patch !== undefined) {
			const currentContent = await this.readTarget(root, changeSet.patch.target);
			operations = [operationWithResolvedAnchor(currentContent, changeSet.operations[0]!)];
		}
		for (const operation of operations) {
			// Manuscript patches have an anchor-based relocation path. The resolver
			// above rewrites baseHash to the current document hash; ordinary
			// ChangeSets remain strict hash-checked.
			const expected =
				changeSet.patch === undefined
					? (operation.baseHash ?? changeSet.baseRevision ?? undefined)
					: operation.baseHash;
			if (
				expected !== undefined &&
				currentHashes[operation.target] !== undefined &&
				currentHashes[operation.target] !== expected &&
				currentHashes[operation.target] !== ""
			) {
				const conflicted: ChangeSet = { ...changeSet, status: "conflict", updatedAt: now };
				repository.changesets.update(conflicted);
				throw new Error("CHANGESET_BASE_STALE");
			}
		}
		// 2. journal（pending）
		const journalId = this.id.id();
		const commitId = this.id.id();
		const journalCommit: CommitJournalCommit = {
			commitId,
			actor,
			summary: changeSet.title,
			createdAt: now,
			...(changeSet.patch === undefined
				? {}
				: {
						patch: {
							chapter: Number(changeSet.patch.anchor.chapterId.replace(/\D/gu, "")) || 1,
							goal: changeSet.patch.goal,
							original: selectedPatchCandidate(changeSet).original,
							replacement: selectedPatchCandidate(changeSet).replacement,
							agentId: changeSet.patch.provenance.agentId,
							runtimeModelId: changeSet.patch.provenance.runtimeModelId,
							impact: changeSet.patch.impact,
						},
					}),
		};
		const journal: CommitJournalEntry = {
			journalId,
			projectId,
			changeSetId,
			state: "pending",
			files: [],
			dbActions: ["changeset.status=committing"],
			startedAt: now,
			completedAt: null,
			commit: journalCommit,
		};
		const committing: ChangeSet = { ...changeSet, status: "committing", updatedAt: now };
		repository.commits.createJournal(journal);
		repository.changesets.update(committing);
		let staged: StagedFileChange[] = [];
		let authorityCommitted = false;
		try {
			// 3. 应用（temp 文件）
			const baseHashes: Record<string, string> = {};
			for (const operation of operations) {
				const hash = operation.baseHash ?? currentHashes[operation.target] ?? "";
				if (hash !== "") baseHashes[operation.target] = hash;
			}
			const appliedResult = await this.files.applyOperations({
				projectRoot: root,
				operations,
				baseHashes,
			});
			staged = appliedResult.staged;
			repository.commits.updateJournalFiles(journalId, staged);
			// 4. 原子替换
			await this.files.finalize({ projectRoot: root, staged });
			// The applied state means canonical files have been replaced. Recovery
			// must never treat a temp-only journal as committed.
			repository.commits.updateJournalState(journalId, "applied", null);
			// 4b. review 重新投影：被修复的 issue 从 open → resolved（spec：commit 完成后重新投影）
			let resolvedIssueCount = 0;
			if (this.reviewProjector !== undefined) {
				const reviewRepo = repository.review;
				const openBefore = reviewRepo
					.list(projectId)
					.filter((issue) => issue.status === "open" || issue.status === "acknowledged").length;
				try {
					await this.reviewProjector.refresh(projectId);
				} catch {
					// Review is derived state; a failed projection must not undo the file commit.
					resolvedIssueCount = 0;
				}
				const openAfter = reviewRepo
					.list(projectId)
					.filter((issue) => issue.status === "open" || issue.status === "acknowledged").length;
				resolvedIssueCount = Math.max(0, openBefore - openAfter);
			}
			// 5. history + changeset committed
			const afterHashes: Record<string, string> = {};
			const beforeHashes: Record<string, string> = {};
			for (const entry of appliedResult.applied) {
				afterHashes[entry.relativePath] = entry.afterHash;
				if (entry.beforeHash !== null) beforeHashes[entry.relativePath] = entry.beforeHash;
			}
			const commit: CommitRecord = {
				commitId,
				projectId,
				changeSetId,
				actor,
				summary: changeSet.title,
				affectedFiles: appliedResult.applied.map((entry) => entry.relativePath),
				beforeHashes,
				afterHashes,
				resolvedIssueCount,
				createdAt: now,
				...(changeSet.patch === undefined
					? {}
					: {
							patch: {
								chapter: Number(changeSet.patch.anchor.chapterId.replace(/\D/gu, "")) || 1,
								goal: changeSet.patch.goal,
								original: selectedPatchCandidate(changeSet).original,
								replacement: selectedPatchCandidate(changeSet).replacement,
								agentId: changeSet.patch.provenance.agentId,
								runtimeModelId: changeSet.patch.provenance.runtimeModelId,
								impact: changeSet.patch.impact,
							},
						}),
			};
			repository.commits.updateJournalCommit(journalId, { ...journalCommit, resolvedIssueCount });
			repository.commits.record(commit);
			const committed: ChangeSet = { ...committing, status: "committed", committedAt: now, updatedAt: now };
			repository.changesets.update(committed);
			this.invalidatePatchWorkflow(
				repository,
				projectId,
				changeSet.patch,
				appliedResult.applied[0]?.afterHash ?? "",
				now,
			);
			repository.commits.updateJournalState(journalId, "committed", now);
			authorityCommitted = true;
			// 6. 派生失效（memory/ledgers 重建）
			try {
				await this.engine.invalidateDerived((await this.roots(projectId)).workspaceRoot, projectId);
			} catch {
				// Derived projections are rebuildable and must not turn a committed change into a failure.
			}
			await this.files.cleanup({ projectRoot: root, staged });
			if (idempotencyKey !== undefined && idempotencyKey.length > 0) {
				this.idempotency.storeResult(`commit:${projectId}:${idempotencyKey}`, { commitId: commit.commitId });
			}
			return { changeSet: committed, commit };
		} catch (error) {
			if (authorityCommitted) throw error;
			// 失败：restore canonical files, remove temp/backup files, and mark the journal failed.
			try {
				if (staged.length > 0) await this.files.rollback({ projectRoot: root, staged });
				repository.commits.updateJournalState(journalId, "rolled-back", this.clock.now());
			} catch {}
			const failed: ChangeSet = { ...committing, status: "failed", updatedAt: this.clock.now() };
			repository.changesets.update(failed);
			throw error;
		}
	}

	private readTarget(projectRoot: string, target: string): string {
		const root = resolve(projectRoot);
		const candidate = resolve(root, target);
		const pathFromRoot = relative(root, candidate);
		if (isAbsolute(pathFromRoot) || pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`))
			throw new Error("PATH_ESCAPE: change set target escapes the project root");
		return readFileSync(candidate, "utf8");
	}

	private invalidatePatchWorkflow(
		repository: ReturnType<ProjectDatabaseRegistryPort["open"]>,
		projectId: string,
		patch: ChangeSet["patch"],
		afterHash: string,
		now: string,
	): void {
		if (patch === undefined) return;
		const chapter = Number(patch.anchor.chapterId.replace(/\D/gu, ""));
		if (!Number.isInteger(chapter) || chapter < 1) return;
		const metadata = repository.chapterMetadata.get(projectId, chapter);
		if (metadata !== null)
			repository.chapterMetadata.update({
				...metadata,
				draftRevision: metadata.draftRevision + 1,
				contentHash: afterHash,
				mtime: now,
				workflowStatus: "draft",
				updatedAt: now,
			});
		const workflow = repository.chapterWorkflow.get(projectId, chapter);
		if (workflow !== null)
			repository.chapterWorkflow.upsert({
				...workflow,
				phase: "draft",
				updatedAt: now,
			});
	}

	// 启动/提交前恢复：残留 journal 必须同时恢复文件和 changeset/history，不允许只改 journal 状态。
	async recoverPendingCommits(projectId: string): Promise<number> {
		const root = await this.projectRoot(projectId);
		const repository = this.registry.open(projectId, root);
		const pending = repository.commits.pendingJournals(projectId);
		for (const journal of pending) {
			const staged = journalStagedFiles(journal);
			const changeSet = repository.changesets.get(journal.changeSetId);
			const commit = journal.commit;
			const afterHashes = Object.fromEntries(
				journal.files
					.filter((entry): entry is typeof entry & { afterHash: string } => typeof entry.afterHash === "string")
					.map((entry) => [entry.relativePath, entry.afterHash]),
			);
			const currentHashes = await this.files.currentHashes(
				root,
				journal.files.map((entry) => entry.relativePath),
			);
			const hasRecoveryMetadata =
				commit !== undefined &&
				journal.files.length > 0 &&
				journal.files.every(
					(entry) =>
						typeof entry.afterHash === "string" &&
						(entry.beforeHash === null || typeof entry.backupPath === "string"),
				);
			if (journal.state === "applied" && !hasRecoveryMetadata) {
				throw new Error("COMMIT_RECOVERY_REQUIRED: applied journal lacks restore metadata");
			}
			const filesAreApplied =
				journal.state === "applied" &&
				commit !== undefined &&
				journal.files.length > 0 &&
				journal.files.every(
					(entry) => typeof entry.afterHash === "string" && currentHashes[entry.relativePath] === entry.afterHash,
				);
			if (filesAreApplied) {
				const beforeHashes: Record<string, string> = {};
				for (const entry of journal.files) {
					if (entry.beforeHash !== null && typeof entry.beforeHash === "string")
						beforeHashes[entry.relativePath] = entry.beforeHash;
				}
				if (repository.commits.get(commit.commitId) === null) {
					repository.commits.record({
						commitId: commit.commitId,
						projectId,
						changeSetId: journal.changeSetId,
						actor: commit.actor,
						summary: commit.summary,
						affectedFiles: journal.files.map((entry) => entry.relativePath),
						beforeHashes,
						afterHashes,
						resolvedIssueCount: commit.resolvedIssueCount ?? 0,
						createdAt: commit.createdAt,
						...(commit.patch === undefined ? {} : { patch: commit.patch }),
					});
				}
				if (changeSet !== null && changeSet.status === "committing") {
					repository.changesets.update({
						...changeSet,
						status: "committed",
						committedAt: commit.createdAt,
						updatedAt: this.clock.now(),
					});
				}
				repository.commits.updateJournalState(journal.journalId, "committed", this.clock.now());
				await this.files.cleanup({ projectRoot: root, staged });
				try {
					await this.engine.invalidateDerived((await this.roots(projectId)).workspaceRoot, projectId);
				} catch {}
			} else {
				await this.files.rollback({ projectRoot: root, staged });
				if (changeSet !== null && changeSet.status === "committing") {
					repository.changesets.update({ ...changeSet, status: "failed", updatedAt: this.clock.now() });
				}
				repository.commits.updateJournalState(journal.journalId, "rolled-back", this.clock.now());
			}
		}
		return pending.length;
	}
}

function journalStagedFiles(journal: CommitJournalEntry): StagedFileChange[] {
	return journal.files.map((entry) => ({
		relativePath: entry.relativePath,
		tempPath: entry.tempPath,
		beforeHash: entry.beforeHash ?? null,
		afterHash: entry.afterHash ?? "",
		backupPath: entry.backupPath ?? null,
	}));
}

function selectedPatchCandidate(changeSet: ChangeSet): { original: string; replacement: string } {
	const patch = changeSet.patch;
	if (patch === undefined) throw new Error("PATCH_REQUIRED");
	const selected = patch.candidates.find((candidate) => candidate.candidateId === changeSet.selectedCandidateId);
	return selected ?? patch.candidates[0]!;
}
