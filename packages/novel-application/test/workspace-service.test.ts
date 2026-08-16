import type { ProjectRecord, ProjectScanResult, WorkspaceManifest } from "@earendil-works/pi-novel-contracts";
import { describe, expect, it } from "vitest";
import {
	type ProjectScannerPort,
	type WorkspaceFileSystemPort,
	type WorkspaceRepository,
	WorkspaceService,
	type WorkspaceServiceDependencies,
} from "../src/index.ts";

const project: ProjectRecord = {
	projectId: "native-story",
	title: "Native Story",
	rootPath: "D:/Novel/native-story",
	kind: "native",
	status: "ready",
	wordCount: 0,
	lastModifiedAt: "2026-08-16T00:00:00.000Z",
	manifest: {
		schemaVersion: 1,
		projectId: "native-story",
		title: "Native Story",
		language: "zh-CN",
		createdAt: null,
		updatedAt: null,
	},
};

class FakeFileSystem implements WorkspaceFileSystemPort {
	readonly paths;
	private readonly manifests: Map<string, WorkspaceManifest>;

	constructor(root: string, manifests: Map<string, WorkspaceManifest>) {
		this.paths = {
			root,
			controlDirectory: `${root}/.pi-novel`,
			manifest: `${root}/.pi-novel/workspace.json`,
			database: `${root}/.pi-novel/workspace.sqlite`,
		};
		this.manifests = manifests;
	}

	async ensureWorkspaceDirectory(): Promise<void> {}

	async readManifest(): Promise<WorkspaceManifest | null> {
		return this.manifests.get(this.paths.root) ?? null;
	}

	async writeManifest(manifest: WorkspaceManifest): Promise<void> {
		this.manifests.set(this.paths.root, manifest);
	}
}

class FakeRepository implements WorkspaceRepository {
	private workspace: { manifest: WorkspaceManifest; lastScanAt: string | null } | null = null;
	private projects: ProjectRecord[] = [];

	readWorkspace() {
		return this.workspace;
	}

	upsertWorkspace(manifest: WorkspaceManifest, lastScanAt: string | null): void {
		this.workspace = { manifest, lastScanAt };
	}

	replaceProjects(projects: ProjectRecord[]): void {
		this.projects = [...projects];
	}

	listProjects(): ProjectRecord[] {
		return [...this.projects];
	}

	close(): void {}
}

class FakeScanner implements ProjectScannerPort {
	readonly result: ProjectScanResult = { projects: [project], warnings: [] };
	callCount = 0;

	async scan(): Promise<ProjectScanResult> {
		this.callCount += 1;
		return this.result;
	}
}

function createService(): { service: WorkspaceService; scanner: FakeScanner } {
	const manifests = new Map<string, WorkspaceManifest>();
	const repositories = new Map<string, FakeRepository>();
	const scanner = new FakeScanner();
	const dependencies: WorkspaceServiceDependencies = {
		createFileSystem: (root) => new FakeFileSystem(root, manifests),
		createRepository: (databasePath) => {
			const repository = repositories.get(databasePath) ?? new FakeRepository();
			repositories.set(databasePath, repository);
			return repository;
		},
		scanner,
	};
	return { service: new WorkspaceService(dependencies), scanner };
}

describe("WorkspaceService ports", () => {
	it("initializes idempotently through fake ports", async () => {
		const { service, scanner } = createService();
		const first = await service.initialize("D:/Novel");
		const second = await service.initialize("D:/Novel");

		expect(second.manifest.workspaceId).toBe(first.manifest.workspaceId);
		expect(second.projects).toEqual([project]);
		expect(scanner.callCount).toBe(2);
	});

	it("keeps scanner warnings separate from persisted projects", async () => {
		const { service, scanner } = createService();
		scanner.result.warnings.push({ code: "INVALID_MANIFEST", rootPath: "D:/Novel/broken", message: "broken" });

		const overview = await service.initialize("D:/Novel");

		expect(overview.projects).toEqual([project]);
		expect(overview.warnings).toHaveLength(1);
	});
});
