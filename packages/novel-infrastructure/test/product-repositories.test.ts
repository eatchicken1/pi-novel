import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChangeSet } from "@earendil-works/pi-novel-contracts";
import { describe, expect, it } from "vitest";
import { ChangeSetRepository } from "../src/sqlite/changeset-repository.ts";
import { CommitRepository } from "../src/sqlite/commit-repository.ts";
import { ProjectDatabase } from "../src/sqlite/project-database.ts";
import { ReviewRepository, reviewIssueDedupKey } from "../src/sqlite/review-repository.ts";
import { StoryGraphRepository } from "../src/sqlite/story-graph-repository.ts";
import { TaskRepository } from "../src/sqlite/task-repository.ts";
import { WorkspaceDatabase } from "../src/sqlite/workspace-database.ts";

function tempDbPath(prefix: string): string {
	return join(mkdtempSync(join(tmpdir(), `novel-infra-${prefix}-`)), "test.sqlite");
}

function removeDb(path: string): void {
	try {
		rmSync(path, { recursive: true });
	} catch {}
}

describe("product repositories", () => {
	it("M1: project database applies versioned migrations transactionally", () => {
		const path = tempDbPath("m1");
		const db = new ProjectDatabase(path);
		const applied = db.db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as Array<{ id: string }>;
		expect(applied.map((row) => row.id)).toEqual([
			"001_project_initial.sql",
			"003_project_product.sql",
			"004_commit_recovery.sql",
		]);
		const tables = db.db.prepare("PRAGMA table_list").all() as Array<{ name: string }>;
		const names = new Set(tables.map((row) => row.name));
		for (const table of [
			"project_metadata",
			"changesets",
			"review_issues",
			"commits",
			"checkpoints",
			"commit_journals",
			"story_nodes",
			"story_edges",
			"artifacts",
		]) {
			expect(names.has(table), table).toBe(true);
		}
		db.close();
		removeDb(path);
	});

	it("M2: workspace database applies task product migration", () => {
		const path = tempDbPath("m2");
		const db = new WorkspaceDatabase(path);
		const applied = db.db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as Array<{ id: string }>;
		expect(applied.some((row) => row.id === "003_task_product.sql")).toBe(true);
		const columns = db.db.prepare("PRAGMA table_info(tasks)").all() as Array<{ name: string }>;
		const names = new Set(columns.map((row) => row.name));
		for (const column of ["progress_json", "result_ref", "started_at", "completed_at"])
			expect(names.has(column), column).toBe(true);
		db.close();
		removeDb(path);
	});

	it("C1: ChangeSetRepository round trips with impact and review", () => {
		const path = tempDbPath("c1");
		const db = new ProjectDatabase(path);
		const repo = new ChangeSetRepository(db.db);
		repo.create({
			changeSetId: "cs-1",
			projectId: "p-1",
			title: "Rewrite ch3",
			status: "proposed",
			kind: "content",
			source: "agent",
			intent: "increase-subtext",
			baseRevision: "rev-2",
			operations: [
				{
					operationId: "op-1",
					kind: "replace-text",
					target: "manuscript/chapter-003.md",
					startChar: 10,
					endChar: 40,
					text: "x",
				},
			],
			impact: {
				severity: "downstream-review",
				affectedChapters: [3],
				affectedCharacters: ["heroine"],
				affectedThreads: [],
				affectedClues: [],
				affectedPromises: [],
				summary: "s",
				analyzedAt: "2026-08-16T10:00:00.000Z",
			},
			createdAt: "2026-08-16T10:00:00.000Z",
			updatedAt: "2026-08-16T10:00:00.000Z",
		});
		const loaded = repo.get("cs-1");
		expect(loaded?.title).toBe("Rewrite ch3");
		expect(loaded?.impact?.severity).toBe("downstream-review");
		expect(repo.listPending("p-1").map((cs) => cs.changeSetId)).toEqual(["cs-1"]);
		const committed: ChangeSet = {
			changeSetId: "cs-1",
			projectId: "p-1",
			title: "Rewrite ch3",
			status: "committed",
			kind: "content",
			source: "agent",
			intent: "increase-subtext",
			baseRevision: "rev-2",
			operations: [
				{
					operationId: "op-1",
					kind: "replace-text",
					target: "manuscript/chapter-003.md",
					startChar: 10,
					endChar: 40,
					text: "x",
				},
			],
			impact: {
				severity: "downstream-review",
				affectedChapters: [3],
				affectedCharacters: ["heroine"],
				affectedThreads: [],
				affectedClues: [],
				affectedPromises: [],
				summary: "s",
				analyzedAt: "2026-08-16T10:00:00.000Z",
			},
			createdAt: "2026-08-16T10:00:00.000Z",
			updatedAt: "2026-08-16T11:00:00.000Z",
			committedAt: "2026-08-16T11:00:00.000Z",
		};
		repo.update(committed);
		expect(repo.listPending("p-1")).toEqual([]);
		db.close();
		removeDb(path);
	});

	it("R2: ReviewRepository dedups issues by source identity and summarizes", () => {
		const path = tempDbPath("r2");
		const db = new ProjectDatabase(path);
		const repo = new ReviewRepository(db.db);
		const base = {
			projectId: "p-1",
			sourceCode: "REALIZED_REVEAL_BEFORE_PROOF",
			severity: "error" as const,
			priority: "P0" as const,
			scope: "future-chapter" as const,
			repairScope: "event-graph" as const,
			blockingForCurrentAction: false,
			chapter: null,
			scene: null,
			landingChapter: 5,
			message: "m",
			evidence: null,
			status: "open" as const,
			firstSeenAt: "2026-08-16T10:00:00.000Z",
			lastSeenAt: "2026-08-16T10:00:00.000Z",
			resolvedAt: null,
		};
		const first = repo.upsert({ ...base, issueId: "iss-1" });
		const second = repo.upsert({ ...base, issueId: "iss-2", lastSeenAt: "2026-08-16T11:00:00.000Z" });
		expect(first.created).toBe(true);
		expect(second.created).toBe(false);
		const issues = repo.list("p-1");
		expect(issues).toHaveLength(1);
		expect(issues[0]?.lastSeenAt).toBe("2026-08-16T11:00:00.000Z");
		const summary = repo.summary("p-1");
		expect(summary.openCount).toBe(1);
		expect(summary.blockingCount).toBe(0);
		expect(summary.errorCount).toBe(1);
		repo.updateStatus("iss-1", "acknowledged", null);
		expect(repo.list("p-1", { status: "acknowledged" })).toHaveLength(1);
		expect(reviewIssueDedupKey(base)).toBe(reviewIssueDedupKey({ ...base, message: "different message" }));
		db.close();
		removeDb(path);
	});

	it("R3: CommitRepository records commits, journals and checkpoints", () => {
		const path = tempDbPath("r3");
		const db = new ProjectDatabase(path);
		const repo = new CommitRepository(db.db);
		repo.record({
			commitId: "cm-1",
			projectId: "p-1",
			changeSetId: "cs-1",
			actor: "user",
			summary: "edit ch3",
			affectedFiles: ["manuscript/chapter-003.md"],
			beforeHashes: { "manuscript/chapter-003.md": "a" },
			afterHashes: { "manuscript/chapter-003.md": "b" },
			resolvedIssueCount: 2,
			createdAt: "2026-08-16T10:00:00.000Z",
		});
		expect(repo.get("cm-1")?.resolvedIssueCount).toBe(2);
		expect(repo.list("p-1")).toHaveLength(1);
		repo.createCheckpoint({
			checkpointId: "cp-1",
			projectId: "p-1",
			label: "before rewrite",
			manifestHashes: { "manuscript/chapter-003.md": "a" },
			createdAt: "2026-08-16T10:00:00.000Z",
		});
		repo.createJournal({
			journalId: "j-1",
			projectId: "p-1",
			changeSetId: "cs-1",
			state: "pending",
			files: [{ relativePath: "manuscript/chapter-003.md", tempPath: "manuscript/chapter-003.md.j-1.tmp" }],
			dbActions: ["changeset.status=committing"],
			startedAt: "2026-08-16T10:00:00.000Z",
			completedAt: null,
		});
		expect(repo.pendingJournals("p-1")).toHaveLength(1);
		repo.updateJournalState("j-1", "committed", "2026-08-16T10:00:01.000Z");
		expect(repo.pendingJournals("p-1")).toHaveLength(0);
		db.close();
		removeDb(path);
	});

	it("G1: StoryGraphRepository rebuilds and filters the projection", () => {
		const path = tempDbPath("g1");
		const db = new ProjectDatabase(path);
		const repo = new StoryGraphRepository(db.db);
		repo.replaceAll({
			projectId: "p-1",
			nodes: [
				{ nodeId: "ev-1", type: "event", ref: "1", label: "接案", chapter: 1, meta: {} },
				{ nodeId: "ev-5", type: "event", ref: "5", label: "揭示", chapter: 5, meta: {} },
				{ nodeId: "clue-1", type: "clue", ref: "CL1", label: "门禁", chapter: 1, meta: { reliability: "medium" } },
				{
					nodeId: "char-1",
					type: "character",
					ref: "heroine",
					label: "沈砚",
					chapter: null,
					meta: { characterId: "heroine" },
				},
			],
			edges: [{ edgeId: "e-1", sourceNodeId: "ev-1", targetNodeId: "clue-1", type: "reveals", label: null }],
			sourceHash: "abc",
			generatedAt: "2026-08-16T10:00:00.000Z",
		});
		const all = repo.query("p-1", {});
		expect(all.nodes).toHaveLength(4);
		const filtered = repo.query("p-1", { chapterFrom: 1, chapterTo: 2 });
		expect(filtered.nodes.map((n) => n.nodeId)).toEqual(["ev-1", "clue-1"]);
		expect(filtered.edges).toHaveLength(1);
		const typed = repo.query("p-1", { nodeTypes: ["clue"] });
		expect(typed.nodes.map((n) => n.nodeId)).toEqual(["clue-1"]);
		const character = repo.query("p-1", { characterId: "heroine" });
		expect(character.nodes.map((n) => n.nodeId)).toContain("char-1");
		expect(repo.counts("p-1")).toEqual({ nodes: 4, edges: 1 });
		repo.replaceAll({
			projectId: "p-1",
			nodes: [],
			edges: [],
			sourceHash: "def",
			generatedAt: "2026-08-16T10:00:00.000Z",
		});
		expect(repo.counts("p-1")).toEqual({ nodes: 0, edges: 0 });
		db.close();
		removeDb(path);
	});

	it("T1: TaskRepository stores tasks, ordered events and agent runs", () => {
		const path = tempDbPath("t1");
		const db = new WorkspaceDatabase(path);
		const repo = new TaskRepository(path);
		repo.createTask({
			taskId: "t-1",
			projectId: "p-1",
			forgeSessionId: null,
			type: "generate-chapter",
			status: "queued",
			resultRef: null,
			errorMessage: null,
			createdAt: "2026-08-16T10:00:00.000Z",
			startedAt: null,
			completedAt: null,
			updatedAt: "2026-08-16T10:00:00.000Z",
		});
		repo.appendEvent({
			eventId: "ev-1",
			taskId: "t-1",
			sequence: 1,
			type: "task.started",
			createdAt: "2026-08-16T10:00:00.000Z",
		});
		repo.appendEvent({
			eventId: "ev-2",
			taskId: "t-1",
			sequence: 2,
			type: "task.progress",
			payload: { phase: "drafting" },
			createdAt: "2026-08-16T10:00:01.000Z",
		});
		const events = repo.listEvents("t-1");
		expect(events.map((event) => event.type)).toEqual(["task.started", "task.progress"]);
		expect(repo.maxSequence("t-1")).toBe(2);
		expect(repo.listEvents("t-1", 1).map((event) => event.type)).toEqual(["task.progress"]);
		const task = repo.getTask("t-1");
		expect(task?.status).toBe("queued");
		repo.createAgentRun({
			agentRunId: "r-1",
			taskId: "t-1",
			model: "faux-1",
			intent: "explore",
			status: "running",
			startedAt: "2026-08-16T10:00:00.000Z",
			completedAt: null,
			producedArtifacts: [],
		});
		expect(repo.getAgentRun("r-1")?.model).toBe("faux-1");
		db.close();
		removeDb(path);
	});
});
