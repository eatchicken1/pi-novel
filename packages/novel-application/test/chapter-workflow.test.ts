import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ChapterDraft, ReconcileReport, SettlementInput } from "@earendil-works/pi-novel-contracts";
import { FileTransaction, ProjectDatabaseRegistry } from "@earendil-works/pi-novel-infrastructure";
import { describe, expect, it } from "vitest";
import { ChangeSetService } from "../src/changesets/change-set-service.ts";
import { ChapterWorkflowService } from "../src/chapter-workflow/chapter-workflow-service.ts";
import type { ChapterAuthoringPort, NovelEnginePort } from "../src/ports.ts";
import { ReviewService } from "../src/review/review-service.ts";
import type { WorkspaceService } from "../src/workspace/workspace-service.ts";

function hash(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function settlementInput(draft: ChapterDraft): SettlementInput {
	return {
		draftRevision: draft.draftRevision,
		contentHash: draft.contentHash,
		summary: {
			pov: "heroine",
			time: "now",
			locations: ["office"],
			characters: ["heroine"],
			events: ["she chooses to investigate"],
			newFacts: ["the file is altered"],
			relationshipChanges: [],
			cluesIntroduced: ["CL1"],
			cluesResolved: [],
			itemsChanged: ["OBJ1"],
			openQuestions: ["who changed the file"],
		},
		knowledgeChanges: [{ characterId: "heroine", change: "knows CL1" }],
		relationshipChanges: [],
		objects: ["OBJ1"],
		threads: ["THREAD1"],
		promises: [],
		clues: ["CL1"],
		professionalState: ["case opened"],
		timelineChanges: ["investigation begins"],
		confirmation: "USER_CONFIRMED",
	};
}

describe("ChapterWorkflowService", () => {
	it("keeps future P0 issues out of current chapter finalization", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-novel-workflow-"));
		mkdirSync(root, { recursive: true });
		const project = {
			projectId: "p-1",
			title: "T",
			rootPath: root,
			kind: "native" as const,
			status: "ready",
			wordCount: 1,
			lastModifiedAt: "2026-08-18T00:00:00.000Z",
			manifest: null,
		};
		const overview = {
			manifest: {
				schemaVersion: 1,
				workspaceId: "w",
				rootPath: root,
				createdAt: "2026-08-18T00:00:00.000Z",
				updatedAt: "2026-08-18T00:00:00.000Z",
			},
			projects: [project],
			summary: { projectCount: 1, nativeProjectCount: 1, legacyProjectCount: 0, wordCount: 1, lastScanAt: null },
			warnings: [],
		};
		const content = "正文。";
		const draft: ChapterDraft = {
			projectId: "p-1",
			chapter: 1,
			draftRevision: 1,
			contentHash: hash(content),
			content,
			updatedAt: "2026-08-18T00:00:00.000Z",
		};
		const report: ReconcileReport = {
			projectId: "p-1",
			chapter: 1,
			draftRevision: 1,
			contentHash: draft.contentHash,
			status: "aligned",
			divergences: [],
			authorDecision: null,
			changeSetId: null,
			createdAt: draft.updatedAt,
			updatedAt: draft.updatedAt,
		};
		const engine = {
			readDraft: async () => draft,
			reconcileChapter: async () => report,
			finalizeChapter: async () => ({ projectId: "p-1", chapter: 1, memoryCommitted: true, transactionId: "tx-1" }),
			getStatus: async () => ({
				nextChapter: 1,
				finalizedChapters: [],
				memoryStatus: "current",
				continuityStatus: "ok",
				openThreads: 0,
				overdueThreads: 0,
				unresolvedSetups: 0,
				downstreamReviewRequired: false,
				currentMovement: null,
			}),
			reviewSources: async () => [
				{
					sourceCode: "FUTURE",
					severity: "error" as const,
					priority: "P0" as const,
					scope: "future-chapter" as const,
					repairScope: "event-graph" as const,
					blockingForCurrentAction: false,
					chapter: null,
					scene: null,
					landingChapter: 5,
					message: "future",
					evidence: null,
				},
			],
			listChapters: async () => [],
			readChapter: async () => null,
			analyzeRevisionImpact: async () => null,
			storyGraphSources: async () => null,
			invalidateDerived: async () => undefined,
		} as unknown as NovelEnginePort & ChapterAuthoringPort;
		const workspace = { getOverview: async () => overview } as unknown as WorkspaceService;
		const registry = new ProjectDatabaseRegistry();
		try {
			const review = new ReviewService({ workspace, engine, registry, id: { id: () => "issue-1" } });
			await review.refresh("p-1");
			const changeSets = new ChangeSetService({
				workspace,
				engine,
				registry,
				files: new FileTransaction(),
				idempotency: { hasResult: () => false, storeResult: () => undefined },
				id: { id: () => "cs-1" },
				clock: { now: () => "2026-08-18T00:00:00.000Z" },
			});
			const service = new ChapterWorkflowService({
				workspace,
				registry,
				engine,
				review,
				changeSets,
				clock: { now: () => "2026-08-18T00:00:00.000Z" },
			});
			await service.reconcile("p-1", 1, { draftRevision: 1, contentHash: draft.contentHash });
			const settled = await service.settle("p-1", 1, settlementInput(draft));
			expect(settled.chapter).toBe(1);
			const finalized = await service.finalize("p-1", 1, {
				draftRevision: 1,
				contentHash: draft.contentHash,
				title: "第一章",
				content,
				confirmation: "USER_CONFIRMED",
			});
			expect(finalized.transactionId).toBe("tx-1");
		} finally {
			registry.closeAll();
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("rejects settlement when the draft changed after reconciliation", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-novel-workflow-stale-"));
		const project = {
			projectId: "p-1",
			title: "T",
			rootPath: root,
			kind: "native" as const,
			status: "ready",
			wordCount: 1,
			lastModifiedAt: "2026-08-18T00:00:00.000Z",
			manifest: null,
		};
		const overview = {
			manifest: {
				schemaVersion: 1,
				workspaceId: "w",
				rootPath: root,
				createdAt: "2026-08-18T00:00:00.000Z",
				updatedAt: "2026-08-18T00:00:00.000Z",
			},
			projects: [project],
			summary: { projectCount: 1, nativeProjectCount: 1, legacyProjectCount: 0, wordCount: 1, lastScanAt: null },
			warnings: [],
		};
		let current: ChapterDraft = {
			projectId: "p-1",
			chapter: 1,
			draftRevision: 1,
			contentHash: hash("旧稿"),
			content: "旧稿",
			updatedAt: "2026-08-18T00:00:00.000Z",
		};
		const report: ReconcileReport = {
			projectId: "p-1",
			chapter: 1,
			draftRevision: 1,
			contentHash: current.contentHash,
			status: "aligned",
			divergences: [],
			authorDecision: null,
			changeSetId: null,
			createdAt: current.updatedAt,
			updatedAt: current.updatedAt,
		};
		const engine = {
			readDraft: async () => current,
			reconcileChapter: async () => report,
			getStatus: async () => ({
				nextChapter: 1,
				finalizedChapters: [],
				memoryStatus: "current",
				continuityStatus: "ok",
				openThreads: 0,
				overdueThreads: 0,
				unresolvedSetups: 0,
				downstreamReviewRequired: false,
				currentMovement: null,
			}),
			reviewSources: async () => [],
			analyzeRevisionImpact: async () => null,
			listChapters: async () => [],
			readChapter: async () => null,
			storyGraphSources: async () => null,
			invalidateDerived: async () => undefined,
			finalizeChapter: async () => ({ projectId: "p-1", chapter: 1, memoryCommitted: true, transactionId: "tx" }),
		} as unknown as NovelEnginePort & ChapterAuthoringPort;
		const workspace = { getOverview: async () => overview } as unknown as WorkspaceService;
		const registry = new ProjectDatabaseRegistry();
		try {
			const review = new ReviewService({ workspace, engine, registry, id: { id: () => "issue" } });
			const changeSets = new ChangeSetService({
				workspace,
				engine,
				registry,
				files: new FileTransaction(),
				idempotency: { hasResult: () => false, storeResult: () => undefined },
				id: { id: () => "cs" },
				clock: { now: () => "2026-08-18T00:00:00.000Z" },
			});
			const service = new ChapterWorkflowService({
				workspace,
				registry,
				engine,
				review,
				changeSets,
				clock: { now: () => "2026-08-18T00:00:00.000Z" },
			});
			await service.reconcile("p-1", 1, { draftRevision: 1, contentHash: current.contentHash });
			current = { ...current, draftRevision: 2, content: "新稿", contentHash: hash("新稿") };
			await expect(service.settle("p-1", 1, settlementInput(current))).rejects.toThrow("DRAFT_STALE");
		} finally {
			registry.closeAll();
			rmSync(root, { recursive: true, force: true });
		}
	});
});
