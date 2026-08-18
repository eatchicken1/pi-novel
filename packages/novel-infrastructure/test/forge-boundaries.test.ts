import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { DirectionCandidate, ForgeSession } from "@earendil-works/pi-novel-contracts";
import { afterEach, describe, expect, it } from "vitest";
import { ForgeArtifactStore, ProjectMaterializationError, ProjectMaterializer } from "../src/index.ts";

const roots: string[] = [];

afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("Forge persistence boundaries", () => {
	it("materializes a committed foundation with a project database", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-forge-"));
		roots.push(root);
		const session = createSession();
		const candidate = createCandidate();
		const result = await new ProjectMaterializer().materialize({
			workspaceRoot: root,
			session,
			candidate,
			request: { title: "雾港", folderName: "fog-harbor", language: "zh-CN" },
		});
		expect(result.projectId).toMatch(/^nov-[a-f0-9]+$/u);
		expect(await readFile(join(root, "fog-harbor", "novel.yaml"), "utf8")).toContain(
			`project_id: ${result.projectId}`,
		);
		expect(await readdir(join(root, "fog-harbor"))).toEqual(
			expect.arrayContaining(["manuscript", "notes", "assets", "exports", "novel.yaml"]),
		);
		const database = new DatabaseSync(join(root, "fog-harbor", ".pi-novel", "project.sqlite"));
		expect(database.prepare("SELECT id FROM schema_migrations ORDER BY id").all()).toEqual([
			{ id: "001_project_initial.sql" },
			{ id: "003_project_product.sql" },
			{ id: "004_commit_recovery.sql" },
		]);
		expect(database.prepare("SELECT project_id FROM project_metadata").get()).toEqual({
			project_id: result.projectId,
		});
		database.close();
	});

	it("guards folder collisions and keeps Forge artifacts inside the workspace", async () => {
		const root = await mkdtemp(join(tmpdir(), "pi-novel-forge-"));
		roots.push(root);
		const store = new ForgeArtifactStore(root);
		await store.writeJson("session-1", "artifacts/directions.json", { safe: true });
		expect(await store.readJson("session-1", "artifacts/directions.json")).toEqual({ safe: true });
		await expect(store.writeJson("session-1", "../outside.json", {})).rejects.toThrow("escapes the Workspace root");
		await new ProjectMaterializer().materialize({
			workspaceRoot: root,
			session: createSession(),
			candidate: createCandidate(),
			request: { title: "One", folderName: "same" },
		});
		await expect(
			new ProjectMaterializer().materialize({
				workspaceRoot: root,
				session: createSession(),
				candidate: createCandidate(),
				request: { title: "Two", folderName: "same" },
			}),
		).rejects.toMatchObject({ code: "PROJECT_FOLDER_EXISTS" });
		await expect(
			new ProjectMaterializer().materialize({
				workspaceRoot: root,
				session: createSession(),
				candidate: createCandidate(),
				request: { title: "Bad", folderName: "../outside" },
			}),
		).rejects.toBeInstanceOf(ProjectMaterializationError);
	});
});

function createSession(): ForgeSession {
	return {
		forgeSessionId: "session-1",
		workspaceId: "workspace-1",
		status: "committed",
		seed: "island",
		titleCandidate: "Fog Harbor",
		narrativeDNA: {
			genre: "悬疑",
			narrativeScale: "中长篇",
			coreExperience: "真相",
			pacing: "持续升级",
			pov: "限制视角",
			endingTone: "余韵明确",
			readerPromise: "真相与关系同时推进",
		},
		hardConstraints: [],
		preferences: [],
		createdAt: "2026-08-16T10:00:00.000Z",
		updatedAt: "2026-08-16T10:00:00.000Z",
		selectedCandidateId: "direction-1",
		committedAt: "2026-08-16T10:00:00.000Z",
		materializedProjectId: null,
		currentTaskId: null,
		runtimeRelativePath: ".pi-novel/sessions/session-1",
		failureCode: null,
		failureMessage: null,
	};
}

function createCandidate(): DirectionCandidate {
	return {
		candidateId: "direction-1",
		artifactId: "artifact-1",
		generation: 1,
		status: "selected",
		title: "雾港回声",
		logline: "一名记者在封闭海岛追查失踪案，发现每段证词都在保护同一个人。",
		corePremise: "封闭海岛中的证词网络",
		centralMystery: "失踪者为何被所有人共同隐瞒",
		socialMechanism: "港口互助会控制信息与出行",
		characterEngine: "记者追求真相但害怕失去归属",
		relationshipFaultLine: "伴侣是互助会的记录者",
		centralDilemma: "公开真相会让无辜者失去庇护",
		readerPromise: "真相与关系同时推进",
		endingShape: "公开真相但重建关系边界",
		climaxIdea: "在封港会议上逐条核对伪造的证词",
		majorRisks: ["封闭空间过度依赖巧合"],
		distinctiveFeatures: ["互助会控制潮汐航线", "记录者伴侣", "公开证词审判"],
		constraintValidation: { status: "PASS", reasons: ["全部硬约束满足"] },
		createdAt: "2026-08-16T10:00:00.000Z",
	};
}
