import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createNovelApi } from "../src/server.ts";

const apps: Array<Awaited<ReturnType<typeof createNovelApi>>> = [];

afterEach(async () => {
	for (const app of apps.splice(0)) await app.close();
});

describe("Novel API", () => {
	const token = "test-local-token";

	it("initializes a workspace and discovers native and legacy projects", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-"));
		await mkdir(join(root, "native-story"));
		await writeFile(join(root, "native-story", "novel.yaml"), "schema_version: 1\nproject_id: native-story\ntitle: Native Story\n");
		await mkdir(join(root, "legacy-story"));
		await writeFile(join(root, "legacy-story", "project.json"), JSON.stringify({ projectId: "legacy-story", title: "Legacy Story" }));

		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const response = await app.inject({ method: "POST", url: "/api/workspace/initialize", headers: { "x-pi-novel-token": token }, payload: { path: root } });

		expect(response.statusCode).toBe(200);
		const payload = response.json() as { workspace: { summary: { projectCount: number }; projects: Array<{ kind: string }> } };
		expect(payload.workspace.summary.projectCount).toBe(2);
		expect(payload.workspace.projects.map((project) => project.kind).sort()).toEqual(["legacy", "native"]);

		const projects = await app.inject({ method: "GET", url: "/api/projects", headers: { "x-pi-novel-token": token } });
		expect(projects.statusCode).toBe(200);
		const projectPayload = projects.json() as { projects: Array<{ projectId: string }> };
		expect(projectPayload.projects.map((project) => project.projectId).sort()).toEqual(["legacy-story", "native-story"]);
		const missing = await app.inject({ method: "GET", url: "/api/projects/missing", headers: { "x-pi-novel-token": token } });
		expect(missing.statusCode).toBe(404);
		expect(missing.json()).toEqual({ error: { code: "PROJECT_NOT_FOUND", message: "Project not found" } });
	});

	it("keeps bootstrap usable without a workspace and exposes project capabilities", async () => {
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const headers = { "x-pi-novel-token": token };
		const unset = await app.inject({ method: "GET", url: "/api/bootstrap", headers });
		expect(unset.statusCode).toBe(200);
		expect(unset.json()).toMatchObject({ api: "ready", workspace: { status: "unset", summary: null }, runtime: { configured: false } });
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-capabilities-"));
		const projectId = "native-capabilities";
		await mkdir(join(root, projectId));
		await writeFile(join(root, projectId, "novel.yaml"), `schema_version: 1\nproject_id: ${projectId}\ntitle: Capabilities\n`);
		const initialized = await app.inject({ method: "POST", url: "/api/workspace/initialize", headers, payload: { path: root } });
		expect(initialized.statusCode).toBe(200);
		const ready = await app.inject({ method: "GET", url: "/api/bootstrap", headers });
		expect(ready.json()).toMatchObject({ api: "ready", workspace: { status: "ready" }, runtime: { configured: false } });
		const capabilities = await app.inject({ method: "GET", url: `/api/projects/${projectId}/capabilities`, headers });
		expect(capabilities.statusCode).toBe(200);
		expect(capabilities.json()).toMatchObject({ manuscriptRead: "supported", manuscriptWrite: "supported", chapterWorkflow: "supported", chapterReview: "supported", storyGraph: "unsupported", revisionImpact: "supported", narrativePatch: "supported" });
	});

	it("refreshes sequential draft hashes and reports external modification", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-save-"));
		const projectId = "save-story";
		await mkdir(join(root, projectId));
		await writeFile(join(root, projectId, "novel.yaml"), `schema_version: 1\nproject_id: ${projectId}\ntitle: Save Story\n`);
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const headers = { "x-pi-novel-token": token };
		await app.inject({ method: "POST", url: "/api/workspace/initialize", headers, payload: { path: root } });
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters`, headers, payload: { title: "潮汐" } });
		const initialResponse = await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1`, headers });
		const initial = (initialResponse.json() as { chapter: { metadata: { contentHash: string }; workflow: { draft: { draftRevision: number } } } }).chapter;
		const first = await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "# 潮汐\n\n第一稿。\n", baseContentHash: initial.metadata.contentHash, revision: initial.workflow.draft.draftRevision + 1 } });
		const firstDraft = first.json() as { contentHash: string; draftRevision: number };
		const second = await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "# 潮汐\n\n第二稿。\n", baseContentHash: firstDraft.contentHash, revision: firstDraft.draftRevision + 1 } });
		expect(second.statusCode).toBe(200);
		const secondDraft = second.json() as { contentHash: string; draftRevision: number };
		expect(secondDraft.contentHash).not.toBe(firstDraft.contentHash);
		await writeFile(join(root, projectId, "manuscript", "chapter-001.md"), "# 外部版本\n\n");
		const conflict = await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "# 本地版本\n\n", baseContentHash: secondDraft.contentHash, revision: secondDraft.draftRevision + 1 } });
		expect(conflict.statusCode).toBe(409);
		expect(conflict.json()).toMatchObject({ error: { code: "CHAPTER_EXTERNAL_MODIFICATION" } });
	});

	it("preserves review acknowledgement and blocks finalization for current chapter issues", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-review-"));
		const projectId = "review-story";
		await mkdir(join(root, projectId));
		await writeFile(join(root, projectId, "novel.yaml"), `schema_version: 1\nproject_id: ${projectId}\ntitle: Review Story\n`);
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const headers = { "x-pi-novel-token": token };
		await app.inject({ method: "POST", url: "/api/workspace/initialize", headers, payload: { path: root } });
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters`, headers, payload: { title: "无标题测试" } });
		const resource = (await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1`, headers })).json() as { chapter: { metadata: { contentHash: string }; workflow: { draft: { draftRevision: number } } } };
		const draft = (await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "没有 Markdown 标题的正文。\n", baseContentHash: resource.chapter.metadata.contentHash, revision: resource.chapter.workflow.draft.draftRevision + 1 } })).json() as { contentHash: string; draftRevision: number };
		const review = await app.inject({ method: "GET", url: `/api/projects/${projectId}/review`, headers });
		const issue = (review.json() as { current: Array<{ issueId: string; sourceCode: string }> }).current.find((candidate) => candidate.sourceCode === "NATIVE_CHAPTER_TITLE_MISSING");
		expect(issue).toBeDefined();
		const acknowledged = await app.inject({ method: "POST", url: `/api/projects/${projectId}/review/${issue?.issueId}/acknowledge`, headers });
		expect(acknowledged.json()).toMatchObject({ issue: { status: "acknowledged" } });
		const refreshed = await app.inject({ method: "GET", url: `/api/projects/${projectId}/review`, headers });
		const refreshedIssue = (refreshed.json() as { issues: Array<{ issueId: string; status: string }> }).issues.find((candidate) => candidate.issueId === issue?.issueId);
		expect(refreshedIssue?.status).toBe("acknowledged");
		const reconciled = await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters/1/reconcile`, headers, payload: draft });
		expect(reconciled.statusCode).toBe(200);
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters/1/settlement`, headers, payload: { draftRevision: draft.draftRevision, contentHash: draft.contentHash, summary: { pov: "", time: "", locations: [], characters: [], events: [], newFacts: [], relationshipChanges: [], cluesIntroduced: [], cluesResolved: [], itemsChanged: [], openQuestions: [] }, knowledgeChanges: [], relationshipChanges: [], objects: [], threads: [], promises: [], clues: [], professionalState: [], timelineChanges: [], confirmation: "USER_CONFIRMED" } });
		const workflow = await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1/workflow`, headers });
		const workflowPayload = workflow.json() as { canFinalize: boolean; blockingReasons: Array<{ code: string }> };
		expect(workflowPayload.canFinalize).toBe(false);
		expect(workflowPayload.blockingReasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(["CURRENT_REVIEW_BLOCKING", "CURRENT_REVIEW_MAJOR"]));
	});

	it("guards narrative patch generation by the chapter.reviser runtime", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-patch-guard-"));
		const projectId = "patch-guard-story";
		await mkdir(join(root, projectId));
		await writeFile(join(root, projectId, "novel.yaml"), `schema_version: 1\nproject_id: ${projectId}\ntitle: Patch Guard\n`);
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const headers = { "x-pi-novel-token": token };
		await app.inject({ method: "POST", url: "/api/workspace/initialize", headers, payload: { path: root } });
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters`, headers, payload: { title: "潮汐" } });
		const resource = (await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1`, headers })).json() as { chapter: { content: string; metadata: { contentHash: string } } };
		const selected = "潮汐";
		const startOffset = resource.chapter.content.indexOf(selected);
		const selectedTextHash = createHash("sha256").update(selected, "utf8").digest("hex");
		const response = await app.inject({
			method: "POST",
			url: `/api/projects/${projectId}/chapters/1/patches`,
			headers,
			payload: {
				goal: "加强戒备感",
				anchor: {
					chapterId: "1",
					baseContentHash: resource.chapter.metadata.contentHash,
					startOffset,
					endOffset: startOffset + selected.length,
					selectedTextHash,
					prefixContext: "# ",
					suffixContext: "\\n\\n",
				},
				outputCount: 1,
			},
		});
		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({ error: { code: "RUNTIME_PROFILE_NOT_CONFIGURED" } });
		const list = await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1/patches`, headers });
		expect(list.statusCode).toBe(200);
		expect(list.json()).toEqual({ changeSets: [] });
	});

	it("marks settlement stale after a later draft save", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-settlement-"));
		const projectId = "settlement-story";
		await mkdir(join(root, projectId));
		await writeFile(join(root, projectId, "novel.yaml"), `schema_version: 1\nproject_id: ${projectId}\ntitle: Settlement Story\n`);
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const headers = { "x-pi-novel-token": token };
		await app.inject({ method: "POST", url: "/api/workspace/initialize", headers, payload: { path: root } });
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters`, headers, payload: { title: "潮汐" } });
		const initial = (await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1`, headers })).json() as { chapter: { metadata: { contentHash: string }; workflow: { draft: { draftRevision: number } } } };
		const first = (await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "# 潮汐\n\n第一稿。\n", baseContentHash: initial.chapter.metadata.contentHash, revision: initial.chapter.workflow.draft.draftRevision + 1 } })).json() as { contentHash: string; draftRevision: number };
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters/1/reconcile`, headers, payload: first });
		await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters/1/settlement`, headers, payload: { draftRevision: first.draftRevision, contentHash: first.contentHash, summary: { pov: "", time: "", locations: [], characters: [], events: [], newFacts: [], relationshipChanges: [], cluesIntroduced: [], cluesResolved: [], itemsChanged: [], openQuestions: [] }, knowledgeChanges: [], relationshipChanges: [], objects: [], threads: [], promises: [], clues: [], professionalState: [], timelineChanges: [], confirmation: "USER_CONFIRMED" } });
		const second = (await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "# 潮汐\n\n第二稿。\n", baseContentHash: first.contentHash, revision: first.draftRevision + 1 } })).json() as { contentHash: string; draftRevision: number };
		expect(second.contentHash).not.toBe(first.contentHash);
		const workflow = await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1/workflow`, headers });
		const workflowPayload = workflow.json() as { settlementStale: boolean; canFinalize: boolean; blockingReasons: Array<{ code: string }> };
		expect(workflowPayload.settlementStale).toBe(true);
		expect(workflowPayload.canFinalize).toBe(false);
		expect(workflowPayload.blockingReasons.map((reason) => reason.code)).toEqual(expect.arrayContaining(["RECONCILIATION_REQUIRED", "SETTLEMENT_STALE"]));
	});

	it("runs the native chapter authoring workflow through the HTTP API", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-native-chapter-"));
		const projectId = "native-story";
		const projectRoot = join(root, projectId);
		await mkdir(projectRoot);
		await writeFile(join(projectRoot, "novel.yaml"), `schema_version: 1\nproject_id: ${projectId}\ntitle: Native Story\n`);
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const headers = { "x-pi-novel-token": token };
		const initialized = await app.inject({ method: "POST", url: "/api/workspace/initialize", headers, payload: { path: root } });
		expect(initialized.statusCode).toBe(200);

		const created = await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters`, headers, payload: { title: "潮汐" } });
		expect(created.statusCode).toBe(200);
		const document = (created.json() as { chapter: { chapter: number; contentHash: string; revision: number } }).chapter;
		expect(document.chapter).toBe(1);
		expect(document.revision).toBe(1);

		const resourceResponse = await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1`, headers });
		expect(resourceResponse.statusCode).toBe(200);
		const resource = (resourceResponse.json() as { chapter: { metadata: { contentHash: string; revision: number }; content: string; workflow: { draft: { draftRevision: number; contentHash: string } } } }).chapter;
		expect(resource.content).toBe("# 潮汐\n\n");

		const saved = await app.inject({ method: "PUT", url: `/api/projects/${projectId}/chapters/1/draft`, headers, payload: { content: "# 潮汐\n\n雨一直下。\n", baseContentHash: resource.metadata.contentHash, revision: resource.workflow.draft.draftRevision + 1 } });
		expect(saved.statusCode).toBe(200);
		const draft = saved.json() as { draftRevision: number; contentHash: string };
		const reconciled = await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters/1/reconcile`, headers, payload: draft });
		expect(reconciled.statusCode).toBe(200);
		expect(reconciled.json().status).toBe("aligned");

		const settled = await app.inject({
			method: "POST",
			url: `/api/projects/${projectId}/chapters/1/settlement`,
			headers,
			payload: {
				draftRevision: draft.draftRevision,
				contentHash: draft.contentHash,
				summary: { pov: "heroine", time: "night", locations: ["home"], characters: ["heroine"], events: ["rain"], newFacts: [], relationshipChanges: [], cluesIntroduced: [], cluesResolved: [], itemsChanged: [], openQuestions: [] },
				knowledgeChanges: [], relationshipChanges: [], objects: [], threads: [], promises: [], clues: [], professionalState: [], timelineChanges: [], confirmation: "USER_CONFIRMED",
			},
		});
		expect(settled.statusCode).toBe(200);

		const finalized = await app.inject({ method: "POST", url: `/api/projects/${projectId}/chapters/1/finalize`, headers, payload: { draftRevision: draft.draftRevision, contentHash: draft.contentHash, title: "潮汐", content: "# 潮汐\n\n雨一直下。\n", confirmation: "USER_CONFIRMED" } });
		expect(finalized.statusCode).toBe(200);
		expect(finalized.json()).toMatchObject({ projectId, chapter: 1, memoryCommitted: false });

		const afterFinalize = await app.inject({ method: "GET", url: `/api/projects/${projectId}/chapters/1`, headers });
		expect((afterFinalize.json() as { chapter: { workflow: { phase: string } } }).chapter.workflow.phase).toBe("finalized");
	});

	it("exposes OAuth and API-key providers from the CLI runtime", async () => {
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const response = await app.inject({ method: "GET", url: "/api/models/catalog", headers: { "x-pi-novel-token": token } });

		expect(response.statusCode).toBe(200);
		const payload = response.json() as { providers: Array<{ providerId: string; cliLoginCommand?: string; authMethods: string[]; models: Array<{ modelId: string }> }> };
		const deepseek = payload.providers.find((provider) => provider.providerId === "deepseek");
		const codex = payload.providers.find((provider) => provider.providerId === "openai-codex");
		expect(deepseek?.authMethods).toContain("api_key");
		expect(deepseek?.models.some((model) => model.modelId === "deepseek-v4-flash")).toBe(true);
		expect(codex?.cliLoginCommand).toBe("npx @earendil-works/pi-ai login openai-codex");
	});

	it("configures an API key through the local API without returning the secret", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-credentials-"));
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const initialized = await app.inject({ method: "POST", url: "/api/workspace/initialize", headers: { "x-pi-novel-token": token }, payload: { path: root } });
		expect(initialized.statusCode).toBe(200);
		const response = await app.inject({ method: "POST", url: "/api/models/providers/deepseek/api-key", headers: { "x-pi-novel-token": token }, payload: { providerId: "deepseek", apiKey: "sk-test-secret" } });
		expect(response.statusCode).toBe(200);
		expect(response.body).not.toContain("sk-test-secret");
		expect(response.json().providers.find((provider: { providerId: string }) => provider.providerId === "deepseek").apiKeyConfigured).toBe(true);
	});

	it("uses the initialized workspace for generic tasks and exposes their terminal state", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-tasks-"));
		const app = await createNovelApi({ localToken: token });
		apps.push(app);
		const initialized = await app.inject({
			method: "POST",
			url: "/api/workspace/initialize",
			headers: { "x-pi-novel-token": token },
			payload: { path: root },
		});
		expect(initialized.statusCode).toBe(200);

		const created = await app.inject({
			method: "POST",
			url: "/api/tasks",
			headers: { "x-pi-novel-token": token },
			payload: { projectId: null, forgeSessionId: null, type: "chapter.generate", intent: "test" },
		});
		expect(created.statusCode).toBe(202);
		const taskId = (created.json() as { task: { taskId: string } }).task.taskId;

		let fetched = await app.inject({ method: "GET", url: `/api/tasks/${taskId}`, headers: { "x-pi-novel-token": token } });
		for (let attempt = 0; attempt < 20 && fetched.json().task?.status !== "failed"; attempt += 1) {
			await new Promise((resolve) => setTimeout(resolve, 5));
			fetched = await app.inject({ method: "GET", url: `/api/tasks/${taskId}`, headers: { "x-pi-novel-token": token } });
		}
		expect(fetched.statusCode).toBe(200);
		expect(fetched.json().task.status).toBe("failed");
		const events = await app.inject({
			method: "GET",
			url: `/api/tasks/${taskId}/events`,
			headers: { "x-pi-novel-token": token },
		});
		expect(events.statusCode).toBe(200);
		expect(events.json().events.map((event: { type: string }) => event.type)).toEqual([
			"task.started",
			"task.failed",
		]);
	});

	it("leaves health public and rejects protected requests without the local token", async () => {
		const app = await createNovelApi({ localToken: token });
		apps.push(app);

		expect((await app.inject({ method: "GET", url: "/api/health" })).statusCode).toBe(200);
		const response = await app.inject({ method: "GET", url: "/api/workspace" });
		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: { code: "UNAUTHORIZED", message: "Local API token is required" } });
	});

	it("uses the shared error contract for invalid request bodies and restricts CORS", async () => {
		const app = await createNovelApi({ localToken: token });
		apps.push(app);

		const invalid = await app.inject({
			method: "POST",
			url: "/api/workspace/initialize",
			headers: { "x-pi-novel-token": token, origin: "http://127.0.0.1:4318" },
			payload: { path: "   " },
		});
		expect(invalid.statusCode).toBe(400);
		expect(invalid.json()).toMatchObject({ error: { code: "INVALID_REQUEST" } });
		expect(invalid.headers["access-control-allow-origin"]).toBe("http://127.0.0.1:4318");

		const disallowed = await app.inject({
			method: "GET",
			url: "/api/models/catalog",
			headers: { "x-pi-novel-token": token, origin: "http://evil.example" },
		});
		expect(disallowed.statusCode).toBe(200);
		expect(disallowed.headers["access-control-allow-origin"]).toBeUndefined();
	});
});
