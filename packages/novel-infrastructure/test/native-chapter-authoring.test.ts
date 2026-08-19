import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NativeChapterAuthoringAdapter } from "../src/native/native-chapter-authoring-adapter.ts";
import { NativeNovelEngineAdapter } from "../src/native/native-novel-engine-adapter.ts";
import { ProjectDatabaseRegistry } from "../src/sqlite/project-database-registry.ts";

describe("native chapter authoring", () => {
	it("reports explicit creative discoveries during reconcile", async () => {
		const workspaceRoot = mkdtempSync(join(tmpdir(), "pi-novel-native-reconcile-"));
		const projectId = "native-reconcile";
		const projectRoot = join(workspaceRoot, projectId);
		mkdirSync(join(projectRoot, "manuscript"), { recursive: true });
		writeFileSync(
			join(projectRoot, "novel.yaml"),
			`schema_version: 1\nproject_id: ${projectId}\ntitle: Native Reconcile\n`,
			"utf8",
		);
		const registry = new ProjectDatabaseRegistry();
		try {
			const authoring = new NativeChapterAuthoringAdapter(registry);
			const created = await authoring.createChapter(workspaceRoot, projectId, "native", { title: "第一章" });
			const draft = await authoring.saveDraft(workspaceRoot, projectId, "native", created.chapter, {
				content: "# 第一章\n\n创作发现：她决定主动追查。\n",
				baseContentHash: created.contentHash,
			});
			const report = await authoring.reconcileChapter(workspaceRoot, projectId, "native", created.chapter, {
				draftRevision: draft.draftRevision,
				contentHash: draft.contentHash,
			});
			expect(report.status).toBe("divergent");
			expect(report.divergences[0]?.kind).toBe("prose-discovery");
			expect(report.divergences[0]?.description).toBe("她决定主动追查。");
		} finally {
			registry.closeAll();
			rmSync(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("stores Markdown as the authority and recovers metadata after a restart", async () => {
		const workspaceRoot = mkdtempSync(join(tmpdir(), "pi-novel-native-"));
		const projectId = "native-story";
		const projectRoot = join(workspaceRoot, projectId);
		mkdirSync(join(projectRoot, "manuscript"), { recursive: true });
		writeFileSync(
			join(projectRoot, "novel.yaml"),
			`schema_version: 1\nproject_id: ${projectId}\ntitle: Native Story\n`,
			"utf8",
		);
		const registry = new ProjectDatabaseRegistry();
		try {
			const authoring = new NativeChapterAuthoringAdapter(registry);
			const created = await authoring.createChapter(workspaceRoot, projectId, "native", { title: "潮汐" });
			expect(readFileSync(join(projectRoot, "manuscript", "chapter-001.md"), "utf8")).toBe("# 潮汐\n\n");
			const metadata = registry.open(projectId, projectRoot).chapterMetadata;
			metadata.create({
				projectId,
				chapter: 1,
				orderIndex: 1,
				title: "潮汐",
				filePath: "manuscript/chapter-001.md",
				draftRevision: 1,
				contentHash: created.contentHash,
				mtime: created.updatedAt,
				workflowStatus: "draft",
				createdAt: created.updatedAt,
				updatedAt: created.updatedAt,
			});
			const nextContent = "# 潮汐\n\n雨一直下到凌晨。\n";
			const saved = await authoring.saveDraft(workspaceRoot, projectId, "native", 1, {
				content: nextContent,
				baseContentHash: created.contentHash,
			});
			metadata.update({
				...metadata.get(projectId, 1)!,
				draftRevision: saved.draftRevision,
				contentHash: saved.contentHash,
				mtime: saved.updatedAt,
				updatedAt: saved.updatedAt,
			});
			expect(saved.draftRevision).toBe(2);
			expect(readFileSync(join(projectRoot, "manuscript", "chapter-001.md"), "utf8")).toBe(nextContent);
			writeFileSync(join(projectRoot, "manuscript", "chapter-001.md"), "外部修改", "utf8");
			await expect(
				authoring.saveDraft(workspaceRoot, projectId, "native", 1, {
					content: "覆盖",
					baseContentHash: saved.contentHash,
				}),
			).rejects.toThrow("CHAPTER_EXTERNAL_MODIFICATION");
		} finally {
			registry.closeAll();
		}
		const restartedRegistry = new ProjectDatabaseRegistry();
		try {
			const restarted = new NativeChapterAuthoringAdapter(restartedRegistry);
			const draft = await restarted.readDraft(workspaceRoot, projectId, "native", 1);
			expect(draft?.draftRevision).toBe(2);
			expect(draft?.content).toBe("外部修改");
			const engine = new NativeNovelEngineAdapter(restartedRegistry);
			const chapters = await engine.listChapters(workspaceRoot, projectId, "native");
			expect(chapters).toHaveLength(1);
			expect(chapters[0]?.finalized).toBe(false);
			const columns = restartedRegistry.open(projectId, projectRoot).chapterMetadata;
			expect(JSON.stringify(columns.list(projectId))).not.toContain("外部修改");
		} finally {
			restartedRegistry.closeAll();
			rmSync(workspaceRoot, { recursive: true, force: true });
		}
	});

	it("returns partial impact with known, possible and unknown coverage", async () => {
		const workspaceRoot = mkdtempSync(join(tmpdir(), "pi-novel-native-impact-"));
		const projectId = "native-impact";
		const projectRoot = join(workspaceRoot, projectId);
		mkdirSync(join(projectRoot, "manuscript"), { recursive: true });
		writeFileSync(
			join(projectRoot, "novel.yaml"),
			`schema_version: 1\nproject_id: ${projectId}\ntitle: Impact\n`,
			"utf8",
		);
		const registry = new ProjectDatabaseRegistry();
		try {
			const engine = new NativeNovelEngineAdapter(registry);
			const impact = await engine.analyzeRevisionImpact(workspaceRoot, projectId, { changedChapter: 1 });
			expect(impact?.causalCoverage).toBe("partial");
			expect(impact?.items.some((item) => item.certainty === "KNOWN")).toBe(true);
			expect(impact?.items.some((item) => item.certainty === "UNKNOWN")).toBe(true);
			expect(impact?.summary).toContain("Story Graph");
		} finally {
			registry.closeAll();
			rmSync(workspaceRoot, { recursive: true, force: true });
		}
	});
});
