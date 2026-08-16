import type {
	DirectionCandidate,
	ForgeArtifact,
	ForgeSession,
	ForgeTask,
	ProjectScanResult,
	WorkspaceManifest,
} from "@earendil-works/pi-novel-contracts";
import { describe, expect, it } from "vitest";
import {
	type ForgeArtifactPort,
	type ForgePersistencePort,
	ForgeService,
	type ProjectMaterializationPort,
	type ProjectScannerPort,
	type StoryExplorationPort,
	type WorkspaceFileSystemPort,
	type WorkspaceRepository,
	WorkspaceService,
	type WorkspaceServiceDependencies,
} from "../src/index.ts";

describe("ForgeService authoring boundary", () => {
	it("keeps selection separate from author commit and materialization", async () => {
		const repository = new FakeForgeRepository();
		const workspace = new WorkspaceService(createDependencies(repository));
		await workspace.initialize("D:/Forge");
		const artifactStore = new MemoryArtifactStore();
		let materialized = false;
		const service = new ForgeService({
			workspace,
			exploration: new FakeExploration(),
			artifactStoreFor: () => artifactStore,
			materializer: {
				materialize: async () => {
					materialized = true;
					return { projectId: "native-1", projectRoot: "D:/Forge/native-1" };
				},
			} satisfies ProjectMaterializationPort,
		});
		const session = service.createSession({
			seed: "封闭海岛上的失踪案",
			narrativeDNA: {
				genre: "悬疑",
				narrativeScale: "中长篇",
				coreExperience: "真相",
				pacing: "持续升级",
				pov: "限制视角",
				endingTone: "余韵明确",
				readerPromise: "真相与关系同时推进",
			},
		});
		const task = service.startDirectionGeneration(session.forgeSessionId, { modelId: "fake/model", count: 3 });
		await waitForTask(repository, task.taskId);
		expect(service.getSession(session.forgeSessionId).status).toBe("awaiting_selection");
		await service.select(session.forgeSessionId, { candidateId: "direction-1" });
		expect(service.getSession(session.forgeSessionId).status).toBe("awaiting_selection");
		await service.commit(session.forgeSessionId, { authorNote: "作者确认这个方向" });
		expect(service.getSession(session.forgeSessionId).status).toBe("committed");
		expect(materialized).toBe(false);
		await service.materialize(session.forgeSessionId, { title: "雾港", folderName: "fog-harbor" });
		expect(materialized).toBe(true);
		expect(service.getSession(session.forgeSessionId).status).toBe("materialized");
	});
});

async function waitForTask(repository: FakeForgeRepository, taskId: string): Promise<void> {
	for (let attempt = 0; attempt < 20; attempt += 1) {
		if (repository.getTask(taskId)?.status === "succeeded") return;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error("Forge task did not finish");
}

class FakeExploration implements StoryExplorationPort {
	async generateDirections(): Promise<{
		candidates: DirectionCandidate[];
		comparison: { dimensions: []; recommendedCandidateIds: string[]; notes: string[]; createdAt: string };
	}> {
		return {
			candidates: [
				createCandidate("direction-1", "港口互助会"),
				createCandidate("direction-2", "潮汐档案"),
				createCandidate("direction-3", "失踪者的录音"),
			],
			comparison: {
				dimensions: [],
				recommendedCandidateIds: ["direction-1"],
				notes: ["比较完成"],
				createdAt: "2026-08-16T10:00:00.000Z",
			},
		};
	}
	async critiqueDirection(): Promise<string> {
		return "批评结果";
	}
}

class MemoryArtifactStore implements ForgeArtifactPort {
	private readonly values = new Map<string, unknown>();
	async writeJson(sessionId: string, relativePath: string, value: unknown): Promise<void> {
		this.values.set(`${sessionId}/${relativePath}`, value);
	}
	async readJson(sessionId: string, relativePath: string): Promise<unknown | null> {
		return this.values.get(`${sessionId}/${relativePath}`) ?? null;
	}
}

class FakeForgeRepository implements ForgePersistencePort {
	readonly sessions = new Map<string, ForgeSession>();
	readonly tasks = new Map<string, ForgeTask>();
	readonly artifacts = new Map<string, ForgeArtifact>();
	createSession(session: ForgeSession): void {
		this.sessions.set(session.forgeSessionId, session);
	}
	getSession(sessionId: string): ForgeSession | null {
		return this.sessions.get(sessionId) ?? null;
	}
	updateSession(session: ForgeSession): void {
		this.sessions.set(session.forgeSessionId, session);
	}
	listArtifacts(sessionId: string): ForgeArtifact[] {
		return [...this.artifacts.values()].filter((artifact) => artifact.forgeSessionId === sessionId);
	}
	addArtifact(artifact: ForgeArtifact): void {
		this.artifacts.set(artifact.artifactId, artifact);
	}
	createTask(task: ForgeTask): void {
		this.tasks.set(task.taskId, task);
	}
	getTask(taskId: string): ForgeTask | null {
		return this.tasks.get(taskId) ?? null;
	}
	updateTask(task: ForgeTask): void {
		this.tasks.set(task.taskId, task);
	}
	close(): void {}
}

function createDependencies(forgeRepository: FakeForgeRepository): WorkspaceServiceDependencies {
	const manifests = new Map<string, WorkspaceManifest>();
	const repository: WorkspaceRepository = {
		readWorkspace: () => null,
		upsertWorkspace: () => {},
		replaceProjects: () => {},
		listProjects: () => [],
		close: () => {},
	};
	const scanner: ProjectScannerPort = {
		scan: async (): Promise<ProjectScanResult> => ({ projects: [], warnings: [] }),
	};
	return {
		createFileSystem: (root) => new FakeFileSystem(root, manifests),
		createRepository: () => repository,
		createForgeRepository: () => forgeRepository,
		scanner,
	};
}

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

function createCandidate(candidateId: string, mystery: string): DirectionCandidate {
	return {
		candidateId,
		artifactId: `${candidateId}-artifact`,
		generation: 1,
		status: "proposed",
		title: mystery,
		logline: `${mystery}引发一场关系与真相的冲突。`,
		corePremise: mystery,
		centralMystery: mystery,
		socialMechanism: `${mystery}背后的制度`,
		characterEngine: "追查者与被追查者互相依赖",
		relationshipFaultLine: `${mystery}撕裂关系`,
		centralDilemma: "公开真相或保护关系",
		readerPromise: "真相与关系同时推进",
		endingShape: "公开真相",
		climaxIdea: "在公开场合核对证词",
		majorRisks: ["风险"],
		distinctiveFeatures: [mystery],
		createdAt: "2026-08-16T10:00:00.000Z",
	};
}
