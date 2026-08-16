import type {
	ChangeSet,
	ChangeSetResponseSchema,
	CommitRecord,
	CreateChangeSetInput,
} from "@earendil-works/pi-novel-contracts";
import { nowIso } from "@earendil-works/pi-novel-contracts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";
import type {
	ClockPort,
	CommitJournalEntry,
	FileTransactionPort,
	IdGeneratorPort,
	IdempotencyPort,
	NovelEnginePort,
	ProjectDatabaseRegistryPort,
} from "../ports.ts";

export class ChangeSetService {
	private readonly workspace: WorkspaceService;
	private readonly engine: NovelEnginePort;
	private readonly registry: ProjectDatabaseRegistryPort;
	private readonly files: FileTransactionPort;
	private readonly idempotency: IdempotencyPort;
	private readonly id: IdGeneratorPort;
	private readonly clock: ClockPort;

	constructor(dependencies: {
		workspace: WorkspaceService;
		engine: NovelEnginePort;
		registry: ProjectDatabaseRegistryPort;
		files: FileTransactionPort;
		idempotency: IdempotencyPort;
		id: IdGeneratorPort;
		clock: ClockPort;
	}) {
		this.workspace = dependencies.workspace;
		this.engine = dependencies.engine;
		this.registry = dependencies.registry;
		this.files = dependencies.files;
		this.idempotency = dependencies.idempotency;
		this.id = dependencies.id;
		this.clock = dependencies.clock;
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
		};
		const repository = this.registry.open(input.projectId, root).changesets;
		repository.create(changeSet);
		// 自动影响分析（analyze_revision_impact 意图接入）
		const knowledgeChanges = input.operations
			.filter((operation) => operation.kind === "structured-artifact-update" && operation.target.includes("knowledge"))
			.map((operation) => ({ characterId: "unknown", factRef: String(operation.metadataKey ?? operation.target), from: "", to: "" }));
		const { workspaceRoot } = await this.roots(input.projectId);
		const impact = await this.engine.analyzeRevisionImpact(workspaceRoot, input.projectId, {
			changedChapter: undefined,
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
	async accept(projectId: string, changeSetId: string): Promise<ChangeSet> {
		const { changeSet, root } = await this.load(projectId, changeSetId);
		if (changeSet.status === "committed" || changeSet.status === "rejected") {
			throw new Error("CHANGESET_INVALID_STATE");
		}
		const updated: ChangeSet = { ...changeSet, status: "accepted", updatedAt: this.clock.now() };
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
	async commit(projectId: string, changeSetId: string, actor: CommitRecord["actor"], idempotencyKey?: string): Promise<{ changeSet: ChangeSet; commit: CommitRecord }> {
		if (idempotencyKey !== undefined && idempotencyKey.length > 0) {
			const stored = this.idempotency.hasResult("commit:" + projectId + ":" + idempotencyKey);
			if (stored) throw new Error("IDEMPOTENT_REPLAY");
		}
		const { changeSet, root } = await this.load(projectId, changeSetId);
		if (changeSet.status !== "accepted" && changeSet.status !== "proposed") {
			throw new Error("CHANGESET_INVALID_STATE: commit requires accepted or proposed");
		}
		const now = this.clock.now();
		const repository = this.registry.open(projectId, root);
		// 1. base hash 校验（外部编辑检测）
		const targets = [...new Set(changeSet.operations.map((operation) => operation.target))];
		const currentHashes = await this.files.currentHashes(root, targets);
		for (const operation of changeSet.operations) {
			const expected = operation.baseHash ?? changeSet.baseRevision ?? undefined;
			if (expected !== undefined && currentHashes[operation.target] !== undefined && currentHashes[operation.target] !== expected && currentHashes[operation.target] !== "") {
				const conflicted: ChangeSet = { ...changeSet, status: "conflict", updatedAt: now };
				repository.changesets.update(conflicted);
				throw new Error("CHANGESET_BASE_STALE");
			}
		}
		// 2. journal（pending）
		const journalId = this.id.id();
		const journal: CommitJournalEntry = {
			journalId,
			projectId,
			changeSetId,
			state: "pending",
			files: [],
			dbActions: ["changeset.status=committing"],
			startedAt: now,
			completedAt: null,
		};
		const committing: ChangeSet = { ...changeSet, status: "committing", updatedAt: now };
		repository.changesets.update(committing);
		repository.commits.createJournal(journal);
		try {
			// 3. 应用（temp 文件）
			const baseHashes: Record<string, string> = {};
			for (const operation of changeSet.operations) {
				const hash = operation.baseHash ?? currentHashes[operation.target] ?? "";
				if (hash !== "") baseHashes[operation.target] = hash;
			}
			const { staged, applied } = await this.files.applyOperations({ projectRoot: root, operations: changeSet.operations, baseHashes });
			const appliedJournal: CommitJournalEntry = { ...journal, state: "applied", files: staged.map((entry) => ({ relativePath: entry.relativePath, tempPath: entry.tempPath })) };
			repository.commits.updateJournalState(journalId, "applied", null);
			// 4. 原子替换
			await this.files.finalize({ projectRoot: root, staged });
			// 5. history + changeset committed
			const afterHashes: Record<string, string> = {};
			const beforeHashes: Record<string, string> = {};
			for (const entry of applied) {
				afterHashes[entry.relativePath] = entry.afterHash;
				if (entry.beforeHash !== null) beforeHashes[entry.relativePath] = entry.beforeHash;
			}
			const commit: CommitRecord = {
				commitId: this.id.id(),
				projectId,
				changeSetId,
				actor,
				summary: changeSet.title,
				affectedFiles: applied.map((entry) => entry.relativePath),
				beforeHashes,
				afterHashes,
				resolvedIssueCount: 0,
				createdAt: now,
			};
			repository.commits.record(commit);
			const committed: ChangeSet = { ...committing, status: "committed", committedAt: now, updatedAt: now };
			repository.changesets.update(committed);
			repository.commits.updateJournalState(journalId, "committed", now);
			// 6. 派生失效（memory/ledgers 重建）
			await this.engine.invalidateDerived((await this.roots(projectId)).workspaceRoot, projectId);
			if (idempotencyKey !== undefined && idempotencyKey.length > 0) {
				this.idempotency.storeResult("commit:" + projectId + ":" + idempotencyKey, { commitId: commit.commitId });
			}
			return { changeSet: committed, commit };
		} catch (error) {
			// 失败：rollback temp + journal rolled-back + changeset failed
			try {
				const pending = repository.commits.pendingJournals(projectId).find((entry) => entry.journalId === journalId);
				if (pending !== undefined) {
					await this.files.rollback({ projectRoot: root, staged: pending.files.map((entry) => ({ relativePath: entry.relativePath, tempPath: entry.tempPath, beforeHash: null, afterHash: "" })) });
					repository.commits.updateJournalState(journalId, "rolled-back", this.clock.now());
				}
			} catch {}
			const failed: ChangeSet = { ...committing, status: "failed", updatedAt: this.clock.now() };
			repository.changesets.update(failed);
			throw error;
		}
	}

	// 启动/提交前恢复：残留 pending journal → 文件已落盘则完成，否则回滚（不允许 silent partial commit）。
	async recoverPendingCommits(projectId: string): Promise<number> {
		const root = await this.projectRoot(projectId);
		const repository = this.registry.open(projectId, root);
		const pending = repository.commits.pendingJournals(projectId);
		for (const journal of pending) {
			if (journal.state === "applied") {
				// 文件已原子替换 → 完成
				repository.commits.updateJournalState(journal.journalId, "committed", this.clock.now());
			} else {
				// pending（temp 未落盘）→ 回滚 temp
				await this.files.rollback({ projectRoot: root, staged: journal.files.map((entry) => ({ relativePath: entry.relativePath, tempPath: entry.tempPath, beforeHash: null, afterHash: "" })) });
				repository.commits.updateJournalState(journal.journalId, "rolled-back", this.clock.now());
			}
		}
		return pending.length;
	}
}