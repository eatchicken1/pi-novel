import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	FemaleSocialSuspenseDesign,
	HeroineContradictionProfile,
	UnifiedEvent,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

const emptyMystery = {
	discoveredClueIds: [],
	readerRevealedClueIds: [],
	claimKnowledgeChanges: [],
	suspectChanges: [],
	interpretationChanges: [],
	proofProgressClaimIds: [],
	revealClaimIds: [],
};
const emptyProfessional = {
	actionIds: [],
	evidenceSourceIds: [],
	conflictIds: [],
	escalationPathIds: [],
	consequenceIds: [],
	observationIds: [],
};

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

function fullMap(): UnifiedEvent[] {
	return [
		unifiedEvent(1, 1, {
			riskDeltas: [{ label: "职业风险", change: "升级" }],
			mysteryDelta: { ...emptyMystery, discoveredClueIds: ["C1"], interpretationChanges: ["C1"] },
			professionalDelta: {
				...emptyProfessional,
				actionIds: ["PA-1"],
				evidenceSourceIds: ["EV-1"],
				observationIds: ["OBS-1"],
			},
		}),
		unifiedEvent(2, 1, {
			irreversible: true,
			cannotRemoveBecause: "材料已经交出去",
			marriageDelta: {
				economicItemChanges: ["E1"],
				responsibilityChanges: [],
				decisionRightChanges: [],
				socialTieChanges: [],
				inertiaChanges: [],
				exitConstraintChanges: [],
				restructuringProgress: [],
			},
		}),
		unifiedEvent(3, 2, { mysteryDelta: { ...emptyMystery, proofProgressClaimIds: ["T1"] } }),
		unifiedEvent(4, 2, {
			riskDeltas: [{ label: "结案时限", change: "收紧" }],
			professionalDelta: {
				...emptyProfessional,
				actionIds: ["PA-1"],
				workflowFromStageId: "S1",
				workflowToStageId: "S2",
			},
		}),
		unifiedEvent(5, 3, {
			marriageDelta: {
				economicItemChanges: [],
				responsibilityChanges: ["R1"],
				decisionRightChanges: [],
				socialTieChanges: [],
				inertiaChanges: [],
				exitConstraintChanges: [],
				restructuringProgress: [],
			},
			chaseWifeDelta: {
				informationDelta: [],
				relationshipDelta: ["旧约定松动"],
				resourceDelta: [],
				riskDelta: [],
				heroineAgencyBefore: 20,
				heroineAgencyAfter: 40,
				harmRefs: [],
				repairRefs: [],
				role: "boundary-test",
				paywallHook: false,
			},
		}),
		unifiedEvent(6, 3, {
			irreversible: true,
			cannotRemoveBecause: "意见书已经归档",
			mysteryDelta: { ...emptyMystery, revealClaimIds: ["T1"] },
			marriageDelta: {
				economicItemChanges: [],
				responsibilityChanges: [],
				decisionRightChanges: ["D1"],
				socialTieChanges: [],
				inertiaChanges: [],
				exitConstraintChanges: [],
				restructuringProgress: [],
			},
			professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
		}),
	];
}

function design(overrides: Partial<FemaleSocialSuspenseDesign> = {}): FemaleSocialSuspenseDesign {
	return {
		socialArchitecture: {
			centralSocialQuestion: "为什么核赔流程放任伪造持续多年",
			institutionalSystem: "外包核赔与赔付率考核",
			everydayEntryPoint: "她只是按流程核验一单理赔",
			hiddenPowerStructure: "区域负责人兼管调查结论与赔付率",
			protagonistPosition: "理赔反欺诈调查员，无越级权限",
			vulnerableGroups: ["投保人家属"],
			beneficiaries: ["核赔负责人"],
			normalizedHarm: ["时间戳被替换"],
			investigationPressure: ["结案时限"],
			personalCostChannels: ["职业问责"],
			publicPrivateCollision: "丈夫家族是保单受益人",
			resolutionScope: "个案澄清，制度未变",
			unresolvedSocialResidue: ["核赔外包仍在"],
			systemMechanisms: [
				{
					id: "m1",
					institutionOrNorm: "理赔调查结论须经区域负责人审批",
					powerHolder: "区域负责人",
					mechanism: "负责人同时承担赔付率 KPI，调查结论被系统性压缩，女主不能越级",
					whoBenefits: "核赔负责人",
					whoPays: "投保人",
					observableStoryEffects: ["结论被压"],
					relatedMysteryClaimIds: ["T1"],
					relatedProfessionalRefIds: ["PA-1"],
					relatedMarriageRefIds: ["E1"],
					eventIds: [1, 2],
				},
			],
		},
		truthLayerMap: [{ claimId: "T1", layer: "system" }],
		suspense: { falseModel: { statement: "丈夫只是隐瞒了外遇", replacedByClaimIds: ["T1"] } },
		marriagePatterns: [
			{
				id: "p1",
				trigger: "遇到危机",
				protagonistDefaultResponse: "为避免争吵而事后补救",
				spouseDefaultResponse: "替她做决定",
				shortTermBenefit: "家庭高效率",
				longTermCost: "她的边界不断消失",
				hiddenAssumption: "她的职业安排属于家庭资源",
				structuralRefs: ["E1"],
				relationshipRefs: ["R1"],
				breakingEventIds: [1, 5],
			},
		],
		professionalDilemmas: [
			{
				id: "d1",
				choiceA: "按职业规范上报",
				choiceBCost: "丈夫家族施压",
				choiceB: "压住结论",
				choiceACost: "被负责人问责",
				valuesInConflict: ["职业原则", "家庭利益"],
				relatedActionIds: ["PA-1"],
				relatedMarriageRefs: ["E1"],
				relatedEventIds: [1],
				resolution: "上报并承担代价",
			},
		],
		professionalPlotDependency: {
			irreplaceabilityStatement: "只有调查员能调取理赔档案并对照门禁记录",
			dependencyChannels: ["职业权限获取线索", "工作流迁移暴露审批结构"],
		},
		chaseArcReview: {
			wrongPursuitRootedInFlaw: true,
			wrongPursuitExplanation: "他以为问题是误会，其实是边界",
			repairAddressesHarmMechanism: true,
			repairExplanation: "公开承认她的职业判断",
			regretWithBeliefChange: true,
			regretExplanation: "旧信念被现实否定后行为改变",
		},
		collisionAnalysis: [
			{ eventId: 1, type: "causal", engines: ["mystery", "professional"], rationale: "职业观察直接产出线索" },
			{ eventId: 5, type: "dilemma", engines: ["marriage", "chase-wife"], rationale: "分居安排与旧约定无法两全" },
			{
				eventId: 6,
				type: "causal",
				engines: ["mystery", "marriage", "professional"],
				rationale: "意见书归档直接触发婚姻退出",
			},
		],
		antagonisticForces: [
			{
				id: "f1",
				type: "institution",
				source: "理赔中心",
				goal: "压低赔付率",
				powerMechanism: "审批权集中",
				costBearsOn: ["投保人"],
			},
			{
				id: "f2",
				type: "family-system",
				source: "丈夫家族",
				goal: "保住保单收益",
				powerMechanism: "经济共同体",
				costBearsOn: ["女主"],
			},
		],
		socialResolution: {
			personalResolution: "她搬出共同住房",
			caseResolution: "理赔结论被纠正",
			institutionalChange: "调查结论须双人复核",
			institutionalResistance: "外包模式延续",
			unresolvedResidue: ["复核制形同虚设"],
			costDistributionAfterEnding: ["她被调离理赔科"],
		},
		themeArchitecture: [
			{
				theme: "职业原则不是婚后共同财产",
				statement: "原则是否属于家庭资源",
				actionProof: ["丈夫要求她撤回调查", "她把材料交给第三方"],
			},
		],
		storyMovements: [
			{
				id: "m1",
				chapters: [1],
				dominantQuestion: "保单时间为什么矛盾",
				protagonistGoal: "核验材料",
				falseModel: "丈夫只是隐瞒外遇",
				externalPressure: "结案时限",
				relationshipPressure: "丈夫要求撤回",
				professionalPressure: "结论被压",
				irreversibleChange: "材料交出去",
				exitCondition: "进入调查阶段",
				eventIds: [1, 2],
			},
			{
				id: "m2",
				chapters: [2],
				dominantQuestion: "谁替换了时间戳",
				protagonistGoal: "证明替换存在",
				externalPressure: "门禁记录失效",
				relationshipPressure: "家庭施压",
				professionalPressure: "审批卡住",
				irreversibleChange: "工作流升级",
				exitCondition: "拿到第二份凭证",
				eventIds: [3, 4],
			},
			{
				id: "m3",
				chapters: [3],
				dominantQuestion: "制度为何放任",
				protagonistGoal: "把真相归档",
				externalPressure: "公开压力",
				relationshipPressure: "分居浮出",
				professionalPressure: "意见书问责",
				irreversibleChange: "意见书归档",
				exitCondition: "个案澄清",
				eventIds: [5, 6],
			},
		],
		commercialForm: {
			openingAnomalyChapter: 1,
			midpointReframeChapter: 2,
			lateExpositionChapters: [],
			endingAftershock: "档案室里另一批保单",
			chapterExits: [
				{ chapter: 1, kind: "threat" },
				{ chapter: 2, kind: "decision-pending" },
				{ chapter: 3, kind: "cost-arrival" },
			],
		},
		supportingCharacters: [
			{
				characterId: "boss",
				functionKinds: ["authority", "guardrail"],
				ownGoal: "控制赔付率",
				relationshipToSystem: "审批链顶端",
				informationPosition: "知道外包压价",
				loyalty: "对公司",
				leverage: "审批权",
				conflictWithProtagonist: "要求结案",
				independentCost: "赔付率问责",
				changeArc: "同意复核",
			},
		],
		...overrides,
	};
}

function heroineProfile(overrides: Partial<HeroineContradictionProfile> = {}): HeroineContradictionProfile {
	return {
		characterId: "heroine",
		values: ["职业原则", "孩子优先"],
		strengths: ["证据意识"],
		blindSpots: ["低估丈夫家族的资源"],
		emotionalNeeds: ["被当作独立个体"],
		avoidedTruths: ["婚姻早已失衡"],
		selfProtectiveHabits: ["用工作回避对话"],
		costlyChoices: ["把材料交给第三方"],
		wrongOrIncompleteJudgments: ["误以为丈夫不知情"],
		contradictions: ["既想维持体面又无法再忍"],
		...overrides,
	};
}

async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "vertical",
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
}

async function saveMap(store: NovelProjectStore, projectId: string, events: UnifiedEvent[]): Promise<void> {
	await store.saveUnifiedEventMap({ projectId, chapter: 1, events: events.filter((event) => event.chapter === 1) });
	await store.saveUnifiedEventMap({ projectId, chapter: 2, events: events.filter((event) => event.chapter === 2) });
	await store.saveUnifiedEventMap({ projectId, chapter: 3, events: events.filter((event) => event.chapter === 3) });
}

describe("female social suspense vertical intelligence", () => {
	it("V1: social question without mechanism errors", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v1");
			const broken = design({ socialArchitecture: { ...design().socialArchitecture, systemMechanisms: [] } });
			await store.saveSocialSuspenseDesign({ projectId: "v1", design: broken });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v1" });
			expect(
				report.issues.some(
					(item) => item.code === "SOCIAL_QUESTION_WITHOUT_MECHANISM" && item.severity === "error",
				),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V2: mechanism without event effect warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v2");
			await saveMap(store, "v2", fullMap());
			const base = design();
			const broken = design({
				socialArchitecture: {
					...base.socialArchitecture,
					systemMechanisms: [{ ...base.socialArchitecture.systemMechanisms[0]!, eventIds: [] }],
				},
			});
			await store.saveSocialSuspenseDesign({ projectId: "v2", design: broken });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v2" });
			expect(report.issues.some((item) => item.code === "SOCIAL_MECHANISM_WITHOUT_EVENT_EFFECT")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V3: replaceable profession warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v3");
			// 只有 1/6 事件引用职业
			const events = fullMap().map((event) =>
				event.eventId === 1 ? event : { ...event, professionalDelta: undefined },
			);
			await saveMap(store, "v3", events as UnifiedEvent[]);
			await store.saveSocialSuspenseDesign({ projectId: "v3", design: design() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v3" });
			expect(report.issues.some((item) => item.code === "PROFESSION_REPLACEABLE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V4: marriage crisis without history warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v4");
			await saveMap(store, "v4", fullMap());
			await store.saveSocialSuspenseDesign({ projectId: "v4", design: design({ marriagePatterns: [] }) });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v4" });
			expect(report.issues.some((item) => item.code === "MARRIAGE_CRISIS_WITHOUT_HISTORY")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V5: an old pattern that fires in current events passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v5");
			await saveMap(store, "v5", fullMap());
			await store.saveSocialSuspenseDesign({ projectId: "v5", design: design() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v5" });
			expect(report.issues.some((item) => item.code === "MARRIAGE_PATTERN_WITHOUT_PAYOFF")).toBe(false);
			expect(report.issues.some((item) => item.code === "MARRIAGE_CRISIS_WITHOUT_HISTORY")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V6: wrong pursuit not rooted in the male flaw warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v6");
			await saveMap(store, "v6", fullMap());
			const base = design();
			await store.saveSocialSuspenseDesign({
				projectId: "v6",
				design: design({ chaseArcReview: { ...base.chaseArcReview, wrongPursuitRootedInFlaw: false } }),
			});
			const report = await store.checkSocialSuspenseDesign({ projectId: "v6" });
			expect(report.issues.some((item) => item.code === "WRONG_PURSUIT_NOT_ROOTED_IN_FLAW")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V7: repair not addressing the harm mechanism warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v7");
			await saveMap(store, "v7", fullMap());
			const base = design();
			await store.saveSocialSuspenseDesign({
				projectId: "v7",
				design: design({ chaseArcReview: { ...base.chaseArcReview, repairAddressesHarmMechanism: false } }),
			});
			const report = await store.checkSocialSuspenseDesign({ projectId: "v7" });
			expect(report.issues.some((item) => item.code === "REPAIR_DOES_NOT_ADDRESS_HARM_MECHANISM")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V8: infallible heroine warns on complexity", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v8");
			await store.saveCharacterContradictionProfile({
				projectId: "v8",
				profile: heroineProfile({ costlyChoices: [], wrongOrIncompleteJudgments: [] }),
			});
			const report = await store.checkCharacterComplexity({ projectId: "v8" });
			expect(report.issues.some((item) => item.code === "HEROINE_TOO_INFALLIBLE")).toBe(true);
			expect(report.issues.some((item) => item.code === "AGENCY_WITHOUT_COST")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V9: tool supporting characters warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v9");
			await store.saveCharacterContradictionProfile({ projectId: "v9", profile: heroineProfile() });
			await store.saveSocialSuspenseDesign({
				projectId: "v9",
				design: design({ supportingCharacters: [{ characterId: "sister", functionKinds: ["comfort"] }] }),
			});
			const report = await store.checkCharacterComplexity({ projectId: "v9" });
			expect(report.issues.some((item) => item.code === "SUPPORTING_CHARACTER_AS_TOOL")).toBe(true);
			expect(report.issues.some((item) => item.code === "SIDE_CHARACTER_SINGLE_FUNCTION")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V10: shallow collisions warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v10-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v10");
			const shallow = [
				unifiedEvent(1, 1, {
					mysteryDelta: { ...emptyMystery },
					marriageDelta: {
						economicItemChanges: ["E1"],
						responsibilityChanges: [],
						decisionRightChanges: [],
						socialTieChanges: [],
						inertiaChanges: [],
						exitConstraintChanges: [],
						restructuringProgress: [],
					},
				}),
				unifiedEvent(2, 1, { mysteryDelta: { ...emptyMystery }, professionalDelta: { ...emptyProfessional } }),
				unifiedEvent(3, 2, {
					mysteryDelta: { ...emptyMystery },
					chaseWifeDelta: {
						informationDelta: [],
						relationshipDelta: [],
						resourceDelta: [],
						riskDelta: [],
						heroineAgencyBefore: 20,
						heroineAgencyAfter: 40,
						harmRefs: [],
						repairRefs: [],
						role: "evidence",
						paywallHook: false,
					},
				}),
				unifiedEvent(4, 2, {
					marriageDelta: {
						economicItemChanges: [],
						responsibilityChanges: ["R1"],
						decisionRightChanges: [],
						socialTieChanges: [],
						inertiaChanges: [],
						exitConstraintChanges: [],
						restructuringProgress: [],
					},
					chaseWifeDelta: {
						informationDelta: [],
						relationshipDelta: [],
						resourceDelta: [],
						riskDelta: [],
						heroineAgencyBefore: 30,
						heroineAgencyAfter: 50,
						harmRefs: [],
						repairRefs: [],
						role: "boundary-test",
						paywallHook: false,
					},
				}),
				unifiedEvent(5, 3, { mysteryDelta: { ...emptyMystery }, professionalDelta: { ...emptyProfessional } }),
				unifiedEvent(6, 3, {
					irreversible: true,
					cannotRemoveBecause: "意见书归档",
					mysteryDelta: { ...emptyMystery },
					marriageDelta: {
						economicItemChanges: [],
						responsibilityChanges: [],
						decisionRightChanges: ["D1"],
						socialTieChanges: [],
						inertiaChanges: [],
						exitConstraintChanges: [],
						restructuringProgress: [],
					},
				}),
			];
			await saveMap(store, "v10", shallow);
			const base = design();
			const shallowDesign = design({
				collisionAnalysis: [
					{
						eventId: 2,
						type: "co-occurrence",
						engines: ["mystery", "professional"],
						rationale: "同章两条线各走各的",
					},
					{ eventId: 4, type: "co-occurrence", engines: ["marriage", "chase-wife"], rationale: "回家又吵了一架" },
					{ eventId: 6, type: "co-occurrence", engines: ["mystery", "marriage"], rationale: "调查与婚姻并行" },
				],
				storyMovements: base.storyMovements.map((movement, index) => ({
					...movement,
					eventIds: [index * 2 + 1, index * 2 + 2],
				})),
			});
			await store.saveSocialSuspenseDesign({ projectId: "v10", design: shallowDesign });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v10" });
			expect(report.issues.some((item) => item.code === "COLLISION_SHALLOW")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V11: relationship-only chapters stall the external plot", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v11-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v11");
			const events = fullMap().map((event) => ({ ...event, mysteryDelta: undefined, professionalDelta: undefined }));
			await saveMap(store, "v11", events as UnifiedEvent[]);
			await store.saveSocialSuspenseDesign({ projectId: "v11", design: design() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v11" });
			expect(report.issues.some((item) => item.code === "EXTERNAL_PLOT_STALL")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V12: mystery-only chapters detach the relationship plot", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v12-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v12");
			const events = fullMap().map((event) => ({ ...event, marriageDelta: undefined, chaseWifeDelta: undefined }));
			await saveMap(store, "v12", events as UnifiedEvent[]);
			await store.saveSocialSuspenseDesign({ projectId: "v12", design: design() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v12" });
			expect(report.issues.some((item) => item.code === "RELATIONSHIP_PLOT_DETACHED")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V13: a profession that disappears after the opening warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v13-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v13");
			const events = fullMap().map((event) =>
				event.chapter === 1 ? event : { ...event, professionalDelta: undefined },
			);
			await saveMap(store, "v13", events as UnifiedEvent[]);
			await store.saveSocialSuspenseDesign({ projectId: "v13", design: design() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v13" });
			expect(report.issues.some((item) => item.code === "PROFESSIONAL_PLOT_DISAPPEARS")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V14: a single-engine climax warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v14-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v14");
			// 第 3 章（高潮）只含 mystery 事件，而前面章节多引擎融合
			const climaxOnlyMystery = fullMap().map((event) =>
				event.chapter === 3
					? { ...event, marriageDelta: undefined, chaseWifeDelta: undefined, professionalDelta: undefined }
					: event,
			);
			await saveMap(store, "v14", climaxOnlyMystery as UnifiedEvent[]);
			const base = design();
			const lastMovementOnlyMystery = design({
				storyMovements: [
					base.storyMovements[0]!,
					base.storyMovements[1]!,
					{ ...base.storyMovements[2]!, eventIds: [3] },
				],
			});
			await store.saveSocialSuspenseDesign({ projectId: "v14", design: lastMovementOnlyMystery });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v14" });
			expect(report.issues.some((item) => item.code === "CLIMAX_SINGLE_ENGINE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V15: systemic problems collapsing into one villain warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v15-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v15");
			await saveMap(store, "v15", fullMap());
			await store.saveSocialSuspenseDesign({
				projectId: "v15",
				design: design({
					antagonisticForces: [
						{
							id: "villain",
							type: "individual",
							source: "丈夫",
							goal: "保住收益",
							powerMechanism: "经济控制",
							costBearsOn: ["女主"],
						},
					],
				}),
			});
			const report = await store.checkSocialSuspenseDesign({ projectId: "v15" });
			expect(report.issues.some((item) => item.code === "SYSTEMIC_PROBLEM_COLLAPSES_TO_SINGLE_VILLAIN")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V16: too-clean social endings warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v16-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v16");
			await saveMap(store, "v16", fullMap());
			const base = design();
			await store.saveSocialSuspenseDesign({
				projectId: "v16",
				design: design({
					socialResolution: {
						...base.socialResolution,
						institutionalResistance: undefined,
						unresolvedResidue: [],
					},
				}),
			});
			const report = await store.checkSocialSuspenseDesign({ projectId: "v16" });
			expect(report.issues.some((item) => item.code === "SOCIAL_ENDING_TOO_CLEAN")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V17: themes only stated warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v17-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v17");
			await saveMap(store, "v17", fullMap());
			const base = design();
			await store.saveSocialSuspenseDesign({
				projectId: "v17",
				design: design({ themeArchitecture: [{ ...base.themeArchitecture[0]!, actionProof: [] }] }),
			});
			const report = await store.checkSocialSuspenseDesign({ projectId: "v17" });
			expect(report.issues.some((item) => item.code === "THEME_ONLY_STATED")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V18: a complete vertical design checks clean and stays private for reader-sim", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v18-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v18");
			await saveMap(store, "v18", fullMap());
			await store.saveSocialSuspenseDesign({ projectId: "v18", design: design() });
			await store.saveCharacterContradictionProfile({ projectId: "v18", profile: heroineProfile() });
			const report = await store.checkSocialSuspenseDesign({ projectId: "v18" });
			expect(report.status, JSON.stringify(report)).toBe("ok");
			const complexity = await store.checkCharacterComplexity({ projectId: "v18" });
			expect(complexity.status, JSON.stringify(complexity)).toBe("ok");
			const author = await store.readStoryContext({ projectId: "v18", chapter: 1, task: "chapter-writing" });
			expect(author.includedFiles).toContain("outline/genre/female-social-suspense-design.json");
			const reader = await store.readStoryContext({
				projectId: "v18",
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(
				reader.includedFiles.some(
					(file) => file.includes("female-social-suspense-design") || file.includes("contradiction-profiles"),
				),
			).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("V19: vertical quality review rejects invalid structural evidence", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-vertical-v19-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "v19");
			await saveMap(store, "v19", fullMap());
			await store.saveSocialSuspenseDesign({ projectId: "v19", design: design() });
			const review = {
				verdict: "strong" as const,
				genrePromise: "职业调查与婚姻经济控制互为因果",
				strongestElements: ["观察桥接"],
				majorRisks: [],
				integrationFindings: [
					{
						finding: "职业与婚姻因果碰撞",
						evidence: {
							eventIds: [1, 999],
							professionalActionIds: ["PA-1", "PA-999"],
							marriageRefs: ["E1", "NOPE"],
							clueIds: ["C1"],
							harmIds: [],
							patternIds: ["p1"],
							mechanismIds: ["m1"],
							dilemmaIds: ["d1"],
						},
					},
				],
				characterFindings: [],
				pacingFindings: [],
				professionalFindings: [],
				socialRealityFindings: [],
				revisionPriorities: ["让复核制真实落地"],
			};
			const result = await store.checkVerticalStoryQuality({ projectId: "v19", review });
			expect(result.status).toBe("error");
			expect(
				result.issues.some(
					(item) =>
						item.code === "VERTICAL_EVIDENCE_INVALID" &&
						item.message.includes("999") &&
						item.message.includes("C1"),
				),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
