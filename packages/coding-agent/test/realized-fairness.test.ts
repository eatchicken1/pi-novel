import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { UnifiedEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function unifiedEvent(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "查清理赔时间矛盾",
		conflict: "材料时间戳互相矛盾",
		action: "核验理赔材料时间线",
		consequence: "发现门禁与死亡时间不一致",
		characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
		resourceDeltas: [],
		riskDeltas: [],
		causes: eventId === 1 ? [] : [eventId - 1],
		irreversible: false,
		cannotRemoveBecause: "下一次选择不能回到原地",
		...overrides,
	};
}

const emptyMysteryDelta = {
	discoveredClueIds: [],
	readerRevealedClueIds: [],
	claimKnowledgeChanges: [],
	suspectChanges: [],
	interpretationChanges: [],
	proofProgressClaimIds: [],
	revealClaimIds: [],
};

async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "realized-fairness",
		genre: "female-social-suspense",
		storyProfile: {
			primaryGenre: "female-social-suspense",
			relationshipMechanisms: [],
			professionalDomain: undefined,
			storyForm: "mid-length",
			audience: "female",
			setting: "contemporary-china",
		},
	});
}

async function saveCaseAndClues(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.saveMysteryCase({
		projectId,
		status: "proposed",
		case: {
			id: "case-rf",
			centralQuestion: "为什么死亡时间与门禁记录矛盾？",
			truthSummary: "死亡时间被伪造",
			truthClaims: [
				{
					id: "T1",
					statement: "死亡发生在等待期内",
					category: "timeline",
					dependsOnClaimIds: [],
					proofRequirement: "门禁与保单记录",
					proofPaths: [{ id: "p1", clueIds: ["C1", "C2"], prerequisiteClaimIds: [] }],
					plannedRevealChapter: 2,
					importance: 5,
				},
			],
			finalAnswerClaimIds: ["T1"],
			socialCore: {
				socialQuestion: "核赔流程为何放任伪造",
				institutionalContext: "外包核赔",
				powerAsymmetry: "信息不对等",
				beneficiaries: ["核赔负责人"],
				costBearers: ["投保人"],
				stakesBeyondRelationship: ["行业声誉"],
			},
		},
	});
	await store.saveMysteryClueLedger({
		projectId,
		clues: [
			{
				id: "C1",
				observableFact: "02:17 门禁凭证被使用",
				sourceType: "institutional-record",
				sourceDescription: "门禁系统",
				firstAvailableChapter: 1,
				truthClaimIds: ["T1"],
				reliability: "medium",
				interpretationOptions: [],
				actualImplication: "手机持有人不等于在场人",
				clueRole: "fair",
			},
			{
				id: "C2",
				observableFact: "保单替换记录",
				sourceType: "document",
				sourceDescription: "保单档案",
				firstAvailableChapter: 1,
				truthClaimIds: ["T1"],
				reliability: "high",
				interpretationOptions: [],
				actualImplication: "替换早已发生",
				clueRole: "fair",
			},
		],
	});
}

describe("realized mystery fairness", () => {
	it("RF1: reveal before a required clue is actually realized fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realized-rf1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "rf1");
			await saveCaseAndClues(store, "rf1");
			// C1 第 1 章兑现；C2 第 2 章兑现；T1 第 1 章就揭示（早于 C2）
			await store.saveUnifiedEventMap({
				projectId: "rf1",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						mysteryDelta: {
							...emptyMysteryDelta,
							discoveredClueIds: ["C1"],
							claimKnowledgeChanges: [
								{ claimId: "T1", audience: "heroine", knowledge: "knows" },
								{ claimId: "T1", audience: "reader", knowledge: "knows" },
							],
						},
					}),
				],
			});
			await store.saveUnifiedEventMap({
				projectId: "rf1",
				chapter: 2,
				events: [unifiedEvent(2, 2, { mysteryDelta: { ...emptyMysteryDelta, discoveredClueIds: ["C2"] } })],
			});
			const report = await store.checkMysteryRealizedFairness({ projectId: "rf1" });
			expect(report.verdict).toBe("unfair");
			expect(report.status).toBe("error");
			expect(report.issues.some((item) => item.code === "REALIZED_REVEAL_BEFORE_PROOF")).toBe(true);
			expect(report.unsupportedFinalClaims.some((item) => item.claimId === "T1" && item.reason.includes("C2"))).toBe(
				true,
			);
			expect(report.proofCoverage["T1:reader"]!.completePaths).toBe(0);
			expect(report.proofCoverage["T1:reader"]!.revealChapter).toBe(1);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("RF2: reveal after every required clue is actually realized passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realized-rf2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "rf2");
			await saveCaseAndClues(store, "rf2");
			// T1 第 2 章揭示；C1 第 1 章、C2 第 2 章均已实际兑现
			await store.saveUnifiedEventMap({
				projectId: "rf2",
				chapter: 1,
				events: [unifiedEvent(1, 1, { mysteryDelta: { ...emptyMysteryDelta, discoveredClueIds: ["C1"] } })],
			});
			await store.saveUnifiedEventMap({
				projectId: "rf2",
				chapter: 2,
				events: [
					unifiedEvent(2, 2, {
						mysteryDelta: {
							...emptyMysteryDelta,
							discoveredClueIds: ["C2"],
							claimKnowledgeChanges: [
								{ claimId: "T1", audience: "heroine", knowledge: "knows" },
								{ claimId: "T1", audience: "reader", knowledge: "knows" },
							],
						},
					}),
				],
			});
			const report = await store.checkMysteryRealizedFairness({ projectId: "rf2" });
			expect(report.verdict, JSON.stringify(report)).toBe("fair");
			expect(report.status).toBe("ok");
			expect(report.supportedFinalClaims).toContain("T1");
			expect(report.proofCoverage["T1:reader"]!.completePaths).toBe(1);
			expect(report.proofCoverage["T1:heroine"]!.completePaths).toBe(1);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("RF3: planned reveal without any actual reveal is unverifiable", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realized-rf3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "rf3");
			await saveCaseAndClues(store, "rf3");
			// 只有计划（plannedRevealChapter=2），没有任何实际揭示
			await store.saveUnifiedEventMap({
				projectId: "rf3",
				chapter: 1,
				events: [unifiedEvent(1, 1, { mysteryDelta: { ...emptyMysteryDelta, discoveredClueIds: ["C1"] } })],
			});
			const report = await store.checkMysteryRealizedFairness({ projectId: "rf3" });
			expect(report.verdict).toBe("needs-work");
			expect(report.issues.some((item) => item.code === "REALIZED_CLAIM_NEVER_REVEALED")).toBe(true);
			expect(report.issues.some((item) => item.code === "REALIZED_FAIRNESS_UNVERIFIABLE")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("RF4: a required clue that is never realized in prose blocks the path", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realized-rf4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "rf4");
			await saveCaseAndClues(store, "rf4");
			// C2 从未在任何事件或 realization 中兑现
			await store.saveUnifiedEventMap({
				projectId: "rf4",
				chapter: 1,
				events: [unifiedEvent(1, 1, { mysteryDelta: { ...emptyMysteryDelta, discoveredClueIds: ["C1"] } })],
			});
			await store.saveUnifiedEventMap({
				projectId: "rf4",
				chapter: 2,
				events: [
					unifiedEvent(2, 2, {
						mysteryDelta: {
							...emptyMysteryDelta,
							claimKnowledgeChanges: [
								{ claimId: "T1", audience: "heroine", knowledge: "knows" },
								{ claimId: "T1", audience: "reader", knowledge: "knows" },
							],
						},
					}),
				],
			});
			const report = await store.checkMysteryRealizedFairness({ projectId: "rf4" });
			expect(report.verdict).toBe("unfair");
			expect(
				report.issues.some((item) => item.code === "REALIZED_CLUE_NEVER_REALIZED" && item.message.includes("C2")),
			).toBe(true);
			expect(report.issues.some((item) => item.code === "REALIZED_REVEAL_BEFORE_PROOF")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
