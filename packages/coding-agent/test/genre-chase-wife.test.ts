import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ChaseWifeBeat, ChaseWifeEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function beat(
	beatNumber: number,
	heroinePhase: ChaseWifeBeat["heroinePhase"],
	malePhase?: ChaseWifeBeat["malePhase"],
): ChaseWifeBeat {
	return {
		beat: beatNumber,
		heroinePhase,
		malePhase,
		targetTrack: malePhase === undefined ? "heroine" : "shared",
		paywallHook: beatNumber === 2,
		sceneCount: 1,
		goal: "make a choice",
		conflict: "the old relationship resists the choice",
		actionOrConsequence: "the choice changes the next condition",
		emotionBefore: "hope",
		emotionAfter: "resolve",
		emotionStack: ["surprise", "anger"],
		painPoint: "the heroine loses access to an old promise",
		rewardPoint: "the heroine gains room to choose",
		hook: "the next decision cannot be avoided",
	};
}

function event(eventId: number, role: ChaseWifeEvent["role"], overrides: Partial<ChaseWifeEvent> = {}): ChaseWifeEvent {
	return {
		eventId,
		role,
		scene: eventId,
		pov: "heroine-first-person",
		targetTrack: "heroine",
		paywallHook: false,
		causes: eventId === 1 ? [] : [eventId - 1],
		injuryMechanism: (["neglect", "substitution", "resource-transfer", "public-humiliation"][eventId - 1] ??
			"neglect") as ChaseWifeEvent["injuryMechanism"],
		informationDelta: ["the protagonist learns one new fact"],
		relationshipDelta: ["the relationship loses one promise"],
		resourceDelta: [],
		riskDelta: [],
		heroineAgencyBefore: eventId === 1 ? 10 : 20,
		heroineAgencyAfter: eventId === 1 ? 10 : 25,
		irreversible: role === "irreversible-exit",
		cannotRemoveBecause: "the event changes the next decision",
		lengthMode: role === "irreversible-exit" ? "anchor" : "standard",
		minChars: role === "irreversible-exit" ? 450 : 220,
		maxChars: role === "irreversible-exit" ? 850 : 450,
		eventDescription: "the protagonist encounters a concrete change",
		function: "advance the relationship conflict",
		goal: "protect the protagonist's choice",
		conflict: "the old relationship resists the choice",
		actionOrConsequence: "the choice changes the next condition",
		protagonistReaction: "the protagonist notices the cost and responds",
		oppositionReaction: "the opposing character explains or escalates",
		informationChange: "the protagonist learns one new fact",
		emotionBefore: "expectation",
		emotionAfter: "resolve",
		physicalReaction: "the protagonist pauses before acting",
		setupOrPayoff: "the event prepares a later consequence",
		readerRelease: "the hidden preference becomes visible",
		entryHook: "the previous choice remains unresolved",
		exitHook: "the next decision cannot be avoided",
		...overrides,
	};
}

describe("chase-wife genre branch", () => {
	it("normalizes the Chinese genre selection and checks its dedicated arc", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-wife-"));
		try {
			const store = new NovelProjectStore(cwd);
			const info = await store.initializeNovel({ projectId: "chase", title: "追妻测试", genre: "追妻文" });
			expect(info.genre).toBe("chase-wife");
			const heroinePhases: ChaseWifeBeat["heroinePhase"][] = [
				"injury",
				"recognition",
				"micro-withdrawal",
				"boundary-test",
				"irreversible-exit",
				"self-rebuild",
				"final-boundary",
				"final-boundary",
				"final-boundary",
				"final-boundary",
				"final-boundary",
				"final-boundary",
			];
			await store.saveChaseWifeBeatSheet({
				projectId: "chase",
				povMode: "split-pov",
				heroineArc: [
					"injury",
					"recognition",
					"micro-withdrawal",
					"boundary-test",
					"irreversible-exit",
					"self-rebuild",
					"final-boundary",
				],
				maleArc: [
					"entitlement",
					"loss-of-control",
					"wrong-pursuit",
					"real-consequence",
					"recognition",
					"respect-or-failure",
				],
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				beats: heroinePhases.map((phase, index) =>
					beat(
						index + 1,
						phase,
						[
							"entitlement",
							"entitlement",
							"loss-of-control",
							"wrong-pursuit",
							"real-consequence",
							"recognition",
							"respect-or-failure",
						][index] as ChaseWifeBeat["malePhase"],
					),
				),
			});
			const report = await store.checkChaseWifeArc({ projectId: "chase" });
			expect(report.status).toBe("ok");
			expect(JSON.parse(await readFile(join(cwd, "novels", "chase", "project.json"), "utf8")).genre).toBe(
				"chase-wife",
			);
			await store.saveChaseWifeEventMap({
				projectId: "chase",
				chapter: 1,
				povMode: "split-pov",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				openingConflictMarker: "surrender her place",
				events: [
					event(1, "opening-injury"),
					event(2, "micro-withdrawal"),
					event(3, "irreversible-exit", { heroineAgencyBefore: 25, heroineAgencyAfter: 50 }),
				],
			});
			expect((await store.checkChaseWifeEventMap({ projectId: "chase", chapter: 1 })).status).toBe("ok");
			await store.saveChaseWifeEventMap({
				projectId: "chase",
				chapter: 2,
				povMode: "split-pov",
				openingConflict: "the old relationship returns with a demand",
				events: [event(1, "evidence"), event(2, "micro-withdrawal"), event(3, "boundary-test")],
			});
			expect((await store.checkChaseWifeEventMap({ projectId: "chase", chapter: 2 })).status).toBe("ok");
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "chase",
					chapter: 2,
					povMode: "split-pov",
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the old relationship returns with a demand",
					events: [event(1, "evidence"), event(2, "micro-withdrawal"), event(3, "boundary-test")],
				}),
			).rejects.toThrow("Only chapter 1");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("does not allow chase-wife tools on other genre projects", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-other-genre-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "other", title: "悬疑测试", genre: "suspense" });
			await expect(store.checkChaseWifeArc({ projectId: "other" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("drafts, assembles, and independently checks a compact split-pov chapter", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pacing-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "pacing", title: "紧凑节奏", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "pacing",
				chapter: 1,
				povMode: "split-pov",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				openingConflictMarker: "撕掉名额",
				events: [
					event(1, "opening-injury", { heroineAgencyBefore: 10, heroineAgencyAfter: 20 }),
					event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 20,
						heroineAgencyAfter: 50,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
					event(4, "pursuit-control", {
						pov: "male-limited-third-person",
						targetTrack: "male",
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(5, "real-consequence", {
						pov: "male-limited-third-person",
						targetTrack: "male",
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				],
			});
			const drafts = [
				[1, `撕掉名额。${"我没有回头。".repeat(36)}`],
				[2, "我删掉了他的号码。".repeat(10)],
				[3, "我把钥匙放在桌上，签下离开的文件。".repeat(33)],
				[4, "他终于发现我没有等他。".repeat(10)],
				[5, "他在公开场合失去了原本理所当然的位置。".repeat(32)],
			] as const;
			for (const [eventId, content] of drafts)
				await store.saveChaseWifeEventDraft({ projectId: "pacing", chapter: 1, eventId, content });
			for (const [eventId] of drafts)
				expect((await store.checkChaseWifeEventDraft({ projectId: "pacing", chapter: 1, eventId })).status).toBe(
					"ok",
				);
			const assembled = await store.assembleChaseWifeChapter({ projectId: "pacing", chapter: 1 });
			expect(assembled.eventCount).toBe(5);
			const pacing = await store.checkChaseWifePacing({ projectId: "pacing", chapter: 1, mode: "standard" });
			expect(pacing.status).toBe("ok");
			expect(pacing.metrics.exitRatio).toBeGreaterThan(0.45);
			expect(pacing.metrics.exitRatio).toBeLessThan(0.55);
			const score = await store.scoreChaseWifeChapter({ projectId: "pacing", chapter: 1 });
			expect(score.passed).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("rejects no-state events and reports repeated injury mechanisms", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pacing-invalid-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "invalid-pacing", title: "重复伤害", genre: "chase-wife" });
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "invalid-pacing",
					chapter: 1,
					povMode: "heroine-first-person",
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					openingConflictMarker: "surrender her place",
					events: [
						event(1, "opening-injury", {
							informationDelta: [],
							relationshipDelta: [],
							resourceDelta: [],
							riskDelta: [],
							heroineAgencyBefore: 10,
							heroineAgencyAfter: 10,
						}) as ChaseWifeEvent,
						event(2, "evidence"),
						event(3, "irreversible-exit"),
					],
				}),
			).rejects.toThrow("at least two state changes");
			await store.saveChaseWifeEventMap({
				projectId: "invalid-pacing",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				openingConflictMarker: "surrender her place",
				events: [
					event(1, "opening-injury"),
					event(2, "evidence", { injuryMechanism: "neglect" }),
					event(3, "irreversible-exit", { injuryMechanism: "neglect" }),
				],
			});
			const report = await store.checkChaseWifeEventMap({ projectId: "invalid-pacing", chapter: 1 });
			expect(report.status).toBe("error");
			expect(report.issues).toEqual(expect.arrayContaining(["repeated injury mechanism: neglect"]));
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("rejects incomplete or non-contiguous beat sheets", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-invalid-chase-wife-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "invalid", title: "不完整测试", genre: "追妻文" });
			await expect(
				store.saveChaseWifeBeatSheet({
					projectId: "invalid",
					povMode: "heroine-first-person",
					heroineArc: [
						"injury",
						"recognition",
						"micro-withdrawal",
						"boundary-test",
						"irreversible-exit",
						"self-rebuild",
						"final-boundary",
					],
					maleArc: [
						"entitlement",
						"loss-of-control",
						"wrong-pursuit",
						"real-consequence",
						"recognition",
						"respect-or-failure",
					],
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					beats: [beat(1, "injury")],
				}),
			).rejects.toThrow("12-24");
			await expect(
				store.saveChaseWifeBeatSheet({
					projectId: "invalid",
					povMode: "heroine-first-person",
					heroineArc: [
						"injury",
						"recognition",
						"micro-withdrawal",
						"boundary-test",
						"irreversible-exit",
						"self-rebuild",
						"final-boundary",
					],
					maleArc: [
						"entitlement",
						"loss-of-control",
						"wrong-pursuit",
						"real-consequence",
						"recognition",
						"respect-or-failure",
					],
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					beats: Array.from({ length: 12 }, (_, index) => beat(index === 11 ? 13 : index + 1, "final-boundary")),
				}),
			).rejects.toThrow("contiguous");
			await expect(
				store.saveChaseWifeBeatSheet({
					projectId: "invalid",
					povMode: "heroine-first-person",
					heroineArc: [
						"injury",
						"recognition",
						"micro-withdrawal",
						"boundary-test",
						"irreversible-exit",
						"self-rebuild",
						"final-boundary",
					],
					maleArc: [
						"entitlement",
						"loss-of-control",
						"wrong-pursuit",
						"real-consequence",
						"recognition",
						"respect-or-failure",
					],
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "the protagonist is asked to surrender her place immediately",
					beats: Array.from({ length: 12 }, (_, index) =>
						beat(index + 1, "final-boundary", index === 10 ? "respect-or-failure" : undefined),
					).map((currentBeat, index) => ({ ...currentBeat, paywallHook: index === 10 })),
				}),
			).rejects.toThrow("opening half");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("reports invalid records and phase order instead of passing", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-invalid-arc-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "invalid-arc", title: "曲线测试", genre: "chase-wife" });
			const heroinePhases: ChaseWifeBeat["heroinePhase"][] = [
				"final-boundary",
				"recognition",
				"micro-withdrawal",
				"irreversible-exit",
				"self-rebuild",
				"final-boundary",
				"final-boundary",
				"injury",
				"final-boundary",
				"final-boundary",
				"final-boundary",
				"final-boundary",
			];
			const beats = heroinePhases.map((phase, index) => beat(index + 1, phase));
			(beats[11] as { heroinePhase: string }).heroinePhase = "unknown";
			await mkdir(join(cwd, "novels", "invalid-arc", "outline", "genre"), { recursive: true });
			await writeFile(
				join(cwd, "novels", "invalid-arc", "outline", "genre", "chase-wife-beat-sheet.json"),
				JSON.stringify({ beats }),
				"utf8",
			);
			const report = await store.checkChaseWifeArc({ projectId: "invalid-arc" });
			expect(report.status).toBe("error");
			expect(report.issues).toEqual(
				expect.arrayContaining(["chase-wife beat sheet must declare heroine-first-person or split-pov"]),
			);
			expect(report.issues).toEqual(expect.arrayContaining(["opening intro must contain 80-180 characters"]));
			expect(report.issues).toEqual(expect.arrayContaining(["beat sheet contains invalid beat records"]));
			expect(report.issues).toEqual(expect.arrayContaining(["heroine arc must contain unique phases in order"]));
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
