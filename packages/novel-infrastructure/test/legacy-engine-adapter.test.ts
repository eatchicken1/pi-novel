import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LegacyNovelEngineAdapter } from "../src/legacy/novel-engine-adapter.ts";

function createLegacyProject(): { root: string; projectId: string; cleanup(): void } {
	const root = mkdtempSync(join(tmpdir(), "pi-novel-legacy-"));
	const projectId = "legacy-story";
	const projectRoot = join(root, "novels", projectId);
	mkdirSync(join(projectRoot, "chapters"), { recursive: true });
	mkdirSync(join(projectRoot, "summaries"), { recursive: true });
	mkdirSync(join(projectRoot, "work", "diagnosis"), { recursive: true });
	mkdirSync(join(projectRoot, "work", "mystery"), { recursive: true });
	mkdirSync(join(projectRoot, "work", "authoring"), { recursive: true });
	mkdirSync(join(projectRoot, "outline", "unified"), { recursive: true });
	mkdirSync(join(projectRoot, "outline", "mystery"), { recursive: true });
	mkdirSync(join(projectRoot, "continuity", "reports"), { recursive: true });
	mkdirSync(join(projectRoot, "characters"), { recursive: true });
	writeFileSync(join(projectRoot, "project.json"), JSON.stringify({ projectId, title: "Legacy Story", genre: "female-social-suspense", status: "writing", nextChapter: 2, memoryStatus: "current", continuityStatus: "ok", openThreads: 1, overdueThreads: 0, unresolvedSetups: 0, downstreamReviewRequired: false, currentMovement: "m1", finalizedChapters: [1] }), "utf8");
	writeFileSync(join(projectRoot, "chapters", "chapter-001.md"), "第一版正文内容，足够长。", "utf8");
	writeFileSync(join(projectRoot, "summaries", "chapter-001.json"), JSON.stringify({ chapter: 1, title: "第一章", draftRevision: 2, finalizedAt: "2026-08-16T00:00:00.000Z" }), "utf8");
	writeFileSync(join(projectRoot, "outline", "unified", "event-map.json"), JSON.stringify({ events: [{ eventId: 1, chapter: 1, action: "接案", causes: [], characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "a", to: "b" }], mysteryDelta: { discoveredClueIds: ["CL1"], revealClaimIds: [] }, professionalDelta: { actionIds: ["ACT1"] }, irreversible: false }] }), "utf8");
	writeFileSync(join(projectRoot, "characters", "heroine.json"), JSON.stringify({ characterId: "heroine", name: "沈砚" }), "utf8");
	writeFileSync(join(projectRoot, "outline", "mystery", "clue-ledger.json"), JSON.stringify([{ id: "CL1", observableFact: "门禁记录", plannedRealizationChapter: 1 }]), "utf8");
	writeFileSync(join(projectRoot, "work", "mystery", "truth-model-proposed.json"), JSON.stringify({ case: { truthClaims: [{ id: "T1", statement: "真相", plannedRevealChapter: 2 }] } }), "utf8");
	writeFileSync(join(projectRoot, "work", "authoring", "story-promises.json"), JSON.stringify({ promises: [{ id: "p1", promise: "查清真相" }] }), "utf8");
	writeFileSync(join(projectRoot, "work", "diagnosis", "chapter-001.json"), JSON.stringify({ findings: [{ priority: "P1", problem: "对话直白", sourceIssues: ["DIALOGUE_TOO_DIRECT"] }] }), "utf8");
	writeFileSync(join(projectRoot, "continuity", "reports", "mystery-realized-fairness.json"), JSON.stringify({ issues: [{ code: "REALIZED_REVEAL_BEFORE_PROOF", severity: "error", message: "final claim T1 is actually revealed in chapter 2 for the heroine audience before any proof path is fully realized" }], proofCoverage: { "T1:heroine": { revealChapter: 2 } }, unsupportedFinalClaims: [{ claimId: "T1", reason: "heroine: PP1: clue C2 is never actually realized for the heroine audience before the reveal" }] }), "utf8");
	return { root, projectId, cleanup() { rmSync(root, { recursive: true, force: true }); } };
}

describe("legacy novel engine adapter", () => {
	it("L1: reads status, chapters and chapter documents from a legacy project", async () => {
		const fixture = createLegacyProject();
		try {
			const adapter = new LegacyNovelEngineAdapter();
			const status = await adapter.getStatus(fixture.root, fixture.projectId);
			expect(status?.nextChapter).toBe(2);
			expect(status?.memoryStatus).toBe("current");
			expect(status?.finalizedChapters).toEqual([1]);
			const chapters = await adapter.listChapters(fixture.root, fixture.projectId, "legacy");
			expect(chapters).toHaveLength(1);
			expect(chapters[0]?.revision).toBe(2);
			expect(chapters[0]?.title).toBe("第一章");
			const chapter = await adapter.readChapter(fixture.root, fixture.projectId, "legacy", 1);
			expect(chapter?.text).toContain("第一版正文");
			expect(chapter?.contentHash).toMatch(/^[0-9a-f]{64}$/u);
		} finally { fixture.cleanup(); }
	});

	it("L2: review sources derive from persisted reports with landing chapters", async () => {
		const fixture = createLegacyProject();
		try {
			const adapter = new LegacyNovelEngineAdapter();
			const sources = await adapter.reviewSources(fixture.root, fixture.projectId);
			const fairness = sources.find((source) => source.sourceCode === "REALIZED_REVEAL_BEFORE_PROOF");
			expect(fairness?.landingChapter).toBe(2);
			expect(fairness?.scope).toBe("future-chapter");
			expect(fairness?.blockingForCurrentAction).toBe(false);
			const diagnosis = sources.find((source) => source.sourceCode === "DIALOGUE_TOO_DIRECT");
			expect(diagnosis?.chapter).toBe(1);
			expect(diagnosis?.scope).toBe("chapter");
		} finally { fixture.cleanup(); }
	});

	it("L3: story graph sources read unified events, characters, clues, claims and promises", async () => {
		const fixture = createLegacyProject();
		try {
			const adapter = new LegacyNovelEngineAdapter();
			const sources = await adapter.storyGraphSources(fixture.root, fixture.projectId);
			expect(sources?.events).toHaveLength(1);
			expect(sources?.events[0]?.characterRefs).toContain("heroine");
			expect(sources?.events[0]?.clueRefs).toContain("CL1");
			expect(sources?.characters[0]?.label).toBe("沈砚");
			expect(sources?.clues[0]?.clueId).toBe("CL1");
			expect(sources?.claims[0]?.revealChapter).toBe(2);
			expect(sources?.promises[0]?.promiseId).toBe("p1");
			expect(sources?.sourceHash.length).toBeGreaterThan(0);
		} finally { fixture.cleanup(); }
	});

	it("L4: missing project returns null without throwing", async () => {
		const fixture = createLegacyProject();
		try {
			const adapter = new LegacyNovelEngineAdapter();
			expect(await adapter.getStatus(fixture.root, "missing")).toBeNull();
			expect(await adapter.storyGraphSources(fixture.root, "missing")).toBeNull();
			expect(await adapter.analyzeRevisionImpact(fixture.root, "missing", {})).toBeNull();
		} finally { fixture.cleanup(); }
	});
});