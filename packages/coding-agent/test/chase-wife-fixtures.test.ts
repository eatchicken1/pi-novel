import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type {
	ChaseWifeBeat,
	ChaseWifeEvent,
	ChaseWifeLedgerEvidence,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

type FixtureLabel = {
	pacing: "ok" | "fail";
	aiArtifacts: "ok" | "warning" | "error";
	fakeRemorse: boolean;
	agencyLate: boolean;
	repeatedMechanism: boolean;
};

const fixtureRoot = fileURLToPath(new URL("./fixtures/chase-wife/", import.meta.url));
const fixtureNames = [
	"realistic-tight-pass",
	"realistic-dragging-fail",
	"realistic-fake-remorse-fail",
	"realistic-overexplained-fail",
] as const;

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 8));
	const endChar = Math.min(normalized.length, safeStart + 8);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

function contentHash(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function fixtureBeat(
	beat: number,
	heroinePhase: ChaseWifeBeat["heroinePhase"],
	malePhase: ChaseWifeBeat["malePhase"],
): ChaseWifeBeat {
	return {
		beat,
		heroinePhase,
		malePhase,
		targetTrack: "shared",
		paywallHook: beat === 2,
		sceneCount: 1,
		goal: "把被替换的事实变成自己的决定",
		conflict: "旧关系要求女主继续等待",
		actionOrConsequence: "女主收回账户和生活安排",
		emotionBefore: "期待",
		emotionAfter: "清醒",
		emotionStack: ["震惊", "克制"],
		painPoint: "她失去一段未经同意就被安排的未来",
		rewardPoint: "她获得独立经营工作室的空间",
		hook: "下一次选择不能再交给别人",
	};
}

function fixtureEvent(
	eventId: number,
	role: ChaseWifeEvent["role"],
	overrides: Partial<ChaseWifeEvent> = {},
): ChaseWifeEvent {
	const agencyBefore = eventId === 1 ? 10 : eventId === 2 ? 20 : 35;
	const agencyAfter = eventId === 1 ? 20 : eventId === 2 ? 35 : 60;
	const state = (score: number): ChaseWifeEvent["heroineAgencyStateBefore"] => {
		const level = Math.max(0, Math.min(4, Math.round(score / 25)));
		return { epistemic: level, relational: level, material: level, social: level, future: level };
	};
	const lengthMode = role === "irreversible-exit" ? "anchor" : role === "decision" ? "flash" : "standard";
	const ranges = { flash: [60, 180], standard: [220, 450], anchor: [450, 850] } as const;
	const [minChars, maxChars] = ranges[lengthMode];
	return {
		eventId,
		role,
		scene: eventId,
		pov: "heroine-first-person",
		targetTrack: "heroine",
		paywallHook: false,
		causes: eventId === 1 ? [] : [eventId - 1],
		injuryMechanism: (["neglect", "substitution", "public-humiliation"][eventId - 1] ??
			"neglect") as ChaseWifeEvent["injuryMechanism"],
		informationDelta: [`事实在事件 ${eventId} 中改变`],
		relationshipDelta: [`关系在事件 ${eventId} 中改变`],
		resourceDelta: eventId === 1 ? ["她收回账户清单"] : [],
		riskDelta: eventId === 3 ? ["她承担独立生活的风险"] : [],
		heroineAgencyBefore: agencyBefore,
		heroineAgencyAfter: agencyAfter,
		heroineAgencyStateBefore: state(agencyBefore),
		heroineAgencyStateAfter: state(agencyAfter),
		irreversible: role === "irreversible-exit",
		cannotRemoveBecause: "事件改变下一次选择",
		lengthMode,
		minChars,
		maxChars,
		eventDescription: "女主面对关系中的具体替代事实",
		function: "推进女主收回生活的决定",
		goal: "保护自己的选择",
		conflict: "旧关系要求女主继续等待",
		actionOrConsequence: "女主的行动改变下一步条件",
		protagonistReaction: "女主看见代价并作出回应",
		oppositionReaction: "顾沉解释或承受后果",
		informationChange: "女主获得一个新的事实",
		emotionBefore: "期待",
		emotionAfter: "清醒",
		physicalReaction: "女主握紧手里的物件",
		setupOrPayoff: "事件为下一次选择留下后果",
		readerRelease: "被隐藏的偏好终于显形",
		entryHook: "上一场选择仍未解决",
		exitHook: "下一次决定不能再拖延",
		...overrides,
	};
}

function ledgerEvidence(content: string, eventId: number, startChar: number): ChaseWifeLedgerEvidence {
	return { chapter: 1, eventId, ...anchor(content, startChar), contentHash: contentHash(content) };
}

function literarySignals(content: string): {
	pacing: "ok" | "fail";
	fakeRemorse: boolean;
	agencyLate: boolean;
	repeatedMechanism: boolean;
} {
	const agencyMatch = [
		...content.matchAll(/(?:没有接|离开|取消|拒绝|拉黑|转身|收回|关掉|删除|写下|锁好|推门)/gu),
	].find((match) => {
		const start = match.index ?? 0;
		return !/(?:没有|不|想|等)[^。！？!?]{0,4}$/u.test(content.slice(Math.max(0, start - 6), start));
	});
	const firstAgencyAction = agencyMatch?.index ?? -1;
	const agencyLate = firstAgencyAction < 0 || firstAgencyAction / Math.max(1, content.length) > 0.12;
	const apologyCount = content.match(/(?:对不起|道歉)/gu)?.length ?? 0;
	const repeatedMechanism = (content.match(/回到门口/gu)?.length ?? 0) >= 3;
	const overExplained = (content.match(/这意味着/gu)?.length ?? 0) >= 3;
	const fakeRemorse = apologyCount >= 5;
	return {
		pacing: fakeRemorse || agencyLate || repeatedMechanism || overExplained ? "fail" : "ok",
		fakeRemorse,
		agencyLate,
		repeatedMechanism,
	};
}

describe("realistic Chinese chase-wife fixtures", () => {
	it.each(fixtureNames)("runs the AI-artifact gate against %s", async (fixtureName) => {
		const labels = JSON.parse(await readFile(join(fixtureRoot, "labels.json"), "utf8")) as Record<
			string,
			FixtureLabel
		>;
		const label = labels[fixtureName];
		if (label === undefined) throw new Error(`Missing labels for ${fixtureName}`);
		const content = await readFile(join(fixtureRoot, `${fixtureName}.md`), "utf8");
		const nonWhitespaceChars = [...content.replace(/\s+/gu, "")].length;
		expect(nonWhitespaceChars).toBeGreaterThan(900);

		const cwd = await mkdtemp(join(tmpdir(), `pi-novel-fixture-${fixtureName}-`));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "fixture", title: fixtureName, genre: "urban-romance" });
			await store.saveChapterDraft({ projectId: "fixture", chapter: 1, content });
			const report = await store.checkAiArtifacts({ projectId: "fixture", chapter: 1, draftRevision: 1 });
			expect(report.status, JSON.stringify(report)).toBe(label.aiArtifacts);
			if (label.aiArtifacts === "error") expect(report.passed).toBe(false);
			if (label.aiArtifacts === "ok") expect(report.findingCount).toBe(0);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("keeps literary review labels separate from executable quality-gate output", async () => {
		const labels = JSON.parse(await readFile(join(fixtureRoot, "labels.json"), "utf8")) as Record<
			string,
			FixtureLabel
		>;
		for (const fixtureName of fixtureNames) {
			const label = labels[fixtureName];
			const content = await readFile(join(fixtureRoot, `${fixtureName}.md`), "utf8");
			const signals = literarySignals(content);
			expect(label).toEqual(
				expect.objectContaining({ pacing: expect.any(String), fakeRemorse: expect.any(Boolean) }),
			);
			expect(signals, fixtureName).toEqual({
				pacing: label.pacing,
				fakeRemorse: label.fakeRemorse,
				agencyLate: label.agencyLate,
				repeatedMechanism: label.repeatedMechanism,
			});
		}
	});

	it("runs the strict first-chapter chase-wife workflow against the tight pass fixture", async () => {
		const content = await readFile(join(fixtureRoot, "realistic-tight-pass.md"), "utf8");
		expect(content).toMatch(/我/gu);
		expect(content).not.toMatch(/^林晚/gu);
		const paragraphs = content.split(/\r?\n\s*\r?\n/gu).filter((paragraph) => paragraph.trim().length > 0);
		const eventProse = [
			paragraphs.slice(0, 3).join("\n\n"),
			paragraphs.slice(3, 6).join("\n\n"),
			paragraphs.slice(6, 14).join("\n\n"),
		];
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-chase-wife-e2e-"));
		try {
			const store = new NovelProjectStore(cwd);
			const projectId = "fixture-e2e";
			await store.initializeNovel({ projectId, title: "tight pass", genre: "chase-wife" });
			const openingIntro =
				"我在婚宴门外听见他把婚期和房子交给另一个人，手里的袖扣硌进掌心。我推门进去，决定把自己的名字从这场婚礼里拿回来。从今天开始，我只为自己作决定。";
			await store.saveChaseWifeBeatSheet({
				projectId,
				povMode: "heroine-first-person",
				pacingMode: "standard",
				openingMode: "quiet-dislocation",
				openingIntro,
				openingConflict: "婚期和房子被安排给了另一个人",
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
				stayingLogic: {
					emotionalReason: "她曾经相信共同生活可以被修复",
					falseBelief: "只要解释清楚，承诺就仍然有效",
					sustainingEvidence: ["两家人已经开始筹备婚礼"],
					breakingThreshold: "未经同意的替代安排成为事实",
				},
				beats: Array.from({ length: 12 }, (_, index) => {
					const heroinePhases: ChaseWifeBeat["heroinePhase"][] = [
						"injury",
						"injury",
						"recognition",
						"micro-withdrawal",
						"boundary-test",
						"boundary-test",
						"irreversible-exit",
						"irreversible-exit",
						"self-rebuild",
						"self-rebuild",
						"final-boundary",
						"final-boundary",
					];
					const malePhases: ChaseWifeBeat["malePhase"][] = [
						"entitlement",
						"loss-of-control",
						"wrong-pursuit",
						"real-consequence",
						"recognition",
						"respect-or-failure",
						"respect-or-failure",
						"respect-or-failure",
						"respect-or-failure",
						"respect-or-failure",
						"respect-or-failure",
						"respect-or-failure",
					];
					return fixtureBeat(index + 1, heroinePhases[index]!, malePhases[index]!);
				}),
			});
			const eventRecords = [
				fixtureEvent(1, "opening-injury", { beatRefs: [1, 2, 3, 4], harmRefs: ["harm-001"] }),
				fixtureEvent(2, "decision", { beatRefs: [5, 6, 7, 8], repairRefs: ["repair-001"] }),
				fixtureEvent(3, "irreversible-exit", { beatRefs: [9, 10, 11, 12], repairRefs: ["repair-002"] }),
			] satisfies ChaseWifeEvent[];
			await store.saveChaseWifeEventMap({
				projectId,
				chapter: 1,
				povMode: "heroine-first-person",
				openingMode: "quiet-dislocation",
				openingIntro,
				openingConflict: "婚期和房子被安排给了另一个人",
				openingConflictMarker: "婚期和房子",
				events: eventRecords,
			});
			const arc = await store.checkChaseWifeArc({ projectId, scope: "planned" });
			expect(arc.status, JSON.stringify(arc)).toBe("ok");
			const eventMap = await store.checkChaseWifeEventMap({ projectId, chapter: 1 });
			expect(eventMap.status, JSON.stringify(eventMap)).toBe("ok");
			for (const [index, eventRecord] of eventRecords.entries()) {
				const prose = eventProse[index];
				expect(prose).toBeTruthy();
				await store.saveChaseWifeEventDraft({
					projectId,
					chapter: 1,
					eventId: eventRecord.eventId,
					content: prose,
				});
				const budget = await store.checkChaseWifeEventDraft({
					projectId,
					chapter: 1,
					eventId: eventRecord.eventId,
				});
				expect(budget.status, `${eventRecord.eventId}:${JSON.stringify(budget)}`).toBe("ok");
				const proseReport = await store.checkChaseWifeEventProse({
					projectId,
					chapter: 1,
					eventId: eventRecord.eventId,
				});
				expect(proseReport.status, `${eventRecord.eventId}:${JSON.stringify(proseReport)}`).not.toBe("error");
				const firstAnchor = anchor(prose, 0);
				await store.saveChaseWifeEventSemanticReport({
					projectId,
					chapter: 1,
					eventId: eventRecord.eventId,
					roleSatisfied: true,
					conflictShown: true,
					roleEvidence: firstAnchor,
					conflictEvidence: anchor(prose, 12),
					stateDeltasShown: [
						{
							deltaId: "information-1",
							dimension: "information",
							delta: eventRecord.informationDelta[0]!,
							evidence: firstAnchor,
						},
						{
							deltaId: "relationship-1",
							dimension: "relationship",
							delta: eventRecord.relationshipDelta[0]!,
							evidence: anchor(prose, 24),
						},
					],
					agencyActionEvidence: firstAnchor,
					entryHookEvidence: firstAnchor,
					exitHookEvidence: anchor(prose, 36),
					injuryMechanismEvidence: firstAnchor,
				});
			}
			const assembled = await store.assembleChaseWifeChapter({ projectId, chapter: 1 });
			const projectRoot = join(cwd, "novels", projectId);
			const chapterContent = await readFile(join(projectRoot, assembled.path), "utf8");
			const pacing = await store.checkChaseWifeChapterPacing({ projectId, chapter: 1 });
			expect(pacing.status, JSON.stringify(pacing)).toBe("ok");
			const score = await store.scoreChaseWifeChapter({ projectId, chapter: 1 });
			expect(score.passed, JSON.stringify(score)).toBe(true);
			const aiArtifacts = await store.checkAiArtifacts({
				projectId,
				chapter: 1,
				draftRevision: assembled.draftRevision,
			});
			expect(aiArtifacts.passed, JSON.stringify(aiArtifacts)).toBe(true);
			const manifest = JSON.parse(
				await readFile(join(projectRoot, "work", "chase-wife-assemblies", "chapter-001-r01.json"), "utf8"),
			) as { eventDrafts: Array<{ eventId: number; startChar: number; endChar: number }> };
			const evidenceFor = (eventId: number, offset: number): ChaseWifeLedgerEvidence => {
				const range = manifest.eventDrafts.find((candidate) => candidate.eventId === eventId);
				if (range === undefined) throw new Error(`Missing event range for ${eventId}`);
				return ledgerEvidence(chapterContent, eventId, range.startChar + offset);
			};
			await store.saveChaseWifeHarmLedger({
				projectId,
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				harms: [
					{
						id: "harm-001",
						category: "deception",
						victimImpact: { epistemic: "我失去了对共同未来的判断" },
						maleBeliefAtTheTime: "她会继续等待",
						heroineBeliefAtTheTime: "婚期仍然属于两个人",
						severity: "major",
						recognizedByHeroine: true,
						recognizedByMale: true,
						repaired: true,
						repairable: true,
						evidence: [evidenceFor(1, 0)],
						recognitionEvidence: [evidenceFor(2, 0)],
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
						action: "他公开更正婚期安排并承担两家人的指责",
						costToMale: "他失去原本维护的体面",
						benefitToHeroine: "我的名字和账户被还给我",
						requestedReward: false,
						violatesBoundary: false,
						heroineResponse: "accepted",
						effectiveness: "credible",
						evidence: [evidenceFor(2, 0)],
					},
					{
						id: "repair-002",
						addressesHarmIds: ["harm-001"],
						type: "boundary-respect",
						action: "他接受我不重新开始的决定并退到人行道外",
						costToMale: "他放弃立即复合",
						benefitToHeroine: "我的新生活不再需要他的批准",
						requestedReward: false,
						violatesBoundary: false,
						heroineResponse: "accepted",
						effectiveness: "credible",
						evidence: [evidenceFor(3, 0)],
					},
				],
			});
			const progress = await store.checkChaseWifeHarmRepairProgress({ projectId, chapter: 1 });
			expect(progress.status, JSON.stringify(progress)).toBe("on-track");
			await store.saveChapterPlan({
				projectId,
				chapter: 1,
				content: "第一章计划：让替代事实转化为女主的退出决定。",
			});
			await store.saveSceneContract({
				projectId,
				chapter: 1,
				contracts: [
					{
						sceneId: "scene-1",
						chapter: 1,
						order: 1,
						pov: "heroine",
						time: "周五晚上",
						location: "餐厅和工作室",
						goal: "收回自己的决定",
						opposition: "被安排好的婚期",
						stakes: "她是否继续等待",
						knowledgeBefore: [],
						informationReveal: ["婚期已经被替换"],
						emotionalStateBefore: "期待",
						emotionalTurn: "她停止等待",
						emotionalStateAfter: "清醒",
						stateChanges: ["agency", "relationship"],
						setups: [],
						payoffs: [],
						exitHook: "下一次决定不能再拖延",
					},
				],
			});
			await store.checkContinuity({ projectId, chapter: 1 });
			await store.saveContinuityReport({
				projectId,
				chapter: 1,
				draftRevision: assembled.draftRevision,
				status: "ok",
				issues: [],
			});
			const qualityAnchor = anchor(chapterContent, 0);
			await store.saveQualityReport(
				{
					projectId,
					chapter: 1,
					draftRevision: assembled.draftRevision,
					content: "读者看见女主把决定收回自己手里。",
					structuredReport: {
						status: "ok",
						engagementDrops: [],
						predictions: [],
						confusionPoints: [],
						credibilityBreaks: [],
						strongestMoments: [
							{ location: "chars:0-8", evidence: "她收回决定", problem: "none", anchor: qualityAnchor },
						],
					},
				},
				"reader",
			);
			await store.saveQualityReport(
				{
					projectId,
					chapter: 1,
					draftRevision: assembled.draftRevision,
					content: "关系转折和女主主动权都具备正文证据。",
					structuredReport: {
						status: "ok",
						structuralIssues: [],
						sceneIssues: [],
						characterIssues: [],
						pacingIssues: [],
						priorities: ["保留女主不把改变当礼物的选择"],
						verifiedStrengths: [
							{ location: "chars:0-8", evidence: "女主作出选择", problem: "none", anchor: qualityAnchor },
						],
						allowFinalize: true,
					},
				},
				"review",
			);
			await store.finalizeChapter({
				projectId,
				chapter: 1,
				title: "第一章 婚期之外",
				content: chapterContent,
				summary: {
					pov: "heroine",
					time: "周五到春天",
					locations: ["餐厅", "工作室"],
					characters: ["女主", "顾沉"],
					events: ["女主发现替代事实", "女主退出并建立新生活"],
					newFacts: ["婚期和房子已被安排给另一个人"],
					relationshipChanges: ["女主停止等待"],
					cluesIntroduced: [],
					cluesResolved: [],
					itemsChanged: ["袖扣", "钢笔", "钥匙"],
					openQuestions: [],
				},
				draftRevision: assembled.draftRevision,
				confirmation: "USER_CONFIRMED",
			});
			const finalizedProgress = await store.checkChaseWifeHarmRepairProgress({ projectId, chapter: 1 });
			expect(finalizedProgress.status).toBe("on-track");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
