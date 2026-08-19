import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";
import { FileTransaction, ProjectDatabaseRegistry } from "@earendil-works/pi-novel-infrastructure";
import { describe, expect, it } from "vitest";
import { ChangeSetService } from "../src/changesets/change-set-service.ts";
import { createTextAnchor } from "../src/patch/text-anchor.ts";
import type { NovelEnginePort, ProjectDatabaseRegistryPort } from "../src/ports.ts";
import type { WorkspaceService } from "../src/workspace/workspace-service.ts";

interface Harness {
	service: ChangeSetService;
	projectRoot: string;
	registry: ProjectDatabaseRegistryPort;
	invalidateCalls: number[];
	cleanup(): void;
}

function createHarness(): Harness {
	const projectRoot = mkdtempSync(join(tmpdir(), "pi-novel-cs-"));
	mkdirSync(join(projectRoot, "manuscript"), { recursive: true });
	writeFileSync(join(projectRoot, "manuscript", "chapter-001.md"), "第一版正文内容，足够长。", "utf8");
	const project: ProjectRecord = {
		projectId: "p-1",
		title: "T",
		rootPath: projectRoot,
		kind: "native",
		status: "ready",
		wordCount: 10,
		lastModifiedAt: new Date().toISOString(),
		manifest: null,
	};
	const invalidateCalls: number[] = [];
	const workspace = {
		getOverview: async (): Promise<WorkspaceOverview> => ({
			manifest: {
				schemaVersion: 1,
				workspaceId: "w-1",
				rootPath: projectRoot,
				createdAt: "2026-08-16T00:00:00.000Z",
				updatedAt: "2026-08-16T00:00:00.000Z",
			},
			projects: [project],
			summary: { projectCount: 1, nativeProjectCount: 1, legacyProjectCount: 0, wordCount: 10, lastScanAt: null },
			warnings: [],
		}),
	} as unknown as WorkspaceService;
	const engine = {
		analyzeRevisionImpact: async () => ({
			severity: "safe-local" as const,
			affectedChapters: [],
			affectedCharacters: [],
			affectedThreads: [],
			affectedClues: [],
			affectedPromises: [],
			summary: "s",
			analyzedAt: new Date().toISOString(),
		}),
		invalidateDerived: async () => {
			invalidateCalls.push(1);
		},
	} as unknown as NovelEnginePort;
	const registry = new ProjectDatabaseRegistry();
	let idCounter = 0;
	const service = new ChangeSetService({
		workspace,
		engine,
		registry,
		files: new FileTransaction(),
		idempotency: new MapIdempotency(),
		id: { id: () => `id-${++idCounter}` },
		clock: { now: () => new Date().toISOString() },
	});
	return {
		service,
		projectRoot,
		registry,
		invalidateCalls,
		cleanup() {
			registry.closeAll();
			rmSync(projectRoot, { recursive: true, force: true });
		},
	};
}

class MapIdempotency {
	private readonly results = new Map<string, unknown>();

	hasResult(key: string): boolean {
		return this.results.has(key);
	}

	storeResult(key: string, payload: unknown): void {
		this.results.set(key, payload);
	}
}

function chapterText(root: string): string {
	return readFileSync(join(root, "manuscript", "chapter-001.md"), "utf8");
}

describe("change set commit pipeline", () => {
	it("C1: proposal does not mutate the manuscript", async () => {
		const h = createHarness();
		try {
			const before = chapterText(h.projectRoot);
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "edit",
				kind: "content",
				source: "user",
				intent: "fix prose",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 3,
						text: "修正",
					},
				],
			});
			expect(changeSet.status).toBe("proposed");
			expect(chapterText(h.projectRoot)).toBe(before);
		} finally {
			h.cleanup();
		}
	});

	it("C2: accept does not mutate until commit", async () => {
		const h = createHarness();
		try {
			const before = chapterText(h.projectRoot);
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "edit",
				kind: "content",
				source: "user",
				intent: "x",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 3,
						text: "修正",
					},
				],
			});
			const accepted = await h.service.accept("p-1", changeSet.changeSetId);
			expect(accepted.status).toBe("accepted");
			expect(chapterText(h.projectRoot)).toBe(before);
		} finally {
			h.cleanup();
		}
	});

	it("C3: reject never mutates", async () => {
		const h = createHarness();
		try {
			const before = chapterText(h.projectRoot);
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "edit",
				kind: "content",
				source: "user",
				intent: "x",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 3,
						text: "修正",
					},
				],
			});
			const rejected = await h.service.reject("p-1", changeSet.changeSetId);
			expect(rejected.status).toBe("rejected");
			expect(chapterText(h.projectRoot)).toBe(before);
		} finally {
			h.cleanup();
		}
	});

	it("C4: stale base blocks commit with CHANGESET_BASE_STALE (external edit detection)", async () => {
		const h = createHarness();
		try {
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "edit",
				kind: "content",
				source: "user",
				intent: "x",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 3,
						text: "修正",
						baseHash: "expected-old-hash",
					},
				],
			});
			await h.service.accept("p-1", changeSet.changeSetId);
			await expect(h.service.commit("p-1", changeSet.changeSetId, "user")).rejects.toThrow("CHANGESET_BASE_STALE");
			const stored = h.registry.open("p-1", h.projectRoot).changesets.get(changeSet.changeSetId);
			expect(stored?.status).toBe("conflict");
			// canonical 未被覆盖
			expect(chapterText(h.projectRoot)).toContain("第一版正文");
		} finally {
			h.cleanup();
		}
	});

	it("C5: commit applies atomically and C6 records history", async () => {
		const h = createHarness();
		try {
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "edit ch1",
				kind: "content",
				source: "user",
				intent: "fix opening",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 3,
						text: "修正",
					},
				],
			});
			await h.service.accept("p-1", changeSet.changeSetId);
			const { changeSet: committed, commit } = await h.service.commit("p-1", changeSet.changeSetId, "user");
			expect(committed.status).toBe("committed");
			expect(committed.committedAt).toBeDefined();
			expect(chapterText(h.projectRoot)).toContain("修正");
			expect(commit.changeSetId).toBe(changeSet.changeSetId);
			expect(commit.affectedFiles).toEqual(["manuscript/chapter-001.md"]);
			expect(commit.beforeHashes["manuscript/chapter-001.md"]).toBeDefined();
			expect(commit.afterHashes["manuscript/chapter-001.md"]).toBeDefined();
			const history = h.registry.open("p-1", h.projectRoot).commits.list("p-1");
			expect(history).toHaveLength(1);
			expect(history[0]?.summary).toBe("edit ch1");
		} finally {
			h.cleanup();
		}
	});

	it("relocates a manuscript patch after an unrelated prefix edit", async () => {
		const h = createHarness();
		try {
			const original = chapterText(h.projectRoot);
			const start = original.indexOf("正文内容");
			const anchor = createTextAnchor({
				chapterId: "1",
				content: original,
				startOffset: start,
				endOffset: start + 4,
			});
			const impact = {
				severity: "safe-local" as const,
				causalCoverage: "partial" as const,
				items: [],
				affectedChapters: [1],
				affectedCharacters: [],
				affectedThreads: [],
				affectedClues: [],
				affectedPromises: [],
				summary: "local",
				analyzedAt: new Date().toISOString(),
			};
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "patch",
				kind: "MANUSCRIPT_PATCH",
				source: "agent",
				intent: "tighten",
				baseRevision: "1",
				operations: [
					{
						operationId: "patch-op",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						baseHash: anchor.baseContentHash,
						startChar: start,
						endChar: start + 4,
						text: "改写",
						anchor,
					},
				],
				patch: {
					goal: "tighten",
					target: "manuscript/chapter-001.md",
					constraints: ["facts"],
					operations: [
						{
							operationId: "patch-op",
							kind: "replace-text",
							target: "manuscript/chapter-001.md",
							baseHash: anchor.baseContentHash,
							startChar: start,
							endChar: start + 4,
							text: "改写",
							anchor,
						},
					],
					impact,
					provenance: { agentId: "chapter.reviser", runtimeModelId: "test/model", thinkingLevel: "off" },
					baseRevision: 1,
					baseContentHash: anchor.baseContentHash,
					anchor,
					candidates: [
						{ candidateId: "candidate-1", original: "正文内容", replacement: "改写", explanation: "tighten" },
					],
				},
			});
			await h.service.accept("p-1", changeSet.changeSetId, "candidate-1");
			writeFileSync(join(h.projectRoot, "manuscript", "chapter-001.md"), `新增前缀。\n${original}`, "utf8");
			const result = await h.service.commit("p-1", changeSet.changeSetId, "agent");
			expect(result.changeSet.status).toBe("committed");
			expect(chapterText(h.projectRoot)).toContain("新增前缀。\n第一版改写，足够长。");
		} finally {
			h.cleanup();
		}
	});

	it("C7: commit invalidates derived engine state and is idempotent per key", async () => {
		const h = createHarness();
		try {
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "edit",
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
						endChar: 3,
						text: "新",
					},
				],
			});
			await h.service.accept("p-1", changeSet.changeSetId);
			await h.service.commit("p-1", changeSet.changeSetId, "agent", "key-1");
			expect(h.invalidateCalls.length).toBe(1);
			// 相同 key 重试 → IDEMPOTENT_REPLAY，不产生第二个 commit
			await expect(h.service.commit("p-1", changeSet.changeSetId, "agent", "key-1")).rejects.toThrow(
				"IDEMPOTENT_REPLAY",
			);
			const history = h.registry.open("p-1", h.projectRoot).commits.list("p-1");
			expect(history).toHaveLength(1);
		} finally {
			h.cleanup();
		}
	});

	it("CRASH1: pending journal with applied files recovers as committed; pending temp rolls back", async () => {
		const h = createHarness();
		try {
			// 模拟崩溃：state=pending（temp 未落盘）
			const commits = h.registry.open("p-1", h.projectRoot).commits;
			commits.createJournal({
				journalId: "j-pending",
				projectId: "p-1",
				changeSetId: "cs-y",
				state: "pending",
				files: [{ relativePath: "manuscript/chapter-001.md", tempPath: "manuscript/chapter-001.md.y.tmp" }],
				dbActions: [],
				startedAt: new Date().toISOString(),
				completedAt: null,
			});
			const recovered = await h.service.recoverPendingCommits("p-1");
			expect(recovered).toBe(1);
			const remaining = h.registry.open("p-1", h.projectRoot).commits.pendingJournals("p-1");
			expect(remaining).toHaveLength(0);
			// canonical 未被部分修改破坏
			expect(existsSync(join(h.projectRoot, "manuscript", "chapter-001.md"))).toBe(true);
		} finally {
			h.cleanup();
		}
	});

	it("rebuilds the commit record when a crash happens after file replacement", async () => {
		const h = createHarness();
		try {
			const changeSet = await h.service.create({
				projectId: "p-1",
				title: "recover edit",
				kind: "content",
				source: "user",
				intent: "recover",
				baseRevision: null,
				operations: [
					{
						operationId: "op-1",
						kind: "replace-text",
						target: "manuscript/chapter-001.md",
						startChar: 0,
						endChar: 3,
						text: "恢复",
					},
				],
			});
			await h.service.accept("p-1", changeSet.changeSetId);
			const repository = h.registry.open("p-1", h.projectRoot);
			repository.changesets.update({ ...changeSet, status: "committing" });
			const files = new FileTransaction();
			const currentHashes = await files.currentHashes(h.projectRoot, ["manuscript/chapter-001.md"]);
			const applied = await files.applyOperations({
				projectRoot: h.projectRoot,
				operations: changeSet.operations,
				baseHashes: currentHashes,
			});
			await files.finalize({ projectRoot: h.projectRoot, staged: applied.staged });
			repository.commits.createJournal({
				journalId: "j-recover",
				projectId: "p-1",
				changeSetId: changeSet.changeSetId,
				state: "applied",
				files: applied.staged,
				dbActions: ["changeset.status=committing"],
				startedAt: "2026-08-18T00:00:00.000Z",
				completedAt: null,
				commit: {
					commitId: "commit-recovered",
					actor: "user",
					summary: "recover edit",
					createdAt: "2026-08-18T00:00:00.000Z",
				},
			});

			expect(await h.service.recoverPendingCommits("p-1")).toBe(1);
			expect(repository.changesets.get(changeSet.changeSetId)?.status).toBe("committed");
			expect(repository.commits.get("commit-recovered")?.affectedFiles).toEqual(["manuscript/chapter-001.md"]);
			expect(repository.commits.pendingJournals("p-1")).toHaveLength(0);
		} finally {
			h.cleanup();
		}
	});
});
