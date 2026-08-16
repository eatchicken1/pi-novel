import type {
	ConfigureModelApiKeyInput,
	DirectionCandidate,
	ForgeArtifact,
	ForgeSession,
	ForgeTask,
	MaterializeForgeInput,
	ModelCatalog,
	ProjectRecord,
	ProjectScanResult,
	StoryDirectionComparison,
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
	generateText(workspaceRoot: string, modelId: string, prompt: string, signal?: AbortSignal): Promise<string>;
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
	modelId: string;
	count: number;
	previousCandidates: DirectionCandidate[];
}

export interface StoryExplorationPort {
	generateDirections(
		input: StoryExplorationInput,
		signal?: AbortSignal,
	): Promise<{
		candidates: DirectionCandidate[];
		comparison: StoryDirectionComparison;
	}>;
	critiqueDirection(
		input: {
			workspaceRoot: string;
			modelId: string;
			seed: string;
			candidate: DirectionCandidate;
			instruction: string;
		},
		signal?: AbortSignal,
	): Promise<string>;
}

export interface ProjectMaterializationPort {
	materialize(input: {
		workspaceRoot: string;
		session: ForgeSession;
		candidate: DirectionCandidate;
		request: MaterializeForgeInput;
	}): Promise<{ projectId: string; projectRoot: string }>;
}

export interface WorkspaceServiceDependencies {
	createFileSystem(rootPath: string): WorkspaceFileSystemPort;
	createRepository(databasePath: string): WorkspaceRepository;
	scanner: ProjectScannerPort;
	createForgeRepository?: (databasePath: string) => ForgePersistencePort;
}
