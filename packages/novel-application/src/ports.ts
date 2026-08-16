import type {
	ModelCatalog,
	ProjectRecord,
	ProjectScanResult,
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
	getCatalog(): Promise<ModelCatalog>;
}

export interface WorkspaceServiceDependencies {
	createFileSystem(rootPath: string): WorkspaceFileSystemPort;
	createRepository(databasePath: string): WorkspaceRepository;
	scanner: ProjectScannerPort;
}
