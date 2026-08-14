import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function readJsonIfExists(path: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch {
		return undefined;
	}
}

import { describe, expect, it } from "vitest";
import type {
	ChapterPlanProposal,
	FemaleSocialSuspenseDesign,
	StoryArchitecture,
	StoryConcept,
	StoryFoundation,
	UnifiedChaseWifeDelta,
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
const emptyMarriage = {
	economicItemChanges: [],
	responsibilityChanges: [],
	decisionRightChanges: [],
	socialTieChanges: [],
	inertiaChanges: [],
	exitConstraintChanges: [],
	restructuringProgress: [],
};

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 10));
	const endChar = Math.min(normalized.length, safeStart + 10);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

async function initFull(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "workflow",
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

function concept(): StoryConcept {
	return {
		premise: "35 岁保险调查员发现丈夫家族企业可能涉及骗保",
		protagonistHook: "她按流程核验一单理赔，发现死亡时间被改过",
		protagonistGoal: "查清最后一份保单的真相并保住自己的生活",
		externalConflict: "理赔结论被审批链压缩",
		relationshipConflict: "丈夫家族是保单受益人",
		socialQuestion: "外包核赔为什么放任伪造持续多年",
		professionalHook: "只有调查员能调取理赔档案并对照门禁记录",
		centralDilemma: "按职业规范上报会得罪丈夫家族，压住结论会违背职业原则",
		centralMystery: "为什么死亡时间与门禁记录矛盾",
		emotionalPromise: "她从被安排到亲手决定自己的人生",
		genrePromise: "职业调查与婚姻经济控制互为因果，制度问题由机制生成",
		stakes: "职业、婚姻、孩子的抚养",
		possibleContradictions: ["她既想维持体面又无法再忍"],
		risks: ["万能调查员", "最后都是坏男人干的"],
		storyPotential: ["职业权限获取线索", "离婚摊牌与真相揭示同步"],
		genericRisks: [
			{ risk: "普通出轨模板", mitigatedBy: "社会机制进因果链：审批权与赔付率 KPI" },
			{ risk: "万能调查员", mitigatedBy: "职业后果真实落地：被调离" },
		],
	};
}
function mysteryFoundation() {
	return {
		case: {
			id: "case-w",
			centralQuestion: "为什么死亡时间与门禁记录矛盾？",
			truthSummary: "死亡时间被伪造",
			truthClaims: [
				{
					id: "T1",
					statement: "死亡发生在等待期内",
					category: "timeline",
					dependsOnClaimIds: [],
					proofRequirement: "门禁记录",
					proofPaths: [{ id: "p1", clueIds: ["C1"], prerequisiteClaimIds: [] }],
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
		clues: [
			{
				id: "C1",
				observableFact: "02:17 门禁凭证被使用",
				sourceType: "institutional-record",
				sourceDescription: "门禁系统",
				firstAvailableChapter: 1,
				plannedRealizationChapter: 1,
				truthClaimIds: ["T1"],
				reliability: "medium",
				interpretationOptions: ["死者凌晨回公司"],
				actualImplication: "手机持有人不等于在场人",
				clueRole: "ambiguous",
			},
		],
	};
}

function marriageFoundation() {
	return {
		structure: {
			id: "m-w",
			protagonistCharacterId: "heroine",
			spouseCharacterId: "husband",
			economicItems: [
				{
					id: "E1",
					kind: "housing",
					description: "共同住房",
					control: "spouse",
					protagonistAccess: "limited",
					spouseAccess: "full",
					exitConsequence: "失去住所",
					relatedResponsibilityIds: [],
				},
			],
			responsibilities: [
				{
					id: "R1",
					domain: "childcare",
					description: "接送孩子",
					beneficiaryDescription: "孩子",
					actualPrimaryBearer: "protagonist",
					frequency: "daily",
					substitutability: "difficult",
					failureConsequence: "无人接送",
					recognizedByBoth: "unknown",
					relatedEconomicItemIds: [],
				},
			],
			decisionRights: [],
			socialTies: [],
			inertiaFactors: [],
			exitConstraints: [],
		},
	};
}

function professionalFoundation() {
	return {
		model: {
			id: "dm-w",
			domain: "insurance-fraud-investigation",
			protagonistRole: {
				title: "理赔反欺诈调查员",
				departmentOrFunction: "理赔调查科",
				organizationType: "商业保险公司",
				coreResponsibilities: ["核验材料"],
				reportsTo: "调查科负责人",
				decisionScope: "形成意见",
				cannotDecide: ["终审拒赔"],
				collaboratesWith: ["核赔岗"],
				professionalRisk: "坚持意见被问责",
			},
			organizationContext: "理赔中心",
			authorityBoundaries: [
				{
					id: "AUTH-1",
					category: "inspect-internal-record",
					scopeDescription: "查询理赔档案",
					authorityLevel: "direct",
					conditions: [],
					escalationPathIds: [],
					violationConsequence: "合规警告",
				},
			],
			workflowStages: [
				{
					id: "S1",
					name: "受理",
					objective: "核对材料",
					isEntry: true,
					entryConditions: ["报案"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["申请"],
					possibleNextStageIds: ["S2"],
					terminal: false,
				},
				{
					id: "S2",
					name: "调查",
					objective: "核验矛盾",
					isEntry: false,
					entryConditions: ["风险"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["档案"],
					possibleNextStageIds: ["S3"],
					terminal: false,
				},
				{
					id: "S3",
					name: "结案",
					objective: "归档",
					isEntry: false,
					entryConditions: ["意见"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["意见书"],
					possibleNextStageIds: [],
					terminal: true,
				},
			],
			evidenceSources: [
				{
					id: "EV-1",
					category: "internal-claim-file",
					description: "理赔材料",
					holder: "本公司",
					accessMode: "direct-role-access",
					requiredAuthorityIds: ["AUTH-1"],
					privacyOrSensitivity: "sensitive",
					verificationLimitations: [],
					chainOrProvenanceNote: "内部档案",
				},
			],
			guardrails: [],
			escalationPaths: [],
		},
		plan: {
			id: "cp-w",
			domain: "insurance-fraud-investigation",
			mandate: "核验异常理赔",
			startingStageId: "S1",
			actions: [
				{
					id: "PA-1",
					stageId: "S2",
					description: "核对材料时间线",
					purpose: "核验矛盾",
					authorityIds: ["AUTH-1"],
					authoritySatisfactions: [],
					evidenceSourceIds: ["EV-1"],
					guardrailIds: [],
					expectedInformationGain: "时间线矛盾",
					decisionOrWorkflowEffect: "推进意见",
					ifBlocked: "升级",
					professionalRisk: "误判",
				},
			],
			conflictsOfInterest: [],
			escalations: [],
			professionalConsequences: [],
			observations: [
				{
					id: "OBS-1",
					actionId: "PA-1",
					evidenceSourceId: "EV-1",
					observableFact: "02:17 门禁凭证被使用",
					limitations: [],
					discoveredByCharacterId: "heroine",
					reliability: "medium",
					intendedChapter: 1,
					mysteryClueId: "C1",
				},
			],
			unresolvedQuestions: [],
		},
	};
}
function chaseFoundation() {
	return {
		beatSheet: {
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
			openingIntro: "我把钥匙放在玄关，转身走出家门，夜风把门带上。".repeat(3),
			openingConflict: "他要求我放弃调查这件理赔",
			stayingLogic: {
				emotionalReason: "旧承诺还能修复",
				falseBelief: "再解释一次他就会尊重我",
				sustainingEvidence: ["他不断要求我等待"],
				breakingThreshold: "他把我的职业原则当家庭资源",
			},
			beats: Array.from({ length: 12 }, (_, index) => ({
				beat: index + 1,
				heroinePhase: [
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
				][index],
				malePhase: [
					"entitlement",
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
				][index],
				targetTrack: "heroine",
				paywallHook: false,
				sceneCount: 1,
				goal: "protect her choice",
				conflict: "the old relationship resists",
				actionOrConsequence: "the choice moves forward",
				emotionBefore: "expectation",
				emotionAfter: "resolve",
				emotionStack: ["resolve"],
				painPoint: "the old promise",
				rewardPoint: "her own boundary",
				hook: "the next decision approaches",
			})),
		},
	};
}
function socialDesign(): FemaleSocialSuspenseDesign {
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
			resolutionScope: "个案澄清",
			unresolvedSocialResidue: ["外包模式仍在"],
			systemMechanisms: [
				{
					id: "m1",
					institutionOrNorm: "理赔调查结论须经区域负责人审批",
					powerHolder: "区域负责人",
					mechanism: "负责人同时承担赔付率 KPI，调查结论被系统性压缩",
					whoBenefits: "核赔负责人",
					whoPays: "投保人",
					observableStoryEffects: ["结论被压"],
					relatedMysteryClaimIds: ["T1"],
					relatedProfessionalRefIds: ["PA-1"],
					relatedMarriageRefIds: ["E1"],
					eventIds: [1, 4],
				},
			],
		},
		truthLayerMap: [{ claimId: "T1", layer: "system" }],
		suspense: { falseModel: { statement: "丈夫只是隐瞒了外遇", replacedByClaimIds: ["T1"] } },
		marriagePatterns: [
			{
				id: "p1",
				trigger: "遇到危机",
				protagonistDefaultResponse: "事后补救",
				spouseDefaultResponse: "替她做决定",
				shortTermBenefit: "家庭高效率",
				longTermCost: "边界消失",
				hiddenAssumption: "她的职业安排属于家庭资源",
				structuralRefs: ["E1"],
				relationshipRefs: ["R1"],
				breakingEventIds: [2],
			},
		],
		professionalDilemmas: [
			{
				id: "d1",
				choiceA: "上报",
				choiceBCost: "家族施压",
				choiceB: "压住",
				choiceACost: "被问责",
				valuesInConflict: ["职业原则", "家庭利益"],
				relatedActionIds: ["PA-1"],
				relatedMarriageRefs: ["E1"],
				relatedEventIds: [1],
				resolution: "上报并承担代价",
			},
		],
		professionalPlotDependency: {
			irreplaceabilityStatement: "只有调查员能调取档案",
			dependencyChannels: ["职业权限获取线索"],
		},
		chaseArcReview: {
			wrongPursuitRootedInFlaw: true,
			wrongPursuitExplanation: "他以为问题是误会",
			repairAddressesHarmMechanism: true,
			repairExplanation: "公开承认职业判断",
			regretWithBeliefChange: true,
			regretExplanation: "旧信念被现实否定",
		},
		collisionAnalysis: [
			{ eventId: 1, type: "causal", engines: ["mystery", "professional"], rationale: "职业观察产出线索" },
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
		],
		socialResolution: {
			personalResolution: "她搬出共同住房",
			caseResolution: "理赔结论被纠正",
			institutionalChange: "双人复核",
			institutionalResistance: "外包模式延续",
			unresolvedResidue: ["复核制形同虚设"],
			costDistributionAfterEnding: ["她被调离"],
		},
		themeArchitecture: [
			{
				theme: "职业原则不是婚后共同财产",
				statement: "原则是否属于家庭资源",
				actionProof: ["丈夫要求她撤回调查", "她把门禁记录交给第三方"],
			},
		],
		storyMovements: [
			{
				id: "m1",
				chapters: [1],
				dominantQuestion: "保单时间为什么矛盾",
				protagonistGoal: "核验材料",
				externalPressure: "结案时限",
				relationshipPressure: "丈夫要求撤回",
				professionalPressure: "结论被压",
				irreversibleChange: "钥匙交还",
				exitCondition: "进入调查阶段",
				eventIds: [1, 2],
			},
			{
				id: "m2",
				chapters: [2],
				dominantQuestion: "谁替换了时间戳",
				protagonistGoal: "证明替换",
				externalPressure: "门禁失效",
				relationshipPressure: "离婚摊牌",
				professionalPressure: "赔付率问责",
				irreversibleChange: "搬出住房",
				exitCondition: "拿到凭证",
				eventIds: [3, 4],
			},
			{
				id: "m3",
				chapters: [3],
				dominantQuestion: "制度为何放任",
				protagonistGoal: "把真相归档",
				externalPressure: "公开压力",
				relationshipPressure: "边界划定",
				professionalPressure: "调离问责",
				irreversibleChange: "结论归档",
				exitCondition: "复核制试行",
				eventIds: [5, 6],
			},
		],
		commercialForm: {
			openingAnomalyChapter: 1,
			midpointReframeChapter: 3,
			lateExpositionChapters: [],
			endingAftershock: "档案室里另一批保单",
			chapterExits: [
				{ chapter: 1, kind: "threat" },
				{ chapter: 2, kind: "cost-arrival" },
				{ chapter: 3, kind: "contradiction" },
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
				changeArc: "同意复核制",
			},
		],
	};
}

function foundation(): StoryFoundation {
	return {
		premise: "35 岁保险调查员发现丈夫家族企业可能涉及骗保",
		corePromises: ["职业调查与婚姻经济控制互为因果"],
		endingDirection: "案件解决，制度缓慢松动；她搬出共同住房",
		themes: ["职业原则不是婚后共同财产"],
		mystery: mysteryFoundation() as StoryFoundation["mystery"],
		marriage: marriageFoundation() as StoryFoundation["marriage"],
		professional: professionalFoundation() as StoryFoundation["professional"],
		socialDesign: socialDesign(),
		chase: chaseFoundation() as StoryFoundation["chase"],
		characterProfiles: [
			{
				characterId: "heroine",
				values: ["职业原则", "孩子优先"],
				strengths: ["证据意识"],
				blindSpots: ["低估丈夫家族的资源"],
				emotionalNeeds: ["被当作独立个体"],
				avoidedTruths: ["婚姻早已失衡"],
				selfProtectiveHabits: ["用工作回避对话"],
				costlyChoices: ["把门禁记录交给第三方"],
				wrongOrIncompleteJudgments: ["误以为丈夫不知情"],
				contradictions: ["既想维持体面又无法再忍"],
			},
		],
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
				changeArc: "同意复核制",
			},
		],
	};
}

function architecture(): StoryArchitecture {
	return {
		movements: socialDesign().storyMovements,
		majorQuestions: [{ question: "保单时间为什么矛盾", answeredByClaimIds: ["T1"], movementId: "m1" }],
		majorReframes: [{ chapter: 3, reframe: "不是一个人，是一套流程" }],
		falseModel: { statement: "丈夫只是隐瞒了外遇", collapsesAtMovementId: "m2", replacedByClaimIds: ["T1"] },
		pressureEscalation: [{ chapter: 1, pressureType: "职业风险", sourceRef: "PA-1" }],
		relationshipTurningPoints: [{ chapter: 2, kind: "divorce", marriageRefs: ["E1"], chaseRefs: [] }],
		professionalDilemmas: [
			{
				id: "d1",
				choiceA: "上报",
				choiceBCost: "家族施压",
				choiceB: "压住",
				choiceACost: "被问责",
				valuesInConflict: ["职业原则", "家庭利益"],
				relatedActionIds: ["PA-1"],
				relatedMarriageRefs: ["E1"],
				relatedEventIds: [1],
				resolution: "上报并承担代价",
			},
		],
		irreversibleDecisions: [{ chapter: 2, decision: "搬出共同住房", cannotRemoveBecause: "钥匙已经交还" }],
		climaxArchitecture: { chapter: 3, engines: ["mystery", "marriage", "professional"], resolutionRefs: ["T1"] },
		endingSettlement: {
			chapter: 3,
			personalResolution: "她搬出共同住房",
			caseResolution: "理赔结论被纠正",
			institutionalChange: "双人复核",
			institutionalResistance: "外包模式延续",
			unresolvedResidue: ["复核制形同虚设"],
		},
		socialResidue: ["外包模式仍在"],
		characterArc: [{ characterId: "heroine", arc: "从被安排到亲手决定", keyChapters: [1, 3] }],
	};
}

function unifiedEvent(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "查清保单真相",
		conflict: "材料时间戳互相矛盾",
		action: "核验理赔材料",
		consequence: "真相向表面移动",
		characterDeltas: [{ characterId: "heroine", dimension: "knowledge", from: "未知", to: "怀疑" }],
		resourceDeltas: [],
		riskDeltas: [],
		causes: eventId === 1 ? [] : [eventId - 1],
		irreversible: false,
		cannotRemoveBecause: "下一次选择不能回到原地",
		...overrides,
	};
}

function chaseDelta(role: UnifiedChaseWifeDelta["role"], beatRef: number): UnifiedChaseWifeDelta {
	return {
		informationDelta: ["新信息"],
		relationshipDelta: ["旧约定出现裂缝"],
		resourceDelta: [],
		riskDelta: [],
		heroineAgencyBefore: 20,
		heroineAgencyAfter: 40,
		harmRefs: [],
		repairRefs: [],
		role,
		beatRefs: [beatRef],
		paywallHook: false,
	};
}

function eventGraph(): UnifiedEvent[] {
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
			chaseWifeDelta: chaseDelta("opening-injury", 1),
		}),
		unifiedEvent(2, 1, {
			irreversible: true,
			cannotRemoveBecause: "材料已经交出去",
			marriageDelta: { ...emptyMarriage, economicItemChanges: ["E1"] },
		}),
		unifiedEvent(3, 2, { mysteryDelta: { ...emptyMystery, proofProgressClaimIds: ["T1"] } }),
		unifiedEvent(4, 2, {
			professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
			chaseWifeDelta: chaseDelta("irreversible-exit", 5),
		}),
		unifiedEvent(5, 3, {
			irreversible: true,
			cannotRemoveBecause: "意见书已归档",
			riskDeltas: [{ label: "职业风险", change: "换岗" }],
			mysteryDelta: { ...emptyMystery, revealClaimIds: ["T1"] },
		}),
		unifiedEvent(6, 3, {
			marriageDelta: { ...emptyMarriage, responsibilityChanges: ["R1"] },
			chaseWifeDelta: chaseDelta("boundary-test", 3),
		}),
	];
}

function planProposal(eventIds: number[]): ChapterPlanProposal {
	return {
		chapterGoal: "查清时间矛盾并确认经济控制",
		openingState: "她在理赔办公室核对材料",
		eventIds,
		sceneDesign: [
			{
				sceneId: "s1",
				order: 1,
				location: "理赔办公室",
				goal: "核验材料",
				opposition: "审批卡住",
				stakes: "职业与婚姻",
				emotionalTurn: "决定不再退让",
				informationReveal: ["时间矛盾"],
			},
		],
		informationControl: "逐条核对",
		emotionalMovement: "从平静到清醒",
		professionalConstraints: "只能调取内部档案",
		relationshipMovement: "丈夫要求撤回",
		chapterExitPressure: "威胁",
		targetLength: 2500,
		cannotRemoveBecause: "材料已经交出去",
	};
}
async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await initFull(store, projectId);
	const conceptResult = await store.developStoryConcept({ projectId, concept: concept() });
	expect(conceptResult.status).toBe("completed");
	const bibleResult = await store.developStoryBible({ projectId, foundation: foundation() });
	expect(bibleResult.status, JSON.stringify(bibleResult)).toBe("completed");
	expect(bibleResult.confirmationRequired).toBe(true);
	const architectureResult = await store.designStoryArchitecture({ projectId, architecture: architecture() });
	expect(architectureResult.status, JSON.stringify(architectureResult)).toBe("completed");
	const graphResult = await store.buildNarrativeEventGraph({ projectId, events: eventGraph() });
	expect(graphResult.status, JSON.stringify(graphResult)).toBe("completed");
}

describe("authoring workflow", () => {
	it("AW1-AW4: concept to bible (proposed only) to architecture to event graph with correct next actions", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-workflow-aw14-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFull(store, "aw14");
			const s1 = await store.getNovelStatus({ projectId: "aw14" });
			expect(s1.workflowPhase).toBe("idea");
			expect(s1.recommendedNextActions?.[0]?.tool).toBe("develop_story_concept");
			const conceptResult = await store.developStoryConcept({ projectId: "aw14", concept: concept() });
			expect(conceptResult.status).toBe("completed");
			expect(conceptResult.createdArtifacts).toContain("work/authoring/story-concept.json");
			const s2 = await store.getNovelStatus({ projectId: "aw14" });
			expect(s2.workflowPhase).toBe("concept");
			expect(s2.recommendedNextActions?.[0]?.tool).toBe("develop_story_bible");
			const bibleResult = await store.developStoryBible({ projectId: "aw14", foundation: foundation() });
			expect(bibleResult.status, JSON.stringify(bibleResult)).toBe("completed");
			expect(bibleResult.confirmationRequired).toBe(true);
			expect(bibleResult.awaitingConfirmation?.length).toBeGreaterThan(0);
			const confirmedMystery = await readJsonIfExists(
				join(cwd, "novels", "aw14", "canon", "mystery", "truth-model.json"),
			);
			expect(confirmedMystery).toBeUndefined();
			const proposedMystery = await readJsonIfExists(
				join(cwd, "novels", "aw14", "work", "mystery", "truth-model-proposed.json"),
			);
			expect(proposedMystery).toBeDefined();
			const s3 = await store.getNovelStatus({ projectId: "aw14" });
			expect(s3.workflowPhase).toBe("foundation");
			expect(s3.recommendedNextActions?.[0]?.tool).toBe("design_story_architecture");
			const store2 = new NovelProjectStore(cwd);
			await store2.initializeNovel({
				projectId: "aw3",
				title: "no-foundation",
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
			const blockedArch = await store2.designStoryArchitecture({ projectId: "aw3", architecture: architecture() });
			expect(blockedArch.status).toBe("blocked");
			expect(blockedArch.blockers[0]?.code).toBe("ARCHITECTURE_WITHOUT_CONCEPT");
			const architectureResult = await store.designStoryArchitecture({
				projectId: "aw14",
				architecture: architecture(),
			});
			expect(architectureResult.status, JSON.stringify(architectureResult)).toBe("completed");
			const s4 = await store.getNovelStatus({ projectId: "aw14" });
			expect(s4.workflowPhase).toBe("architecture");
			expect(s4.recommendedNextActions?.[0]?.tool).toBe("build_narrative_event_graph");
			const graphResult = await store.buildNarrativeEventGraph({ projectId: "aw14", events: eventGraph() });
			expect(graphResult.status, JSON.stringify(graphResult)).toBe("completed");
			const s5 = await store.getNovelStatus({ projectId: "aw14" });
			expect(s5.workflowPhase).toBe("event-design");
			expect(s5.recommendedNextActions?.[0]?.tool).toBe("plan_chapter");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("AW16/AW17: status next actions are capability-aware", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-workflow-aw1617-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "plain", title: "plain", genre: "urban-romance" });
			await store.developStoryConcept({
				projectId: "plain",
				concept: {
					...concept(),
					professionalHook: "无",
					relationshipConflict: "夫妻隔阂",
					socialQuestion: "城市生活的孤独",
				},
			});
			const status = await store.getNovelStatus({ projectId: "plain" });
			expect(status.foundationMissing ?? []).toEqual([]);
			expect(status.workflowPhase).toBe("foundation");
			expect(status.recommendedNextActions?.[0]?.tool).toBe("design_story_architecture");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
	it("AW5-AW8: plan_chapter saves plan and contracts; draft_chapter assembles without finalizing", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-workflow-aw58-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "aw58");
			const planResult = await store.planChapter({ projectId: "aw58", chapter: 1, plan: planProposal([1, 2]) });
			expect(planResult.status, JSON.stringify(planResult)).toBe("completed");
			expect(planResult.chapterContext).toBeDefined();
			const context = planResult.chapterContext as {
				movement?: { id: string };
				relevantRefs?: Record<string, string[]>;
			};
			expect(context.movement?.id).toBe("m1");
			expect(context.relevantRefs?.clueIds).toContain("C1");
			expect(context.relevantRefs?.professionalActionIds).toContain("PA-1");
			expect(context.relevantRefs?.marriageRefs).toContain("E1");
			const planAgain = await store.planChapter({ projectId: "aw58", chapter: 1, plan: planProposal([1, 2]) });
			expect(planAgain.createdArtifacts).toEqual([]);
			const prose1 =
				"他要求我放弃调查这件理赔，我没有同意。我把保单材料摊在桌上核对时间戳。旧约定出现裂缝，门禁记录与死亡证明叠在一起，矛盾自己跳出来。我拨通调查科电话先报备，把第一页复印件收进档案袋。回家的路上我数了数手里的钥匙，最后把材料锁进抽屉。".repeat(
					2,
				);
			const prose2 =
				"我把钥匙从钥匙圈上取下来放进抽屉，他问我要去哪里，我说只是分开住一段。夜风很凉，我走完整条街，到妹妹家时她在门口等我。我坐下把水喝完，妹妹问我想清楚没有，我说先这样。".repeat(
					2,
				);
			const draftResult = await store.draftChapter({
				projectId: "aw58",
				chapter: 1,
				eventDrafts: [
					{ eventId: 1, content: prose1 },
					{ eventId: 2, content: prose2 },
				],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [
							{ dimension: "information", evidence: anchor(prose1, 0) },
							{ dimension: "risk", evidence: anchor(prose1, 30) },
						],
						chaseEvidence: {
							roleShown: true,
							conflictShown: true,
							relationshipDeltasShown: ["旧约定出现裂缝"],
							agencyActionShown: true,
						},
					},
					{
						eventId: 2,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [
							{ dimension: "information", evidence: anchor(prose2, 0) },
							{ dimension: "relationship", evidence: anchor(prose2, 20) },
						],
					},
				],
			});
			expect(draftResult.status, JSON.stringify(draftResult)).toBe("completed");
			expect(draftResult.draftRevision).toBe(1);
			expect(draftResult.recommendedNextActions[0]?.tool).toBe("diagnose_chapter");
			const status = await store.getNovelStatus({ projectId: "aw58" });
			expect(status.finalizedChapters).toEqual([]);
			const chapterFile = await readJsonIfExists(join(cwd, "novels", "aw58", "chapters", "chapter-001.md"));
			expect(chapterFile).toBeUndefined();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CS1 + AW9-AW13: chase evidence gate blocks, diagnosis aggregates, scoped revision passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-workflow-aw9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "aw9");
			await store.planChapter({ projectId: "aw9", chapter: 1, plan: planProposal([1, 2]) });
			const prose1 =
				"他要求我放弃调查这件理赔，我没有同意。我把保单材料摊在桌上核对时间戳。旧约定出现裂缝，门禁记录与死亡证明叠在一起，矛盾自己跳出来。我拨通调查科电话先报备，把第一页复印件收进档案袋。回家的路上我数了数手里的钥匙，最后把材料锁进抽屉。".repeat(
					2,
				);
			const prose2 =
				"我把钥匙从钥匙圈上取下来放进抽屉，他问我要去哪里，我说只是分开住一段。夜风很凉，我走完整条街，到妹妹家时她在门口等我。我坐下把水喝完，妹妹问我想清楚没有，我说先这样。".repeat(
					2,
				);
			// CS1: chase 事件缺少 chaseEvidence → 语义失败 → draft 阻塞
			const blockedDraft = await store.draftChapter({
				projectId: "aw9",
				chapter: 1,
				eventDrafts: [
					{ eventId: 1, content: prose1 },
					{ eventId: 2, content: prose2 },
				],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [
							{ dimension: "information", evidence: anchor(prose1, 0) },
							{ dimension: "risk", evidence: anchor(prose1, 30) },
						],
					},
					{
						eventId: 2,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [
							{ dimension: "information", evidence: anchor(prose2, 0) },
							{ dimension: "relationship", evidence: anchor(prose2, 20) },
						],
					},
				],
			});
			expect(blockedDraft.status).toBe("blocked");
			expect(
				blockedDraft.blockers.some(
					(blocker) => blocker.code === "DRAFT_SEMANTIC_FAIL" && blocker.message.includes("chaseEvidence"),
				),
			).toBe(true);
			// AW9: diagnose → P0 聚合（semantic-report + realization 门）
			const diagnosis = await store.diagnoseChapter({ projectId: "aw9", chapter: 1 });
			expect(diagnosis.verdict).toBe("blocked");
			expect(
				diagnosis.findings.some(
					(finding) => finding.priority === "P0" && finding.sourceIssues.includes("semantic-report"),
				),
			).toBe(true);
			// AW11-AW13: revise 用 RevisionPlan + 补 chaseEvidence → 通过（scoped: 只改事件 1）
			const revise = await store.reviseChapter({
				projectId: "aw9",
				chapter: 1,
				revisionPlan: {
					chapter: 1,
					goals: [
						{
							id: "REV-1",
							priority: "P0",
							sourceDiagnosisIds: [diagnosis.findings[0]!.id],
							problem: "chase 语义证据缺失",
							strategy: "补充 chaseEvidence 并确认关系 delta 出现",
							affectedEventIds: [1],
						},
					],
				},
				eventDrafts: [{ eventId: 1, content: prose1 }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [
							{ dimension: "information", evidence: anchor(prose1, 0) },
							{ dimension: "risk", evidence: anchor(prose1, 30) },
						],
						chaseEvidence: {
							roleShown: true,
							conflictShown: true,
							relationshipDeltasShown: ["旧约定出现裂缝"],
							agencyActionShown: true,
						},
					},
				],
			});
			expect(revise.status, JSON.stringify(revise)).not.toBe("blocked");
			expect(revise.createdArtifacts[0]).toContain("revisions");
			// AW12: realization 未被伪造
			const realizationFile = await readJsonIfExists(
				join(cwd, "novels", "aw9", "continuity", "realizations", "chapter-001.json"),
			);
			expect(realizationFile).toBeUndefined();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("AW14/AW15: review_manuscript detects whole-story structure problems", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-workflow-aw1415-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFull(store, "aw1415");
			await store.developStoryConcept({ projectId: "aw1415", concept: concept() });
			await store.developStoryBible({ projectId: "aw1415", foundation: foundation() });
			await store.designStoryArchitecture({ projectId: "aw1415", architecture: architecture() });
			const stalled = eventGraph().map((event) =>
				event.chapter === 1 ? event : { ...event, mysteryDelta: undefined, professionalDelta: undefined },
			);
			await store.buildNarrativeEventGraph({ projectId: "aw1415", events: stalled });
			const review = await store.reviewManuscript({
				projectId: "aw1415",
				review: {
					verdict: "structural-revision-needed",
					strongestElements: ["职业观察桥接"],
					structuralIssues: ["第二幕外部情节停滞"],
					characterIssues: [],
					suspenseIssues: [],
					relationshipIssues: [],
					professionalIssues: [],
					socialRealityIssues: [],
					pacingIssues: [],
					endingIssues: [],
					revisionPriorities: ["把职业线带回中段"],
					storyRevisionPlan: [
						{
							id: "REV-M1",
							action: "在第 2-3 章恢复职业调查动作",
							rationale: "外部情节停滞",
							affectedChapters: [2, 3],
						},
					],
				},
			});
			expect(review.status).toBe("needs-review");
			expect(review.diagnostics.some((item) => item.includes("外部情节停滞"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("CTX: workflow context loads author artifacts and stays private for reader-sim", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-workflow-ctx-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "ctx");
			const planning = await store.readStoryContext({ projectId: "ctx", chapter: 1, task: "chapter-planning" });
			expect(planning.includedFiles).toContain("outline/unified/event-map.json");
			expect(planning.includedFiles).toContain("work/authoring/story-concept.json");
			expect(planning.includedFiles).toContain("outline/story-architecture.json");
			const reader = await store.readStoryContext({
				projectId: "ctx",
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(
				reader.includedFiles.some(
					(file) =>
						file.includes("story-concept") ||
						file.includes("story-architecture") ||
						file.includes("female-social-suspense-design") ||
						file.includes("story-bible-index"),
				),
			).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
