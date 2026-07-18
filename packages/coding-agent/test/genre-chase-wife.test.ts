import { createHash } from "node:crypto";
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
	const heroineAgencyBefore = overrides.heroineAgencyBefore ?? (eventId === 1 ? 10 : 20);
	const heroineAgencyAfter = overrides.heroineAgencyAfter ?? (eventId === 1 ? 10 : 25);
	const agencyState = (score: number): ChaseWifeEvent["heroineAgencyStateBefore"] => {
		const level = Math.max(0, Math.min(4, Math.round(score / 25)));
		return { epistemic: level, relational: level, material: level, social: level, future: level };
	};
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
		heroineAgencyBefore,
		heroineAgencyAfter,
		heroineAgencyStateBefore: agencyState(heroineAgencyBefore),
		heroineAgencyStateAfter: agencyState(heroineAgencyAfter),
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

function semanticAnchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 3));
	const endChar = Math.min(normalized.length, safeStart + Math.max(3, Math.min(12, normalized.length - safeStart)));
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

function ledgerEvidence(
	content: string,
	chapter: number,
	start: number,
	eventId?: number,
): { chapter: number; startChar: number; endChar: number; excerpt: string; contentHash: string; eventId?: number } {
	return {
		chapter,
		...semanticAnchor(content, start),
		contentHash: createHash("sha256").update(content, "utf8").digest("hex"),
		...(eventId === undefined ? {} : { eventId }),
	};
}

async function saveFixtureSemanticReport(
	store: NovelProjectStore,
	projectId: string,
	chapter: number,
	eventRecord: ChaseWifeEvent,
	content: string,
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
				evidence: semanticAnchor(content, 0),
			},
			{
				dimension: "relationship",
				delta: eventRecord.relationshipDelta[0] ?? "relationship shift",
				evidence: semanticAnchor(content, 16),
			},
		],
		roleEvidence: semanticAnchor(content, 0),
		conflictEvidence: semanticAnchor(content, 16),
		agencyActionEvidence: eventRecord.targetTrack === "male" ? undefined : semanticAnchor(content, 32),
		entryHookEvidence: semanticAnchor(content, 48),
		exitHookEvidence: semanticAnchor(content, 64),
		injuryMechanismEvidence: eventRecord.injuryMechanism === undefined ? undefined : semanticAnchor(content, 80),
	});
}

async function saveFixtureRelationshipContracts(
	store: NovelProjectStore,
	cwd: string,
	projectId: string,
): Promise<void> {
	const chapterContent = await readFile(join(cwd, "novels", projectId, "chapters", "chapter-001.md"), "utf8");
	const manifest = JSON.parse(
		await readFile(join(cwd, "novels", projectId, "work", "chase-wife-assemblies", "chapter-001-r01.json"), "utf8"),
	) as { eventDrafts: Array<{ eventId: number; startChar: number; endChar: number }> };
	const eventEvidence = (eventId: number, offset: number): ReturnType<typeof ledgerEvidence> => {
		const range = manifest.eventDrafts.find((item) => item.eventId === eventId);
		if (range === undefined || range.startChar + offset >= range.endChar)
			throw new Error(`Missing event range for fixture event ${eventId}`);
		return ledgerEvidence(chapterContent, 1, range.startChar + offset, eventId);
	};
	await store.saveChaseWifeHarmLedger({
		projectId,
		status: "confirmed",
		confirmation: "USER_CONFIRMED",
		harms: [
			{
				id: "harm-001",
				category: "deprioritization",
				victimImpact: {
					emotional: "the heroine is treated as replaceable",
					future: "the shared future is withdrawn",
				},
				maleBeliefAtTheTime: "he believes she will keep waiting",
				heroineBeliefAtTheTime: "she believes the promise still matters",
				severity: "major",
				recognizedByHeroine: true,
				recognizedByMale: true,
				repaired: true,
				repairable: true,
				evidence: [eventEvidence(1, 0)],
				recognitionEvidence: [eventEvidence(2, 0)],
			},
		],
	});
	await store.saveChaseWifeRepairLedger({
		projectId,
		status: "confirmed",
		confirmation: "USER_CONFIRMED",
		repairs: [
			{
				id: "repair-001",
				addressesHarmIds: ["harm-001"],
				type: "costly-accountability",
				action: "he publicly corrects the record and accepts the lost relationship",
				costToMale: "he loses status and access",
				benefitToHeroine: "her choice is respected and the record is repaired",
				requestedReward: "none",
				violatesBoundary: false,
				acceptedByHeroine: true,
				effectiveness: "credible",
				evidence: [eventEvidence(2, 0)],
			},
			{
				id: "repair-002",
				addressesHarmIds: ["harm-001"],
				type: "boundary-respect",
				action: "he accepts the heroine's refusal without further contact",
				costToMale: "he gives up immediate reconciliation",
				benefitToHeroine: "her boundary remains intact",
				requestedReward: "none",
				violatesBoundary: false,
				acceptedByHeroine: true,
				effectiveness: "credible",
				evidence: [eventEvidence(3, 0)],
			},
		],
	});
	await store.saveChaseWifeEndingContract({
		projectId,
		status: "confirmed",
		confirmation: "USER_CONFIRMED",
		contract: {
			mode: "earned-reunion",
			heroineIndependentFutureRequired: true,
			maleRecognitionRequired: true,
			restitutionRequired: true,
			boundaryRespectRequired: true,
			reunionEligibilityRules: ["the heroine chooses whether contact resumes"],
			heroineIndependentFutureEvidence: [eventEvidence(3, 0)],
		},
	});
}

async function finalizeFixtureChapter(
	store: NovelProjectStore,
	cwd: string,
	projectId: string,
	chapter: number,
	events: ChaseWifeEvent[],
): Promise<number> {
	const eventMapEvents = events.map((eventRecord) => {
		if (chapter !== 1) return eventRecord;
		if (eventRecord.eventId === 1) return { ...eventRecord, harmRefs: ["harm-001"] };
		if (eventRecord.eventId === 2) return { ...eventRecord, repairRefs: ["repair-001"] };
		if (eventRecord.eventId === 3) return { ...eventRecord, repairRefs: ["repair-002"] };
		return eventRecord;
	});
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
		events: eventMapEvents,
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
		await saveFixtureSemanticReport(store, projectId, chapter, eventRecord, fixtureEventProse(eventRecord, chapter));
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
	const projectRoot = join(cwd, "novels", projectId);
	const chapterContent = await readFile(join(projectRoot, assembled.path), "utf8");
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
				strongestMoments: [
					{
						location: "chars:0-8",
						evidence: "the heroine leaves",
						problem: "none",
						anchor: semanticAnchor(chapterContent, 0),
					},
				],
			},
		},
		"reader",
	);
	await store.saveQualityReport(
		{
			projectId,
			chapter,
			draftRevision: assembled.draftRevision,
			content: "the reviewer confirms the relationship turn",
			structuredReport: {
				status: "ok",
				structuralIssues: [],
				sceneIssues: [],
				characterIssues: [],
				pacingIssues: [],
				priorities: ["keep the heroine's final choice visible"],
				verifiedStrengths: [
					{
						location: "chars:0-8",
						evidence: "the heroine leaves",
						problem: "the review verifies the final choice",
						anchor: semanticAnchor(chapterContent, 0),
					},
				],
				allowFinalize: true,
			},
		},
		"review",
	);
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
				stayingLogic: {
					emotionalReason: "she still believes the old promise can be repaired",
					materialReason: "her home and work are tied to the relationship",
					socialReason: "both families expect her to keep the commitment",
					falseBelief: "one more explanation will make him choose her",
					sustainingEvidence: ["he keeps asking her to wait"],
					breakingThreshold: "he publicly gives her place to someone else",
				},
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
			const beatSheetPath = join(cwd, "novels", "chase", "outline", "genre", "chase-wife-beat-sheet.json");
			const beatSheetWithoutStayingLogic = JSON.parse(await readFile(beatSheetPath, "utf8")) as Record<
				string,
				unknown
			>;
			delete beatSheetWithoutStayingLogic.stayingLogic;
			await writeFile(beatSheetPath, `${JSON.stringify(beatSheetWithoutStayingLogic)}\n`, "utf8");
			const missingStayingLogic = await store.checkChaseWifeArc({ projectId: "chase" });
			expect(missingStayingLogic.status).toBe("error");
			expect(missingStayingLogic.issues).toContain(
				"staying logic must explain why the heroine remains before choosing to leave",
			);
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
					event(1, "opening-injury", { beatRefs: [1] }),
					event(2, "micro-withdrawal", { beatRefs: [2] }),
					event(3, "irreversible-exit", { heroineAgencyBefore: 25, heroineAgencyAfter: 50, beatRefs: [5] }),
				],
			});
			expect((await store.checkChaseWifeEventMap({ projectId: "chase", chapter: 1 })).status).toBe("ok");
			await store.saveChaseWifeEventMap({
				projectId: "chase",
				chapter: 2,
				povMode: "split-pov",
				openingConflict: "the old relationship returns with a demand",
				events: [
					event(1, "evidence", { beatRefs: [2] }),
					event(2, "micro-withdrawal", { beatRefs: [3] }),
					event(3, "boundary-test", { beatRefs: [4] }),
				],
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

	it("matches the first event role to the selected opening mode", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-opening-mode-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "result-first", title: "结果先行", genre: "chase-wife" });
			await store.saveChaseWifeBeatSheet({
				projectId: "result-first",
				povMode: "split-pov",
				openingMode: "result-first",
				openingConflict: "她正在签下结束关系的文件",
				stayingLogic: {
					emotionalReason: "她仍想确认自己没有误会",
					materialReason: "共同住所让她暂时无法立刻离开",
					socialReason: "双方家庭仍在等待一个结果",
					falseBelief: "只要拿到最后的解释就能放下",
					sustainingEvidence: ["他一直要求她再等一天"],
					breakingThreshold: "她发现文件上的签名人已经换成别人",
				},
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
				beats: Array.from({ length: 12 }, (_, index) =>
					beat(
						index + 1,
						[
							"injury",
							"recognition",
							"micro-withdrawal",
							"boundary-test",
							"irreversible-exit",
							"self-rebuild",
							"final-boundary",
						][Math.min(index, 6)] as ChaseWifeBeat["heroinePhase"],
						[
							"entitlement",
							"entitlement",
							"loss-of-control",
							"wrong-pursuit",
							"real-consequence",
							"recognition",
							"respect-or-failure",
						][Math.min(index, 6)] as ChaseWifeBeat["malePhase"],
					),
				),
			});
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "result-first",
					chapter: 1,
					povMode: "split-pov",
					openingConflict: "她正在签下结束关系的文件",
					openingConflictMarker: "签下结束关系的文件",
					events: [
						event(1, "decision", {
							heroineAgencyBefore: 10,
							heroineAgencyAfter: 30,
							irreversible: false,
							beatRefs: [1],
						}),
						event(2, "boundary-test", { heroineAgencyBefore: 30, heroineAgencyAfter: 40, beatRefs: [2] }),
						event(3, "irreversible-exit", { heroineAgencyBefore: 40, heroineAgencyAfter: 60, beatRefs: [3] }),
					],
				}),
			).resolves.toBeTruthy();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("blocks male POV until an irreversible exit exists in an earlier chapter", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-cross-chapter-pov-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "cross-pov", title: "cross chapter pov", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "cross-pov",
				chapter: 1,
				povMode: "split-pov",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine discovers that her place has already been given away",
				openingConflictMarker: "a signed replacement contract",
				events: [event(1, "opening-injury"), event(2, "boundary-test"), event(3, "evidence")],
			});
			const maleChapter = [
				event(1, "pursuit-control", { pov: "male-limited-third-person", targetTrack: "male" }),
				event(2, "real-consequence", { pov: "male-limited-third-person", targetTrack: "male" }),
				event(3, "recognition", { pov: "male-limited-third-person", targetTrack: "male" }),
			];
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "cross-pov",
					chapter: 2,
					povMode: "split-pov",
					openingConflict: "the man tries to recover the access he treated as permanent",
					events: maleChapter,
				}),
			).rejects.toThrow("after the irreversible exit");
			await store.saveChaseWifeEventMap({
				projectId: "cross-pov",
				chapter: 1,
				povMode: "split-pov",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine discovers that her place has already been given away",
				openingConflictMarker: "a signed replacement contract",
				events: [
					event(1, "opening-injury"),
					event(2, "boundary-test"),
					event(3, "irreversible-exit", { heroineAgencyBefore: 30, heroineAgencyAfter: 60 }),
				],
			});
			await expect(
				store.saveChaseWifeEventMap({
					projectId: "cross-pov",
					chapter: 2,
					povMode: "split-pov",
					openingConflict: "the man tries to recover the access he treated as permanent",
					events: maleChapter,
				}),
			).resolves.toBeTruthy();
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
						pov: "heroine-first-person",
						targetTrack: "shared",
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
						pov: "heroine-first-person",
						targetTrack: "shared",
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
				const eventContent = drafts.find(([draftEventId]) => draftEventId === eventId)?.[1];
				if (eventRecord !== undefined && eventContent !== undefined)
					await saveFixtureSemanticReport(store, "pacing", 1, eventRecord, eventContent);
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
			expect(storyPacing.metrics.newLifeRatio).toBe(0);
			const score = await store.scoreChaseWifeChapter({ projectId: "pacing", chapter: 1 });
			expect(score.passed).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("does not count a result-first exit preview as the present-timeline exit", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-exit-preview-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "exit-preview", title: "exit preview", genre: "chase-wife" });
			const events = [
				event(1, "irreversible-exit", {
					chronology: "flashforward-preview",
					heroineAgencyBefore: 10,
					heroineAgencyAfter: 20,
					lengthMode: "anchor",
					minChars: 450,
					maxChars: 850,
				}),
				event(2, "evidence", { lengthMode: "flash", minChars: 60, maxChars: 180 }),
				event(3, "irreversible-exit", {
					heroineAgencyBefore: 25,
					heroineAgencyAfter: 50,
					lengthMode: "anchor",
					minChars: 450,
					maxChars: 850,
				}),
				event(4, "pursuit-failure", {
					pov: "male-limited-third-person",
					targetTrack: "male",
					lengthMode: "flash",
					minChars: 60,
					maxChars: 180,
				}),
			];
			await store.saveChaseWifeEventMap({
				projectId: "exit-preview",
				chapter: 1,
				povMode: "split-pov",
				openingMode: "result-first",
				openingIntro: "我在签字前看见了那份已经替我决定好的离婚协议。".repeat(4),
				openingConflict: "离婚协议已经放在我面前",
				openingConflictMarker: "离婚协议",
				events,
			});
			for (const eventRecord of events) {
				const content = `${eventRecord.eventId === 1 ? "离婚协议" : ""}${fixtureEventProse(eventRecord, 1)}`;
				await store.saveChaseWifeEventDraft({
					projectId: "exit-preview",
					chapter: 1,
					eventId: eventRecord.eventId,
					content,
				});
				await store.checkChaseWifeEventDraft({
					projectId: "exit-preview",
					chapter: 1,
					eventId: eventRecord.eventId,
				});
				await saveFixtureSemanticReport(store, "exit-preview", 1, eventRecord, content);
			}
			await store.assembleChaseWifeChapter({ projectId: "exit-preview", chapter: 1 });
			const pacing = await store.checkChaseWifeChapterPacing({ projectId: "exit-preview", chapter: 1 });
			expect(pacing.metrics.exitRatio).toBeGreaterThan(0.6);
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
					boundedContent,
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
					boundedContent,
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
			await store.saveChaseWifeBeatSheet({
				projectId: "six",
				povMode: "split-pov",
				pacingMode: "standard",
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
				openingConflict: "the heroine is asked to surrender her place",
				stayingLogic: {
					emotionalReason: "she still believes the old promise can be repaired",
					materialReason: "her home and work are tied to the relationship",
					socialReason: "both families expect her to keep the commitment",
					falseBelief: "one more explanation will make him choose her",
					sustainingEvidence: ["he keeps asking her to wait"],
					breakingThreshold: "he publicly gives her place to someone else",
				},
				beats: [
					beat(1, "injury", "entitlement"),
					beat(2, "recognition", "entitlement"),
					beat(3, "micro-withdrawal", "loss-of-control"),
					beat(4, "boundary-test", "wrong-pursuit"),
					beat(5, "irreversible-exit", "real-consequence"),
					beat(6, "irreversible-exit", "recognition"),
					beat(7, "self-rebuild", "recognition"),
					beat(8, "self-rebuild", "respect-or-failure"),
					beat(9, "final-boundary"),
					beat(10, "final-boundary"),
					beat(11, "final-boundary"),
					beat(12, "final-boundary"),
				],
			});
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
			const beatGroups = [
				[1, 2],
				[3, 4],
				[5, 6],
				[7, 8],
				[9, 10],
				[11, 12],
			];
			for (const [chapterIndex, chapterEvents] of chapters.entries())
				for (const [eventIndex, eventRecord] of chapterEvents.entries())
					eventRecord.beatRefs = beatGroups[(chapterIndex * 3 + eventIndex) % beatGroups.length];
			for (const [index, events] of chapters.entries())
				await finalizeFixtureChapter(store, cwd, "six", index + 1, events);
			await saveFixtureRelationshipContracts(store, cwd, "six");
			const finalizedPacing = await store.checkChaseWifeStoryPacing({ projectId: "six", scope: "finalized" });
			expect(finalizedPacing.status, JSON.stringify(finalizedPacing)).not.toBe("error");
			expect(finalizedPacing.metrics.chapterCount).toBe(6);
			expect(finalizedPacing.metrics.eventCount).toBe(18);
			const endingEligibility = await store.checkChaseWifeEndingEligibility({ projectId: "six" });
			expect(endingEligibility.status, JSON.stringify(endingEligibility)).toBe("ok");
			const chapterOneContent = await readFile(join(cwd, "novels", "six", "chapters", "chapter-001.md"), "utf8");
			const chapterOneManifest = JSON.parse(
				await readFile(join(cwd, "novels", "six", "work", "chase-wife-assemblies", "chapter-001-r01.json"), "utf8"),
			) as { eventDrafts: Array<{ eventId: number; startChar: number }> };
			const eventThreeRange = chapterOneManifest.eventDrafts.find((item) => item.eventId === 3);
			if (eventThreeRange === undefined) throw new Error("fixture event range is missing");
			await store.saveChaseWifeHarmLedger({
				projectId: "six",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-001",
						category: "deprioritization",
						victimImpact: {
							emotional: "the heroine is treated as replaceable",
							future: "the shared future is withdrawn",
						},
						maleBeliefAtTheTime: "he believes she will keep waiting",
						heroineBeliefAtTheTime: "she believes the promise still matters",
						severity: "major",
						recognizedByHeroine: true,
						recognizedByMale: true,
						repaired: true,
						repairable: true,
						evidence: [ledgerEvidence(chapterOneContent, 1, eventThreeRange.startChar, 1)],
						recognitionEvidence: [ledgerEvidence(chapterOneContent, 1, 0, 2)],
					},
				],
			});
			const outOfRange = await store.checkChaseWifeEndingEligibility({ projectId: "six" });
			expect(outOfRange.status).toBe("error");
			expect(outOfRange.issues.some((issue) => issue.includes("harm-001 evidence must stay inside"))).toBe(true);
			await saveFixtureRelationshipContracts(store, cwd, "six");
			const seal = await store.finalizeManuscript({ projectId: "six", confirmation: "USER_CONFIRMED" });
			expect(seal.status).toBe("finalized");
			await store.checkChaseWifeArc({ projectId: "six" });
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
			const semantics = await store.checkChaseWifeEventProse({
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
				const semantics = await store.checkChaseWifeEventProse({ projectId: "finalize", chapter: 1, eventId });
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
				if (eventRecord !== undefined) await saveFixtureSemanticReport(store, "finalize", 1, eventRecord, content);
			}
			const assembled = await store.assembleChaseWifeChapter({ projectId: "finalize", chapter: 1 });
			const content = await readFile(join(cwd, "novels", "finalize", assembled.path), "utf8");
			const chapterPacing = await store.checkChaseWifeChapterPacing({ projectId: "finalize", chapter: 1 });
			expect(chapterPacing.status, JSON.stringify(chapterPacing)).toBe("ok");
			const score = await store.scoreChaseWifeChapter({ projectId: "finalize", chapter: 1 });
			expect(score.passed, JSON.stringify(score)).toBe(true);
			await store.checkAiArtifacts({ projectId: "finalize", chapter: 1, draftRevision: assembled.draftRevision });
			const aiArtifactPath = join(
				cwd,
				"novels",
				"finalize",
				"evaluations",
				"chapter",
				"chapter-001-ai-artifacts-r01.json",
			);
			const aiArtifact = JSON.parse(await readFile(aiArtifactPath, "utf8")) as Record<string, unknown>;
			expect(aiArtifact.contentHash).toBe(createHash("sha256").update(content, "utf8").digest("hex"));
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
			).rejects.toThrow("reader simulation and story review");
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
					content: "the reader follows the heroine's choice",
					structuredReport: {
						status: "ok",
						engagementDrops: [],
						predictions: [],
						confusionPoints: [],
						credibilityBreaks: [],
						strongestMoments: [
							{
								location: "chars:0-8",
								evidence: "the heroine leaves",
								problem: "none",
								anchor: semanticAnchor(content, 0),
							},
						],
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
			).rejects.toThrow("reader simulation and story review");
			await expect(
				store.saveQualityReport(
					{
						projectId: "finalize",
						chapter: 1,
						draftRevision: assembled.draftRevision,
						content: "an empty review cannot authorize finalization",
						structuredReport: {
							status: "ok",
							structuralIssues: [],
							sceneIssues: [],
							characterIssues: [],
							pacingIssues: [],
							priorities: ["keep the heroine's final choice visible"],
							verifiedStrengths: [],
							allowFinalize: true,
						},
					},
					"review",
				),
			).rejects.toThrow("structured");
			await store.saveQualityReport(
				{
					projectId: "finalize",
					chapter: 1,
					draftRevision: assembled.draftRevision,
					content: "the reviewer confirms the relationship turn",
					structuredReport: {
						status: "ok",
						structuralIssues: [],
						sceneIssues: [],
						characterIssues: [],
						pacingIssues: [],
						priorities: ["keep the heroine's final choice visible"],
						verifiedStrengths: [
							{
								location: "chars:0-8",
								evidence: "the heroine leaves",
								problem: "the review verifies the final choice",
								anchor: semanticAnchor(content, 0),
							},
						],
						allowFinalize: true,
					},
				},
				"review",
			);
			const staleAiArtifact = JSON.parse(await readFile(aiArtifactPath, "utf8")) as Record<string, unknown>;
			staleAiArtifact.contentHash = "stale-draft-hash";
			await writeFile(aiArtifactPath, `${JSON.stringify(staleAiArtifact, null, 2)}\n`, "utf8");
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
			).rejects.toThrow("AI-artifact");
			await store.checkAiArtifacts({ projectId: "finalize", chapter: 1, draftRevision: assembled.draftRevision });
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
			const stayingLogic = {
				emotionalReason: "she still believes the promise can be repaired",
				falseBelief: "one more explanation will make him choose her",
				sustainingEvidence: ["he keeps asking her to wait"],
				breakingThreshold: "he gives her place to someone else in public",
			};
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
					stayingLogic,
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
					stayingLogic,
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
					stayingLogic,
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
			const semanticContent = "I turn away and leave.";
			const invalid = await store.saveChaseWifeEventSemanticReport({
				projectId: "semantic-gate",
				chapter: 1,
				eventId: 1,
				roleSatisfied: false,
				conflictShown: false,
				stateDeltasShown: [
					{ dimension: "information", delta: "fact", evidence: semanticAnchor(semanticContent, 0) },
					{ dimension: "relationship", delta: "trust", evidence: semanticAnchor(semanticContent, 0) },
				],
				roleEvidence: semanticAnchor(semanticContent, 0),
				conflictEvidence: semanticAnchor(semanticContent, 2),
				entryHookEvidence: semanticAnchor(semanticContent, 2),
				exitHookEvidence: semanticAnchor(semanticContent, 2),
				injuryMechanismEvidence: semanticAnchor(semanticContent, 4),
			});
			expect(invalid.status).toBe("error");
			expect(invalid.issues).toEqual(
				expect.arrayContaining(["roleSatisfied must be true", "conflictShown must be true"]),
			);
			const valid = await saveFixtureSemanticReport(
				store,
				"semantic-gate",
				1,
				event(1, "opening-injury"),
				semanticContent,
			);
			expect(valid).toBeUndefined();
			const saved = await store.saveChaseWifeEventSemanticReport({
				projectId: "semantic-gate",
				chapter: 1,
				eventId: 1,
				roleSatisfied: true,
				conflictShown: true,
				stateDeltasShown: [
					{ dimension: "information", delta: "fact", evidence: semanticAnchor(semanticContent, 0) },
					{ dimension: "relationship", delta: "trust", evidence: semanticAnchor(semanticContent, 20) },
				],
				roleEvidence: semanticAnchor(semanticContent, 0),
				conflictEvidence: semanticAnchor(semanticContent, 2),
				agencyActionEvidence: semanticAnchor(semanticContent, 0),
				entryHookEvidence: semanticAnchor(semanticContent, 2),
				exitHookEvidence: semanticAnchor(semanticContent, 12),
				injuryMechanismEvidence: semanticAnchor(semanticContent, 4),
			});
			expect(saved.status).toBe("ok");
			await store.checkChaseWifeEventDraft({ projectId: "semantic-gate", chapter: 1, eventId: 1 });
			const semanticReport = JSON.parse(
				await readFile(
					join(cwd, "novels", "semantic-gate", "continuity", "reports", "chapter-001-event-001-semantics.json"),
					"utf8",
				),
			) as { source?: string };
			expect(semanticReport.source).toBe("model");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("does not treat confirmed relationship claims as prose evidence", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-ledger-evidence-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "ledger-evidence", title: "ledger evidence", genre: "chase-wife" });
			await store.saveChaseWifeHarmLedger({
				projectId: "ledger-evidence",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-1",
						category: "deception",
						victimImpact: { emotional: "trust is broken" },
						maleBeliefAtTheTime: "the truth can wait",
						heroineBeliefAtTheTime: "the promise is real",
						severity: "relationship-breaking",
						recognizedByHeroine: true,
						recognizedByMale: true,
						repaired: true,
						repairable: true,
					},
				],
			});
			await store.saveChaseWifeRepairLedger({
				projectId: "ledger-evidence",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				repairs: [
					{
						id: "repair-1",
						addressesHarmIds: ["harm-1"],
						type: "costly-accountability",
						action: "he accepts the public consequence",
						costToMale: "he loses status",
						benefitToHeroine: "the record is repaired",
						requestedReward: "none",
						violatesBoundary: false,
						acceptedByHeroine: true,
						effectiveness: "credible",
					},
					{
						id: "repair-2",
						addressesHarmIds: ["harm-1"],
						type: "boundary-respect",
						action: "he accepts her refusal",
						costToMale: "he gives up reconciliation",
						benefitToHeroine: "her boundary remains intact",
						requestedReward: "none",
						violatesBoundary: false,
						acceptedByHeroine: true,
						effectiveness: "credible",
					},
				],
			});
			await store.saveChaseWifeEndingContract({
				projectId: "ledger-evidence",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				contract: {
					mode: "earned-reunion",
					heroineIndependentFutureRequired: true,
					maleRecognitionRequired: true,
					restitutionRequired: true,
					boundaryRespectRequired: true,
					reunionEligibilityRules: ["no pressure after refusal"],
				},
			});
			const progress = await store.checkChaseWifeHarmRepairProgress({ projectId: "ledger-evidence", chapter: 1 });
			expect(progress.status).toBe("stalled");
			expect(progress.harms).toEqual([
				expect.objectContaining({ harmId: "harm-1", repairCount: 2, credibleRepairCount: 0, evidenceBound: false }),
			]);
			const eligibility = await store.checkChaseWifeEndingEligibility({ projectId: "ledger-evidence" });
			expect(eligibility.status).toBe("error");
			expect(eligibility.issues.some((issue) => issue.includes("prose evidence"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("rejects an event plan that leaves beats unreferenced", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-beat-coverage-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "beat-coverage", title: "beat coverage", genre: "chase-wife" });
			await store.saveChaseWifeBeatSheet({
				projectId: "beat-coverage",
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
				openingConflict: "the heroine is asked to surrender her place",
				stayingLogic: {
					emotionalReason: "she still believes the old promise can be repaired",
					materialReason: "her home and work are tied to the relationship",
					socialReason: "both families expect her to keep the commitment",
					falseBelief: "one more explanation will make him choose her",
					sustainingEvidence: ["he keeps asking her to wait"],
					breakingThreshold: "he publicly gives her place to someone else",
				},
				beats: [
					beat(1, "injury", "entitlement"),
					beat(2, "recognition", "entitlement"),
					beat(3, "micro-withdrawal", "loss-of-control"),
					beat(4, "boundary-test", "wrong-pursuit"),
					beat(5, "irreversible-exit", "real-consequence"),
					beat(6, "irreversible-exit", "recognition"),
					beat(7, "self-rebuild", "recognition"),
					beat(8, "self-rebuild", "respect-or-failure"),
					beat(9, "final-boundary"),
					beat(10, "final-boundary"),
					beat(11, "final-boundary"),
					beat(12, "final-boundary"),
				],
			});
			await store.saveChaseWifeEventMap({
				projectId: "beat-coverage",
				chapter: 1,
				povMode: "split-pov",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine is asked to surrender her place",
				openingConflictMarker: "surrender her place",
				events: [
					event(1, "opening-injury", { beatRefs: [1] }),
					event(2, "micro-withdrawal", { beatRefs: [2] }),
					event(3, "irreversible-exit", { beatRefs: [3] }),
				],
			});
			const report = await store.checkChaseWifeArc({ projectId: "beat-coverage" });
			expect(report.status).toBe("error");
			expect(report.issues).toContain("beat 4 is not referenced by any chapter event");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps chase-wife chapter drafts behind event assembly", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-draft-boundary-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "draft-boundary", title: "draft boundary", genre: "chase-wife" });
			await expect(
				store.saveChapterDraft({ projectId: "draft-boundary", chapter: 1, content: "直接写入整章" }),
			).rejects.toThrow("assemble_chase_wife_chapter");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("requires concrete harm, repair, and ending evidence for an earned reunion", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-ledgers-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "ledgers", title: "ledgers", genre: "chase-wife" });
			const ledgerContent = "她在公开场合确认了自己的新生活，男方承认曾经的选择造成了伤害。";
			await mkdir(join(cwd, "novels", "ledgers", "chapters"), { recursive: true });
			await writeFile(join(cwd, "novels", "ledgers", "chapters", "chapter-001.md"), ledgerContent, "utf8");
			await store.saveChaseWifeHarmLedger({
				projectId: "ledgers",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-1",
						category: "deception",
						victimImpact: { epistemic: "she loses trust in her own judgment" },
						maleBeliefAtTheTime: "the truth can wait",
						heroineBeliefAtTheTime: "the promise is real",
						severity: "major",
						recognizedByHeroine: true,
						recognizedByMale: false,
						repaired: false,
						repairable: true,
						evidence: [ledgerEvidence(ledgerContent, 1, 0)],
						recognitionEvidence: [ledgerEvidence(ledgerContent, 1, 20)],
					},
				],
			});
			await store.saveChaseWifeRepairLedger({
				projectId: "ledgers",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				repairs: [
					{
						id: "repair-1",
						addressesHarmIds: ["harm-1"],
						type: "specific-apology",
						action: "he explains the specific lie",
						costToMale: "he admits fault",
						benefitToHeroine: "she receives the truth",
						requestedReward: false,
						violatesBoundary: false,
						acceptedByHeroine: true,
						effectiveness: "credible",
						evidence: [ledgerEvidence(ledgerContent, 1, 10)],
					},
					{
						id: "repair-2",
						addressesHarmIds: ["harm-1"],
						type: "costly-accountability",
						action: "he accepts public consequences",
						costToMale: "he loses status",
						benefitToHeroine: "the record is repaired",
						requestedReward: "none",
						violatesBoundary: false,
						acceptedByHeroine: true,
						effectiveness: "credible",
						evidence: [ledgerEvidence(ledgerContent, 1, 30)],
					},
				],
			});
			await store.saveChaseWifeEndingContract({
				projectId: "ledgers",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				contract: {
					mode: "earned-reunion",
					heroineIndependentFutureRequired: true,
					maleRecognitionRequired: true,
					restitutionRequired: true,
					boundaryRespectRequired: true,
					reunionEligibilityRules: ["no pressure after refusal"],
					eligibilityRules: [
						{
							id: "public-correction-required",
							type: "repair-type-required",
							repairType: "public-correction",
							harmId: "harm-1",
						},
					],
					heroineIndependentFutureEvidence: [ledgerEvidence(ledgerContent, 1, 0)],
				},
			});
			const blocked = await store.checkChaseWifeEndingEligibility({ projectId: "ledgers" });
			expect(blocked.status).toBe("error");
			expect(blocked.issues.some((issue) => issue.includes("male recognition"))).toBe(true);
			await store.saveChaseWifeHarmLedger({
				projectId: "ledgers",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-1",
						category: "deception",
						victimImpact: { epistemic: "she loses trust in her own judgment" },
						maleBeliefAtTheTime: "the truth can wait",
						heroineBeliefAtTheTime: "the promise is real",
						severity: "major",
						recognizedByHeroine: true,
						recognizedByMale: true,
						repaired: true,
						repairable: true,
						evidence: [ledgerEvidence(ledgerContent, 1, 0)],
						recognitionEvidence: [ledgerEvidence(ledgerContent, 1, 20)],
					},
				],
			});
			const blockedByRule = await store.checkChaseWifeEndingEligibility({ projectId: "ledgers" });
			expect(blockedByRule.status).toBe("error");
			expect(blockedByRule.issues.some((issue) => issue.includes("public-correction-required"))).toBe(true);
			await store.saveChaseWifeRepairLedger({
				projectId: "ledgers",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				repairs: [
					{
						id: "repair-3",
						addressesHarmIds: ["harm-1"],
						type: "public-correction",
						action: "he corrects the public record",
						costToMale: "he loses the reputation he protected",
						benefitToHeroine: "her name is cleared",
						requestedReward: "none",
						violatesBoundary: false,
						acceptedByHeroine: true,
						effectiveness: "credible",
						evidence: [ledgerEvidence(ledgerContent, 1, 40)],
					},
				],
			});
			const eligible = await store.checkChaseWifeEndingEligibility({ projectId: "ledgers" });
			expect(eligible.status).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("enforces no-reunion and open-ending eligibility requirements", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-ending-modes-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "ending-modes", title: "ending modes", genre: "chase-wife" });
			const chapterContent =
				"The heroine names the harm, keeps her own work, and chooses the boundary without waiting for his permission. ".repeat(
					8,
				);
			await mkdir(join(cwd, "novels", "ending-modes", "chapters"), { recursive: true });
			await writeFile(join(cwd, "novels", "ending-modes", "chapters", "chapter-001.md"), chapterContent, "utf8");
			const evidence = ledgerEvidence(chapterContent, 1, 0, 1);
			await store.saveChaseWifeHarmLedger({
				projectId: "ending-modes",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-1",
						category: "boundary-violation",
						victimImpact: { future: "she stops planning her future around him" },
						maleBeliefAtTheTime: "she will stay",
						heroineBeliefAtTheTime: "the promise still has value",
						severity: "relationship-breaking",
						recognizedByHeroine: true,
						recognizedByMale: true,
						repaired: true,
						repairable: true,
						evidence: [evidence],
						recognitionEvidence: [ledgerEvidence(chapterContent, 1, 30, 2)],
					},
				],
			});
			await store.saveChaseWifeRepairLedger({
				projectId: "ending-modes",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				repairs: [
					{
						id: "repair-1",
						addressesHarmIds: ["harm-1"],
						type: "boundary-respect",
						action: "he stops contacting her after the refusal",
						costToMale: "he gives up immediate reconciliation",
						benefitToHeroine: "her boundary remains intact",
						requestedReward: "none",
						violatesBoundary: false,
						acceptedByHeroine: false,
						heroineResponse: "rejected",
						effectiveness: "credible",
						evidence: [ledgerEvidence(chapterContent, 1, 60, 2)],
					},
				],
			});
			const baseContract = {
				heroineIndependentFutureRequired: true,
				maleRecognitionRequired: true,
				restitutionRequired: false,
				boundaryRespectRequired: true,
				reunionEligibilityRules: ["the heroine keeps the final choice"],
				heroineIndependentFutureEvidence: [ledgerEvidence(chapterContent, 1, 90, 3)],
			};
			await store.saveChaseWifeEndingContract({
				projectId: "ending-modes",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				contract: { mode: "no-reunion", ...baseContract },
			});
			const repairProgress = await store.checkChaseWifeHarmRepairProgress({ projectId: "ending-modes", chapter: 1 });
			expect(repairProgress.harms).toEqual([
				expect.objectContaining({ credibleRepairCount: 1, stage: "repair-credible" }),
			]);
			const noBoundary = await store.checkChaseWifeEndingEligibility({ projectId: "ending-modes" });
			expect(noBoundary.status).toBe("error");
			expect(noBoundary.issues.some((issue) => issue.includes("final-boundary"))).toBe(true);
			await store.saveChaseWifeEventMap({
				projectId: "ending-modes",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the heroine sees the relationship's true priority",
				openingConflictMarker: "the replacement is already public",
				events: [
					event(1, "opening-injury", { harmRefs: ["harm-1"] }),
					event(2, "irreversible-exit", { repairRefs: ["repair-1"] }),
					event(3, "final-boundary"),
				],
			});
			const noReunion = await store.checkChaseWifeEndingEligibility({ projectId: "ending-modes" });
			expect(noReunion.status).toBe("error");
			expect(noReunion.issues.some((issue) => issue.includes("finalized final-boundary"))).toBe(true);
			await store.saveChaseWifeEndingContract({
				projectId: "ending-modes",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				contract: { mode: "open-ending", ...baseContract },
			});
			const closedOpenEnding = await store.checkChaseWifeEndingEligibility({ projectId: "ending-modes" });
			expect(closedOpenEnding.status).toBe("error");
			expect(closedOpenEnding.issues.some((issue) => issue.includes("open choice"))).toBe(true);
			expect(closedOpenEnding.issues.some((issue) => issue.includes("finalized final-boundary"))).toBe(true);
			await store.saveChaseWifeEndingContract({
				projectId: "ending-modes",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				contract: {
					mode: "open-ending",
					...baseContract,
					openChoice: "Whether she ever allows a new relationship remains her choice.",
				},
			});
			const openEnding = await store.checkChaseWifeEndingEligibility({ projectId: "ending-modes" });
			expect(openEnding.status).toBe("error");
			expect(openEnding.issues.some((issue) => issue.includes("finalized final-boundary"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("rejects ledger claims that are not bound to referenced event prose", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-ledger-event-binding-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "ledger-events", title: "ledger events", genre: "chase-wife" });
			const chapterContent =
				"The heroine names the broken promise, leaves the shared home, and keeps the future she planned for herself. ".repeat(
					8,
				);
			await mkdir(join(cwd, "novels", "ledger-events", "chapters"), { recursive: true });
			await writeFile(join(cwd, "novels", "ledger-events", "chapters", "chapter-001.md"), chapterContent, "utf8");
			const saveHarm = async (withEventId: boolean): Promise<void> => {
				await store.saveChaseWifeHarmLedger({
					projectId: "ledger-events",
					status: "confirmed",
					confirmation: "USER_CONFIRMED",
					harms: [
						{
							id: "harm-1",
							category: "deception",
							victimImpact: { future: "she stops building a future around him" },
							maleBeliefAtTheTime: "she will stay",
							heroineBeliefAtTheTime: "the promise still matters",
							severity: "relationship-breaking",
							recognizedByHeroine: true,
							recognizedByMale: true,
							repaired: true,
							repairable: true,
							evidence: [ledgerEvidence(chapterContent, 1, 0, withEventId ? 1 : undefined)],
							recognitionEvidence: [ledgerEvidence(chapterContent, 1, 30, 2)],
						},
					],
				});
			};
			const saveRepair = async (withEventId: boolean): Promise<void> => {
				await store.saveChaseWifeRepairLedger({
					projectId: "ledger-events",
					status: "confirmed",
					confirmation: "USER_CONFIRMED",
					repairs: [
						{
							id: "repair-1",
							addressesHarmIds: ["harm-1"],
							type: "boundary-respect",
							action: "he stops after her refusal",
							costToMale: "he gives up immediate reconciliation",
							benefitToHeroine: "her boundary remains intact",
							requestedReward: "none",
							violatesBoundary: false,
							acceptedByHeroine: true,
							effectiveness: "credible",
							evidence: [ledgerEvidence(chapterContent, 1, 60, withEventId ? 2 : undefined)],
						},
					],
				});
			};
			await saveHarm(false);
			await saveRepair(false);
			await store.saveChaseWifeEventMap({
				projectId: "ledger-events",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "opening intro ".repeat(8),
				openingConflict: "the relationship's priority is exposed",
				openingConflictMarker: "the promise is already broken",
				events: [
					event(1, "opening-injury", { harmRefs: ["harm-1"] }),
					event(2, "irreversible-exit", { repairRefs: ["repair-1"] }),
					event(3, "final-boundary"),
				],
			});
			await store.saveChaseWifeEndingContract({
				projectId: "ledger-events",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				contract: {
					mode: "no-reunion",
					heroineIndependentFutureRequired: true,
					maleRecognitionRequired: true,
					restitutionRequired: false,
					boundaryRespectRequired: true,
					reunionEligibilityRules: ["her refusal is final"],
					heroineIndependentFutureEvidence: [ledgerEvidence(chapterContent, 1, 90)],
				},
			});
			const unbound = await store.checkChaseWifeEndingEligibility({ projectId: "ledger-events" });
			expect(unbound.status).toBe("error");
			expect(
				unbound.issues.some((issue) => issue.includes("harm-1 evidence must identify its referenced event")),
			).toBe(true);
			await saveHarm(true);
			await saveRepair(true);
			const bound = await store.checkChaseWifeEndingEligibility({ projectId: "ledger-events" });
			expect(bound.status).toBe("error");
			expect(
				bound.issues.some((issue) => issue.includes("harm-1 evidence must identify its referenced event")),
			).toBe(false);
			expect(bound.issues.some((issue) => issue.includes("finalized final-boundary"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("recognizes real Chinese action evidence in semantic prose checks", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chinese-evidence-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "chinese-evidence", title: "中文证据", genre: "chase-wife" });
			await store.saveChaseWifeEventMap({
				projectId: "chinese-evidence",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "开场引言先给出被替代的事实，再把选择压到女主面前。".repeat(5),
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "让给了别人",
				events: [
					event(1, "opening-injury", { minChars: 220, maxChars: 450 }),
					event(2, "micro-withdrawal"),
					event(3, "irreversible-exit"),
				],
			});
			const prose = Array.from(
				{ length: 18 },
				(_, index) => `I在第${index + 1}次确认后转身离开，把决定写进新的生活。`,
			).join("");
			await store.saveChaseWifeEventDraft({ projectId: "chinese-evidence", chapter: 1, eventId: 1, content: prose });
			const report = await store.checkChaseWifeEventProse({
				projectId: "chinese-evidence",
				chapter: 1,
				eventId: 1,
			});
			expect(report.status, JSON.stringify(report)).toBe("ok");
			expect(report.roleSatisfied).toBe(true);
			expect(report.agencyActionEvidence).toContain("转身离开");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("assembles a compact Chinese chase-wife chapter from event-level prose", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chinese-chapter-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "chinese-chapter", title: "离开以后", genre: "chase-wife" });
			const events = [
				event(1, "opening-injury", { heroineAgencyBefore: 10, heroineAgencyAfter: 20 }),
				event(2, "micro-withdrawal", {
					heroineAgencyBefore: 20,
					heroineAgencyAfter: 30,
					lengthMode: "flash",
					minChars: 60,
					maxChars: 180,
				}),
				event(3, "irreversible-exit", {
					heroineAgencyBefore: 30,
					heroineAgencyAfter: 50,
					lengthMode: "anchor",
					minChars: 450,
					maxChars: 850,
				}),
			];
			await store.saveChaseWifeEventMap({
				projectId: "chinese-chapter",
				chapter: 1,
				povMode: "heroine-first-person",
				openingIntro: "引言先给出被替代的事实，再让女主在第一段就看见关系的真实位置。".repeat(4),
				openingConflict: "他把我的位置让给了别人",
				openingConflictMarker: "把我的位置让给了别人",
				events,
			});
			const prose = [
				[
					1,
					Array.from(
						{ length: 12 },
						(_, index) => `他把我的位置让给了别人。我在第${index + 1}次确认后转身离开，把决定写进了新的生活。`,
					).join(""),
				],
				[
					2,
					Array.from({ length: 4 }, (_, index) => `我删除了共同日程里的第${index + 1}项安排，没有再解释。`).join(
						"",
					),
				],
				[
					3,
					Array.from(
						{ length: 27 },
						(_, index) => `我把钥匙放在桌上，签下离开的文件。第${index + 1}次回头时，门已经关上。`,
					).join(""),
				],
			] as const;
			for (const [eventId, content] of prose) {
				await store.saveChaseWifeEventDraft({ projectId: "chinese-chapter", chapter: 1, eventId, content });
				const budget = await store.checkChaseWifeEventDraft({ projectId: "chinese-chapter", chapter: 1, eventId });
				expect(budget.status, JSON.stringify(budget)).toBe("ok");
				await saveFixtureSemanticReport(store, "chinese-chapter", 1, events[eventId - 1], content);
			}
			const assembled = await store.assembleChaseWifeChapter({ projectId: "chinese-chapter", chapter: 1 });
			const assembledContent = await readFile(join(cwd, "novels", "chinese-chapter", assembled.path), "utf8");
			expect(assembled.eventCount).toBe(3);
			expect(assembledContent).toContain("我把钥匙放在桌上");
			expect(assembledContent).toContain("把我的位置让给了别人");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("turns excessive AI-artifact findings into a failed quality gate", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-ai-artifacts-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "ai-artifacts", title: "ai artifacts", genre: "urban-romance" });
			await store.saveChapterDraft({ projectId: "ai-artifacts", chapter: 1, content: "仿佛。仿佛。仿佛。仿佛。" });
			const report = await store.checkAiArtifacts({ projectId: "ai-artifacts", chapter: 1, draftRevision: 1 });
			expect(report.findingCount).toBe(1);
			expect(report.passed).toBe(false);
			expect(report.status).toBe("error");
			await store.saveChapterDraft({ projectId: "ai-artifacts", chapter: 1, content: "仿佛。仿佛。仿佛。仿佛。" });
			const chineseReport = await store.checkAiArtifacts({
				projectId: "ai-artifacts",
				chapter: 1,
				draftRevision: 2,
			});
			expect(chineseReport.findingCount).toBe(1);
			expect(chineseReport.passed).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
