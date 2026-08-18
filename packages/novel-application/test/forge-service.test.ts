import type {
	AgentRuntimeProfile,
	DirectionCandidate,
	ForgeArtifact,
	ForgeSession,
	ForgeTask,
	ModelCatalog,
	ProjectScanResult,
	TaskEvent,
	WorkspaceManifest,
} from "@earendil-works/pi-novel-contracts";
import { describe, expect, it } from "vitest";
import {
	AgentRuntimeService,
	type ForgeArtifactPort,
	type ForgePersistencePort,
	ForgeService,
	type MaterializationJournalEntry,
	type MaterializationJournalPort,
	type ModelRuntimePort,
	type ProjectMaterializationPort,
	type ProjectScannerPort,
	type RuntimeProfileStorePort,
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
		const runtime = new FakeRuntime();
		const agentRuntime = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Forge",
			runtime,
		});
		await agentRuntime.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
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
			runtime: agentRuntime,
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
		const task = await service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(repository, task.taskId);
		expect(service.getSession(session.forgeSessionId).status).toBe("awaiting_selection");
		const artifacts = await service.getArtifacts(session.forgeSessionId);
		expect(artifacts.candidates).toHaveLength(3);
		expect(artifacts.generations.map((entry) => entry.generation)).toEqual([1]);
		// candidate artifactId must resolve to a real artifact
		for (const candidate of artifacts.candidates) {
			expect(artifacts.artifacts.some((artifact) => artifact.artifactId === candidate.artifactId)).toBe(true);
		}
		await service.select(session.forgeSessionId, { candidateId: "direction-1" });
		expect(service.getSession(session.forgeSessionId).status).toBe("awaiting_selection");
		// selection artifact recorded
		const selectionArtifacts = (await service.getArtifacts(session.forgeSessionId)).artifacts.filter(
			(artifact) => artifact.kind === "selection",
		);
		expect(selectionArtifacts).toHaveLength(1);
		await service.commit(session.forgeSessionId, { authorNote: "作者确认这个方向" });
		expect(service.getSession(session.forgeSessionId).status).toBe("committed");
		expect(materialized).toBe(false);
		await service.materialize(session.forgeSessionId, { title: "雾港", folderName: "fog-harbor" });
		expect(materialized).toBe(true);
		expect(service.getSession(session.forgeSessionId).status).toBe("materialized");
	});

	it("regeneration appends an immutable generation and reuses the explorer profile", async () => {
		const repository = new FakeForgeRepository();
		const workspace = new WorkspaceService(createDependencies(repository));
		await workspace.initialize("D:/Forge");
		const artifactStore = new MemoryArtifactStore();
		const runtime = new FakeRuntime();
		const agentRuntime = new AgentRuntimeService({
			storeFor: () => runtime.profileStore,
			rootFor: () => "D:/Forge",
			runtime,
		});
		await agentRuntime.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const service = new ForgeService({
			workspace,
			exploration: new FakeExploration(),
			artifactStoreFor: () => artifactStore,
			materializer: {
				materialize: async () => ({ projectId: "native-2", projectRoot: "D:/Forge/native-2" }),
			},
			runtime: agentRuntime,
		});
		const session = service.createSession({
			seed: "雨夜的档案室",
			narrativeDNA: {
				genre: "悬疑",
				narrativeScale: "中长篇",
				coreExperience: "档案",
				pacing: "持续升级",
				pov: "限制视角",
				endingTone: "余韵明确",
				readerPromise: "真相与关系同时推进",
			},
		});
		const first = await service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(repository, first.taskId);
		const second = await service.startRegeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(repository, second.taskId);
		const artifacts = await service.getArtifacts(session.forgeSessionId);
		expect(artifacts.generations.map((entry) => entry.generation)).toEqual([1, 2]);
		const firstGeneration = await artifactStore.readJson(
			session.forgeSessionId,
			"artifacts/generations/001/generation.json",
		);
		const secondGeneration = await artifactStore.readJson(
			session.forgeSessionId,
			"artifacts/generations/002/generation.json",
		);
		expect(firstGeneration).not.toBeNull();
		expect(secondGeneration).not.toBeNull();
		expect((firstGeneration as { candidates: DirectionCandidate[] }).candidates[0]?.generation).toBe(1);
		expect((secondGeneration as { candidates: DirectionCandidate[] }).candidates[0]?.generation).toBe(2);
		// first generation remains auditable
		expect(
			artifacts.artifacts.some((artifact) => artifact.relativePath === "artifacts/generations/001/generation.json"),
		).toBe(true);
	});
});

async function waitForTask(repository: FakeForgeRepository, taskId: string): Promise<void> {
	for (let attempt = 0; attempt < 40; attempt += 1) {
		if (repository.getTask(taskId)?.status === "succeeded") return;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error("Forge task did not finish");
}

class FakeExploration implements StoryExplorationPort {
	async generateDirections(): Promise<{
		candidates: DirectionCandidate[];
		comparison: null;
	}> {
		return {
			candidates: [
				createCandidate("direction-1", "港口互助会"),
				createCandidate("direction-2", "潮汐档案"),
				createCandidate("direction-3", "失踪者的录音"),
			],
			comparison: null,
		};
	}
	async critiqueDirection(): Promise<string> {
		return "批评结果";
	}
	async compareDirections(): Promise<{
		dimensions: [];
		recommendedCandidateIds: string[];
		notes: string[];
		createdAt: string;
	}> {
		return {
			dimensions: [],
			recommendedCandidateIds: ["direction-1"],
			notes: ["比较完成"],
			createdAt: "2026-08-16T10:00:00.000Z",
		};
	}
}

class FakeRuntime implements ModelRuntimePort {
	readonly profileStore: RuntimeProfileStorePort = new InMemoryProfileStore();
	async getCatalog(): Promise<ModelCatalog> {
		return {
			providers: [
				{
					providerId: "openai",
					name: "OpenAI",
					authLabel: "API Key",
					authMethods: ["api_key"],
					isSubscription: false,
					status: "connected",
					apiKeyConfigured: true,
					models: [
						{
							providerId: "openai",
							modelId: "gpt-4o",
							name: "GPT-4o",
							reasoning: false,
							thinkingLevels: ["off"],
							contextWindow: 128000,
							maxTokens: 4096,
							input: ["text"],
						},
					],
				},
			],
		};
	}
	async configureApiKey(): Promise<ModelCatalog> {
		return this.getCatalog();
	}
	async clearApiKey(): Promise<ModelCatalog> {
		return this.getCatalog();
	}
	async generateText(): Promise<string> {
		return "{}";
	}
}

class InMemoryProfileStore implements RuntimeProfileStorePort {
	private readonly profiles = new Map<string, AgentRuntimeProfile>();
	listProfiles(): AgentRuntimeProfile[] {
		return [...this.profiles.values()];
	}
	getProfile(agentId: string): AgentRuntimeProfile | null {
		return this.profiles.get(agentId) ?? null;
	}
	setProfile(profile: AgentRuntimeProfile): void {
		this.profiles.set(profile.agentId, profile);
	}
	close(): void {}
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
	readonly events = new Map<string, TaskEvent[]>();
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
	appendTaskEvent(event: TaskEvent): void {
		const events = this.events.get(event.taskId) ?? [];
		events.push(event);
		this.events.set(event.taskId, events);
	}
	listTaskEvents(taskId: string, afterSequence: number): TaskEvent[] {
		return (this.events.get(taskId) ?? []).filter((event) => event.sequence > afterSequence);
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
		databasePath: "D:/Forge/.pi-novel/workspace.sqlite",
		close: () => {},
	};
	const scanner: ProjectScannerPort = {
		scan: async (): Promise<ProjectScanResult> => ({ projects: [], warnings: [] }),
	};
	const journal = new FakeJournal();
	return {
		createFileSystem: (root) => new FakeFileSystem(root, manifests),
		createRepository: () => repository,
		createForgeRepository: () => forgeRepository,
		createMaterializationJournalRepository: () => journal,
		scanner,
	};
}

class FakeJournal implements MaterializationJournalPort {
	private readonly entries = new Map<string, MaterializationJournalEntry>();
	get(sessionId: string): MaterializationJournalEntry | null {
		return this.entries.get(sessionId) ?? null;
	}
	update(entry: MaterializationJournalEntry): void {
		this.entries.set(entry.forgeSessionId, entry);
	}
	close(): void {}
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
		artifactId: candidateId,
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
		constraintValidation: { status: "PASS", reasons: ["全部硬约束满足"] },
		createdAt: "2026-08-16T10:00:00.000Z",
	};
}
