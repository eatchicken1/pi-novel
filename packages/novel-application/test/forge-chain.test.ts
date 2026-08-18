import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
	AgentRuntimeProfile,
	DirectionCandidate,
	ForgeArtifact,
	ForgeSession,
	ForgeTask,
	ModelCatalog,
	RuntimeInvocation,
	StoryDirectionComparison,
	TaskEvent,
	WorkspaceManifest,
} from "@earendil-works/pi-novel-contracts";
import { ProjectMaterializer } from "@earendil-works/pi-novel-infrastructure";
import { afterEach, describe, expect, it } from "vitest";
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

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
	await Promise.all(cleanups.splice(0).map((fn) => fn()));
});

describe("Forge runtime chain", () => {
	it("generation uses the forge.explorer profile and comparison uses forge.comparator", async () => {
		const h = await createHarness();
		const exploration = h.exploration;
		await h.agent.setProfile("forge.explorer", { modelId: "openai/o3-mini", thinkingLevel: "high" });
		await h.agent.setProfile("forge.comparator", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const session = h.service.createSession({ seed: "档案室", narrativeDNA: h.dna() });
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		expect(exploration.lastGenerationInvocation).toEqual({
			agentId: "forge.explorer",
			modelId: "openai/o3-mini",
			thinkingLevel: "high",
		});
		const compareTask = await h.service.startComparison(session.forgeSessionId);
		await waitForTask(h.repository, compareTask.taskId);
		expect(exploration.lastCompareInvocation).toEqual({
			agentId: "forge.comparator",
			modelId: "openai/gpt-4o",
			thinkingLevel: "off",
		});
		const artifacts = await h.service.getArtifacts(session.forgeSessionId);
		expect(artifacts.comparison).not.toBeNull();
		expect(artifacts.comparison?.dimensions.length).toBeGreaterThan(0);
	});

	it("critique uses the forge.critic profile and writes a critique artifact", async () => {
		const h = await createHarness();
		await h.agent.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		await h.agent.setProfile("forge.critic", { modelId: "openai/o3-mini", thinkingLevel: "medium" });
		const session = h.service.createSession({ seed: "档案室", narrativeDNA: h.dna() });
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		const artifacts = await h.service.getArtifacts(session.forgeSessionId);
		const candidateId = artifacts.candidates[0]?.candidateId;
		expect(candidateId).toBeTruthy();
		const critiqueTask = await h.service.startCritique(session.forgeSessionId, {
			candidateId: candidateId as string,
			instruction: "指出套路",
		});
		await waitForTask(h.repository, critiqueTask.taskId);
		expect(h.exploration.lastCritiqueInvocation).toEqual({
			agentId: "forge.critic",
			modelId: "openai/o3-mini",
			thinkingLevel: "medium",
		});
		const after = await h.service.getArtifacts(session.forgeSessionId);
		expect(
			after.artifacts.some((artifact) => artifact.kind === "critique" && artifact.candidateId === candidateId),
		).toBe(true);
	});

	it("constraint gate: FAIL candidates fail the task after bounded retries", async () => {
		const h = await createHarness();
		h.exploration.mode = "constraint-fail";
		await h.agent.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const session = h.service.createSession({
			seed: "档案室",
			narrativeDNA: h.dna(),
			hardConstraints: [{ id: "h1", kind: "hard", text: "主角必须是女性" }],
		});
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		expect(h.repository.getTask(task.taskId)?.status).toBe("failed");
		expect(h.service.getSession(session.forgeSessionId).failureCode).toBe("FORGE_CONSTRAINT_GATE_FAILED");
		expect(h.service.getSession(session.forgeSessionId).status).toBe("failed");
		// bounded: exactly 2 attempts, no unbounded loop
		expect(h.exploration.generationCalls).toBe(2);
	});

	it("distinctiveness gate: not-distinct directions fail the task after bounded retries", async () => {
		const h = await createHarness();
		h.exploration.mode = "not-distinct";
		await h.agent.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const session = h.service.createSession({ seed: "档案室", narrativeDNA: h.dna() });
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		expect(h.repository.getTask(task.taskId)?.status).toBe("failed");
		expect(h.service.getSession(session.forgeSessionId).failureCode).toBe("FORGE_DIRECTIONS_NOT_DISTINCT");
		expect(h.exploration.generationCalls).toBe(2);
	});

	it("selection and commitment artifacts are recorded with the right confirmation", async () => {
		const h = await createHarness();
		await h.agent.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const session = h.service.createSession({ seed: "档案室", narrativeDNA: h.dna() });
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		const artifacts = await h.service.getArtifacts(session.forgeSessionId);
		const candidateId = artifacts.candidates[0]?.candidateId as string;
		await h.service.select(session.forgeSessionId, { candidateId });
		const afterSelect = await h.service.getArtifacts(session.forgeSessionId);
		const selectionArtifact = afterSelect.artifacts.find((artifact) => artifact.kind === "selection");
		expect(selectionArtifact).toBeTruthy();
		const selection = await h.artifactStore.readJson(
			session.forgeSessionId,
			(selectionArtifact as ForgeArtifact).relativePath,
		);
		expect(selection).toMatchObject({ candidateId, confirmation: "AUTHOR_SELECTED", previousSelection: null });
		await h.service.commit(session.forgeSessionId, { authorNote: "确认" });
		const afterCommit = await h.service.getArtifacts(session.forgeSessionId);
		const commitmentArtifact = afterCommit.artifacts.find((artifact) => artifact.kind === "commitment");
		expect(commitmentArtifact).toBeTruthy();
		const commitment = await h.artifactStore.readJson(
			session.forgeSessionId,
			(commitmentArtifact as ForgeArtifact).relativePath,
		);
		expect(commitment).toMatchObject({
			candidateId,
			confirmation: "USER_CONFIRMED",
			authorNote: "确认",
			confirmationScope: ["direction", "readerPromise", "hardConstraints"],
		});
	});

	it("materialization is idempotent: a second request does not create a second novel", async () => {
		const h = await createHarness();
		await h.agent.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const session = h.service.createSession({ seed: "档案室", narrativeDNA: h.dna(), titleCandidate: "雾港" });
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		await h.service.select(session.forgeSessionId, {
			candidateId: (await h.service.getArtifacts(session.forgeSessionId)).candidates[0]?.candidateId as string,
		});
		await h.service.commit(session.forgeSessionId, { authorNote: "确认" });
		const first = await h.service.materialize(session.forgeSessionId, { title: "雾港", folderName: "fog-harbor" });
		expect(first.status).toBe("materialized");
		expect(first.materializedProjectId).toBeTruthy();
		const journal = h.journal.get(session.forgeSessionId);
		expect(journal?.status).toBe("COMPLETED");
		let materializeCalls = 0;
		const service2 = new ForgeService({
			workspace: h.workspace,
			exploration: h.exploration,
			artifactStoreFor: () => h.artifactStore,
			materializer: {
				materialize: async () => {
					materializeCalls += 1;
					return { projectId: "second-novel", projectRoot: "D:/Forge/second" };
				},
			} satisfies ProjectMaterializationPort,
			runtime: h.agent,
		});
		const second = await service2.materialize(session.forgeSessionId, { title: "雾港", folderName: "fog-harbor" });
		expect(second.materializedProjectId).toBe(first.materializedProjectId);
		expect(materializeCalls).toBe(0);
	});
});

describe("Forge materialization recovery", () => {
	it("recoverMaterialization completes a session whose disk project exists but was never registered", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-recover-"));
		cleanups.push(() => rm(root, { recursive: true, force: true }));
		const h = await createHarness({ root, realMaterializer: true });
		await h.agent.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		const session = h.service.createSession({ seed: "档案室", narrativeDNA: h.dna(), titleCandidate: "雾港" });
		const task = await h.service.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(h.repository, task.taskId);
		const candidateId = (await h.service.getArtifacts(session.forgeSessionId)).candidates[0]?.candidateId as string;
		await h.service.select(session.forgeSessionId, { candidateId });
		await h.service.commit(session.forgeSessionId, { authorNote: "确认" });
		const first = await h.service.materialize(session.forgeSessionId, { title: "雾港", folderName: "fog-harbor" });
		expect(first.status).toBe("materialized");
		const projectId = first.materializedProjectId as string;
		// Simulate a crash between rename and registration: the disk project is
		// complete, the journal is rewound to RENAMED, the session is failed.
		const entry = h.journal.get(session.forgeSessionId) as MaterializationJournalEntry;
		h.journal.update({ ...entry, status: "RENAMED", updatedAt: new Date().toISOString() });
		h.repository.updateSession({
			...h.service.getSession(session.forgeSessionId),
			status: "failed",
			failureCode: "FORGE_MATERIALIZATION_RECOVERABLE",
			failureMessage: "simulated crash",
			updatedAt: new Date().toISOString(),
		});
		const recovered = await h.service.recoverMaterialization(session.forgeSessionId);
		expect(recovered.status).toBe("materialized");
		// same project, not a second novel
		expect(recovered.materializedProjectId).toBe(projectId);
		expect(h.journal.get(session.forgeSessionId)?.status).toBe("COMPLETED");
		// single source of truth: projection file exists, notes/story-commitment.json does not
		const projection = join(root, "fog-harbor", ".pi-novel", "projections", "story-commitment.json");
		const legacyNotes = join(root, "fog-harbor", "notes", "story-commitment.json");
		expect(await fileExists(projection)).toBe(true);
		expect(await fileExists(legacyNotes)).toBe(false);
	});
});

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function waitForTask(repository: FakeForgeRepository, taskId: string): Promise<void> {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		if (repository.getTask(taskId)?.status === "succeeded" || repository.getTask(taskId)?.status === "failed") return;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error("Forge task did not finish");
}

async function createHarness(options?: { root?: string; realMaterializer?: boolean }): Promise<{
	service: ForgeService;
	workspace: WorkspaceService;
	repository: FakeForgeRepository;
	artifactStore: MemoryArtifactStore;
	exploration: FakeExploration;
	agent: AgentRuntimeService;
	journal: FakeJournal;
	dna(): NonNullable<ForgeSession["narrativeDNA"]>;
}> {
	const root = options?.root ?? "D:/Forge";
	const repository = new FakeForgeRepository();
	const journal = new FakeJournal();
	const workspace = new WorkspaceService(createDependencies(repository, root, journal));
	await workspace.initialize(root);
	const artifactStore = new MemoryArtifactStore();
	const runtime = new FakeRuntime();
	const agent = new AgentRuntimeService({ storeFor: () => runtime.profileStore, rootFor: () => root, runtime });
	const exploration = new FakeExploration();
	const service = new ForgeService({
		workspace,
		exploration,
		artifactStoreFor: () => artifactStore,
		materializer: options?.realMaterializer
			? new ProjectMaterializer(journal)
			: {
					materialize: async () => ({ projectId: "native-1", projectRoot: `${root}/native-1` }),
				},
		runtime: agent,
	});
	return {
		service,
		workspace,
		repository,
		artifactStore,
		exploration,
		agent,
		journal,
		dna: () => ({
			genre: "悬疑",
			narrativeScale: "中长篇",
			coreExperience: "真相",
			pacing: "持续升级",
			pov: "限制视角",
			endingTone: "余韵明确",
			readerPromise: "真相与关系同时推进",
		}),
	};
}

class FakeExploration implements StoryExplorationPort {
	mode: "normal" | "constraint-fail" | "not-distinct" = "normal";
	generationCalls = 0;
	lastGenerationInvocation: RuntimeInvocation | null = null;
	lastCompareInvocation: RuntimeInvocation | null = null;
	lastCritiqueInvocation: RuntimeInvocation | null = null;

	async generateDirections(input: {
		invocation: RuntimeInvocation;
	}): Promise<{ candidates: DirectionCandidate[]; comparison: null }> {
		this.generationCalls += 1;
		this.lastGenerationInvocation = input.invocation;
		if (this.mode === "not-distinct")
			throw new ForgeAdapterErrorLike("FORGE_DIRECTIONS_NOT_DISTINCT", "directions too similar");
		if (this.mode === "constraint-fail") {
			return {
				candidates: [0, 1, 2].map((index) => createCandidate(`direction-c${index}`, { status: "FAIL" as const })),
				comparison: null,
			};
		}
		return {
			candidates: [0, 1, 2].map((index) => createCandidate(`direction-${index}`, { status: "PASS" as const })),
			comparison: null,
		};
	}
	async critiqueDirection(input: { invocation: RuntimeInvocation }): Promise<string> {
		this.lastCritiqueInvocation = input.invocation;
		return "批评";
	}
	async compareDirections(input: {
		invocation: RuntimeInvocation;
		candidates: DirectionCandidate[];
	}): Promise<StoryDirectionComparison> {
		this.lastCompareInvocation = input.invocation;
		return {
			dimensions: [
				{
					dimension: "Narrative Drive",
					assessment: "stronger",
					candidateIds: [input.candidates[0]?.candidateId as string],
					reason: "钩子最强",
				},
				{
					dimension: "Major Risk",
					assessment: "risk",
					candidateIds: [input.candidates[1]?.candidateId as string],
					reason: "依赖巧合",
				},
			],
			recommendedCandidateIds: [input.candidates[0]?.candidateId as string],
			notes: ["综合排序"],
			createdAt: "2026-08-16T10:00:00.000Z",
		};
	}
}

class ForgeAdapterErrorLike extends Error {
	readonly code: string;
	constructor(code: string, message: string) {
		super(message);
		this.name = "ForgeAdapterError";
		this.code = code;
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
						{
							providerId: "openai",
							modelId: "o3-mini",
							name: "O3 Mini",
							reasoning: true,
							thinkingLevels: ["off", "low", "medium", "high"],
							contextWindow: 200000,
							maxTokens: 8192,
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
		return [...this.profiles.values()].sort((left, right) => left.agentId.localeCompare(right.agentId));
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

function createDependencies(
	forgeRepository: FakeForgeRepository,
	root: string,
	journal: FakeJournal,
): WorkspaceServiceDependencies {
	const manifests = new Map<string, WorkspaceManifest>();
	const repository: WorkspaceRepository = {
		readWorkspace: () => null,
		upsertWorkspace: () => {},
		replaceProjects: () => {},
		listProjects: () => [],
		databasePath: `${root}/.pi-novel/workspace.sqlite`,
		close: () => {},
	};
	const scanner: ProjectScannerPort = {
		scan: async (): Promise<{ projects: []; warnings: [] }> => ({ projects: [], warnings: [] }),
	};
	return {
		createFileSystem: (r) => new FakeFileSystem(r, manifests),
		createRepository: () => repository,
		createForgeRepository: () => forgeRepository,
		createMaterializationJournalRepository: () => journal,
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

function createCandidate(candidateId: string, validation: { status: "PASS" | "FAIL" }): DirectionCandidate {
	return {
		candidateId,
		artifactId: candidateId,
		generation: 1,
		status: "proposed",
		title: `方向 ${candidateId}`,
		logline: "一条独立的方向。",
		corePremise: "独立前提",
		centralMystery: `谜团 ${candidateId}`,
		socialMechanism: "社会机制",
		characterEngine: "角色引擎",
		relationshipFaultLine: "关系断裂",
		centralDilemma: "两难",
		readerPromise: "承诺",
		endingShape: "结局",
		climaxIdea: "高潮",
		majorRisks: ["风险"],
		distinctiveFeatures: [`feature-${candidateId}`],
		constraintValidation: {
			status: validation.status,
			reasons: validation.status === "FAIL" ? ["违反了硬约束"] : ["满足"],
		},
		createdAt: "2026-08-16T10:00:00.000Z",
	};
}
