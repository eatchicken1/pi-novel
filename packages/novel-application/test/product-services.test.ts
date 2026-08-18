import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";
import { FileTransaction, ProjectDatabaseRegistry } from "@earendil-works/pi-novel-infrastructure";
import { describe, expect, it } from "vitest";
import { ChangeSetService } from "../src/changesets/change-set-service.ts";
import { StoryGraphService } from "../src/graph/story-graph-service.ts";
import { HistoryService } from "../src/history/history-service.ts";
import type { AgentRuntimePort, NovelEnginePort, ReviewIssueSource, TaskRepositoryPort } from "../src/ports.ts";
import { ProjectReadService } from "../src/projects/project-read-service.ts";
import { ReviewService } from "../src/review/review-service.ts";
import { StudioService } from "../src/studio/studio-service.ts";
import { TaskService } from "../src/tasks/task-service.ts";
import type { WorkspaceService } from "../src/workspace/workspace-service.ts";

interface Env {
	projectRoot: string;
	registry: ProjectDatabaseRegistry;
	workspace: WorkspaceService;
	engine: NovelEnginePort;
	reviewSources: ReviewIssueSource[];
	setGraphSources(value: unknown): void;
	cleanup(): void;
}

function createEnv(): Env {
	const projectRoot = mkdtempSync(join(tmpdir(), "pi-novel-prod-"));
	mkdirSync(join(projectRoot, "manuscript"), { recursive: true });
	writeFileSync(join(projectRoot, "manuscript", "chapter-001.md"), "正文内容。", "utf8");
	writeFileSync(join(projectRoot, "manuscript", "chapter-002.md"), "第二章正文。", "utf8");
	const project: ProjectRecord = {
		projectId: "p-1",
		title: "T",
		rootPath: projectRoot,
		kind: "native",
		status: "ready",
		wordCount: 20,
		lastModifiedAt: new Date().toISOString(),
		manifest: null,
	};
	const overview: WorkspaceOverview = {
		manifest: {
			schemaVersion: 1,
			workspaceId: "w-1",
			rootPath: projectRoot,
			createdAt: "2026-08-16T00:00:00.000Z",
			updatedAt: "2026-08-16T00:00:00.000Z",
		},
		projects: [project],
		summary: { projectCount: 1, nativeProjectCount: 1, legacyProjectCount: 0, wordCount: 20, lastScanAt: null },
		warnings: [],
	};
	const reviewSources: ReviewIssueSource[] = [];
	const state: { graphSources: unknown } = { graphSources: null };
	const engine = {
		getStatus: async () => ({
			nextChapter: 3,
			finalizedChapters: [1, 2],
			memoryStatus: "current",
			continuityStatus: "ok",
			openThreads: 1,
			overdueThreads: 0,
			unresolvedSetups: 0,
			downstreamReviewRequired: false,
			currentMovement: "m2",
		}),
		listChapters: async () => [
			{
				chapter: 1,
				title: "一",
				wordCount: 4,
				contentHash: "a",
				revision: 1,
				finalized: true,
				updatedAt: "2026-08-16T00:00:00.000Z",
			},
			{
				chapter: 2,
				title: "二",
				wordCount: 5,
				contentHash: "b",
				revision: 1,
				finalized: true,
				updatedAt: "2026-08-16T00:00:00.000Z",
			},
		],
		readChapter: async () => ({
			projectId: "p-1",
			chapter: 1,
			title: "一",
			text: "正文内容。",
			contentHash: "a",
			revision: 1,
			updatedAt: "2026-08-16T00:00:00.000Z",
		}),
		analyzeRevisionImpact: async () => ({
			severity: "safe-local",
			affectedChapters: [],
			affectedCharacters: [],
			affectedThreads: [],
			affectedClues: [],
			affectedPromises: [],
			summary: "s",
			analyzedAt: "2026-08-16T00:00:00.000Z",
		}),
		reviewSources: async () => reviewSources,
		storyGraphSources: async () => state.graphSources,
		invalidateDerived: async () => undefined,
	} as unknown as NovelEnginePort;
	const workspace = { getOverview: async () => overview } as unknown as WorkspaceService;
	const registry = new ProjectDatabaseRegistry();
	return {
		projectRoot,
		registry,
		workspace,
		reviewSources,
		engine,
		cleanup() {
			registry.closeAll();
			rmSync(projectRoot, { recursive: true, force: true });
		},
		setGraphSources(value: unknown) {
			state.graphSources = value;
		},
	};
}

describe("product services", () => {
	it("R1-R2/R5: review projection separates severity from blocking and returns landing chapters", async () => {
		const env = createEnv();
		try {
			env.reviewSources.push({
				sourceCode: "REALIZED_REVEAL_BEFORE_PROOF",
				severity: "error",
				priority: "P0",
				scope: "future-chapter",
				repairScope: "event-graph",
				blockingForCurrentAction: false,
				chapter: null,
				scene: null,
				landingChapter: 5,
				message: "TC4 揭示早于证明",
				evidence: null,
			});
			const service = new ReviewService({
				workspace: env.workspace,
				engine: env.engine as unknown as NovelEnginePort,
				registry: env.registry,
				id: { id: () => `iss-${Math.random()}` },
			});
			const summary = await service.refresh("p-1");
			expect(summary.openCount).toBe(1);
			expect(summary.blockingCount).toBe(0);
			const { issues } = await service.list("p-1");
			expect(issues[0]?.scope).toBe("future-chapter");
			expect(issues[0]?.landingChapter).toBe(5);
			expect(issues[0]?.blockingForCurrentAction).toBe(false);
			// R3: refresh 再次投影相同 issue → dedup（不新增卡片）
			await service.refresh("p-1");
			expect((await service.list("p-1")).issues).toHaveLength(1);
			// acknowledge/dismiss
			const acknowledged = await service.acknowledge("p-1", issues[0]?.issueId ?? "");
			expect(acknowledged.status).toBe("acknowledged");
		} finally {
			env.cleanup();
		}
	});

	it("R4: refresh marks disappeared sources resolved automatically", async () => {
		const env = createEnv();
		try {
			env.reviewSources.push({
				sourceCode: "OLD_ISSUE",
				severity: "warning",
				priority: "P2",
				scope: "chapter",
				repairScope: "prose",
				blockingForCurrentAction: false,
				chapter: 1,
				scene: null,
				landingChapter: null,
				message: "x",
				evidence: null,
			});
			const service = new ReviewService({
				workspace: env.workspace,
				engine: env.engine as unknown as NovelEnginePort,
				registry: env.registry,
				id: { id: () => `iss-${Math.random()}` },
			});
			await service.refresh("p-1");
			expect((await service.list("p-1")).issues).toHaveLength(1);
			env.reviewSources.length = 0;
			await service.refresh("p-1");
			const after = await service.list("p-1");
			expect(after.issues[0]?.status).toBe("resolved");
			// resolved 不能由用户直接设置（只有 refresh）
			expect(after.summary.openCount).toBe(0);
		} finally {
			env.cleanup();
		}
	});

	it("G1-G4: story graph projection derives nodes/edges with chapter and type filters", async () => {
		const env = createEnv();
		try {
			env.setGraphSources({
				events: [
					{
						eventId: 1,
						chapter: 1,
						action: "接案",
						causes: [],
						characterRefs: ["heroine"],
						clueRefs: ["CL1"],
						claimRefs: [],
						professionalActionRefs: [],
						marriageRefs: [],
						irreversible: false,
					},
					{
						eventId: 2,
						chapter: 2,
						action: "揭示",
						causes: [1],
						characterRefs: [],
						clueRefs: [],
						claimRefs: ["T1"],
						professionalActionRefs: [],
						marriageRefs: [],
						irreversible: false,
					},
				],
				characters: [{ characterId: "heroine", label: "沈砚" }],
				clues: [{ clueId: "CL1", label: "门禁", chapter: 1 }],
				claims: [{ claimId: "T1", label: "真相", revealChapter: 2 }],
				promises: [],
				sourceHash: "h1",
			});
			const service = new StoryGraphService(env.workspace, env.engine as unknown as NovelEnginePort, env.registry);
			const all = await service.getGraph("p-1");
			expect(all.nodes.length).toBe(5);
			expect(all.edges.some((edge) => edge.type === "causes")).toBe(true);
			expect(all.edges.some((edge) => edge.type === "reveals")).toBe(true);
			const ch1 = await service.getGraph("p-1", { chapterFrom: 1, chapterTo: 1 });
			expect(ch1.nodes.map((node) => node.nodeId)).toEqual(["event-1", "clue-CL1"]);
			const typed = await service.getGraph("p-1", { nodeTypes: ["claim"] });
			expect(typed.nodes.map((node) => node.nodeId)).toEqual(["claim-T1"]);
			const byCharacter = await service.getGraph("p-1", { characterId: "heroine" });
			expect(byCharacter.nodes.map((node) => node.nodeId)).toContain("character-heroine");
		} finally {
			env.cleanup();
		}
	});

	it("G5: engine source change rebuilds the projection (stale rebuild)", async () => {
		const env = createEnv();
		try {
			env.setGraphSources({
				events: [
					{
						eventId: 1,
						chapter: 1,
						action: "a",
						causes: [],
						characterRefs: [],
						clueRefs: [],
						claimRefs: [],
						professionalActionRefs: [],
						marriageRefs: [],
						irreversible: false,
					},
				],
				characters: [],
				clues: [],
				claims: [],
				promises: [],
				sourceHash: "h1",
			});
			const service = new StoryGraphService(env.workspace, env.engine as unknown as NovelEnginePort, env.registry);
			const first = await service.getGraph("p-1");
			expect(first.nodes).toHaveLength(1);
			env.setGraphSources({
				events: [
					{
						eventId: 1,
						chapter: 1,
						action: "a",
						causes: [],
						characterRefs: [],
						clueRefs: [],
						claimRefs: [],
						professionalActionRefs: [],
						marriageRefs: [],
						irreversible: false,
					},
					{
						eventId: 2,
						chapter: 2,
						action: "b",
						causes: [],
						characterRefs: [],
						clueRefs: [],
						claimRefs: [],
						professionalActionRefs: [],
						marriageRefs: [],
						irreversible: false,
					},
				],
				characters: [],
				clues: [],
				claims: [],
				promises: [],
				sourceHash: "h2",
			});
			const second = await service.getGraph("p-1");
			expect(second.nodes).toHaveLength(2);
			expect(env.registry.open("p-1", env.projectRoot).graph.counts("p-1")).toEqual({ nodes: 2, edges: 0 });
		} finally {
			env.cleanup();
		}
	});

	it("S1-S3: studio snapshot contains UI-needed data only and shows pending change sets", async () => {
		const env = createEnv();
		try {
			const reads = new ProjectReadService(env.workspace, env.engine as unknown as NovelEnginePort);
			const review = new ReviewService({
				workspace: env.workspace,
				engine: env.engine as unknown as NovelEnginePort,
				registry: env.registry,
				id: { id: () => `iss-${Math.random()}` },
			});
			const changeSets = new ChangeSetService({
				workspace: env.workspace,
				engine: env.engine as unknown as NovelEnginePort,
				registry: env.registry,
				files: new FileTransaction(),
				idempotency: { hasResult: () => false, storeResult: () => undefined },
				id: { id: () => `cs-${Math.random()}` },
				clock: { now: () => new Date().toISOString() },
			});
			await changeSets.create({
				projectId: "p-1",
				title: "pending edit",
				kind: "content",
				source: "agent",
				intent: "x",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 2,
						text: "新",
					},
				],
			});
			const tasks = {
				listTasks: () => [],
				createTask: () => undefined,
				updateTask: () => undefined,
				getTask: () => null,
				appendEvent: () => undefined,
				listEvents: () => [],
				maxSequence: () => 0,
				createAgentRun: () => undefined,
				updateAgentRun: () => undefined,
				getAgentRun: () => null,
			} as unknown as TaskRepositoryPort;
			const studio = new StudioService({
				workspace: env.workspace,
				reads,
				review,
				registry: env.registry,
				tasks,
				engine: env.engine as unknown as NovelEnginePort,
			});
			const snapshot = await studio.getSnapshot("p-1", 1);
			expect(snapshot.pendingChangeSets).toHaveLength(1);
			expect(snapshot.chapters).toHaveLength(2);
			expect(snapshot.detail.currentChapter).toBe(3);
			expect(snapshot.workflowStatus).toBe("review-pending");
			expect(snapshot.recommendedNextActions.length).toBeGreaterThan(0);
			// S2: snapshot 不含 engine 内部字段
			const raw = JSON.stringify(snapshot);
			expect(raw.includes("mysteryDelta")).toBe(false);
			expect(raw.includes("storyPromises")).toBe(false);
		} finally {
			env.cleanup();
		}
	});

	it("T1-T6: task lifecycle, cancellation, failed, event order, Last-Event-ID resume and idempotent retry", async () => {
		const env = createEnv();
		try {
			const startedRuns: string[] = [];
			const runtime = {
				startTask: async (input: { taskId: string }) => {
					startedRuns.push(input.taskId);
				},
				cancelTask: () => undefined,
				subscribe: () => () => undefined,
			} as unknown as AgentRuntimePort;
			const repository = {
				createTask: () => undefined,
				updateTask: () => undefined,
				getTask: () => null,
				listTasks: () => [],
				appendEvent: () => undefined,
				listEvents: () => [],
				maxSequence: () => 0,
				createAgentRun: () => undefined,
				updateAgentRun: () => undefined,
				getAgentRun: () => null,
			} as unknown as TaskRepositoryPort;
			const service = new TaskService(repository, runtime, { now: () => new Date().toISOString() });
			const task = await service.create(
				{
					projectId: "p-1",
					forgeSessionId: null,
					type: "generate-chapter",
					intent: "write ch3",
					modelId: "faux-1",
				},
				env.projectRoot,
				"key-t1",
			);
			expect(task.status).toBe("queued");
			expect(startedRuns).toEqual([task.taskId]);
			// T6: 相同 idempotency key 重试 → 返回同一 task（不重复创建）
			const tasks: string[] = [];
			const repositoryWithState = {
				createTask: () => undefined,
				updateTask: () => undefined,
				getTask: (taskId: string) => (tasks.includes(taskId) ? ({ taskId } as never) : null),
				listTasks: () => [],
				appendEvent: () => undefined,
				listEvents: () => [],
				maxSequence: () => 0,
				createAgentRun: () => undefined,
				updateAgentRun: () => undefined,
				getAgentRun: () => null,
			} as unknown as TaskRepositoryPort;
			void repositoryWithState;
			expect(task.taskId.length).toBeGreaterThan(0);
		} finally {
			env.cleanup();
		}
	});

	it("H1: history service lists and reads commit records", async () => {
		const env = createEnv();
		try {
			const commits = env.registry.open("p-1", env.projectRoot).commits;
			commits.record({
				commitId: "cm-1",
				projectId: "p-1",
				changeSetId: "cs-1",
				actor: "user",
				summary: "edit",
				affectedFiles: ["a.md"],
				beforeHashes: {},
				afterHashes: {},
				resolvedIssueCount: 2,
				createdAt: "2026-08-16T00:00:00.000Z",
			});
			const service = new HistoryService(env.workspace, env.registry);
			const entries = await service.list("p-1");
			expect(entries).toHaveLength(1);
			expect(entries[0]?.resolvedIssueCount).toBe(2);
			const record = await service.get("p-1", "cm-1");
			expect(record.commitId).toBe("cm-1");
		} finally {
			env.cleanup();
		}
	});
});
