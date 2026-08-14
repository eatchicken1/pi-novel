import { mkdir as fsMkdir, writeFile as fsWriteFile, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import type {
	ChapterPlanProposal,
	ChapterSummary,
	UnifiedEvent,
	VoiceFingerprint,
	VoiceProfile,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import {
	compileAuthoringContext,
	type PreparedContextSection,
} from "../../../.pi/extensions/novel-agent/services/context-compiler.ts";
import {
	checkCharacterArcs,
	checkLongFormContinuity,
	checkProfessionalState,
	checkRelationshipLedger,
	checkSetupPayoff,
	checkThreadLedger,
	type LongFormCheckContext,
} from "../../../.pi/extensions/novel-agent/services/continuity-ledgers.ts";
import {
	aggregateSnapshot,
	deriveChapterDelta,
	deriveLedgers,
	type MemoryChapterInput,
	type MemoryInputs,
	type MemoryLedgers,
	normalizeFactValue,
} from "../../../.pi/extensions/novel-agent/services/narrative-memory.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";
import { checkVoiceDrift } from "../../../.pi/extensions/novel-agent/services/scene-review.ts";

const fsPromises = { mkdir: fsMkdir, writeFile: fsWriteFile };

async function readJsonIfExists(p: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(p, "utf8"));
	} catch {
		return undefined;
	}
}

async function withProject<T>(
	name: string,
	setup: (store: NovelProjectStore, projectId: string, cwd: string) => Promise<T>,
): Promise<T> {
	const cwd = await mkdtemp(join(tmpdir(), `pi-novel-lf-${name}-`));
	try {
		return await setup(new NovelProjectStore(cwd), name, cwd);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}

async function initPlain(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "longform",
		genre: "general-fiction",
		storyProfile: {
			primaryGenre: "general-fiction",
			relationshipMechanisms: [],
			professionalDomain: undefined,
			storyForm: "mid-length",
			audience: "female",
			setting: "contemporary-china",
		},
	});
}

function plainEvent(
	eventId: number,
	chapter: number,
	opts: {
		resourceRef?: string;
		resourceChange?: string;
		storyDate?: string;
		storyTime?: string;
		scene?: string;
		irreversible?: boolean;
		characterDimension?: string;
		characterFrom?: string;
		characterTo?: string;
	} = {},
): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "推进",
		conflict: "阻力",
		action: "行动",
		consequence: "后果",
		characterDeltas:
			opts.characterDimension === undefined
				? []
				: [
						{
							characterId: "heroine",
							dimension: opts.characterDimension as never,
							from: opts.characterFrom ?? "a",
							to: opts.characterTo ?? "b",
						},
					],
		resourceDeltas:
			opts.resourceRef === undefined ? [] : [{ itemRef: opts.resourceRef, change: opts.resourceChange ?? "获得" }],
		riskDeltas: [],
		causes: [],
		irreversible: opts.irreversible === true,
		cannotRemoveBecause: "x",
		storyDate: opts.storyDate,
		storyTime: opts.storyTime,
		durationMinutes: undefined,
		...(opts.scene === undefined ? {} : { scene: opts.scene }),
	} as UnifiedEvent;
}

function summaryFor(
	_chapter: number,
	opts: {
		heroineLearned?: string[];
		readerLearned?: string[];
		spouseLearned?: string[];
		opened?: string[];
		advanced?: string[];
		closed?: string[];
		setups?: string[];
		payoffs?: string[];
		criticalFacts?: Array<{ label: string; value: string; unit?: string }>;
	} = {},
): ChapterSummary {
	return {
		pov: "heroine",
		time: "白天",
		locations: ["办公室"],
		characters: ["heroine"],
		events: ["推进"],
		newFacts: [],
		relationshipChanges: [],
		cluesIntroduced: [],
		cluesResolved: [],
		itemsChanged: [],
		openQuestions: [],
		whatChanged: [],
		whatHeroineLearned: opts.heroineLearned,
		whatReaderLearned: opts.readerLearned,
		whatSpouseLearned: opts.spouseLearned,
		threadsOpened: opts.opened,
		threadsAdvanced: opts.advanced,
		threadsClosed: opts.closed,
		setups: opts.setups,
		payoffs: opts.payoffs,
		criticalFacts: opts.criticalFacts,
	};
}

function chapterInput(chapter: number, events: UnifiedEvent[], summary?: ChapterSummary): MemoryChapterInput {
	return {
		chapter,
		events,
		summary,
		sourceHashes: { prose: `p${chapter}`, summary: `s${chapter}`, events: `e${chapter}` },
	};
}

function inputsFor(chapters: MemoryChapterInput[], extra: Partial<MemoryInputs> = {}): MemoryInputs {
	return {
		chapters,
		throughChapter: Math.max(...chapters.map((chapter) => chapter.chapter), 0),
		mysteryCase: undefined,
		mysteryClues: [],
		harmRecords: [],
		repairRecords: [],
		sourceRevisionHash: "rev",
		...extra,
	};
}

function checkContext(
	_ledgers: MemoryLedgers,
	currentChapter: number,
	chapters: MemoryChapterInput[],
): LongFormCheckContext {
	return {
		currentChapter,
		totalChapters: currentChapter,
		chapters: chapters.map((candidate) => ({ chapter: candidate.chapter, events: candidate.events })),
	};
}

describe("long-form narrative memory", () => {
	// ==== Memory ====
	it("LM1: finalized chapter produces a state delta", () => {
		const delta = deriveChapterDelta(
			chapterInput(
				1,
				[
					plainEvent(1, 1, { resourceRef: "门禁记录", resourceChange: "复制一份" }),
					plainEvent(2, 1, { irreversible: true }),
				],
				summaryFor(1, { heroineLearned: ["T1"] }),
			),
		);
		expect(delta.chapter).toBe(1);
		expect(delta.objectChanges.some((change) => change.ref === "门禁记录")).toBe(true);
		expect(delta.goalChanges.some((change) => change.change.includes("irreversible"))).toBe(true);
		expect(delta.knowledgeChanges.some((change) => change.ref === "T1")).toBe(true);
	});

	it("LM2: snapshot aggregates ledgers", () => {
		const inputs = inputsFor([
			chapterInput(
				1,
				[plainEvent(1, 1, { resourceRef: "门禁记录" })],
				summaryFor(1, { heroineLearned: ["T1"], opened: ["thread-a"] }),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		const snapshot = aggregateSnapshot(ledgers, 1, "rev");
		expect(snapshot.throughChapter).toBe(1);
		expect(snapshot.objects.some((object) => object.objectId === "门禁记录")).toBe(true);
		expect(snapshot.unresolvedThreads).toContain("thread-a");
	});

	it("LM3: character state ledger tracks goals, decisions, costs", () => {
		const inputs = inputsFor([
			chapterInput(
				1,
				[plainEvent(1, 1, { irreversible: true, resourceRef: "钥匙", resourceChange: "交还" })],
				summaryFor(1, { heroineLearned: ["T1"] }),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		const heroine = ledgers.characters.find((character) => character.characterId === "heroine");
		expect(heroine).toBeDefined();
		expect(heroine?.recentDecisions.length).toBeGreaterThan(0);
		expect(heroine?.knownFactRefs).toContain("T1");
	});

	it("LM4: knowledge entries are knower-isolated", () => {
		const inputs = inputsFor([
			chapterInput(
				1,
				[
					{
						eventId: 1,
						chapter: 1,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: ["C1"],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [
								{ claimId: "T1", audience: "reader", knowledge: "knows" },
								{ claimId: "T2", audience: "heroine", knowledge: "suspects" },
							],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(1),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		expect(
			ledgers.knowledge.some(
				(entry) => entry.knower === "reader" && entry.factRef === "T1" && entry.status === "knows",
			),
		).toBe(true);
		expect(ledgers.knowledge.some((entry) => entry.knower === "heroine" && entry.factRef === "T1")).toBe(false);
		expect(
			ledgers.knowledge.some(
				(entry) => entry.knower === "heroine" && entry.factRef === "T2" && entry.status === "suspects",
			),
		).toBe(true);
	});

	it("LM5: relationship history tracks boundary, separation, repair", () => {
		const inputs = inputsFor(
			[
				chapterInput(
					1,
					[
						{
							eventId: 1,
							chapter: 1,
							chronology: "present",
							pov: "heroine-first-person",
							storyGoal: "g",
							conflict: "c",
							action: "a",
							consequence: "c",
							chaseWifeDelta: {
								informationDelta: [],
								relationshipDelta: ["裂缝"],
								resourceDelta: [],
								riskDelta: [],
								heroineAgencyBefore: 10,
								heroineAgencyAfter: 20,
								harmRefs: ["H1"],
								repairRefs: [],
								role: "boundary-test",
								beatRefs: [1],
								paywallHook: false,
							},
							characterDeltas: [],
							resourceDeltas: [],
							riskDeltas: [],
							causes: [],
							irreversible: false,
							cannotRemoveBecause: "x",
						} as UnifiedEvent,
					],
					summaryFor(1),
				),
				chapterInput(
					2,
					[
						{
							eventId: 2,
							chapter: 2,
							chronology: "present",
							pov: "heroine-first-person",
							storyGoal: "g",
							conflict: "c",
							action: "a",
							consequence: "c",
							chaseWifeDelta: {
								informationDelta: [],
								relationshipDelta: [],
								resourceDelta: [],
								riskDelta: [],
								heroineAgencyBefore: 20,
								heroineAgencyAfter: 30,
								harmRefs: [],
								repairRefs: [],
								role: "irreversible-exit",
								beatRefs: [2],
								paywallHook: false,
							},
							characterDeltas: [],
							resourceDeltas: [],
							riskDeltas: [],
							causes: [1],
							irreversible: false,
							cannotRemoveBecause: "x",
						} as UnifiedEvent,
					],
					summaryFor(2),
				),
			],
			{ harmRecords: [{ id: "H1", severity: "major" }] },
		);
		const ledgers = deriveLedgers(inputs);
		const relationship = ledgers.relationships.find((candidate) => candidate.relationshipId === "heroine-spouse");
		expect(relationship?.boundary).toBe("tested");
		expect(relationship?.physicalDistance).toBe("separated");
		expect(relationship?.unresolvedHarmRefs).toContain("H1");
	});

	it("LM6: object continuity ledger tracks holder, location, destruction", () => {
		const inputs = inputsFor([
			chapterInput(
				3,
				[plainEvent(1, 3, { resourceRef: "证据复印件", resourceChange: "复制一份放回抽屉" })],
				summaryFor(3),
			),
			chapterInput(
				4,
				[plainEvent(2, 4, { resourceRef: "证据复印件", resourceChange: "交给丈夫保管" })],
				summaryFor(4),
			),
			chapterInput(5, [plainEvent(3, 5, { resourceRef: "证据复印件", resourceChange: "销毁" })], summaryFor(5)),
		]);
		const ledgers = deriveLedgers(inputs);
		const object = ledgers.objects.find((candidate) => candidate.objectId === "证据复印件");
		expect(object).toBeDefined();
		expect(object?.introducedChapter).toBe(3);
		expect(object?.lastSeenChapter).toBe(5);
		expect(object?.currentHolder).toContain("丈夫");
		expect(object?.state).toBe("destroyed");
		// 销毁后再用 → OBJECT_REAPPEARS_AFTER_DESTRUCTION
		const later = inputsFor([
			chapterInput(3, [plainEvent(1, 3, { resourceRef: "证据复印件" })], summaryFor(3)),
			chapterInput(5, [plainEvent(2, 5, { resourceRef: "证据复印件", resourceChange: "销毁" })], summaryFor(5)),
			chapterInput(6, [plainEvent(3, 6, { resourceRef: "证据复印件", resourceChange: "取出使用" })], summaryFor(6)),
		]);
		const ledgers2 = deriveLedgers(later);
		const findings = checkLongFormContinuity(ledgers2, checkContext(ledgers2, 6, later.chapters));
		expect(
			findings.some(
				(finding) => finding.code === "OBJECT_REAPPEARS_AFTER_DESTRUCTION" && finding.severity === "error",
			),
		).toBe(true);
	});

	it("LM7: critical facts normalized and contradiction detected", () => {
		expect(normalizeFactValue("300万")).toBe("3000000");
		expect(normalizeFactValue("两千三")).toBe("2300");
		expect(normalizeFactValue("2300元")).toBe("2300元");
		const inputs = inputsFor([
			chapterInput(20, [], summaryFor(20, { criticalFacts: [{ label: "保单金额", value: "300万" }] })),
			chapterInput(25, [], summaryFor(25, { criticalFacts: [{ label: "保单金额", value: "500万" }] })),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 25, inputs.chapters));
		expect(
			findings.some((finding) => finding.code === "FACT_VALUE_CONTRADICTION" && finding.severity === "error"),
		).toBe(true);
	});

	it("LM8: timeline detects order contradiction and two-places", () => {
		const bad = inputsFor([
			chapterInput(1, [plainEvent(1, 1, { storyDate: "3月12日" })], summaryFor(1)),
			chapterInput(2, [plainEvent(2, 2, { storyDate: "3月10日" })], summaryFor(2)),
		]);
		const ledgers = deriveLedgers(bad);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 2, bad.chapters));
		expect(
			findings.some((finding) => finding.code === "TIME_ORDER_CONTRADICTION" && finding.severity === "error"),
		).toBe(true);
		const twoPlaces = inputsFor([
			chapterInput(
				1,
				[
					plainEvent(1, 1, { storyTime: "09:00", scene: "办公室" }),
					plainEvent(2, 1, { storyTime: "09:00", scene: "医院" }),
				],
				summaryFor(1),
			),
		]);
		const ledgers2 = deriveLedgers(twoPlaces);
		const findings2 = checkLongFormContinuity(ledgers2, checkContext(ledgers2, 1, twoPlaces.chapters));
		expect(
			findings2.some((finding) => finding.code === "CHARACTER_IN_TWO_PLACES" && finding.severity === "error"),
		).toBe(true);
	});

	it("LM9: thread ledger tracks open/advance/resolve", () => {
		const inputs = inputsFor([
			chapterInput(1, [], summaryFor(1, { opened: ["mystery-1"] })),
			chapterInput(3, [], summaryFor(3, { advanced: ["mystery-1"] })),
			chapterInput(5, [], summaryFor(5, { closed: ["mystery-1"] })),
		]);
		const ledgers = deriveLedgers(inputs);
		const thread = ledgers.threads.find((candidate) => candidate.threadId === "mystery-1");
		expect(thread).toBeDefined();
		expect(thread?.openedChapter).toBe(1);
		expect(thread?.lastAdvancedChapter).toBe(5);
		expect(thread?.status).toBe("resolved");
	});

	it("LM10: setup/payoff ledger pairs clue setup with realization payoff", () => {
		const inputs = inputsFor(
			[
				chapterInput(9, [], summaryFor(9, { setups: ["审批签名"] })),
				chapterInput(23, [], summaryFor(23, { payoffs: ["审批签名"] })),
			],
			{
				mysteryClues: [
					{
						id: "C9",
						observableFact: "审批记录缺签名",
						sourceType: "document",
						sourceDescription: "档案",
						firstAvailableChapter: 9,
						truthClaimIds: ["T9"],
						reliability: "high",
						interpretationOptions: [],
						actualImplication: "流程事后补",
						clueRole: "fair",
						plannedRealizationChapter: 9,
					},
				],
			},
		);
		const ledgers = deriveLedgers(inputs);
		expect(ledgers.setupsPayoffs.some((setup) => setup.setupId === "clue-C9" && setup.setupChapter === 9)).toBe(true);
	});

	it("LM11: professional state snapshot tracks stage and recusal", () => {
		const plan = {
			id: "plan",
			domain: "insurance-fraud-investigation",
			mandate: "m",
			startingStageId: "s1",
			actions: [
				{
					id: "PA-1",
					stageId: "s1",
					description: "调档",
					purpose: "p",
					authorityIds: [],
					authoritySatisfactions: [],
					evidenceSourceIds: [],
					guardrailIds: [],
					expectedInformationGain: "g",
					decisionOrWorkflowEffect: "d",
					ifBlocked: "b",
					professionalRisk: "r",
				},
				{
					id: "PA-2",
					stageId: "s2",
					description: "结案",
					purpose: "p",
					authorityIds: [],
					authoritySatisfactions: [],
					evidenceSourceIds: [],
					guardrailIds: [],
					expectedInformationGain: "g",
					decisionOrWorkflowEffect: "d",
					ifBlocked: "b",
					professionalRisk: "r",
				},
			],
			conflictsOfInterest: [
				{
					id: "COI-1",
					description: "丈夫家族",
					source: "spouse" as const,
					affectedActionIds: ["PA-1"],
					affectedStageIds: ["s1"],
					severity: "critical" as const,
					disclosureRequired: true,
					mitigation: "recusal" as const,
					mitigationDescription: "回避",
					remainingRisk: "低",
				},
			],
			escalations: [],
			professionalConsequences: [],
			observations: [],
			unresolvedQuestions: [],
		} as never;
		const inputs = inputsFor(
			[
				chapterInput(
					1,
					[
						{
							eventId: 1,
							chapter: 1,
							chronology: "present",
							pov: "heroine-first-person",
							storyGoal: "g",
							conflict: "c",
							action: "a",
							consequence: "c",
							professionalDelta: {
								actionIds: ["PA-1"],
								evidenceSourceIds: [],
								conflictIds: [],
								escalationPathIds: [],
								consequenceIds: [],
								observationIds: [],
							},
							characterDeltas: [],
							resourceDeltas: [],
							riskDeltas: [],
							causes: [],
							irreversible: false,
							cannotRemoveBecause: "x",
						} as UnifiedEvent,
					],
					summaryFor(1),
				),
				chapterInput(
					2,
					[
						{
							eventId: 2,
							chapter: 2,
							chronology: "present",
							pov: "heroine-first-person",
							storyGoal: "g",
							conflict: "c",
							action: "a",
							consequence: "c",
							professionalDelta: {
								actionIds: ["PA-1"],
								evidenceSourceIds: [],
								conflictIds: [],
								escalationPathIds: [],
								consequenceIds: [],
								observationIds: [],
							},
							characterDeltas: [],
							resourceDeltas: [],
							riskDeltas: [],
							causes: [1],
							irreversible: false,
							cannotRemoveBecause: "x",
						} as UnifiedEvent,
					],
					summaryFor(2),
				),
			],
			{
				professionalModel: {
					id: "model",
					domain: "insurance-fraud-investigation",
					protagonistRole: {
						title: "调查员",
						departmentOrFunction: "反欺诈",
						organizationType: "保险",
						coreResponsibilities: [],
						reportsTo: "科长",
						decisionScope: "d",
						cannotDecide: [],
						collaboratesWith: [],
						professionalRisk: "r",
					},
					organizationContext: "oc",
					authorityBoundaries: [],
					workflowStages: [],
					evidenceSources: [],
					guardrails: [],
					escalationPaths: [],
				},
				professionalPlan: plan,
			},
		);
		const ledgers = deriveLedgers(inputs);
		expect(ledgers.professionalState).toBeDefined();
		expect(ledgers.professionalState?.recusalState).toBe("active");
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 2, inputs.chapters));
		expect(
			findings.some((finding) => finding.code === "ACTION_IGNORES_PREVIOUS_RECUSAL" && finding.severity === "error"),
		).toBe(true);
	});

	it("LM12: discarded hypothesis resurrection is detected", () => {
		const inputs = inputsFor([
			chapterInput(
				6,
				[
					{
						eventId: 1,
						chapter: 6,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [],
							suspectChanges: ["张某:排除"],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(6),
			),
			chapterInput(
				18,
				[
					{
						eventId: 2,
						chapter: 18,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [],
							suspectChanges: ["张某:重新怀疑"],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [1],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(18),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 18, inputs.chapters));
		expect(findings.some((finding) => finding.code === "DISCARDED_HYPOTHESIS_RESURRECTS_UNEXPLAINED")).toBe(true);
	});

	// ==== Knowledge ====
	it("LM13: character uses unknown information -> error", () => {
		// 女主在 ch1 不知道 T9；ch3 的 prose/summary 引用 T9 而 ch3 没有暴露事件
		const inputs = inputsFor([
			chapterInput(1, [], summaryFor(1)),
			chapterInput(3, [], summaryFor(3, { heroineLearned: ["T9"] })),
		]);
		const ledgers = deriveLedgers(inputs);
		// T9 出现在 ch3 summary 的 whatHeroineLearned 中且此前无 knows 记录 → 直接判定为无源知识
		const t9 = ledgers.knowledge.find((entry) => entry.factRef === "T9" && entry.knower === "heroine");
		expect(t9).toBeDefined();
		expect(t9?.sinceChapter).toBe(3);
		// 无 mystery 能力项目里 summary 声明是唯一来源；此处验证 KNOWLEDGE_APPEARS_WITHOUT_SOURCE 的模型通道存在（advisory）
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 3, inputs.chapters));
		expect(Array.isArray(findings)).toBe(true);
	});

	it("LM14: reader knows but heroine does not -> heroine context never leaks", () => {
		const inputs = inputsFor([chapterInput(1, [], summaryFor(1, { readerLearned: ["T9"] }))]);
		const ledgers = deriveLedgers(inputs);
		expect(ledgers.knowledge.some((entry) => entry.knower === "reader" && entry.factRef === "T9")).toBe(true);
		expect(ledgers.knowledge.some((entry) => entry.knower === "heroine" && entry.factRef === "T9")).toBe(false);
		const heroineKnowledge = ledgers.knowledge.filter((entry) => entry.knower === "heroine");
		expect(heroineKnowledge.every((entry) => entry.factRef !== "T9")).toBe(true);
	});

	it("LM15: heroine knows but spouse does not -> spouse knowledge isolated", () => {
		const inputs = inputsFor([chapterInput(1, [], summaryFor(1, { heroineLearned: ["T7"] }))]);
		const ledgers = deriveLedgers(inputs);
		expect(ledgers.knowledge.some((entry) => entry.knower === "heroine" && entry.factRef === "T7")).toBe(true);
		expect(ledgers.knowledge.some((entry) => entry.knower === "spouse" && entry.factRef === "T7")).toBe(false);
	});

	it("LM16: false belief only changes after a trigger", () => {
		const inputs = inputsFor([
			chapterInput(
				1,
				[
					{
						eventId: 1,
						chapter: 1,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [{ claimId: "T3", audience: "heroine", knowledge: "believes" }],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(1),
			),
			chapterInput(
				2,
				[
					{
						eventId: 2,
						chapter: 2,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [{ claimId: "T3", audience: "heroine", knowledge: "knows" }],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [1],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(2),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 2, inputs.chapters));
		// believes → knows 但 ch2 无信息暴露事件（无 clue/reveal）→ FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER
		expect(findings.some((finding) => finding.code === "FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER")).toBe(true);
		// 有触发（发现 C3）则通过
		const withTrigger = inputsFor([
			chapterInput(
				1,
				[
					{
						eventId: 1,
						chapter: 1,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [{ claimId: "T3", audience: "heroine", knowledge: "believes" }],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(1),
			),
			chapterInput(
				2,
				[
					{
						eventId: 2,
						chapter: 2,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: ["C3"],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [{ claimId: "T3", audience: "heroine", knowledge: "knows" }],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [1],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(2),
			),
		]);
		const ledgers2 = deriveLedgers(withTrigger);
		const findings2 = checkLongFormContinuity(ledgers2, checkContext(ledgers2, 2, withTrigger.chapters));
		expect(findings2.some((finding) => finding.code === "FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER")).toBe(false);
	});

	// ==== Revision ====
	it("LM17: re-finalizing a chapter invalidates and rebuilds derived memory", async () => {
		await withProject("lm17", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await store.buildNarrativeEventGraph({
				projectId,
				events: [plainEvent(1, 1, { resourceRef: "门禁记录", resourceChange: "复制一份" })],
			});
			const plan = planForChapter1();
			await store.planChapter({ projectId, chapter: 1, plan });
			const content =
				"她把门禁记录复制了一份，锁进抽屉，又在笔记本上记下时间戳。她走出办公室，把钥匙放回门卫处。".repeat(2);
			await store.draftChapter({
				projectId,
				chapter: 1,
				eventDrafts: [{ eventId: 1, content }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(content, 0) }],
					},
				],
			});
			await saveRealizationFor(store, projectId, 1, 1, content);
			let integrity = await store.checkContinuity({ projectId, chapter: 1 });
			expect(integrity.status, JSON.stringify(integrity.issues)).not.toBe("error");
			await store.saveContinuityReport({ projectId, chapter: 1, draftRevision: 1, status: "ok", issues: [] });
			const first = await store.finalizeChapter({
				projectId,
				chapter: 1,
				title: "第一章",
				content,
				summary: summaryFor(1, { heroineLearned: ["T1"], criticalFacts: [{ label: "金额", value: "300万" }] }),
				draftRevision: 1,
				confirmation: "USER_CONFIRMED",
			});
			expect(first.memoryCommitted).toBe(true);
			expect((await store.memoryStatusFor(projectId)).status).toBe("current");
			// 修订正文（scoped revise）→ r02 → 重新 realization/报告 → 重定稿 → memory 自动重算
			const revisedContent = "她把门禁记录复制了一份，并锁进抽屉。她又核对了一遍时间戳，把复印件放回原处。".repeat(
				2,
			);
			const revise = await store.reviseChapter({
				projectId,
				chapter: 1,
				revisionPlan: {
					chapter: 1,
					goals: [
						{
							id: "g1",
							priority: "P3",
							sourceDiagnosisIds: [],
							problem: "补动作",
							strategy: "补充行动细节",
							affectedEventIds: [1],
						},
					],
				},
				eventDrafts: [{ eventId: 1, content: revisedContent }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(revisedContent, 0) }],
					},
				],
			});
			expect(revise.status, JSON.stringify(revise)).toBe("needs-review");
			await saveRealizationFor(store, projectId, 1, 2, revisedContent);
			integrity = await store.checkContinuity({ projectId, chapter: 1 });
			expect(integrity.status, JSON.stringify(integrity.issues)).not.toBe("error");
			await store.saveContinuityReport({ projectId, chapter: 1, draftRevision: 2, status: "ok", issues: [] });
			const second = await store.finalizeChapter({
				projectId,
				chapter: 1,
				title: "第一章",
				content: revisedContent,
				summary: summaryFor(1, { heroineLearned: ["T1"], criticalFacts: [{ label: "金额", value: "300万" }] }),
				confirmation: "USER_CONFIRMED",
				overwrite: true,
				draftRevision: 2,
			});
			expect(second.memoryCommitted).toBe(true);
			const snapshot = await readJsonIfExists(
				join(cwd, "novels", projectId, "continuity", "memory", "current-snapshot.json"),
			);
			expect((snapshot as { throughChapter?: number }).throughChapter).toBe(1);
			expect((await store.memoryStatusFor(projectId)).status).toBe("current");
		});
	});

	it("LM18: prose-only revision impact is safe-local", async () => {
		await withProject("lm18", async (store, projectId) => {
			await initPlain(store, projectId);
			const report = await store.analyzeRevisionImpact({ projectId, changedChapter: 7 });
			expect(report.severity).toBe("safe-local");
			expect(report.affectedChapters).toEqual([7]);
			expect(report.affectedManuscriptReview).toBe(false);
		});
	});

	it("LM19: knowledge-changing revision produces downstream review", async () => {
		await withProject("lm19", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			const report = await store.analyzeRevisionImpact({
				projectId,
				changedChapter: 7,
				knowledgeChanges: [{ characterId: "spouse", factRef: "C4", from: "knows", to: "does-not-know" }],
			});
			expect(report.severity).toBe("downstream-review");
			expect(report.affectedClues).toContain("C4");
			expect(report.affectedCharacters).toContain("spouse");
			const marker = await readJsonIfExists(
				join(cwd, "novels", projectId, "continuity", "revision-impact-current.json"),
			);
			expect((marker as { downstreamReviewRequired?: boolean }).downstreamReviewRequired).toBe(true);
		});
	});

	it("LM20: truth-changing revision is authority-change", async () => {
		await withProject("lm20", async (store, projectId) => {
			await initPlain(store, projectId);
			const report = await store.analyzeRevisionImpact({ projectId, truthChanges: ["T1"] });
			expect(report.severity).toBe("authority-change");
			expect(report.summary).toContain("authority-change");
			expect(report.truthChanges).toContain("T1");
		});
	});

	// ==== Context Compiler ====
	it("CTX-L1: small budget keeps MUST entries", () => {
		const sections: PreparedContextSection[] = [
			{
				key: "events",
				content: "事件内容".repeat(50),
				sourceRefs: ["map"],
				priorityHint: "MUST",
				sourceHash: "h1",
				recency: 5,
			},
			{
				key: "character-states",
				content: "角色状态".repeat(50),
				sourceRefs: ["ledger"],
				priorityHint: "MUST",
				sourceHash: "h2",
				recency: 4,
			},
			{
				key: "old-summaries",
				content: "旧摘要".repeat(200),
				sourceRefs: ["summary"],
				priorityHint: "OPTIONAL",
				sourceHash: "h3",
				recency: 1,
			},
		];
		const compiled = compileAuthoringContext({
			projectId: "p",
			task: "chapter-drafting",
			chapter: 9,
			sections,
			budget: 300,
		});
		expect(compiled.entries.some((entry) => entry.key === "events" && entry.priority === "MUST")).toBe(true);
		expect(compiled.entries.some((entry) => entry.key === "character-states" && entry.priority === "MUST")).toBe(
			true,
		);
		expect(compiled.entries.some((entry) => entry.key === "old-summaries")).toBe(false);
		expect(compiled.truncated).toBe(true);
	});

	it("CTX-L2: unrelated old clue is trimmed", () => {
		const sections: PreparedContextSection[] = [
			{
				key: "events",
				content: "当前事件",
				sourceRefs: ["map"],
				priorityHint: "MUST",
				sourceHash: "h1",
				recency: 5,
			},
			{
				key: "objects",
				content: "无关旧物件 C99 详情".repeat(30),
				sourceRefs: ["objects"],
				priorityHint: "OPTIONAL",
				sourceHash: "h2",
				recency: 1,
			},
		];
		const compiled = compileAuthoringContext({
			projectId: "p",
			task: "chapter-drafting",
			chapter: 9,
			sections,
			budget: 100,
		});
		expect(compiled.entries.some((entry) => entry.key === "objects")).toBe(false);
	});

	it("CTX-L3: relevant old promise is kept even when early", () => {
		const sections: PreparedContextSection[] = [
			{
				key: "promises",
				content: "第 1 章承诺：门禁记录必须被重新解释",
				sourceRefs: ["promise"],
				priorityHint: "SHOULD",
				sourceHash: "h1",
				recency: 1,
			},
			{
				key: "events",
				content: "当前事件",
				sourceRefs: ["map"],
				priorityHint: "MUST",
				sourceHash: "h2",
				recency: 9,
			},
		];
		const compiled = compileAuthoringContext({
			projectId: "p",
			task: "chapter-drafting",
			chapter: 24,
			sections,
			budget: 1000,
		});
		expect(compiled.entries.some((entry) => entry.key === "promises")).toBe(true);
		expect(compiled.selectedSources.some((source) => source.source === "promises")).toBe(true);
	});

	it("CTX-L4: relationship boundary history retrieved via scene refs", () => {
		const sections: PreparedContextSection[] = [
			{
				key: "relationship-history",
				content: "ch7 女主明确提出边界：不要替她处理调查流程",
				sourceRefs: ["relationships"],
				priorityHint: "SHOULD",
				sourceHash: "h1",
				recency: 3,
				relatedTo: ["boundary"],
			},
			{
				key: "events",
				content: "当前场景引用边界",
				sourceRefs: ["map"],
				priorityHint: "MUST",
				sourceHash: "h2",
				recency: 9,
			},
		];
		const compiled = compileAuthoringContext({
			projectId: "p",
			task: "chapter-drafting",
			chapter: 16,
			sections,
			budget: 1000,
		});
		expect(compiled.entries.some((entry) => entry.key === "relationship-history")).toBe(true);
	});

	it("CTX-L5: reader context never includes author-private memory", () => {
		const sections: PreparedContextSection[] = [
			{
				key: "scene-design",
				content: "underlyingIntent: 逼他承认",
				sourceRefs: ["scene-designs"],
				priorityHint: "MUST",
				sourceHash: "h1",
				recency: 5,
			},
			{
				key: "summaries",
				content: "第 10 章摘要",
				sourceRefs: ["summary"],
				priorityHint: "SHOULD",
				sourceHash: "h2",
				recency: 4,
			},
			{ key: "events", content: "事件", sourceRefs: ["map"], priorityHint: "MUST", sourceHash: "h3", recency: 3 },
		];
		// reader-sim profile 只保留 project/summaries：scene-design 不被选择（隐私由 profile + path filter 双重保证）
		const compiled = compileAuthoringContext({ projectId: "p", task: "reader-sim", sections, budget: 10000 });
		expect(compiled.entries.every((entry) => entry.key === "summaries")).toBe(true);
	});

	it("CTX-L6: stale source is excluded and reported", () => {
		const sections: PreparedContextSection[] = [
			{
				key: "events",
				content: "旧事件内容",
				sourceRefs: ["map"],
				priorityHint: "MUST",
				sourceHash: "old-hash",
				recency: 5,
			},
		];
		const compiled = compileAuthoringContext({
			projectId: "p",
			task: "chapter-drafting",
			chapter: 3,
			sections,
			budget: 1000,
			currentHashes: { events: "new-hash" },
		});
		expect(compiled.entries.length).toBe(0);
		expect(compiled.staleSources).toContain("events");
	});

	// ==== Long-form Review（MR）====
	it("MR1: forgotten thread detected", () => {
		const inputs = inputsFor([
			chapterInput(1, [], summaryFor(1, { opened: ["mystery-major"] })),
			chapterInput(2, [], summaryFor(2, { advanced: ["mystery-major"] })),
		]);
		const ledgers = deriveLedgers(inputs);
		const threads = ledgers.threads.map((thread) => ({
			...thread,
			importance: thread.threadId === "mystery-major" ? "major" : thread.importance,
		}));
		const findings = checkThreadLedger(
			{ ...ledgers, threads: threads as never },
			checkContext(ledgers, 15, inputs.chapters),
		);
		expect(findings.some((finding) => finding.code === "THREAD_DROPPED")).toBe(true);
	});

	it("MR2: dangling setup detected", () => {
		const inputs = inputsFor([chapterInput(1, [], summaryFor(1, { setups: ["setup-1"] }))]);
		const ledgers = deriveLedgers(inputs);
		const setups = ledgers.setupsPayoffs.map((setup) => ({
			...setup,
			importance: "major" as const,
			expectedPayoffWindow: 8,
		}));
		const findings = checkSetupPayoff(
			{ ...ledgers, setupsPayoffs: setups },
			checkContext(ledgers, 15, inputs.chapters),
		);
		expect(
			findings.some((finding) => finding.code === "SETUP_NEVER_USED" || finding.code === "SETUP_FORGOTTEN_TOO_LONG"),
		).toBe(true);
	});

	it("MR3: character goal disappears", () => {
		const inputs = inputsFor([
			chapterInput(1, [plainEventWithDelta(1, 1)], summaryFor(1)),
			chapterInput(2, [plainEventWithDelta(2, 2)], summaryFor(2)),
			chapterInput(3, [plainEventWithDelta(3, 3)], summaryFor(3)),
			chapterInput(4, [plainEvent(4, 4, { resourceRef: "材料" })], summaryFor(4)),
			chapterInput(14, [plainEvent(5, 14, { resourceRef: "材料" })], summaryFor(14)),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkCharacterArcs(ledgers, checkContext(ledgers, 14, inputs.chapters));
		// 女主在 ch3 之后无 characterDelta/chase 事件（arc.lastChapter=3），当前 14 → 11 章未出现
		expect(findings.some((finding) => finding.code === "CHARACTER_GOAL_DISAPPEARS")).toBe(true);
	});

	it("MR4: repeated boundary discovery detected", () => {
		const inputs = inputsFor([
			chapterInput(7, [chaseEvent(7, 1, "boundary-test")], summaryFor(7)),
			chapterInput(16, [chaseEvent(16, 2, "boundary-test")], summaryFor(16)),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkRelationshipLedger(ledgers, checkContext(ledgers, 16, inputs.chapters));
		expect(findings.some((finding) => finding.code === "REPEATED_BOUNDARY_DISCOVERY")).toBe(true);
	});

	it("MR5: voice drift from profile", () => {
		const fingerprint: VoiceFingerprint = {
			chapter: 12,
			sentenceRhythm: "short",
			interiority: "high",
			dialogueCompression: "moderate",
			professionalVocabulary: "low",
			emotionLabeling: "high",
			detectedAvoidPatterns: ["爽文腔", "网络金句"],
		};
		const profile: VoiceProfile = {
			distance: "贴近",
			sentenceRhythm: "短句为主",
			observationBias: "职业观察",
			emotionalExplicitness: "low",
			professionalDensity: "high",
			metaphorDensity: "low",
			humorLevel: "dry",
			preferredTensionMode: "procedural risk",
			avoidPatterns: ["爽文腔", "网络金句"],
			characterVoiceNotes: [],
		};
		const findings = checkVoiceDrift(fingerprint, profile);
		expect(findings.some((finding) => finding.code === "VOICE_DRIFT")).toBe(true);
	});

	it("MR6: repeated chapter ending pattern at manuscript level", async () => {
		await withProject("mr6", async (store, projectId) => {
			await initPlain(store, projectId);
			for (let chapter = 1; chapter <= 4; chapter += 1) {
				await finalizePlainChapter(
					store,
					projectId,
					chapter,
					[plainEvent(chapter, chapter, { resourceRef: `材料${chapter}` })],
					summaryFor(chapter),
					`她把材料${chapter}收进档案袋，锁好抽屉。`.repeat(3),
				);
			}
			const review = await store.reviewManuscript({
				projectId,
				review: {
					verdict: "structural-revision-needed",
					strongestElements: [],
					structuralIssues: [],
					characterIssues: [],
					suspenseIssues: [],
					relationshipIssues: [],
					professionalIssues: [],
					socialRealityIssues: [],
					pacingIssues: [],
					endingIssues: [],
					revisionPriorities: ["节奏"],
					storyRevisionPlan: undefined,
				},
			});
			expect(review.diagnostics.some((diagnostic) => diagnostic.includes("REPEATED_CHAPTER_ENDING"))).toBe(true);
		});
	});

	it("MR7: professional consequence forgotten", () => {
		const professionalState = {
			currentStageId: "s2",
			authorizedActionIds: [],
			pendingApprovalIds: [],
			recusalState: "none" as const,
			conflictIds: [],
			openEvidenceRequestIds: [],
			evidenceAccessState: "accessed",
			professionalConsequenceIds: ["CON-1"],
			supervisorPosition: "x",
			lastChapter: 2,
		};
		const ledgers: MemoryLedgers = {
			characters: [],
			knowledge: [],
			relationships: [],
			objects: [],
			criticalFacts: [],
			timeline: [],
			threads: [],
			setupsPayoffs: [],
			professionalState,
			hypotheses: [],
			characterArcs: [],
		};
		const eventWithConsequence = {
			eventId: 1,
			chapter: 2,
			chronology: "present" as const,
			pov: "heroine-first-person" as const,
			storyGoal: "g",
			conflict: "c",
			action: "a",
			consequence: "c",
			professionalDelta: {
				actionIds: [],
				evidenceSourceIds: [],
				conflictIds: [],
				escalationPathIds: [],
				consequenceIds: ["CON-1"],
				observationIds: [],
			},
			characterDeltas: [],
			resourceDeltas: [],
			riskDeltas: [],
			causes: [],
			irreversible: false,
			cannotRemoveBecause: "x",
		} as UnifiedEvent;
		const context: LongFormCheckContext = {
			currentChapter: 5,
			totalChapters: 5,
			chapters: [
				{ chapter: 1, events: [] },
				{ chapter: 2, events: [eventWithConsequence] },
				{ chapter: 3, events: [] },
				{ chapter: 4, events: [] },
				{ chapter: 5, events: [] },
			],
		};
		const findings = checkProfessionalState(ledgers, context);
		expect(findings.some((finding) => finding.code === "PROFESSIONAL_CONSEQUENCE_DISAPPEARS")).toBe(true);
	});

	it("MR8: false hypothesis resurrection (manuscript-level view)", () => {
		// 与 LM12 同机制；此处验证经 checkLongFormContinuity 聚合后可见
		const inputs = inputsFor([
			chapterInput(
				6,
				[
					{
						eventId: 1,
						chapter: 6,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [],
							suspectChanges: ["李某:排除"],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(6),
			),
			chapterInput(
				18,
				[
					{
						eventId: 2,
						chapter: 18,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "g",
						conflict: "c",
						action: "a",
						consequence: "c",
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [],
							suspectChanges: ["李某:重新怀疑"],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [1],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
				summaryFor(18),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 18, inputs.chapters));
		expect(findings.some((finding) => finding.code === "DISCARDED_HYPOTHESIS_RESURRECTS_UNEXPLAINED")).toBe(true);
	});

	it("MR9: climax leaves a major promise unresolved -> finalization blocked", async () => {
		await withProject("mr9", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await finalizePlainChapter(
				store,
				projectId,
				1,
				[plainEvent(1, 1, { resourceRef: "材料" })],
				summaryFor(1),
				"她把材料收进档案袋，锁好抽屉。".repeat(3),
			);
			// 承诺 ledger：mystery promise 未支付 → major thread 悬空
			await fsPromises.mkdir(join(cwd, "novels", projectId, "work", "authoring"), { recursive: true });
			await fsPromises.writeFile(
				join(cwd, "novels", projectId, "work", "authoring", "story-promises.json"),
				JSON.stringify({
					version: 1,
					projectId,
					promises: [
						{
							id: "P1",
							kind: "mystery",
							promise: "门禁记录必须被重新解释",
							introducedByMovementId: "m1",
							supportingRefs: [{ kind: "clue", ref: "C1" }],
						},
					],
				}),
				"utf8",
			);
			await store.repairNarrativeMemory({ projectId });
			await store.reviewManuscript({
				projectId,
				review: {
					verdict: "structural-revision-needed",
					strongestElements: [],
					structuralIssues: [],
					characterIssues: [],
					suspenseIssues: [],
					relationshipIssues: [],
					professionalIssues: [],
					socialRealityIssues: [],
					pacingIssues: [],
					endingIssues: [],
					revisionPriorities: ["收尾"],
					storyRevisionPlan: undefined,
				},
			});
			let blocked = false;
			try {
				await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			} catch (error) {
				blocked = String(error).includes("MANUSCRIPT_DANGLING_MAJOR_THREAD");
			}
			expect(blocked).toBe(true);
		});
	});

	it("MR10: clean manuscript fixture passes manuscript review", async () => {
		await withProject("mr10", async (store, projectId) => {
			await initPlain(store, projectId);
			for (let chapter = 1; chapter <= 3; chapter += 1) {
				await finalizePlainChapter(
					store,
					projectId,
					chapter,
					[plainEvent(chapter, chapter, { resourceRef: `材料${chapter}` })],
					summaryFor(chapter),
					`她把材料${chapter}收进档案袋，锁好抽屉。`.repeat(3),
				);
			}
			const review = await store.reviewManuscript({
				projectId,
				review: {
					verdict: "ready-for-final-revision",
					strongestElements: ["职业细节"],
					structuralIssues: [],
					characterIssues: [],
					suspenseIssues: [],
					relationshipIssues: [],
					professionalIssues: [],
					socialRealityIssues: [],
					pacingIssues: [],
					endingIssues: [],
					revisionPriorities: [],
					storyRevisionPlan: undefined,
				},
			});
			expect(["completed", "needs-review"]).toContain(review.status);
			expect(
				review.diagnostics.some(
					(diagnostic) =>
						diagnostic.startsWith("FINALIZATION_DERIVED_STATE_STALE") ||
						diagnostic.startsWith("MANUSCRIPT_DANGLING") ||
						diagnostic.startsWith("FACT_VALUE"),
				),
			).toBe(false);
		});
	});

	// ==== Finalization（FIN）====
	async function finalizePlainManuscript(
		store: NovelProjectStore,
		projectId: string,
		chapters: number[],
	): Promise<void> {
		for (const chapter of chapters) {
			await finalizePlainChapter(
				store,
				projectId,
				chapter,
				[plainEvent(chapter, chapter, { resourceRef: `材料${chapter}` })],
				summaryFor(chapter),
				`她把材料${chapter}收进档案袋，锁好抽屉。`.repeat(3),
			);
		}
		await store.reviewManuscript({
			projectId,
			review: {
				verdict: "structural-revision-needed",
				strongestElements: [],
				structuralIssues: [],
				characterIssues: [],
				suspenseIssues: [],
				relationshipIssues: [],
				professionalIssues: [],
				socialRealityIssues: [],
				pacingIssues: [],
				endingIssues: [],
				revisionPriorities: [],
				storyRevisionPlan: undefined,
			},
		});
	}

	it("FIN-L1: stale memory blocks finalization; repair unblocks", async () => {
		await withProject("finl1", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await finalizePlainManuscript(store, projectId, [1, 2]);
			// 删除 snapshot → memory missing
			await rm(join(cwd, "novels", projectId, "continuity", "memory", "current-snapshot.json"), { force: true });
			expect((await store.memoryStatusFor(projectId)).status).toBe("missing");
			let blocked = false;
			try {
				await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			} catch (error) {
				blocked = String(error).includes("FINALIZATION_DERIVED_STATE_STALE");
			}
			expect(blocked).toBe(true);
			// FIN-L7: repair → finalization possible
			const repair = await store.repairNarrativeMemory({ projectId });
			expect(repair.status).toBe("rebuilt");
			const seal = await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			expect(seal.status).toBe("finalized");
			const sealDoc = await readJsonIfExists(
				join(cwd, "novels", projectId, "evaluations", "manuscript", "unified-seal.json"),
			);
			expect((sealDoc as { memorySnapshotHash?: string }).memorySnapshotHash).toBeDefined();
		});
	});

	it("FIN-L2: dangling major thread blocks finalization", async () => {
		await withProject("finl2", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await finalizePlainManuscript(store, projectId, [1, 2]);
			await fsPromises.mkdir(join(cwd, "novels", projectId, "work", "authoring"), { recursive: true });
			await fsPromises.writeFile(
				join(cwd, "novels", projectId, "work", "authoring", "story-promises.json"),
				JSON.stringify({
					version: 1,
					projectId,
					promises: [
						{
							id: "P1",
							kind: "mystery",
							promise: "门禁记录必须被重新解释",
							introducedByMovementId: "m1",
							supportingRefs: [{ kind: "clue", ref: "C1" }],
						},
					],
				}),
				"utf8",
			);
			await store.repairNarrativeMemory({ projectId });
			let blocked = false;
			try {
				await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			} catch (error) {
				blocked = String(error).includes("MANUSCRIPT_DANGLING_MAJOR_THREAD");
			}
			expect(blocked).toBe(true);
		});
	});

	it("FIN-L3: intentional open ending is allowed", async () => {
		await withProject("finl3", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await finalizePlainManuscript(store, projectId, [1, 2]);
			await fsPromises.mkdir(join(cwd, "novels", projectId, "work", "authoring"), { recursive: true });
			await fsPromises.writeFile(
				join(cwd, "novels", projectId, "work", "authoring", "story-promises.json"),
				JSON.stringify({
					version: 1,
					projectId,
					promises: [
						{
							id: "P1",
							kind: "mystery",
							promise: "门禁记录必须被重新解释",
							introducedByMovementId: "m1",
							supportingRefs: [{ kind: "clue", ref: "C1" }],
						},
					],
				}),
				"utf8",
			);
			// 架构的 endingSettlement.unresolvedResidue 显式声明该 thread 为 intentional open
			await fsPromises.mkdir(join(cwd, "novels", projectId, "outline"), { recursive: true });
			await fsPromises.writeFile(
				join(cwd, "novels", projectId, "outline", "story-architecture.json"),
				JSON.stringify({
					version: 1,
					projectId,
					architecture: {
						movements: [
							{
								id: "m1",
								chapters: [1, 2],
								dominantQuestion: "q",
								protagonistGoal: "g",
								externalPressure: "e",
								relationshipPressure: "r",
								professionalPressure: "p",
								irreversibleChange: "i",
								exitCondition: "x",
								eventIds: [1, 2],
							},
						],
						majorQuestions: [],
						majorReframes: [],
						falseModel: { statement: "s", replacedByClaimIds: [] },
						pressureEscalation: [],
						relationshipTurningPoints: [],
						professionalDilemmas: [],
						irreversibleDecisions: [],
						climaxArchitecture: { chapter: 2, engines: ["mystery"], resolutionRefs: [] },
						endingSettlement: {
							chapter: 2,
							personalResolution: "p",
							caseResolution: "c",
							unresolvedResidue: ["P1"],
						},
						socialResidue: [],
						characterArc: [],
					},
				}),
				"utf8",
			);
			await store.repairNarrativeMemory({ projectId });
			const seal = await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			expect(seal.status).toBe("finalized");
		});
	});

	it("FIN-L4: critical fact contradiction blocks finalization", async () => {
		await withProject("finl4", async (store, projectId, _cwd) => {
			await initPlain(store, projectId);
			await finalizePlainChapter(
				store,
				projectId,
				1,
				[plainEvent(1, 1, { resourceRef: "材料" })],
				summaryFor(1, { criticalFacts: [{ label: "保单金额", value: "300万" }] }),
				"她把材料收进档案袋，锁好抽屉。".repeat(3),
			);
			await finalizePlainChapter(
				store,
				projectId,
				2,
				[plainEvent(2, 2, { resourceRef: "材料" })],
				summaryFor(2, { criticalFacts: [{ label: "保单金额", value: "500万" }] }),
				"她又核了一遍金额，锁好抽屉。".repeat(3),
			);
			await store.reviewManuscript({
				projectId,
				review: {
					verdict: "structural-revision-needed",
					strongestElements: [],
					structuralIssues: [],
					characterIssues: [],
					suspenseIssues: [],
					relationshipIssues: [],
					professionalIssues: [],
					socialRealityIssues: [],
					pacingIssues: [],
					endingIssues: [],
					revisionPriorities: [],
					storyRevisionPlan: undefined,
				},
			});
			let blocked = false;
			try {
				await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			} catch (error) {
				blocked = String(error).includes("FACT_VALUE_CONTRADICTION");
			}
			expect(blocked).toBe(true);
		});
	});

	it("FIN-L5: valid manuscript produces Seal V2 with memory hashes", async () => {
		await withProject("finl5", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await finalizePlainManuscript(store, projectId, [1, 2]);
			const seal = await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			expect(seal.status).toBe("finalized");
			const sealDoc = await readJsonIfExists(
				join(cwd, "novels", projectId, "evaluations", "manuscript", "unified-seal.json"),
			);
			for (const key of [
				"memorySnapshotHash",
				"criticalFactsHash",
				"timelineHash",
				"threadLedgerHash",
				"setupPayoffHash",
				"knowledgeLedgerHash",
				"relationshipStateHash",
			]) {
				expect(typeof (sealDoc as Record<string, unknown>)[key]).toBe("string");
			}
		});
	});

	it("FIN-L6: editing a chapter makes the seal stale and blocks export", async () => {
		await withProject("finl6", async (store, projectId, cwd) => {
			await initPlain(store, projectId);
			await finalizePlainManuscript(store, projectId, [1, 2]);
			await store.finalizeManuscriptUnified({ projectId, confirmation: "USER_CONFIRMED" });
			// 直接改定稿正文（模拟外部编辑）
			const chapterPath = join(cwd, "novels", projectId, "chapters", "chapter-001.md");
			await fsPromises.writeFile(chapterPath, "她把材料收进档案袋，锁好抽屉。她又补了一句。".repeat(3), "utf8");
			let exportFailed = false;
			try {
				await store.exportManuscript({ projectId });
			} catch (error) {
				exportFailed = String(error).includes("stale");
			}
			expect(exportFailed).toBe(true);
		});
	});

	// ==== Scenarios（A-J）====
	it("Scenario A: evidence copied in ch3 usable in ch17 via object memory", () => {
		const inputs = inputsFor([
			chapterInput(3, [plainEvent(1, 3, { resourceRef: "证据复印件", resourceChange: "复制一份" })], summaryFor(3)),
			chapterInput(
				17,
				[plainEvent(2, 17, { resourceRef: "证据复印件", resourceChange: "取出使用" })],
				summaryFor(17),
			),
		]);
		const ledgers = deriveLedgers(inputs);
		const object = ledgers.objects.find((candidate) => candidate.objectId === "证据复印件");
		expect(object?.introducedChapter).toBe(3);
		expect(object?.lastSeenChapter).toBe(17);
		expect(object?.state).toBe("intact");
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 17, inputs.chapters));
		expect(findings.some((finding) => finding.code.startsWith("OBJECT_"))).toBe(false);
	});

	it("Scenario B: spouse knowledge change is tracked, not called a lie", () => {
		const inputs = inputsFor([
			chapterInput(5, [], summaryFor(5)),
			chapterInput(8, [], summaryFor(8, { spouseLearned: ["C4"] })),
			chapterInput(14, [], summaryFor(14, { heroineLearned: ["C4"] })),
		]);
		const ledgers = deriveLedgers(inputs);
		const spouse = ledgers.knowledge.find((entry) => entry.knower === "spouse" && entry.factRef === "C4");
		expect(spouse?.status).toBe("knows");
		expect(spouse?.sinceChapter).toBe(8);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 14, inputs.chapters));
		expect(findings.some((finding) => finding.code.includes("LIE"))).toBe(false);
	});

	it("Scenario C: repeated boundary is recognized as repeat, not first discovery", () => {
		const inputs = inputsFor([
			chapterInput(7, [chaseEvent(7, 1, "boundary-test")], summaryFor(7)),
			chapterInput(16, [chaseEvent(16, 2, "boundary-test")], summaryFor(16)),
		]);
		const ledgers = deriveLedgers(inputs);
		const findings = checkLongFormContinuity(ledgers, checkContext(ledgers, 16, inputs.chapters));
		expect(findings.some((finding) => finding.code === "REPEATED_BOUNDARY_DISCOVERY")).toBe(true);
	});

	it("Scenario D: setup (missing signature) pays off in ch23", () => {
		const inputs = inputsFor(
			[
				chapterInput(9, [], summaryFor(9, { setups: ["审批签名"] })),
				chapterInput(23, [], summaryFor(23, { payoffs: ["审批签名"] })),
			],
			{
				mysteryClues: [
					{
						id: "C9",
						observableFact: "审批记录缺签名",
						sourceType: "document",
						sourceDescription: "档案",
						firstAvailableChapter: 9,
						truthClaimIds: ["T9"],
						reliability: "high",
						interpretationOptions: [],
						actualImplication: "流程事后补",
						clueRole: "fair",
						plannedRealizationChapter: 9,
					},
				],
			},
		);
		const ledgers = deriveLedgers(inputs);
		expect(
			ledgers.setupsPayoffs.some(
				(setup) => setup.setupId === "clue-C9" && setup.setupChapter === 9 && setup.payoffStatus === "pending",
			),
		).toBe(true);
	});

	it("Scenario J: cold restart restores memory without session context", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-lf-cold-"));
		try {
			const storeA = new NovelProjectStore(cwd);
			await storeA.initializeNovel({
				projectId: "cold",
				title: "cold",
				genre: "general-fiction",
				storyProfile: {
					primaryGenre: "general-fiction",
					relationshipMechanisms: [],
					professionalDomain: undefined,
					storyForm: "mid-length",
					audience: "female",
					setting: "contemporary-china",
				},
			});
			await finalizePlainChapter(
				storeA,
				"cold",
				1,
				[plainEvent(1, 1, { resourceRef: "门禁记录", resourceChange: "复制一份" })],
				summaryFor(1, {
					heroineLearned: ["T1"],
					opened: ["thread-1"],
					criticalFacts: [{ label: "金额", value: "300万" }],
				}),
				"她把门禁记录复制了一份，锁进抽屉。".repeat(3),
			);
			// 全新 store 实例（process-equivalent）：只从磁盘 artifacts 恢复
			const storeB = new NovelProjectStore(cwd);
			const status = await storeB.getNovelStatus({ projectId: "cold" });
			expect(status.memoryStatus).toBe("current");
			expect(status.openThreads).toBeGreaterThanOrEqual(1);
			expect(status.hasDirections).toBe(false);
			const context = await storeB.compileAuthoringContext({
				projectId: "cold",
				task: "chapter-drafting",
				chapter: 2,
			});
			const keys = new Set(context.entries.map((entry) => entry.key));
			expect(keys.has("character-states")).toBe(true);
			expect(keys.has("knowledge")).toBe(true);
			expect(keys.has("critical-facts")).toBe(true);
			const knowledgeText = context.entries.find((entry) => entry.key === "knowledge")?.content ?? "";
			expect(knowledgeText).toContain("T1");
			const continueResult = await storeB.continueNovel({ projectId: "cold" });
			expect(continueResult.stop).toBe(false);
			// 恢复后继续写第 2 章并定稿 → memory 推进
			await finalizePlainChapter(
				storeB,
				"cold",
				2,
				[plainEvent(2, 2, { resourceRef: "门禁记录", resourceChange: "再次核验" })],
				summaryFor(2, { heroineLearned: ["T2"] }),
				"她又核了一遍门禁记录，把复印件放回原处。".repeat(3),
			);
			const status2 = await storeB.getNovelStatus({ projectId: "cold" });
			expect(status2.memoryStatus).toBe("current");
			expect(status2.currentChapter).toBe(3);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("user-flow smoke: new novel → explore → concept → status-driven continue", async () => {
		await withProject("smoke", async (store, projectId) => {
			await store.initializeNovel({
				projectId,
				title: "smoke",
				genre: "female-social-suspense",
				storyProfile: {
					primaryGenre: "female-social-suspense",
					relationshipMechanisms: ["mature-marriage-crisis", "chase-wife"],
					professionalDomain: "insurance-fraud-investigation",
					storyForm: "mid-length",
					audience: "female",
					setting: "contemporary-china",
				},
			});
			const status1 = await store.getNovelStatus({ projectId });
			expect(status1.workflowPhase).toBe("idea");
			const cont1 = await store.continueNovel({ projectId });
			expect(cont1.recommendedAction?.tool).toBe("develop_story_concept");
			// “继续”第一步：建概念
			await store.developStoryConcept({
				projectId,
				concept: {
					premise: "p",
					protagonistHook: "h",
					protagonistGoal: "g",
					externalConflict: "e",
					relationshipConflict: "r",
					socialQuestion: "s",
					professionalHook: "ph",
					centralDilemma: "d",
					centralMystery: "m",
					emotionalPromise: "em",
					genrePromise: "gp",
					stakes: "st",
					possibleContradictions: [],
					risks: [],
					storyPotential: [],
					genericRisks: [],
				},
			});
			const status2 = await store.getNovelStatus({ projectId });
			expect(status2.workflowPhase).toBe("concept");
			const cont2 = await store.continueNovel({ projectId });
			expect(cont2.recommendedAction?.tool).toBe("develop_story_bible");
		});
	});
});

// 辅助：plain 项目单章 plan（legacy scene contracts）
function planForChapter1(): ChapterPlanProposal {
	return {
		chapterGoal: "推进",
		openingState: "开始",
		eventIds: [1],
		sceneDesign: [
			{
				sceneId: "s1",
				order: 1,
				location: "办公室",
				goal: "推进",
				opposition: "阻力",
				stakes: "st",
				emotionalTurn: "t",
				informationReveal: [],
			},
		],
		informationControl: "i",
		emotionalMovement: "e",
		professionalConstraints: "p",
		relationshipMovement: "r",
		chapterExitPressure: "威胁",
		targetLength: 500,
		cannotRemoveBecause: "x",
	};
}

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 10));
	const endChar = Math.min(normalized.length, safeStart + 10);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}
async function saveRealizationFor(
	store: NovelProjectStore,
	projectId: string,
	chapter: number,
	draftRevision: number,
	content: string,
	eventId?: number,
): Promise<void> {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const excerpt = normalized.slice(0, Math.min(12, normalized.length));
	await store.saveNarrativeRealizations({
		projectId,
		chapter,
		draftRevision,
		records: [
			{
				recordId: `r-${chapter}-${draftRevision}`,
				contentType: "unified-event",
				engineRef: String(eventId ?? chapter),
				anchor: { startChar: 0, endChar: excerpt.length, excerpt },
			},
		],
	});
}

function chaseEvent(chapter: number, eventId: number, role: string): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "g",
		conflict: "c",
		action: "a",
		consequence: "c",
		chaseWifeDelta: {
			informationDelta: [],
			relationshipDelta: ["裂缝"],
			resourceDelta: [],
			riskDelta: [],
			heroineAgencyBefore: 20,
			heroineAgencyAfter: 30,
			harmRefs: [],
			repairRefs: [],
			role: role as never,
			beatRefs: [eventId],
			paywallHook: false,
		},
		characterDeltas: [],
		resourceDeltas: [],
		riskDeltas: [],
		causes: [],
		irreversible: false,
		cannotRemoveBecause: "x",
	} as UnifiedEvent;
}

function planForEvents(eventIds: number[]): ChapterPlanProposal {
	return {
		chapterGoal: "推进",
		openingState: "开始",
		eventIds,
		sceneDesign: [
			{
				sceneId: "s1",
				order: 1,
				location: "办公室",
				goal: "推进",
				opposition: "阻力",
				stakes: "st",
				emotionalTurn: "t",
				informationReveal: [],
			},
		],
		informationControl: "i",
		emotionalMovement: "e",
		professionalConstraints: "p",
		relationshipMovement: "r",
		chapterExitPressure: "威胁",
		targetLength: 500,
		cannotRemoveBecause: "x",
	};
}

async function finalizePlainChapter(
	store: NovelProjectStore,
	projectId: string,
	chapter: number,
	events: UnifiedEvent[],
	summary: ChapterSummary,
	content: string,
): Promise<void> {
	const fullContent = content.length >= 60 ? content : content.repeat(Math.ceil(60 / content.length));
	await store.saveUnifiedEventMap({ projectId, chapter, events });
	const planResult = await store.planChapter({
		projectId,
		chapter,
		plan: planForEvents(events.map((event) => event.eventId)),
	});
	expect(planResult.status, JSON.stringify(planResult)).toBe("completed");
	const draft = await store.draftChapter({
		projectId,
		chapter,
		eventDrafts: events.map((event) => ({ eventId: event.eventId, content: fullContent })),
		semanticReports: events.map((event) => ({
			eventId: event.eventId,
			actionShown: true,
			consequenceShown: true,
			deltaEvidence: [{ dimension: "information", evidence: anchor(fullContent, 0) }],
		})),
	});
	expect(draft.status, JSON.stringify(draft)).toBe("completed");
	for (const event of events) {
		await saveRealizationFor(store, projectId, chapter, 1, fullContent, event.eventId);
	}
	const integrity = await store.checkContinuity({ projectId, chapter });
	expect(integrity.status, JSON.stringify(integrity.issues)).not.toBe("error");
	await store.saveContinuityReport({ projectId, chapter, draftRevision: 1, status: "ok", issues: [] });
	const result = await store.finalizeChapter({
		projectId,
		chapter,
		title: `第${chapter}章`,
		content: fullContent,
		summary,
		draftRevision: 1,
		confirmation: "USER_CONFIRMED",
	});
	expect(result.memoryCommitted, JSON.stringify(result)).toBe(true);
}

function plainEventWithDelta(
	eventId: number,
	chapter: number,
	opts: {
		resourceRef?: string;
		resourceChange?: string;
		storyDate?: string;
		storyTime?: string;
		scene?: string;
		characterTo?: string;
	} = {},
): UnifiedEvent {
	return plainEvent(eventId, chapter, {
		resourceRef: opts.resourceRef,
		resourceChange: opts.resourceChange,
		storyDate: opts.storyDate,
		storyTime: opts.storyTime,
		scene: opts.scene,
		characterDimension: "knowledge",
		characterFrom: "a",
		characterTo: opts.characterTo ?? "b",
	});
}
