import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

const baseContract = {
	sceneId: "scene",
	chapter: 1,
	order: 1,
	pov: "protagonist",
	time: "day one",
	location: "station",
	goal: "learn the truth",
	opposition: "the truth is hidden",
	stakes: "the relationship or case will be lost",
	knowledgeBefore: [],
	informationReveal: ["a new fact"],
	emotionalStateBefore: "uncertain",
	emotionalTurn: "a choice becomes necessary",
	emotionalStateAfter: "committed",
	stateChanges: ["knowledge"],
	setups: ["a recurring object"],
	payoffs: [],
	exitHook: "a new decision is forced",
};

function summary(chapter: number) {
	return {
		pov: "protagonist",
		time: `day ${chapter}`,
		locations: ["station"],
		characters: ["protagonist"],
		events: [`event ${chapter}`],
		newFacts: [`fact ${chapter}`],
		relationshipChanges: chapter === 1 ? [] : ["trust changes"],
		cluesIntroduced: [`clue ${chapter}`],
		cluesResolved: chapter === 2 ? ["clue 1"] : [],
		itemsChanged: ["object"],
		openQuestions: chapter === 2 ? [] : ["what is hidden"],
	};
}

describe("novel MVP benchmark", () => {
	it.each(["suspense", "urban-romance"])("completes the two-chapter %s workflow", async (genre) => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-benchmark-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "benchmark", title: `${genre} benchmark`, genre });
			for (const chapter of [1, 2]) {
				await store.saveChapterPlan({ projectId: "benchmark", chapter, content: `Chapter ${chapter} plan` });
				await store.saveSceneContract({
					projectId: "benchmark",
					chapter,
					contracts: [{ ...baseContract, chapter, sceneId: `scene-${chapter}` }],
				});
				const draft = `Chapter ${chapter} draft for ${genre}`;
				await store.saveChapterDraft({ projectId: "benchmark", chapter, content: draft });
				const integrity = await store.checkContinuity({ projectId: "benchmark", chapter });
				expect(integrity.status).toBe("ok");
				await store.saveContinuityReport({
					projectId: "benchmark",
					chapter,
					draftRevision: 1,
					status: "ok",
					issues: [],
				});
				await store.finalizeChapter({
					projectId: "benchmark",
					chapter,
					title: `Chapter ${chapter}`,
					content: draft,
					summary: summary(chapter),
					draftRevision: 1,
					confirmation: "USER_CONFIRMED",
				});
			}
			const status = await store.getNovelStatus({ projectId: "benchmark" });
			expect(status.finalizedChapters).toEqual([1, 2]);
			expect(status.nextChapter).toBe(3);
			const context = await store.readStoryContext({
				projectId: "benchmark",
				task: "chapter-writing",
				chapter: 3,
				includePreviousChapterEnding: true,
			});
			expect(context.includedFiles.some((file) => file.endsWith("chapter-002.json"))).toBe(true);
			const exported = await store.exportManuscript({ projectId: "benchmark" });
			expect(exported.chapters).toBe(2);
			expect(JSON.parse(await readFile(join(cwd, "novels", "benchmark", "status.json"), "utf8")).nextChapter).toBe(
				3,
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
