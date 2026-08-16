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
