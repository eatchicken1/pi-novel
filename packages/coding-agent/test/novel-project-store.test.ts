import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

async function withStore(test: (store: NovelProjectStore, cwd: string) => Promise<void>): Promise<void> {
	const cwd = await mkdtemp(join(tmpdir(), "pi-novel-test-"));
	try {
		await test(new NovelProjectStore(cwd), cwd);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}

const sceneContract = {
	sceneId: "scene-001",
	chapter: 1,
	order: 1,
	pov: "林默",
	time: "夜晚",
	location: "旧档案室",
	goal: "找到失踪档案",
	opposition: "门卫即将巡查",
	stakes: "暴露会失去唯一线索",
	knowledgeBefore: ["档案在旧档案室"],
	informationReveal: ["档案被人提前取走"],
	emotionalStateBefore: "焦虑",
	emotionalTurn: "从主动调查转为被调查",
	emotionalStateAfter: "警觉",
	stateChanges: ["人物知识"],
	setups: ["门卫巡查路线"],
	payoffs: [],
	exitHook: "门外传来钥匙转动声",
};

const summary = {
	pov: "林默",
	time: "夜晚",
	locations: ["旧档案室"],
	characters: ["林默"],
	events: ["发现档案被取走"],
	newFacts: ["有人先一步取走档案"],
	relationshipChanges: [],
	cluesIntroduced: ["钥匙转动声"],
	cluesResolved: [],
	itemsChanged: ["失踪档案"],
	openQuestions: ["谁取走了档案"],
};

async function prepareChapter(store: NovelProjectStore): Promise<void> {
	await store.saveChapterPlan({ projectId: "demo", chapter: 1, content: "本章计划" });
	await store.saveSceneContract({ projectId: "demo", chapter: 1, contracts: [sceneContract] });
	await store.saveChapterDraft({ projectId: "demo", chapter: 1, content: "第一章草稿" });
	await store.checkContinuity({ projectId: "demo", chapter: 1 });
	await store.saveContinuityReport({ projectId: "demo", chapter: 1, draftRevision: 1, status: "ok", issues: [] });
}

describe("NovelProjectStore", () => {
	it("rejects invalid project ids and path traversal", async () => {
		await withStore(async (store) => {
			await expect(store.initializeNovel({ projectId: "../escape", title: "x", genre: "y" })).rejects.toThrow(
				"Invalid projectId",
			);
			await expect(store.initializeNovel({ projectId: "UPPER", title: "x", genre: "y" })).rejects.toThrow(
				"Invalid projectId",
			);
		});
	});

	it("never overwrites an existing project during initialization", async () => {
		await withStore(async (store, cwd) => {
			await store.initializeNovel({ projectId: "demo", title: "原题名", genre: "悬疑" });
			await expect(store.initializeNovel({ projectId: "demo", title: "新题名", genre: "情感" })).rejects.toThrow(
				"never overwrites",
			);
			const project = JSON.parse(await readFile(join(cwd, "novels", "demo", "project.json"), "utf8")) as {
				title: string;
			};
			expect(project.title).toBe("原题名");
		});
	});

	it("rejects invalid JSON without replacing the original document", async () => {
		await withStore(async (store, cwd) => {
			await store.initializeNovel({ projectId: "demo", title: "题名", genre: "悬疑" });
			const original = await readFile(join(cwd, "novels", "demo", "timeline", "events.json"), "utf8");
			await expect(
				store.saveStoryDocument({
					projectId: "demo",
					documentType: "timeline",
					name: "events",
					format: "json",
					content: "{",
				}),
			).rejects.toThrow("Invalid JSON");
			expect(await readFile(join(cwd, "novels", "demo", "timeline", "events.json"), "utf8")).toBe(original);
		});
	});

	it("requires the complete chapter workflow before finalization", async () => {
		await withStore(async (store, cwd) => {
			await store.initializeNovel({ projectId: "demo", title: "题名", genre: "悬疑" });
			await expect(
				store.finalizeChapter({
					projectId: "demo",
					chapter: 1,
					title: "第一章",
					content: "第一章草稿",
					summary,
					draftRevision: 1,
					confirmation: "USER_CONFIRMED",
				}),
			).rejects.toThrow("chapter plan");
			await prepareChapter(store);
			const result = await store.finalizeChapter({
				projectId: "demo",
				chapter: 1,
				title: "第一章",
				content: "第一章草稿",
				summary,
				draftRevision: 1,
				confirmation: "USER_CONFIRMED",
			});
			expect(result.transactionId).toBeTruthy();
			const status = await store.getNovelStatus({ projectId: "demo" });
			expect(status.nextChapter).toBe(2);
			expect(status.finalizedChapters).toEqual([1]);
			expect(
				(await readdir(join(cwd, "novels", "demo", "transactions"))).some((name) => name.endsWith(".tmp")),
			).toBe(false);
			await expect(
				store.finalizeChapter({
					projectId: "demo",
					chapter: 1,
					title: "第一章",
					content: "第一章草稿",
					summary,
					draftRevision: 1,
					confirmation: "USER_CONFIRMED",
				}),
			).rejects.toThrow("not the next chapter");
		});
	});

	it("replacing a chapter removes old timeline events and preserves progress", async () => {
		await withStore(async (store, cwd) => {
			await store.initializeNovel({ projectId: "demo", title: "题名", genre: "悬疑" });
			await prepareChapter(store);
			await store.finalizeChapter({
				projectId: "demo",
				chapter: 1,
				title: "第一章",
				content: "第一章草稿",
				summary,
				draftRevision: 1,
				confirmation: "USER_CONFIRMED",
			});
			await store.saveChapterDraft({ projectId: "demo", chapter: 1, content: "第一章修订" });
			await store.checkContinuity({ projectId: "demo", chapter: 1 });
			await store.saveContinuityReport({
				projectId: "demo",
				chapter: 1,
				draftRevision: 2,
				status: "ok",
				issues: [],
			});
			await store.finalizeChapter({
				projectId: "demo",
				chapter: 1,
				title: "第一章修订",
				content: "第一章修订",
				summary: { ...summary, events: ["发现新的档案线索"] },
				draftRevision: 2,
				confirmation: "USER_CONFIRMED",
				overwrite: true,
			});
			const timeline = JSON.parse(
				await readFile(join(cwd, "novels", "demo", "timeline", "events.json"), "utf8"),
			) as Array<{ chapter: number }>;
			expect(timeline.filter((event) => event.chapter === 1)).toHaveLength(1);
			expect((await store.getNovelStatus({ projectId: "demo" })).nextChapter).toBe(2);
		});
	});

	it("keeps proposed state updates separate from confirmed canon", async () => {
		await withStore(async (store, cwd) => {
			await store.initializeNovel({ projectId: "demo", title: "State", genre: "suspense" });
			const proposed = await store.updateCharacterState({
				projectId: "demo",
				characterId: "lin-mo",
				status: "proposed",
				content: '{"goal":"find-file"}',
			});
			expect(proposed.path).toBe("work/facts/lin-mo-character-state.json");
			await expect(
				store.updateCharacterState({
					projectId: "demo",
					characterId: "lin-mo",
					status: "confirmed",
					content: '{"goal":"find-file"}',
				}),
			).rejects.toThrow("USER_CONFIRMED");
			const confirmed = await store.updateCharacterState({
				projectId: "demo",
				characterId: "lin-mo",
				status: "confirmed",
				content: '{"goal":"find-file"}',
				confirmation: "USER_CONFIRMED",
			});
			expect(confirmed.path).toBe("characters/lin-mo.json");
			await store.updateClueLedger({
				projectId: "demo",
				status: "confirmed",
				entries: [{ id: "clue-1", description: "missing file", introducedIn: 1 }],
				confirmation: "USER_CONFIRMED",
			});
			await store.updateTimeline({
				projectId: "demo",
				status: "confirmed",
				events: [{ id: "event-1", chapter: 1, description: "file missing" }],
				confirmation: "USER_CONFIRMED",
			});
			expect(await readFile(join(cwd, "novels", "demo", "characters", "lin-mo.json"), "utf8")).toContain(
				"find-file",
			);
		});
	});

	it("scores, compares, checks, and exports workflow artifacts", async () => {
		await withStore(async (store) => {
			await store.initializeNovel({ projectId: "demo", title: "Quality", genre: "urban-romance" });
			const foundation = await store.scoreStoryFoundation({
				projectId: "demo",
				scores: {
					coreIdea: 8,
					readerPromise: 8,
					protagonistCost: 10,
					coreConflict: 10,
					causality: 12,
					characterArc: 8,
					climaxEnding: 10,
					setupPayoff: 8,
					genrePromise: 4,
					feasibility: 4,
				},
				comment: "good",
			});
			expect(foundation.passed).toBe(true);
			await store.saveChapterDraft({ projectId: "demo", chapter: 1, revision: 1, content: "第一版 draft" });
			await store.saveChapterDraft({
				projectId: "demo",
				chapter: 1,
				revision: 2,
				content: "第二版 draft with change",
			});
			const diff = await store.compareDraftVersions({
				projectId: "demo",
				chapter: 1,
				leftRevision: 1,
				rightRevision: 2,
			});
			expect(diff.rightRevision).toBe(2);
			const chapterScore = await store.scoreChapter({
				projectId: "demo",
				chapter: 1,
				draftRevision: 2,
				scores: {
					sceneFunction: 8,
					causality: 8,
					characterConsistency: 8,
					povStability: 8,
					informationRelease: 8,
					pacing: 8,
					dialogueDifference: 8,
					emotionalTurn: 8,
					endingDrive: 8,
					aiArtifacts: 8,
					continuity: 8,
				},
				comment: "good",
			});
			expect(chapterScore.passed).toBe(true);
			const artifacts = await store.checkAiArtifacts({ projectId: "demo", chapter: 1, draftRevision: 2 });
			expect(artifacts.draftRevision).toBe(2);
			expect((await store.exportManuscript({ projectId: "demo" })).chapters).toBe(0);
		});
	});

	it("does not create formal files after a cancelled finalization", async () => {
		await withStore(async (store, cwd) => {
			await store.initializeNovel({ projectId: "demo", title: "Cancel", genre: "suspense" });
			await prepareChapter(store);
			const controller = new AbortController();
			controller.abort();
			await expect(
				store.finalizeChapter(
					{
						projectId: "demo",
						chapter: 1,
						title: "Chapter",
						content: "第一章草稿",
						summary,
						draftRevision: 1,
						confirmation: "USER_CONFIRMED",
					},
					controller.signal,
				),
			).rejects.toThrow("aborted");
			await expect(
				readFile(join(cwd, "novels", "demo", "chapters", "chapter-001.md"), "utf8"),
			).rejects.toMatchObject({ code: "ENOENT" });
		});
	});
});
