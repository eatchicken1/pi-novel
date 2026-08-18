import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AgentRuntimeService, ForgeService, WorkspaceService } from "@earendil-works/pi-novel-application";
import type { DirectionCandidate } from "@earendil-works/pi-novel-contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
	ForgeArtifactStore,
	ForgeRepository,
	LegacyStoryExplorationAdapter,
	MaterializationJournalRepository,
	PiModelRuntimeAdapter,
	ProjectMaterializer,
	ProjectScanner,
	RuntimeProfileRepository,
	WorkspaceDatabase,
	WorkspaceFiles,
} from "../src/index.ts";

// ============================================================================
// E2E：真实 HTTP → Pi Model Runtime → Legacy Novel Engine → SQLite 全链路。
// 使用本地 mock OpenAI-Responses 兼容服务器，无需外部 API Key。
// ============================================================================

const CANNED_CANDIDATES = [
	{
		title: "雾港回声",
		logline: "记者在封闭海岛追查失踪案，发现每段证词都在保护同一个人。",
		corePremise: "证词网络",
		centralMystery: "失踪者为何被全岛共同隐瞒",
		socialMechanism: "港口互助会控制信息与出行",
		protagonistGoal: "找出失踪者",
		protagonistBlindSpot: "害怕失去归属",
		relationshipFaultLine: "伴侣是互助会的记录者",
		spouseCoreBelief: "保护者必须隐瞒",
		professionalDependency: "互助会提供案件来源",
		centralDilemma: "公开真相会让无辜者失去庇护",
		majorCost: "失去信息来源",
		climaxIdea: "封港会议上逐条核对证词",
		endingShape: "公开真相但重建关系边界",
		distinctiveMechanism: "证词逐条可验证",
		readerPromise: "真相与关系同时推进",
		majorRisks: ["封闭空间依赖巧合"],
		constraintValidation: { status: "PASS", reasons: ["满足全部硬约束"] },
	},
	{
		title: "潮汐档案",
		logline: "档案管理员发现每月的潮汐记录都在掩盖一次未登记的海难。",
		corePremise: "档案篡改",
		centralMystery: "海难为何被系统性抹除",
		socialMechanism: "档案馆的等级审批链",
		protagonistGoal: "恢复被删除的记录",
		protagonistBlindSpot: "信任制度",
		relationshipFaultLine: "上司是抹除记录的执行人",
		spouseCoreBelief: "制度正确",
		professionalDependency: "档案馆提供全部数据",
		centralDilemma: "恢复记录会摧毁档案馆",
		majorCost: "职业生涯",
		climaxIdea: "在年度归档时恢复原件",
		endingShape: "档案公开但责任人逃逸",
		distinctiveMechanism: "潮汐周期作为时间坐标",
		readerPromise: "制度与个人同时崩塌",
		majorRisks: ["档案馆设定需专业细节"],
		constraintValidation: { status: "PASS", reasons: ["满足全部硬约束"] },
	},
	{
		title: "失踪者的录音",
		logline: "声音分析师从一段旧录音里听出失踪者最后的求救被剪掉了。",
		corePremise: "录音证据",
		centralMystery: "求救为何被剪辑",
		socialMechanism: "电台的播出审查",
		protagonistGoal: "还原完整录音",
		protagonistBlindSpot: "依赖技术结论",
		relationshipFaultLine: "搭档参与了剪辑",
		spouseCoreBelief: "电台声誉高于真相",
		professionalDependency: "电台设备支持分析",
		centralDilemma: "公开录音会毁掉电台",
		majorCost: "信任搭档",
		climaxIdea: "直播中播放未剪辑版",
		endingShape: "真相播出但声音证据存疑",
		distinctiveMechanism: "声纹分析作为叙事语言",
		readerPromise: "声音与沉默对抗",
		majorRisks: ["技术描写需要准确"],
		constraintValidation: { status: "PASS", reasons: ["满足全部硬约束"] },
	},
];

const COMPARISON_TEMPLATE = (candidateIds: string[]) => ({
	dimensions: [
		{ dimension: "Narrative Drive", assessment: "stronger", candidateIds: [candidateIds[0]], reason: "开局钩子最紧" },
		{
			dimension: "Character Agency",
			assessment: "comparable",
			candidateIds: candidateIds,
			reason: "主角都有主动行为",
		},
		{
			dimension: "Conflict Sustainability",
			assessment: "stronger",
			candidateIds: [candidateIds[1]],
			reason: "制度性对抗可持续",
		},
		{
			dimension: "Mystery / Question Strength",
			assessment: "comparable",
			candidateIds: candidateIds,
			reason: "谜团均可验证",
		},
		{
			dimension: "Distinctiveness",
			assessment: "stronger",
			candidateIds: [candidateIds[2]],
			reason: "媒介语言最独特",
		},
		{
			dimension: "Ending Potential",
			assessment: "comparable",
			candidateIds: candidateIds,
			reason: "结局形态均已设计",
		},
		{
			dimension: "Long-form Sustainability",
			assessment: "weaker",
			candidateIds: [candidateIds[2]],
			reason: "技术谜团易提前揭底",
		},
		{ dimension: "Major Risk", assessment: "risk", candidateIds: [candidateIds[0]], reason: "依赖封闭空间巧合" },
	],
	recommendedCandidateIds: [candidateIds[0]],
	notes: ["综合排序不构成作者确认"],
});

class MockOpenAIServer {
	private readonly server: Server;
	private readonly requests: string[] = [];
	private readonly bound: Promise<number>;

	constructor() {
		this.server = createServer((request, response) => {
			const chunks: Buffer[] = [];
			request.on("data", (chunk: Buffer) => chunks.push(chunk));
			request.on("end", () => {
				const body = Buffer.concat(chunks).toString("utf8");
				this.requests.push(body);
				const prompt = body.slice(0, 200_000);
				const text = this.answerFor(prompt);
				this.streamResponse(response, text, prompt);
			});
		});
		this.bound = new Promise<number>((resolve, reject) => {
			this.server.once("error", reject);
			this.server.listen(0, "127.0.0.1", () => {
				const current = this.server.address();
				if (current === null || typeof current === "string") {
					reject(new Error("mock server did not bind"));
					return;
				}
				resolve(current.port);
			});
		});
	}

	async ready(): Promise<number> {
		return this.bound;
	}

	get port(): Promise<number> {
		return this.bound;
	}

	async close(): Promise<void> {
		await new Promise<void>((resolve, reject) => this.server.close((error) => (error ? reject(error) : resolve())));
	}

	get requestCount(): number {
		return this.requests.length;
	}

	private answerFor(prompt: string): string {
		if (prompt.includes("forge.comparator")) {
			const ids = [...prompt.matchAll(/"candidateId":\s*"(direction-[a-f0-9-]+)"/gu)].map((match) => match[1]);
			if (ids.length === 0) {
				// The request body is JSON with escaped quotes; parse it back.
				try {
					const parsed = JSON.parse(prompt) as { input?: Array<{ content?: Array<{ text?: string }> }> };
					const text = parsed.input?.[0]?.content?.map((entry) => entry.text ?? "").join("\n") ?? "";
					ids.push(...[...text.matchAll(/"candidateId":\s*"(direction-[a-f0-9-]+)"/gu)].map((match) => match[1]));
				} catch {
					// fall through with no ids
				}
			}
			const comparison = COMPARISON_TEMPLATE(ids);
			return JSON.stringify(comparison);
		}
		if (prompt.includes("forge.critic")) {
			return "这个方向的主要风险是把封闭空间写成巧合；建议为每个巧合设置可见的因果链。";
		}
		return JSON.stringify({ candidates: CANNED_CANDIDATES });
	}

	private streamResponse(response: import("node:http").ServerResponse, text: string, prompt: string): void {
		response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
		const itemId = "msg_mock_1";
		const responseId = "resp_mock_1";
		const outputItem = {
			id: itemId,
			type: "message",
			role: "assistant",
			status: "completed",
			content: [{ type: "output_text", text, annotations: [] }],
		};
		const event = (type: string, data: unknown): void => {
			response.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
		};
		event("response.created", { type: "response.created", response: { id: responseId, status: "in_progress" } });
		event("response.output_item.added", {
			type: "response.output_item.added",
			output_index: 0,
			item: { id: itemId, type: "message", role: "assistant", status: "in_progress", content: [] },
		});
		event("response.content_part.added", {
			type: "response.content_part.added",
			output_index: 0,
			content_index: 0,
			part: { type: "output_text", text: "" },
		});
		const chunkSize = 500;
		for (let index = 0; index < text.length; index += chunkSize) {
			event("response.output_text.delta", {
				type: "response.output_text.delta",
				output_index: 0,
				content_index: 0,
				delta: text.slice(index, index + chunkSize),
			});
		}
		event("response.output_text.done", {
			type: "response.output_text.done",
			output_index: 0,
			content_index: 0,
			text,
		});
		event("response.content_part.done", {
			type: "response.content_part.done",
			output_index: 0,
			content_index: 0,
			part: { type: "output_text", text },
		});
		event("response.output_item.done", { type: "response.output_item.done", output_index: 0, item: outputItem });
		event("response.completed", {
			type: "response.completed",
			response: {
				id: responseId,
				status: "completed",
				output: [outputItem],
				usage: {
					input_tokens: 100,
					output_tokens: 50,
					total_tokens: 150,
					output_tokens_details: { reasoning_tokens: 0 },
				},
			},
		});
		void prompt;
		response.end();
	}
}

const roots: Array<{ root: string; server?: MockOpenAIServer; workspace?: WorkspaceService }> = [];

afterEach(async () => {
	await Promise.all(
		roots.splice(0).map(async ({ root, server, workspace }) => {
			workspace?.close();
			await server?.close();
			await rm(root, { recursive: true, force: true });
		}),
	);
});

describe("Forge E2E on a real workspace (mock provider)", () => {
	it("runs the full chain: provider -> profiles -> generate -> compare -> critique -> regenerate -> select -> commit -> materialize -> restart recovery", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-e2e-"));
		const server = new MockOpenAIServer();
		roots.push({ root, server });
		const port = await server.ready();
		const adapter = new PiModelRuntimeAdapter();

		// 1. Initial state: workspace has no configured credential for openai.
		const initial = await adapter.getCatalog(root);
		const initialOpenai = initial.providers.find((provider) => provider.providerId === "openai");
		expect(initialOpenai?.apiKeyConfigured).toBe(false);

		// 2. Configure provider -> connected.
		const configured = await adapter.configureApiKey(root, {
			providerId: "openai",
			apiKey: "sk-e2e-test",
			baseUrl: `http://127.0.0.1:${port}/v1`,
		});
		const openai = configured.providers.find((provider) => provider.providerId === "openai");
		expect(openai?.status).toBe("connected");
		const gpt4o = openai?.models.find((model) => model.modelId === "gpt-4o");
		expect(gpt4o?.thinkingLevels).toEqual(["off"]);

		// 3. Workspace + repos.
		const workspace = new WorkspaceService({
			createFileSystem: (path) => new WorkspaceFiles(path),
			createRepository: (databasePath) => new WorkspaceDatabase(databasePath),
			scanner: new ProjectScanner(),
			createForgeRepository: (databasePath) => new ForgeRepository(databasePath),
			createRuntimeProfileRepository: (databasePath) => new RuntimeProfileRepository(databasePath),
			createMaterializationJournalRepository: (databasePath) => new MaterializationJournalRepository(databasePath),
		});
		await workspace.initialize(root);
		roots[roots.length - 1] = { ...roots[roots.length - 1], workspace };

		// 4. Agent runtime profiles (independent per agent).
		const agentRuntime = new AgentRuntimeService({
			storeFor: () => workspace.getRuntimeProfileRepository(),
			rootFor: () => root,
			runtime: adapter,
		});
		await agentRuntime.setProfile("forge.explorer", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		await agentRuntime.setProfile("forge.comparator", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		await agentRuntime.setProfile("forge.critic", { modelId: "openai/gpt-4o", thinkingLevel: "off" });
		expect(agentRuntime.listProfiles()).toHaveLength(3);

		const forge = new ForgeService({
			workspace,
			exploration: new LegacyStoryExplorationAdapter(adapter),
			artifactStoreFor: (workspaceRoot) => new ForgeArtifactStore(workspaceRoot),
			materializer: new ProjectMaterializer(),
			runtime: agentRuntime,
		});

		// 5. Create session and generate.
		const session = forge.createSession({
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
			hardConstraints: [{ id: "h1", kind: "hard", text: "不能出现超自然力量" }],
			preferences: [{ id: "p1", kind: "preference", text: "强关系冲突" }],
		});
		const task = await forge.startDirectionGeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(forge, task.taskId);
		expect(forge.getSession(session.forgeSessionId).status).toBe("awaiting_selection");
		let artifacts = await forge.getArtifacts(session.forgeSessionId);
		expect(artifacts.candidates).toHaveLength(3);
		expect(artifacts.candidates.every((candidate) => candidate.constraintValidation.status === "PASS")).toBe(true);
		expect(artifacts.candidates.every((candidate) => candidate.artifactId === candidate.candidateId)).toBe(true);
		// every candidate artifactId resolves to a stored artifact
		for (const candidate of artifacts.candidates) {
			expect(artifacts.artifacts.some((artifact) => artifact.artifactId === candidate.artifactId)).toBe(true);
		}
		expect(artifacts.generations.map((entry) => entry.generation)).toEqual([1]);

		// 6. Real comparison through forge.comparator.
		const compareTask = await forge.startComparison(session.forgeSessionId);
		await waitForTask(forge, compareTask.taskId);
		artifacts = await forge.getArtifacts(session.forgeSessionId);
		expect(artifacts.comparison).not.toBeNull();
		expect(artifacts.comparison?.dimensions.length).toBeGreaterThanOrEqual(8);
		expect(artifacts.comparison?.dimensions.every((entry) => entry.candidateIds.length > 0)).toBe(true);

		// 7. Critique through forge.critic.
		const candidateId = artifacts.candidates[0]?.candidateId as string;
		const critiqueTask = await forge.startCritique(session.forgeSessionId, { candidateId, instruction: "指出套路" });
		await waitForTask(forge, critiqueTask.taskId);
		artifacts = await forge.getArtifacts(session.forgeSessionId);
		expect(
			artifacts.artifacts.some((artifact) => artifact.kind === "critique" && artifact.candidateId === candidateId),
		).toBe(true);

		// 8. Regenerate -> generation 2, generation 1 stays immutable.
		const regenerateTask = await forge.startRegeneration(session.forgeSessionId, { count: 3 });
		await waitForTask(forge, regenerateTask.taskId);
		artifacts = await forge.getArtifacts(session.forgeSessionId);
		expect(artifacts.generations.map((entry) => entry.generation)).toEqual([1, 2]);
		const generation1 = JSON.parse(
			(
				await readFile(
					join(
						root,
						".pi-novel",
						"sessions",
						session.forgeSessionId,
						"artifacts",
						"generations",
						"001",
						"generation.json",
					),
				)
			).toString("utf8"),
		) as { candidates: DirectionCandidate[] };
		expect(generation1.candidates[0]?.generation).toBe(1);

		// 9. Select the latest-generation candidate -> SelectionArtifact (AUTHOR_SELECTED).
		const latestCandidateId = artifacts.candidates[0]?.candidateId as string;
		await forge.select(session.forgeSessionId, { candidateId: latestCandidateId });
		const selectionArtifact = (await forge.getArtifacts(session.forgeSessionId)).artifacts.find(
			(artifact) => artifact.kind === "selection",
		);
		expect(selectionArtifact).toBeTruthy();

		// 10. Commit -> StoryCommitment (USER_CONFIRMED + confirmationScope).
		await forge.commit(session.forgeSessionId, { authorNote: "作者确认" });
		const commitmentArtifact = (await forge.getArtifacts(session.forgeSessionId)).artifacts.find(
			(artifact) => artifact.kind === "commitment",
		);
		expect(commitmentArtifact).toBeTruthy();
		const commitment = JSON.parse(
			(
				await readFile(
					join(
						root,
						".pi-novel",
						"sessions",
						session.forgeSessionId,
						(commitmentArtifact as { relativePath: string }).relativePath,
					),
				)
			).toString("utf8"),
		) as { confirmation: string; confirmationScope: string[] };
		expect(commitment.confirmation).toBe("USER_CONFIRMED");
		expect(commitment.confirmationScope).toEqual(["direction", "readerPromise", "hardConstraints"]);

		// 11. Materialize -> native project; single source of truth.
		const materialized = await forge.materialize(session.forgeSessionId, {
			title: "雾港回声",
			folderName: "fog-harbor",
			language: "zh-CN",
		});
		expect(materialized.status).toBe("materialized");
		const projectId = materialized.materializedProjectId as string;
		const projectRoot = join(root, "fog-harbor");
		expect(await stat(join(projectRoot, "novel.yaml"))).toBeTruthy();
		const projectDb = new DatabaseSync(join(projectRoot, ".pi-novel", "project.sqlite"));
		const commitmentRow = projectDb.prepare("SELECT * FROM story_commitments LIMIT 1").get() as {
			candidate_id: string;
			payload_json: string;
		};
		projectDb.close();
		expect(commitmentRow.candidate_id).toBe(latestCandidateId);
		const projection = JSON.parse(
			(await readFile(join(projectRoot, ".pi-novel", "projections", "story-commitment.json"))).toString("utf8"),
		) as { derived: boolean; rebuildable: boolean };
		expect(projection.derived).toBe(true);
		expect(projection.rebuildable).toBe(true);
		// no second authority under notes/
		let legacyNotesExists = true;
		try {
			await stat(join(projectRoot, "notes", "story-commitment.json"));
		} catch {
			legacyNotesExists = false;
		}
		expect(legacyNotesExists).toBe(false);

		// 12. Materialize idempotency: duplicate request returns the same project.
		const again = await forge.materialize(session.forgeSessionId, { title: "雾港回声", folderName: "fog-harbor" });
		expect(again.materializedProjectId).toBe(projectId);

		// 13. Restart: reopen workspace; profiles, forge state and project survive.
		workspace.close();
		const reopened = new WorkspaceService({
			createFileSystem: (path) => new WorkspaceFiles(path),
			createRepository: (databasePath) => new WorkspaceDatabase(databasePath),
			scanner: new ProjectScanner(),
			createForgeRepository: (databasePath) => new ForgeRepository(databasePath),
			createRuntimeProfileRepository: (databasePath) => new RuntimeProfileRepository(databasePath),
			createMaterializationJournalRepository: (databasePath) => new MaterializationJournalRepository(databasePath),
		});
		const overview = await reopened.open(root);
		expect(overview).not.toBeNull();
		expect(overview?.projects.some((project) => project.projectId === projectId)).toBe(true);
		const agentRuntime2 = new AgentRuntimeService({
			storeFor: () => reopened.getRuntimeProfileRepository(),
			rootFor: () => root,
			runtime: adapter,
		});
		expect(agentRuntime2.getProfile("forge.explorer")).toMatchObject({
			modelId: "openai/gpt-4o",
			thinkingLevel: "off",
		});
		const forge2 = new ForgeService({
			workspace: reopened,
			exploration: new LegacyStoryExplorationAdapter(adapter),
			artifactStoreFor: (workspaceRoot) => new ForgeArtifactStore(workspaceRoot),
			materializer: new ProjectMaterializer(),
			runtime: agentRuntime2,
		});
		expect(forge2.getSession(session.forgeSessionId).status).toBe("materialized");
		const afterRestart = await forge2.getArtifacts(session.forgeSessionId);
		expect(afterRestart.generations.map((entry) => entry.generation)).toEqual([1, 2]);
		reopened.close();
	});
});

async function waitForTask(forge: ForgeService, taskId: string): Promise<void> {
	for (let attempt = 0; attempt < 200; attempt += 1) {
		const task = forge.getTask(taskId);
		if (task.status === "succeeded") return;
		if (task.status === "failed") throw new Error(`Forge task failed: ${task.errorMessage}`);
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
	throw new Error("Forge task did not finish");
}
