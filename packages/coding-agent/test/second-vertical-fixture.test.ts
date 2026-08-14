import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { FemaleSocialSuspenseDesign, UnifiedEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

// 第二 Vertical Fixture：遗产执行（estate executor）——证明 Genre Intelligence 不过拟合保险案例。
// 不开发第二 Professional Domain；social/marriage/mystery 智能完全复用。

const emptyMystery = {
	discoveredClueIds: [],
	readerRevealedClueIds: [],
	claimKnowledgeChanges: [],
	suspectChanges: [],
	interpretationChanges: [],
	proofProgressClaimIds: [],
	revealClaimIds: [],
};

function unifiedEvent(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "执行遗嘱并查清遗产去向",
		conflict: "遗嘱与账目时间矛盾",
		action: "核验遗产清单",
		consequence: "账目缺口浮出水面",
		characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
		resourceDeltas: [],
		riskDeltas: [],
		causes: eventId === 1 ? [] : [eventId - 1],
		irreversible: false,
		cannotRemoveBecause: "下一次选择不能回到原地",
		...overrides,
	};
}

const emptyMarriage = {
	economicItemChanges: [],
	responsibilityChanges: [],
	decisionRightChanges: [],
	socialTieChanges: [],
	inertiaChanges: [],
	exitConstraintChanges: [],
	restructuringProgress: [],
};

function estateMap(): UnifiedEvent[] {
	return [
		unifiedEvent(1, 1, {
			riskDeltas: [{ label: "执行人责任", change: "升级" }],
			mysteryDelta: { ...emptyMystery, discoveredClueIds: ["C1"], interpretationChanges: ["C1"] },
		}),
		unifiedEvent(2, 1, {
			irreversible: true,
			cannotRemoveBecause: "遗产清单已经提交公证",
			marriageDelta: { ...emptyMarriage, economicItemChanges: ["E1"] },
		}),
		unifiedEvent(3, 2, {
			mysteryDelta: {
				...emptyMystery,
				proofProgressClaimIds: ["T1"],
				claimKnowledgeChanges: [
					{ claimId: "T1", audience: "heroine", knowledge: "knows" },
					{ claimId: "T1", audience: "reader", knowledge: "knows" },
				],
			},
		}),
		unifiedEvent(4, 2, {
			riskDeltas: [{ label: "家族孤立", change: "开始" }],
			marriageDelta: { ...emptyMarriage, responsibilityChanges: ["R1"] },
		}),
		unifiedEvent(5, 3, {
			irreversible: true,
			cannotRemoveBecause: "结论已经归档",
			riskDeltas: [{ label: "家族压力", change: "摊牌" }],
			mysteryDelta: { ...emptyMystery, revealClaimIds: ["T1"] },
		}),
		unifiedEvent(6, 3, { marriageDelta: { ...emptyMarriage, restructuringProgress: ["分居安排"] } }),
	];
}

function estateDesign(): FemaleSocialSuspenseDesign {
	return {
		socialArchitecture: {
			centralSocialQuestion: "遗嘱执行中的信息真空如何被长期利用",
			institutionalSystem: "遗产公证与家庭内部执行并存",
			everydayEntryPoint: "她只是按程序清点一箱遗物",
			hiddenPowerStructure: "亲属掌握全部账目而执行人只拿到清单",
			protagonistPosition: "遗产执行人，无独立审计权限",
			vulnerableGroups: ["未成年继承人"],
			beneficiaries: ["受托亲属"],
			normalizedHarm: ["账目被合并"],
			investigationPressure: ["公证时限"],
			personalCostChannels: ["家族孤立"],
			publicPrivateCollision: "丈夫是受托亲属之一",
			resolutionScope: "清单更正，信息真空仍在",
			unresolvedSocialResidue: ["公证只认清单"],
			systemMechanisms: [
				{
					id: "m1",
					institutionOrNorm: "公证程序只核对清单不核对账目",
					powerHolder: "受托亲属",
					mechanism: "执行人接触不到原始账目，核对请求被亲属制度性拖延",
					whoBenefits: "受托亲属",
					whoPays: "未成年继承人",
					observableStoryEffects: ["清单与账目永远对不上"],
					relatedMysteryClaimIds: ["T1"],
					relatedProfessionalRefIds: [],
					relatedMarriageRefIds: ["E1"],
					eventIds: [1, 2, 5],
				},
			],
		},
		truthLayerMap: [{ claimId: "T1", layer: "system" }],
		suspense: { falseModel: { statement: "丈夫只是隐瞒了一笔借款", replacedByClaimIds: ["T1"] } },
		marriagePatterns: [
			{
				id: "p1",
				trigger: "涉及家族利益",
				protagonistDefaultResponse: "先自己核对再开口",
				spouseDefaultResponse: "替她把结论定好",
				shortTermBenefit: "家族表面和睦",
				longTermCost: "她的知情权不断缩小",
				hiddenAssumption: "家族账目属于男人之间的事",
				structuralRefs: ["E1"],
				relationshipRefs: ["R1"],
				breakingEventIds: [2, 4],
			},
		],
		professionalDilemmas: [],
		professionalPlotDependency: {
			irreplaceabilityStatement: "遗产执行人身份提供唯一的清单访问权",
			dependencyChannels: [],
		},
		chaseArcReview: {
			wrongPursuitRootedInFlaw: true,
			wrongPursuitExplanation: "他以为问题是她多疑",
			repairAddressesHarmMechanism: true,
			repairExplanation: "公开全部账目",
			regretWithBeliefChange: true,
			regretExplanation: "旧信念被账目否定后改变",
		},
		collisionAnalysis: [
			{ eventId: 1, type: "causal", engines: ["mystery", "marriage"], rationale: "清单核对直接揭开家庭账目" },
		],
		antagonisticForces: [
			{
				id: "f1",
				type: "family-system",
				source: "受托亲属",
				goal: "守住账目",
				powerMechanism: "信息垄断",
				costBearsOn: ["未成年继承人"],
			},
			{
				id: "f2",
				type: "institution",
				source: "公证处",
				goal: "程序合规",
				powerMechanism: "只认清单",
				costBearsOn: ["执行人"],
			},
		],
		socialResolution: {
			personalResolution: "她离开丈夫家",
			caseResolution: "清单被更正",
			institutionalChange: "公证增加账目抽查",
			institutionalResistance: "亲属抵制",
			unresolvedResidue: ["抽查比例很低"],
			costDistributionAfterEnding: ["她失去家族关系"],
		},
		themeArchitecture: [
			{
				theme: "知情权不是施舍",
				statement: "她有没有资格知道账目",
				actionProof: ["她逐项核对清单", "她把账目缺口交给公证处"],
			},
		],
		storyMovements: [
			{
				id: "m1",
				chapters: [1],
				dominantQuestion: "清单为什么对不上",
				protagonistGoal: "核对遗物",
				externalPressure: "公证时限",
				relationshipPressure: "丈夫要求结案",
				professionalPressure: "",
				irreversibleChange: "清单提交",
				exitCondition: "进入核对",
				eventIds: [1, 2],
			},
			{
				id: "m2",
				chapters: [2],
				dominantQuestion: "谁合并了账目",
				protagonistGoal: "拿到原始账目",
				externalPressure: "时限",
				relationshipPressure: "家族施压",
				professionalPressure: "",
				irreversibleChange: "账目缺口确认",
				exitCondition: "拿到原始凭证",
				eventIds: [3, 4],
			},
			{
				id: "m3",
				chapters: [3],
				dominantQuestion: "真空为何存在",
				protagonistGoal: "更正清单",
				externalPressure: "公开压力",
				relationshipPressure: "分居",
				professionalPressure: "",
				irreversibleChange: "结论归档",
				exitCondition: "抽查落地",
				eventIds: [5, 6],
			},
		],
		commercialForm: {
			openingAnomalyChapter: 1,
			midpointReframeChapter: 3,
			lateExpositionChapters: [],
			endingAftershock: "另一份遗嘱也在核对中",
			chapterExits: [
				{ chapter: 1, kind: "new-evidence" },
				{ chapter: 2, kind: "threat" },
				{ chapter: 3, kind: "cost-arrival" },
			],
		},
		supportingCharacters: [
			{
				characterId: "uncle",
				functionKinds: ["guardian", "opposition"],
				ownGoal: "守住账目",
				relationshipToSystem: "受托人",
				informationPosition: "掌握原始账目",
				loyalty: "对家族",
				leverage: "账目",
				conflictWithProtagonist: "阻止核对",
				independentCost: "被查出的风险",
				changeArc: "交出账目",
			},
		],
	};
}

describe("second vertical fixture (estate executor)", () => {
	it("S1: social/marriage/mystery genre intelligence is not insurance-specific", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-estate-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({
				projectId: "estate",
				title: "清单之外",
				genre: "female-social-suspense",
				storyProfile: {
					primaryGenre: "female-social-suspense",
					relationshipMechanisms: ["mature-marriage-crisis"],
					professionalDomain: undefined,
					storyForm: "mid-length",
					audience: "female",
					setting: "contemporary-china",
				},
			});
			await store.saveMysteryCase({
				projectId: "estate",
				status: "proposed",
				case: {
					id: "case-estate",
					centralQuestion: "遗嘱清单为什么与账目对不上？",
					truthSummary: "账目被合并，信息真空被利用",
					truthClaims: [
						{
							id: "T1",
							statement: "账目缺口来自合并而非遗漏",
							category: "event",
							dependsOnClaimIds: [],
							proofRequirement: "原始凭证",
							proofPaths: [{ id: "p1", clueIds: ["C1"], prerequisiteClaimIds: [] }],
							plannedRevealChapter: 2,
							importance: 5,
						},
					],
					finalAnswerClaimIds: ["T1"],
					socialCore: {
						socialQuestion: "公证为何只认清单",
						institutionalContext: "遗产公证",
						powerAsymmetry: "信息真空",
						beneficiaries: ["受托亲属"],
						costBearers: ["未成年继承人"],
						stakesBeyondRelationship: ["继承权"],
					},
				},
			});
			await store.saveMysteryClueLedger({
				projectId: "estate",
				clues: [
					{
						id: "C1",
						observableFact: "原始凭证上的合并章",
						sourceType: "document",
						sourceDescription: "银行回单",
						firstAvailableChapter: 1,
						plannedRealizationChapter: 1,
						truthClaimIds: ["T1"],
						reliability: "high",
						interpretationOptions: [],
						actualImplication: "账目被合并",
						clueRole: "fair",
					},
				],
			});
			await store.saveMatureMarriageStructure({
				projectId: "estate",
				status: "proposed",
				structure: {
					id: "m-estate",
					protagonistCharacterId: "heroine",
					spouseCharacterId: "husband",
					economicItems: [
						{
							id: "E1",
							kind: "asset",
							description: "遗产份额",
							control: "shared",
							protagonistAccess: "limited",
							spouseAccess: "full",
							exitConsequence: "失去份额",
							relatedResponsibilityIds: [],
						},
					],
					responsibilities: [
						{
							id: "R1",
							domain: "childcare",
							description: "照顾孩子",
							beneficiaryDescription: "孩子",
							actualPrimaryBearer: "protagonist",
							frequency: "daily",
							substitutability: "difficult",
							failureConsequence: "无人照看",
							recognizedByBoth: "unknown",
							relatedEconomicItemIds: [],
						},
					],
					decisionRights: [],
					socialTies: [],
					inertiaFactors: [],
					exitConstraints: [],
				},
			});
			for (const chapter of [1, 2, 3]) {
				await store.saveUnifiedEventMap({
					projectId: "estate",
					chapter,
					events: estateMap().filter((event) => event.chapter === chapter),
				});
			}
			const designCheck = await store.checkSocialSuspenseDesign({ projectId: "estate" });
			expect(designCheck.status, JSON.stringify(designCheck)).toBe("error");
			expect(designCheck.issues.some((item) => item.code === "SOCIAL_DESIGN_MISSING")).toBe(true);
			await store.saveSocialSuspenseDesign({ projectId: "estate", design: estateDesign() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "estate" });
			expect(report.status, JSON.stringify(report)).toBe("ok");
			expect(report.issues.some((item) => item.code === "PROFESSION_REPLACEABLE")).toBe(false);
			const realized = await store.checkMysteryRealizedFairness({ projectId: "estate" });
			expect(realized.verdict, JSON.stringify(realized)).toBe("fair");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
