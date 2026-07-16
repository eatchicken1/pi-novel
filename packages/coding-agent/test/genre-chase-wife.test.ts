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

function fixtureEventProse(eventRecord: ChaseWifeEvent, chapter: number): string {
	const count = eventRecord.lengthMode === "anchor" ? 20 : eventRecord.lengthMode === "flash" ? 4 : 12;
	const lead = eventRecord.targetTrack === "male" ? "他终于发现自己失去了控制" : "我把选择重新握回手中";
	const lines = Array.from(
		{ length: count },
		(_, index) =>
			`${lead}${chapter}-${eventRecord.eventId}-${index}，${eventRecord.targetTrack === "male" ? "他追到门口，却只能看着门合上" : "我转身离开，收回钥匙"}。`,
	);
	return `${chapter === 1 && eventRecord.eventId === 1 ? "交出位置。" : ""}${lines.join("")}`;
}

async function saveFixtureSemanticReport(
	store: NovelProjectStore,
	projectId: string,
	chapter: number,
	eventRecord: ChaseWifeEvent,
): Promise<void> {
	await store.saveChaseWifeEventSemanticReport({
		projectId,
		chapter,
		eventId: eventRecord.eventId,
		roleSatisfied: true,
		conflictShown: true,
		stateDeltasShown: [
			{
				dimension: "information",
				delta: eventRecord.informationDelta[0] ?? "new fact",
				evidence: `fact evidence ${chapter}-${eventRecord.eventId}`,
			},
			{
				dimension: "relationship",
				delta: eventRecord.relationshipDelta[0] ?? "relationship shift",
				evidence: `relationship evidence ${chapter}-${eventRecord.eventId}`,
			},
		],
		agencyActionEvidence:
			eventRecord.targetTrack === "male" ? undefined : `agency action evidence ${chapter}-${eventRecord.eventId}`,
		exitHookEvidence: `exit hook evidence ${chapter}-${eventRecord.eventId}`,
		injuryMechanismEvidence:
			eventRecord.injuryMechanism === undefined ? undefined : `injury evidence ${chapter}-${eventRecord.eventId}`,
	});
}

async function finalizeFixtureChapter(
	store: NovelProjectStore,
	cwd: string,
	projectId: string,
	chapter: number,
	events: ChaseWifeEvent[],
): Promise<number> {
	await store.saveChaseWifeEventMap({
		projectId,
		chapter,
		povMode: "split-pov",
		...(chapter === 1
			? {
					openingIntro: "opening intro ".repeat(8),
					openingConflict: "女主被要求交出原本的位置",
					openingConflictMarker: "交出位置",
				}
			: { openingConflict: "the old relationship creates a new demand" }),
		events,
	});
	const mapReport = await store.checkChaseWifeEventMap({ projectId, chapter });
	expect(mapReport.status, `${chapter}:${JSON.stringify(mapReport)}`).toBe("ok");
	for (const eventRecord of events) {
		await store.saveChaseWifeEventDraft({
			projectId,
			chapter,
			eventId: eventRecord.eventId,
			content: fixtureEventProse(eventRecord, chapter),
		});
		const budget = await store.checkChaseWifeEventDraft({ projectId, chapter, eventId: eventRecord.eventId });
		expect(budget.status, `${chapter}/${eventRecord.eventId}:${JSON.stringify(budget)}`).toBe("ok");
		await saveFixtureSemanticReport(store, projectId, chapter, eventRecord);
	}
	const assembled = await store.assembleChaseWifeChapter({ projectId, chapter });
	const pacing = await store.checkChaseWifeChapterPacing({ projectId, chapter });
	expect(pacing.status, JSON.stringify(pacing)).toBe("ok");
	const score = await store.scoreChaseWifeChapter({ projectId, chapter });
	expect(score.passed, JSON.stringify(score)).toBe(true);
	await store.checkAiArtifacts({ projectId, chapter, draftRevision: assembled.draftRevision });
	await store.saveChapterPlan({ projectId, chapter, content: `chapter plan ${chapter}` });
	await store.saveSceneContract({
		projectId,
		chapter,
		contracts: [
			{
				sceneId: `scene-${chapter}`,
				chapter,
				order: 1,
				pov: "heroine",
				time: "today",
				location: "home",
				goal: "leave",
				opposition: "the old promise",
				stakes: "her freedom",
				knowledgeBefore: [],
				informationReveal: ["the promise changes"],
				emotionalStateBefore: "hurt",
				emotionalTurn: "she chooses herself",
				emotionalStateAfter: "resolved",
				stateChanges: ["agency"],
				setups: [],
				payoffs: [],
				exitHook: "the next life begins",
			},
		],
	});
	await store.checkContinuity({ projectId, chapter });
	await store.saveContinuityReport({
		projectId,
		chapter,
		draftRevision: assembled.draftRevision,
		status: "ok",
		issues: [],
	});
	await store.saveQualityReport(
		{
			projectId,
			chapter,
			draftRevision: assembled.draftRevision,
			content: "the reader follows the heroine's choice",
			structuredReport: {
				status: "ok",
				engagementDrops: [],
				predictions: [],
				confusionPoints: [],
				credibilityBreaks: [],
				strongestMoments: [{ location: "chapter ending", evidence: "the heroine leaves", problem: "none" }],
			},
		},
		"reader",
	);
	const projectRoot = join(cwd, "novels", projectId);
	const chapterContent = await readFile(join(projectRoot, assembled.path), "utf8");
	await store.finalizeChapter({
		projectId,
		chapter,
		title: `chapter ${chapter}`,
		content: chapterContent,
		summary: {
			pov: "heroine",
			time: "today",
			locations: ["home"],
			characters: ["heroine"],
			events: [`chapter ${chapter} advances the choice`],
			newFacts: ["the promise changes"],
			relationshipChanges: ["trust changes"],
			cluesIntroduced: [],
			cluesResolved: [],
			itemsChanged: ["key"],
			openQuestions: [],
		},
		draftRevision: assembled.draftRevision,
		confirmation: "USER_CONFIRMED",
	});
	return assembled.draftRevision;
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
			const varied = (lead: string, count: number): string =>
				Array.from({ length: count }, (_, index) => `${lead}${index + 1}，我把下一步写进了行动里。`).join("");
			const drafts = [
				[1, `撕掉名额。我当场收回了答应过的承诺。${varied("门外的脚步停在第", 16)}`],
				[2, `我删掉了他的号码，${varied("屏幕上最后一条消息是第", 5)}`],
				[3, `我把钥匙放在桌上，签下离开的文件。${varied("我在文件末页写下第", 24)}`],
				[4, `他终于发现我没有等他，${varied("他在空荡的房间里翻找第", 5)}`],
				[5, `他在公开场合失去了原本理所当然的位置。${varied("众人把目光移开了第", 32)}`],
			] as const;
			for (const [eventId, content] of drafts)
				await store.saveChaseWifeEventDraft({ projectId: "pacing", chapter: 1, eventId, content });
			for (const [eventId] of drafts) {
				expect((await store.checkChaseWifeEventDraft({ projectId: "pacing", chapter: 1, eventId })).status).toBe(
					"ok",
				);
				const eventRecord = [
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
				][eventId - 1];
				if (eventRecord !== undefined) await saveFixtureSemanticReport(store, "pacing", 1, eventRecord);
			}
			const assembled = await store.assembleChaseWifeChapter({ projectId: "pacing", chapter: 1 });
			expect(assembled.eventCount).toBe(5);
			expect(await readFile(join(cwd, "novels", "pacing", assembled.path), "utf8")).toContain("opening intro");
			expect(await readFile(join(cwd, "novels", "pacing", assembled.manifestPath), "utf8")).toContain(
				'"openingIntroIncluded": true',
			);
			const pacing = await store.checkChaseWifePacing({ projectId: "pacing", chapter: 1, mode: "standard" });
			expect(pacing.status).toBe("ok");
			expect(pacing.metrics.exitRatio).toBeGreaterThan(0.45);
			expect(pacing.metrics.exitRatio).toBeLessThan(0.6);
			const storyPacing = await store.checkChaseWifeStoryPacing({ projectId: "pacing", mode: "standard" });
			expect(storyPacing.metrics.exitRatio).toBeGreaterThan(0.45);
			expect(storyPacing.metrics.exitRatio).toBeLessThan(0.65);
			const score = await store.scoreChaseWifeChapter({ projectId: "pacing", chapter: 1 });
			expect(score.passed).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("does not convert a missing opening conflict marker into a valid full-story position", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-opening-marker-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "marker", title: "opening marker", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "marker",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine is asked to surrender her place",
				openingConflictMarker: "this marker is absent",
				events: [
					event(1, "opening-injury"),
					event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
					event(3, "irreversible-exit", { lengthMode: "anchor", minChars: 450, maxChars: 850 }),
				],
			});
			for (const [eventId, content] of [
				[1, Array.from({ length: 50 }, (_, index) => `我转身离开${index}。`).join("")],
				[2, Array.from({ length: 10 }, (_, index) => `我删掉了他的号码${index}。`).join("")],
				[3, Array.from({ length: 70 }, (_, index) => `我签下文件，提着行李走出门${index}。`).join("")],
			] as const) {
				const boundedContent = eventId === 3 ? [...content].slice(0, 800).join("") : content;
				await store.saveChaseWifeEventDraft({ projectId: "marker", chapter: 1, eventId, content: boundedContent });
				await store.checkChaseWifeEventDraft({ projectId: "marker", chapter: 1, eventId });
				await saveFixtureSemanticReport(
					store,
					"marker",
					1,
					event(
						eventId,
						eventId === 1 ? "opening-injury" : eventId === 2 ? "micro-withdrawal" : "irreversible-exit",
					),
				);
			}
			await store.assembleChaseWifeChapter({ projectId: "marker", chapter: 1 });
			const report = await store.checkChaseWifeStoryPacing({ projectId: "marker", scope: "working" });
			expect(report.metrics.firstConflictPosition).toBeUndefined();
			expect(report.issues).toContain(
				"first visible conflict is not verified within 250 characters of the full story",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("invalidates event reports and assembly when the event map changes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-stale-event-map-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "stale-map", title: "stale map", genre: "chase-wife" });
			const saveMap = (conflict: string) =>
				store.saveChaseWifeEventMap({
					projectId: "stale-map",
					chapter: 1,
					povMode: "heroine-first-person",
					openingIntro: "opening intro ".repeat(8),
					openingConflict: conflict,
					openingConflictMarker: "surrender her place",
					events: [
						event(1, "opening-injury"),
						event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
						event(3, "irreversible-exit", { lengthMode: "anchor", minChars: 450, maxChars: 850 }),
					],
				});
			await saveMap("the heroine is asked to surrender her place");
			const drafts = [
				[1, Array.from({ length: 50 }, (_, index) => `surrender her place ${index}. 我转身离开。`).join(" ")],
				[2, Array.from({ length: 10 }, (_, index) => `我删掉了他的号码${index}。`).join("")],
				[3, Array.from({ length: 70 }, (_, index) => `我签下文件，提着行李走出门${index}。`).join("")],
			] as const;
			for (const [eventId, content] of drafts) {
				const boundedContent =
					eventId === 3
						? [...content].slice(0, 800).join("")
						: eventId === 1
							? [...content].slice(0, 400).join("")
							: content;
				await store.saveChaseWifeEventDraft({
					projectId: "stale-map",
					chapter: 1,
					eventId,
					content: boundedContent,
				});
				await store.checkChaseWifeEventDraft({ projectId: "stale-map", chapter: 1, eventId });
				await saveFixtureSemanticReport(
					store,
					"stale-map",
					1,
					event(
						eventId,
						eventId === 1 ? "opening-injury" : eventId === 2 ? "micro-withdrawal" : "irreversible-exit",
					),
				);
			}
			await store.assembleChaseWifeChapter({ projectId: "stale-map", chapter: 1 });
			await saveMap("the heroine is now publicly ordered to surrender her place");
			await expect(store.assembleChaseWifeChapter({ projectId: "stale-map", chapter: 1 })).rejects.toThrow(
				"current event map",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps finalized story pacing separate from working event drafts", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-finalized-scope-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "scope", title: "scope", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "scope",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine is asked to surrender her place",
				openingConflictMarker: "surrender her place",
				events: [
					event(1, "opening-injury"),
					event(2, "micro-withdrawal", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
					event(3, "irreversible-exit", { lengthMode: "anchor", minChars: 450, maxChars: 850 }),
				],
			});
			await store.saveChaseWifeEventDraft({
				projectId: "scope",
				chapter: 1,
				eventId: 1,
				content: "surrender her place. 我转身离开。".repeat(20),
			});
			const working = await store.checkChaseWifeStoryPacing({ projectId: "scope", scope: "working" });
			const finalized = await store.checkChaseWifeStoryPacing({ projectId: "scope", scope: "finalized" });
			expect(working.scope).toBe("working");
			expect(finalized.scope).toBe("finalized");
			expect(finalized.metrics.eventCount).toBe(0);
			expect(finalized.issues).toContain("finalized scope requires at least one finalized chapter");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("runs a six-chapter Chinese finalized-story regression and seals export", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-six-chapter-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "six", title: "六章回归", genre: "chase-wife" });
			const chapters: ChaseWifeEvent[][] = [
				[
					event(1, "opening-injury", { heroineAgencyBefore: 10, heroineAgencyAfter: 20 }),
					event(2, "decision", { heroineAgencyBefore: 20, heroineAgencyAfter: 35 }),
					event(3, "boundary-test", { heroineAgencyBefore: 35, heroineAgencyAfter: 45 }),
				],
				[
					event(1, "evidence", { heroineAgencyBefore: 45, heroineAgencyAfter: 55 }),
					event(2, "micro-withdrawal", {
						heroineAgencyBefore: 55,
						heroineAgencyAfter: 65,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "boundary-test", { heroineAgencyBefore: 65, heroineAgencyAfter: 75 }),
				],
				[
					event(1, "self-rebuild", { heroineAgencyBefore: 75, heroineAgencyAfter: 80 }),
					event(2, "irreversible-exit", {
						heroineAgencyBefore: 80,
						heroineAgencyAfter: 90,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
					event(3, "pursuit-control", {
						pov: "male-limited-third-person",
						targetTrack: "male",
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
				],
				[
					event(1, "self-rebuild", { heroineAgencyBefore: 90, heroineAgencyAfter: 92 }),
					event(2, "pursuit-failure", {
						pov: "heroine-first-person",
						targetTrack: "shared",
						heroineAgencyBefore: 92,
						heroineAgencyAfter: 95,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "real-consequence", { pov: "male-limited-third-person", targetTrack: "male" }),
				],
				[
					event(1, "self-rebuild", { heroineAgencyBefore: 95, heroineAgencyAfter: 96 }),
					event(2, "final-boundary", { heroineAgencyBefore: 96, heroineAgencyAfter: 98 }),
					event(3, "closure", { heroineAgencyBefore: 98, heroineAgencyAfter: 100 }),
				],
				[
					event(1, "self-rebuild", { heroineAgencyBefore: 100, heroineAgencyAfter: 100 }),
					event(2, "pursuit-failure", {
						pov: "heroine-first-person",
						targetTrack: "shared",
						heroineAgencyBefore: 100,
						heroineAgencyAfter: 100,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "recognition", { pov: "male-limited-third-person", targetTrack: "male" }),
				],
			];
			for (const [index, events] of chapters.entries())
				await finalizeFixtureChapter(store, cwd, "six", index + 1, events);
			const finalizedPacing = await store.checkChaseWifeStoryPacing({ projectId: "six", scope: "finalized" });
			expect(finalizedPacing.status, JSON.stringify(finalizedPacing)).not.toBe("error");
			expect(finalizedPacing.metrics.chapterCount).toBe(6);
			expect(finalizedPacing.metrics.eventCount).toBe(18);
			const seal = await store.finalizeManuscript({ projectId: "six", confirmation: "USER_CONFIRMED" });
			expect(seal.status).toBe("finalized");
			const exported = await store.exportManuscript({ projectId: "six" });
			expect(exported.chapters).toBe(6);
			await store.saveChaseWifeEventMap({
				projectId: "six",
				chapter: 1,
				povMode: "split-pov",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine is asked to surrender her place",
				openingConflictMarker: "surrender her place",
				events: chapters[0],
			});
			await expect(store.exportManuscript({ projectId: "six" })).rejects.toThrow("event map");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("protects canonical documents behind a dedicated proposed or confirmed workflow", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-canon-protection-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "canon", title: "canon", genre: "chase-wife" });
			await expect(
				store.saveStoryDocument({
					projectId: "canon",
					documentType: "story-bible",
					format: "markdown",
					content: "unsafe overwrite",
				}),
			).rejects.toThrow("dedicated workflow");
			const proposal = await store.saveCanonDocument({
				projectId: "canon",
				documentType: "story-bible",
				format: "markdown",
				content: "proposed bible",
				status: "proposed",
			});
			expect(proposal.path.replace(/\\/gu, "/")).toMatch(/^work\/canon-candidates\/story-bible-/u);
			await expect(
				store.saveCanonDocument({
					projectId: "canon",
					documentType: "story-bible",
					format: "markdown",
					content: "confirmed bible",
					status: "confirmed",
				}),
			).rejects.toThrow("USER_CONFIRMED");
			const confirmed = await store.saveCanonDocument({
				projectId: "canon",
				documentType: "story-bible",
				format: "markdown",
				content: "confirmed bible",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
			});
			expect(confirmed.path).toBe("story-bible.md");
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
			await store.saveChaseWifeEventDraft({
				projectId: "invalid-pacing",
				chapter: 1,
				eventId: 1,
				content: "我删掉了他的号码。".repeat(30),
			});
			const semantics = await store.checkChaseWifeEventSemantics({
				projectId: "invalid-pacing",
				chapter: 1,
				eventId: 1,
			});
			expect(semantics.status).toBe("error");
			expect(semantics.issues.map((issue) => issue.code)).toContain("repeated-sentence");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("requires every chase-wife quality gate before finalization", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-finalize-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "finalize", title: "quality gates", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "finalize",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the protagonist is asked to surrender her place immediately",
				openingConflictMarker: "surrender her place",
				events: [
					event(1, "opening-injury", { heroineAgencyBefore: 10, heroineAgencyAfter: 20 }),
					event(2, "micro-withdrawal", {
						heroineAgencyBefore: 20,
						heroineAgencyAfter: 35,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 35,
						heroineAgencyAfter: 60,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				],
			});
			await store.checkChaseWifeEventMap({ projectId: "finalize", chapter: 1 });
			const prose = (lead: string, count: number): string =>
				Array.from({ length: count }, (_, index) => `${lead} ${index + 1}.`).join(" ");
			const drafts = [
				[1, `surrender her place. 我收回承诺。${prose("I turn away", 18)}`],
				[2, `我删除号码。${prose("I close the message", 3)}`],
				[3, `我签下文件并离开。${prose("I carry the key outside", 25)}`],
			] as const;
			for (const [eventId, content] of drafts) {
				await store.saveChaseWifeEventDraft({ projectId: "finalize", chapter: 1, eventId, content });
				const report = await store.checkChaseWifeEventDraft({ projectId: "finalize", chapter: 1, eventId });
				expect(report.status, `${eventId}:${report.actualChars}:${JSON.stringify(report.issues)}`).toBe("ok");
				const semantics = await store.checkChaseWifeEventSemantics({ projectId: "finalize", chapter: 1, eventId });
				expect(semantics.status, `${eventId}:${JSON.stringify(semantics.issues)}`).not.toBe("error");
				const eventRecord = [
					event(1, "opening-injury", { heroineAgencyBefore: 10, heroineAgencyAfter: 20 }),
					event(2, "micro-withdrawal", {
						heroineAgencyBefore: 20,
						heroineAgencyAfter: 35,
						lengthMode: "flash",
						minChars: 60,
						maxChars: 180,
					}),
					event(3, "irreversible-exit", {
						heroineAgencyBefore: 35,
						heroineAgencyAfter: 60,
						lengthMode: "anchor",
						minChars: 450,
						maxChars: 850,
					}),
				][eventId - 1];
				if (eventRecord !== undefined) await saveFixtureSemanticReport(store, "finalize", 1, eventRecord);
			}
			const assembled = await store.assembleChaseWifeChapter({ projectId: "finalize", chapter: 1 });
			const content = await readFile(join(cwd, "novels", "finalize", assembled.path), "utf8");
			const chapterPacing = await store.checkChaseWifeChapterPacing({ projectId: "finalize", chapter: 1 });
			expect(chapterPacing.status, JSON.stringify(chapterPacing)).toBe("ok");
			const score = await store.scoreChaseWifeChapter({ projectId: "finalize", chapter: 1 });
			expect(score.passed, JSON.stringify(score)).toBe(true);
			await store.checkAiArtifacts({ projectId: "finalize", chapter: 1, draftRevision: assembled.draftRevision });
			await store.saveChapterPlan({ projectId: "finalize", chapter: 1, content: "chapter plan" });
			await store.saveSceneContract({
				projectId: "finalize",
				chapter: 1,
				contracts: [
					{
						sceneId: "scene-1",
						chapter: 1,
						order: 1,
						pov: "heroine",
						time: "today",
						location: "home",
						goal: "leave",
						opposition: "the old promise",
						stakes: "her freedom",
						knowledgeBefore: [],
						informationReveal: ["the promise was false"],
						emotionalStateBefore: "hurt",
						emotionalTurn: "she chooses herself",
						emotionalStateAfter: "resolved",
						stateChanges: ["agency"],
						setups: [],
						payoffs: [],
						exitHook: "the next life begins",
					},
				],
			});
			await store.checkContinuity({ projectId: "finalize", chapter: 1 });
			await store.saveContinuityReport({
				projectId: "finalize",
				chapter: 1,
				draftRevision: assembled.draftRevision,
				status: "ok",
				issues: [],
			});
			await expect(
				store.finalizeChapter({
					projectId: "finalize",
					chapter: 1,
					title: "chapter 1",
					content,
					summary: {
						pov: "heroine",
						time: "today",
						locations: ["home"],
						characters: ["heroine"],
						events: ["she leaves"],
						newFacts: ["the promise was false"],
						relationshipChanges: ["trust ends"],
						cluesIntroduced: [],
						cluesResolved: [],
						itemsChanged: ["key"],
						openQuestions: [],
					},
					draftRevision: assembled.draftRevision,
					confirmation: "USER_CONFIRMED",
				}),
			).rejects.toThrow("reader simulation or story review");
			await expect(
				store.saveQualityReport(
					{
						projectId: "finalize",
						chapter: 1,
						draftRevision: assembled.draftRevision,
						content: "an unstructured sentence cannot be a quality report",
					},
					"reader",
				),
			).rejects.toThrow("structuredReport");
			await store.saveQualityReport(
				{
					projectId: "finalize",
					chapter: 1,
					draftRevision: assembled.draftRevision,
					content: "the reader follows the heroine's choice",
					structuredReport: {
						status: "ok",
						engagementDrops: [],
						predictions: [],
						confusionPoints: [],
						credibilityBreaks: [],
						strongestMoments: [{ location: "chapter ending", evidence: "the heroine leaves", problem: "none" }],
					},
				},
				"reader",
			);
			await expect(
				store.finalizeChapter({
					projectId: "finalize",
					chapter: 1,
					title: "chapter 1",
					content,
					summary: {
						pov: "heroine",
						time: "today",
						locations: ["home"],
						characters: ["heroine"],
						events: ["she leaves"],
						newFacts: ["the promise was false"],
						relationshipChanges: ["trust ends"],
						cluesIntroduced: [],
						cluesResolved: [],
						itemsChanged: ["key"],
						openQuestions: [],
					},
					draftRevision: assembled.draftRevision,
					confirmation: "USER_CONFIRMED",
				}),
			).resolves.toBeTruthy();
			await expect(store.exportManuscript({ projectId: "finalize" })).rejects.toThrow("finalized manuscript gate");
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

	it("requires independent model semantic evidence before event assembly", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-semantic-gate-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "semantic-gate", title: "semantic gate", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "semantic-gate",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine is asked to surrender her place",
				openingConflictMarker: "surrender her place",
				events: [event(1, "opening-injury"), event(2, "micro-withdrawal"), event(3, "irreversible-exit")],
			});
			await store.saveChaseWifeEventDraft({
				projectId: "semantic-gate",
				chapter: 1,
				eventId: 1,
				content: "I turn away and leave.",
			});
			const invalid = await store.saveChaseWifeEventSemanticReport({
				projectId: "semantic-gate",
				chapter: 1,
				eventId: 1,
				roleSatisfied: false,
				conflictShown: false,
				stateDeltasShown: [
					{ dimension: "information", delta: "fact", evidence: "the same action" },
					{ dimension: "relationship", delta: "trust", evidence: "the same action" },
				],
				exitHookEvidence: "the next choice",
				injuryMechanismEvidence: "the injury",
			});
			expect(invalid.status).toBe("error");
			expect(invalid.issues).toEqual(
				expect.arrayContaining(["roleSatisfied must be true", "conflictShown must be true"]),
			);
			const valid = await saveFixtureSemanticReport(store, "semantic-gate", 1, event(1, "opening-injury"));
			expect(valid).toBeUndefined();
			const saved = await store.saveChaseWifeEventSemanticReport({
				projectId: "semantic-gate",
				chapter: 1,
				eventId: 1,
				roleSatisfied: true,
				conflictShown: true,
				stateDeltasShown: [
					{ dimension: "information", delta: "fact", evidence: "new fact" },
					{ dimension: "relationship", delta: "trust", evidence: "new boundary" },
				],
				agencyActionEvidence: "I turn away",
				exitHookEvidence: "the next choice",
				injuryMechanismEvidence: "the injury",
			});
			expect(saved.status).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("turns excessive AI-artifact findings into a failed quality gate", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-ai-artifacts-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "ai-artifacts", title: "ai artifacts", genre: "chase-wife" });
			await store.saveChapterDraft({ projectId: "ai-artifacts", chapter: 1, content: "仿佛。仿佛。仿佛。仿佛。" });
			const report = await store.checkAiArtifacts({ projectId: "ai-artifacts", chapter: 1, draftRevision: 1 });
			expect(report.findingCount).toBeGreaterThan(1);
			expect(report.passed).toBe(false);
			expect(report.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
