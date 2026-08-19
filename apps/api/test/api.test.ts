import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
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
