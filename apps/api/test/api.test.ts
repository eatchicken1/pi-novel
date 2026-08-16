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
	it("initializes a workspace and discovers native and legacy projects", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-api-"));
		await mkdir(join(root, "native-story"));
		await writeFile(join(root, "native-story", "novel.yaml"), "schema_version: 1\nproject_id: native-story\ntitle: Native Story\n");
		await mkdir(join(root, "legacy-story"));
		await writeFile(join(root, "legacy-story", "project.json"), JSON.stringify({ projectId: "legacy-story", title: "Legacy Story" }));

		const app = await createNovelApi();
		apps.push(app);
		const response = await app.inject({ method: "POST", url: "/api/workspace/initialize", payload: { path: root } });

		expect(response.statusCode).toBe(200);
		const payload = response.json() as { workspace: { summary: { projectCount: number }; projects: Array<{ kind: string }> } };
		expect(payload.workspace.summary.projectCount).toBe(2);
		expect(payload.workspace.projects.map((project) => project.kind).sort()).toEqual(["legacy", "native"]);
	});

	it("exposes the same OAuth provider catalog used by the CLI", async () => {
		const app = await createNovelApi();
		apps.push(app);
		const response = await app.inject({ method: "GET", url: "/api/models/catalog" });

		expect(response.statusCode).toBe(200);
		const payload = response.json() as { providers: Array<{ providerId: string; cliLoginCommand: string }> };
		expect(payload.providers.map((provider) => provider.providerId)).toEqual([
			"anthropic",
			"github-copilot",
			"kimi-coding",
			"openai-codex",
			"openrouter",
			"radius",
			"xai",
		]);
		expect(payload.providers[3]?.cliLoginCommand).toBe("npx @earendil-works/pi-ai login openai-codex");
	});
});
