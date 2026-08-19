import type {
	AgentRuntimeProfile,
	ChapterDraft,
	ChapterSettlement,
	ChapterWorkflowPhase,
	CommitRecord,
	ConfigureModelApiKeyInput,
	CreateChapterInput,
	DirectionCandidate,
	FinalizeChapterInput,
	ForgeArtifact,
	ForgeSession,
	ForgeTask,
	MaterializeForgeInput,
	ModelCatalog,
	ProjectCapabilities,
	ProjectRecord,
	ProjectScanResult,
	ReconcileInput,
	ReconcileReport,
	RuntimeInvocation,
	SaveDraftInput,
	StoryDirectionComparison,
	TaskEvent,
	WorkspaceManifest,
} from "@earendil-works/pi-novel-contracts";

export interface WorkspacePathSet {
	root: string;
	controlDirectory: string;
	manifest: string;
	database: string;
}

export interface WorkspaceFileSystemPort {
	readonly paths: WorkspacePathSet;

	ensureWorkspaceDirectory(): Promise<void>;
	readManifest(): Promise<WorkspaceManifest | null>;
	writeManifest(manifest: WorkspaceManifest): Promise<void>;
}

export interface WorkspaceStoredState {
	manifest: WorkspaceManifest;
	lastScanAt: string | null;
}

export interface WorkspaceRepository {
	readonly databasePath: string;
	readWorkspace(): WorkspaceStoredState | null;
	upsertWorkspace(manifest: WorkspaceManifest, lastScanAt: string | null): void;
	replaceProjects(projects: ProjectRecord[]): void;
	listProjects(): ProjectRecord[];
	close(): void;
}

export interface ProjectScannerPort {
	scan(rootPath: string): Promise<ProjectScanResult>;
}

export interface ModelRuntimePort {
	getCatalog(workspaceRoot?: string): Promise<ModelCatalog>;
	configureApiKey(workspaceRoot: string, input: ConfigureModelApiKeyInput): Promise<ModelCatalog>;
	clearApiKey(workspaceRoot: string, providerId: string): Promise<ModelCatalog>;
	generateText(
		workspaceRoot: string,
		invocation: RuntimeInvocation,
		prompt: string,
		signal?: AbortSignal,
	): Promise<string>;
}

// AgentRuntimeProfile 的持久化存储（workspace.sqlite）。
export interface RuntimeProfileStorePort {
	listProfiles(): AgentRuntimeProfile[];
	getProfile(agentId: string): AgentRuntimeProfile | null;
	setProfile(profile: AgentRuntimeProfile): void;
	close(): void;
}

// Materialization Journal：项目创建链的可恢复记录（PREPARING → FILES_READY →
// RENAMED → REGISTERED → COMPLETED；失败进入 RECOVERY_REQUIRED）。
export type MaterializationJournalStatus =
	| "PREPARING"
	| "FILES_READY"
	| "RENAMED"
	| "REGISTERED"
	| "COMPLETED"
	| "RECOVERY_REQUIRED";

export interface MaterializationJournalEntry {
	forgeSessionId: string;
	status: MaterializationJournalStatus;
	projectId: string | null;
	targetFolder: string;
	stagingPath: string | null;
	attempts: number;
	errorMessage: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface MaterializationJournalPort {
	get(sessionId: string): MaterializationJournalEntry | null;
	update(entry: MaterializationJournalEntry): void;
	close(): void;
}

export interface ForgePersistencePort {
	close(): void;
	createSession(session: ForgeSession): void;
	getSession(sessionId: string): ForgeSession | null;
	updateSession(session: ForgeSession): void;
	listArtifacts(sessionId: string): ForgeArtifact[];
	addArtifact(artifact: ForgeArtifact): void;
	createTask(task: ForgeTask): void;
	getTask(taskId: string): ForgeTask | null;
	updateTask(task: ForgeTask): void;
	appendTaskEvent(event: TaskEvent): void;
	listTaskEvents(taskId: string, afterSequence: number): TaskEvent[];
}

export interface ForgeArtifactPort {
	writeJson(sessionId: string, relativePath: string, value: unknown): Promise<void>;
	readJson(sessionId: string, relativePath: string): Promise<unknown | null>;
}

export interface StoryExplorationInput {
	workspaceRoot: string;
	forgeSessionId: string;
	seed: string;
	narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
	hardConstraints: ForgeSession["hardConstraints"];
	preferences: ForgeSession["preferences"];
	// Runtime invocation resolved from the owning AgentRuntimeProfile
	// (forge.explorer for generation). Business callers never pick models.
	invocation: RuntimeInvocation;
	count: number;
	previousCandidates: DirectionCandidate[];
	repairHint?: string;
}

export interface StoryExplorationPort {
	generateDirections(
		input: StoryExplorationInput,
		signal?: AbortSignal,
	): Promise<{
		candidates: DirectionCandidate[];
		comparison: StoryDirectionComparison | null;
	}>;
	critiqueDirection(
		input: {
			workspaceRoot: string;
			invocation: RuntimeInvocation;
			seed: string;
			candidate: DirectionCandidate;
			instruction: string;
		},
		signal?: AbortSignal,
	): Promise<string>;
	compareDirections(
		input: {
			workspaceRoot: string;
			invocation: RuntimeInvocation;
			seed: string;
			narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
			hardConstraints: ForgeSession["hardConstraints"];
			preferences: ForgeSession["preferences"];
			candidates: DirectionCandidate[];
		},
		signal?: AbortSignal,
	): Promise<StoryDirectionComparison>;
}

export interface ProjectMaterializationPort {
	materialize(input: {
		workspaceRoot: string;
		session: ForgeSession;
		candidate: DirectionCandidate;
		request: MaterializeForgeInput;
		journal?: MaterializationJournalPort;
	}): Promise<{ projectId: string; projectRoot: string }>;
}

// ==== Product Backend Ports（阶段 3+：read models / ChangeSet / Review / History / Graph / Task）====

export interface ClockPort {
	now(): string;
}

export interface IdGeneratorPort {
	id(): string;
}

// Novel Engine 对外只暴露 read/analyze 意图；写操作一律走 ChangeSet → Commit。
export interface NovelEngineStatus {
	nextChapter: number | null;
	finalizedChapters: number[];
	memoryStatus: "missing" | "current" | "stale" | null;
	continuityStatus: "ok" | "warning" | "error" | null;
	openThreads: number | null;
	overdueThreads: number | null;
	unresolvedSetups: number | null;
	downstreamReviewRequired: boolean | null;
	currentMovement: string | null;
}

export interface ChapterSummaryView {
	chapter: number;
	title: string | null;
	wordCount: number;
	contentHash: string;
	revision: number;
	finalized: boolean;
	updatedAt: string;
}

export interface ChapterDocumentView {
	projectId: string;
	chapter: number;
	title: string | null;
	text: string;
	contentHash: string;
	revision: number;
	updatedAt: string;
}

export interface RevisionImpactInput {
	changedChapter?: number;
	changedEventIds?: number[];
	knowledgeChanges?: Array<{ characterId: string; factRef: string; from: string; to: string }>;
	truthChanges?: string[];
}

export interface ReviewIssueSource {
	sourceCode: string;
	severity: "error" | "warning" | "info";
	priority: "P0" | "P1" | "P2" | "P3" | "P4" | null;
	scope: "scene" | "chapter" | "future-chapter" | "movement" | "story-design" | "manuscript";
	repairScope: "prose" | "scene-plan" | "chapter-plan" | "event-graph" | "architecture" | "foundation" | "manuscript";
	blockingForCurrentAction: boolean;
	chapter: number | null;
	scene: string | null;
	landingChapter: number | null;
	message: string;
	evidence: string | null;
}

export interface StoryGraphSourceEvent {
	eventId: number;
	chapter: number;
	action: string;
	causes: number[];
	characterRefs: string[];
	clueRefs: string[];
	claimRefs: string[];
	professionalActionRefs: string[];
	marriageRefs: string[];
	irreversible: boolean;
}

export interface StoryGraphSources {
	events: StoryGraphSourceEvent[];
	characters: Array<{ characterId: string; label: string | null }>;
	clues: Array<{ clueId: string; label: string | null; chapter: number | null }>;
	claims: Array<{ claimId: string; label: string | null; revealChapter: number | null }>;
	promises: Array<{ promiseId: string; label: string | null }>;
	sourceHash: string;
}

export interface NovelEnginePort {
	getCapabilities(workspaceRoot: string, projectId: string): Promise<ProjectCapabilities | null>;
	getStatus(workspaceRoot: string, projectId: string): Promise<NovelEngineStatus | null>;
	listChapters(workspaceRoot: string, projectId: string, kind: "native" | "legacy"): Promise<ChapterSummaryView[]>;
	readChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
	): Promise<ChapterDocumentView | null>;
	analyzeRevisionImpact(
		workspaceRoot: string,
		projectId: string,
		input: RevisionImpactInput,
	): Promise<{
		severity: "safe-local" | "downstream-review" | "structural-revision" | "authority-change";
		affectedChapters: number[];
		affectedCharacters: string[];
		affectedThreads: string[];
		affectedClues: string[];
		affectedPromises: string[];
		summary: string;
		analyzedAt: string;
	} | null>;
	reviewSources(workspaceRoot: string, projectId: string): Promise<ReviewIssueSource[]>;
	storyGraphSources(workspaceRoot: string, projectId: string): Promise<StoryGraphSources | null>;
	// commit 后派生失效：legacy engine 重建 derived state（memory/ledgers/review）。
	invalidateDerived(workspaceRoot: string, projectId: string): Promise<void>;
}

// 章节写入能力独立于 NovelEnginePort：普通读取/分析不会意外触发正文或长期记忆写入。
export interface ChapterAuthoringPort {
	createChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		input: CreateChapterInput,
	): Promise<ChapterDocumentView>;
	saveDraft(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: SaveDraftInput,
	): Promise<ChapterDraft>;
	readDraft(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
	): Promise<ChapterDraft | null>;
	reconcileChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: ReconcileInput,
	): Promise<ReconcileReport>;
	finalizeChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: FinalizeChapterInput,
		settlement: ChapterSettlement,
	): Promise<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }>;
}

export interface ChapterWorkflowReadiness {
	canFinalize: boolean;
	blockingCount: number;
	majorLocalCount: number;
}

export interface ProjectDatabaseHandle {
	changesets: ChangeSetRepositoryPort;
	commits: CommitRepositoryPort;
	review: ReviewRepositoryPort;
	graph: StoryGraphRepositoryPort;
	chapterWorkflow: ChapterWorkflowRepositoryPort;
	chapterMetadata: ChapterMetadataRepositoryPort;
}

export interface ChapterMetadata {
	projectId: string;
	chapter: number;
	orderIndex: number;
	title: string;
	filePath: string;
	draftRevision: number;
	contentHash: string;
	mtime: string;
	workflowStatus: "draft" | "finalized";
	createdAt: string;
	updatedAt: string;
}

export interface ChapterMetadataRepositoryPort {
	list(projectId: string): ChapterMetadata[];
	get(projectId: string, chapter: number): ChapterMetadata | null;
	create(metadata: ChapterMetadata): void;
	update(metadata: ChapterMetadata): void;
}

export interface ChapterWorkflowRecord {
	projectId: string;
	chapter: number;
	phase: ChapterWorkflowPhase;
	reconcile: ReconcileReport | null;
	settlement: ChapterSettlement | null;
	updatedAt: string;
}

export interface ChapterWorkflowRepositoryPort {
	get(projectId: string, chapter: number): ChapterWorkflowRecord | null;
	upsert(record: ChapterWorkflowRecord): void;
}

export interface ProjectDatabaseRegistryPort {
	open(projectId: string, projectRoot: string): ProjectDatabaseHandle;
	close(projectId: string): void;
	closeAll(): void;
}

export interface ChangeSetRepositoryPort {
	create(changeSet: import("@earendil-works/pi-novel-contracts").ChangeSet): void;
	update(changeSet: import("@earendil-works/pi-novel-contracts").ChangeSet): void;
	get(changeSetId: string): import("@earendil-works/pi-novel-contracts").ChangeSet | null;
	listByProject(projectId: string): import("@earendil-works/pi-novel-contracts").ChangeSet[];
	listPending(projectId: string): import("@earendil-works/pi-novel-contracts").ChangeSet[];
}

export interface CommitJournalFile {
	relativePath: string;
	tempPath: string;
	beforeHash?: string | null;
	afterHash?: string;
	backupPath?: string | null;
}

export interface CommitJournalCommit {
	commitId: string;
	actor: CommitRecord["actor"];
	summary: string;
	createdAt: string;
	resolvedIssueCount?: number;
}

export interface CommitJournalEntry {
	journalId: string;
	projectId: string;
	changeSetId: string;
	state: "pending" | "applied" | "committed" | "rolled-back";
	files: CommitJournalFile[];
	dbActions: string[];
	startedAt: string;
	completedAt: string | null;
	commit?: CommitJournalCommit;
}

export interface CommitRepositoryPort {
	record(commit: import("@earendil-works/pi-novel-contracts").CommitRecord): void;
	list(projectId: string, limit?: number): import("@earendil-works/pi-novel-contracts").CommitRecord[];
	get(commitId: string): import("@earendil-works/pi-novel-contracts").CommitRecord | null;
	createCheckpoint(checkpoint: import("@earendil-works/pi-novel-contracts").ProjectCheckpoint): void;
	createJournal(journal: CommitJournalEntry): void;
	updateJournalFiles(journalId: string, files: CommitJournalEntry["files"]): void;
	updateJournalCommit(journalId: string, commit: CommitJournalCommit): void;
	updateJournalState(journalId: string, state: CommitJournalEntry["state"], completedAt: string | null): void;
	pendingJournals(projectId: string): CommitJournalEntry[];
}

export interface ReviewRepositoryPort {
	upsert(issue: import("@earendil-works/pi-novel-contracts").ReviewIssue): { created: boolean };
	list(
		projectId: string,
		filter?: { severity?: string; scope?: string; chapter?: number; status?: string },
	): import("@earendil-works/pi-novel-contracts").ReviewIssue[];
	updateStatus(
		issueId: string,
		status: import("@earendil-works/pi-novel-contracts").ReviewIssueStatus,
		resolvedAt: string | null,
	): void;
	markResolvedByDedupKeys(projectId: string, dedupKeys: string[], now: string): number;
	summary(projectId: string): import("@earendil-works/pi-novel-contracts").ReviewSummary;
}

export interface StoryGraphRepositoryPort {
	replaceAll(graph: import("@earendil-works/pi-novel-contracts").StoryGraph): void;
	query(
		projectId: string,
		filter: import("@earendil-works/pi-novel-contracts").StoryGraphQuery,
	): {
		nodes: import("@earendil-works/pi-novel-contracts").StoryNode[];
		edges: import("@earendil-works/pi-novel-contracts").StoryEdge[];
	};
	counts(projectId: string): { nodes: number; edges: number };
}

export interface TaskRepositoryPort {
	createTask(task: import("@earendil-works/pi-novel-contracts").NovelTask): void;
	updateTask(task: import("@earendil-works/pi-novel-contracts").NovelTask): void;
	getTask(taskId: string): import("@earendil-works/pi-novel-contracts").NovelTask | null;
	listTasks(filter?: {
		projectId?: string;
		status?: string;
		limit?: number;
	}): import("@earendil-works/pi-novel-contracts").NovelTask[];
	appendEvent(event: import("@earendil-works/pi-novel-contracts").TaskEvent): void;
	listEvents(taskId: string, afterSequence?: number): import("@earendil-works/pi-novel-contracts").TaskEvent[];
	maxSequence(taskId: string): number;
	createAgentRun(run: import("@earendil-works/pi-novel-contracts").AgentRun): void;
	updateAgentRun(run: import("@earendil-works/pi-novel-contracts").AgentRun): void;
	getAgentRun(agentRunId: string): import("@earendil-works/pi-novel-contracts").AgentRun | null;
}

export interface StagedFileChange {
	relativePath: string;
	tempPath: string;
	beforeHash: string | null;
	afterHash: string;
	backupPath?: string | null;
}

export interface AppliedChange {
	relativePath: string;
	beforeHash: string | null;
	afterHash: string;
}

// FileTransactionPort：ChangeSet 应用与原子落盘（temp → validate → atomic replace），
// base hash 不符抛 CHANGESET_BASE_STALE。
export interface FileTransactionPort {
	applyOperations(input: {
		projectRoot: string;
		operations: import("@earendil-works/pi-novel-contracts").ChangeOperation[];
		baseHashes: Record<string, string>;
	}): Promise<{ staged: StagedFileChange[]; applied: AppliedChange[] }>;
	finalize(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void>;
	rollback(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void>;
	cleanup(input: { projectRoot: string; staged: StagedFileChange[] }): Promise<void>;
	currentHashes(projectRoot: string, relativePaths: string[]): Promise<Record<string, string>>;
}

export interface IdempotencyPort {
	hasResult(key: string): boolean;
	storeResult(key: string, payload: unknown): void;
}

export interface AgentRuntimePort {
	startTask(input: {
		taskId: string;
		workspaceRoot: string;
		projectId: string | null;
		intent: string;
		modelId?: string;
		signal?: AbortSignal;
	}): Promise<void>;
	cancelTask(taskId: string): void;
	subscribe(
		taskId: string,
		listener: (event: import("@earendil-works/pi-novel-contracts").TaskEvent) => void,
	): () => void;
}

export interface WorkspaceServiceDependencies {
	createFileSystem(rootPath: string): WorkspaceFileSystemPort;
	createRepository(databasePath: string): WorkspaceRepository;
	scanner: ProjectScannerPort;
	createForgeRepository?: (databasePath: string) => ForgePersistencePort;
	createRuntimeProfileRepository?: (databasePath: string) => RuntimeProfileStorePort;
	createMaterializationJournalRepository?: (databasePath: string) => MaterializationJournalPort;
}
