import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import type {
	ChapterPlanProposal,
	EndingArchitecture,
	FemaleSocialSuspenseDesign,
	StoryArchitecture,
	StoryConcept,
	StoryDirectionCandidate,
	StoryFoundation,
	UnifiedChaseWifeDelta,
	UnifiedEvent,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";
import { classifyDraftFailure } from "../../../.pi/extensions/novel-agent/services/story-design.ts";

async function readJsonIfExists(path: string): Promise<unknown> {
	try {
		return JSON.parse(await readFile(path, "utf8"));
	} catch {
		return undefined;
	}
}

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

// ==== Round 8: Story Design Intelligence（SD1-SD36 + second fixture）====

function directionCandidate(
	id: string,
	mystery: string,
	social: string,
	faultLine: string,
	dependency: string,
	ending: string,
	dilemma: string,
	logline: string,
): StoryDirectionCandidate {
	return {
		id,
		logline,
		centralMystery: mystery,
		socialMechanism: social,
		protagonistGoal: "查明真相并保住自己的生活",
		protagonistBlindSpot: "以为丈夫只是隐瞒",
		relationshipFaultLine: faultLine,
		spouseCoreBelief: "家族利益优先于婚姻",
		professionalDependency: dependency,
		centralDilemma: dilemma,
		majorCost: "失去婚姻与工作",
		climaxIdea: "在公开场合对质",
		endingShape: ending,
		distinctiveMechanism: "职业权限与家庭身份冲突",
		majorRisks: ["万能调查员"],
	};
}

function distinctDirections(): StoryDirectionCandidate[] {
	return [
		directionCandidate(
			"sd-a",
			"死亡时间被伪造以骗取等待期免责",
			"外包核赔按赔付率考核，压案有制度收益",
			"丈夫早已知情但选择沉默",
			"只有调查员能对照门禁与理赔档案",
			"她揭发后失去婚姻但保住职业",
			"按规范上报会毁掉夫家，压下会违背职业",
			"丈夫知情不报，她按职业规范揭发",
		),
		directionCandidate(
			"sd-b",
			"死者身份被顶替，真正受益人另有其人",
			"亲属代签授权书长期无人核验",
			"婚姻的经济控制通过共同账户实施",
			"调查员的权限边界决定证据能否到手",
			"她离职后以个人身份追查到底",
			"追查会暴露自己也签署过违规授权",
			"顶替案与她的职业污点互为因果",
		),
		directionCandidate(
			"sd-c",
			"等待期规则被制度性利用，多起保单同模式",
			"再保险与赔付率考核共同制造伪造动机",
			"丈夫利用婚姻身份获取调查进度",
			"调查员的反欺诈权限被家族企业反向利用",
			"制度部分修复而她选择不复合",
			"揭发整个模式会连累信任她的同事",
			"她发现模式而非单案，代价是孤立",
		),
	];
}

function pseudoDirections(): StoryDirectionCandidate[] {
	const base = {
		socialMechanism: "外包核赔按赔付率考核",
		relationshipFaultLine: "丈夫隐瞒",
		professionalDependency: "只有调查员能调档案",
		endingShape: "揭发后离婚",
		centralDilemma: "上报毁掉夫家",
		protagonistGoal: "查明真相",
		protagonistBlindSpot: "以为丈夫只是隐瞒",
		spouseCoreBelief: "家族优先",
		majorCost: "失去婚姻",
		climaxIdea: "对质",
		distinctiveMechanism: "权限冲突",
		majorRisks: [],
	};
	return [
		{ ...base, id: "p1", logline: "丈夫家族骗保", centralMystery: "家族伪造死亡时间" },
		{ ...base, id: "p2", logline: "丈夫父亲骗保", centralMystery: "家族伪造死亡时间" },
		{ ...base, id: "p3", logline: "丈夫哥哥骗保", centralMystery: "家族伪造死亡时间" },
	] as StoryDirectionCandidate[];
}

async function withProject<T>(
	name: string,
	setup: (store: NovelProjectStore, projectId: string, cwd: string) => Promise<T>,
): Promise<T> {
	const cwd = await mkdtemp(join(tmpdir(), `pi-novel-sd-${name}-`));
	try {
		return await setup(new NovelProjectStore(cwd), name, cwd);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}

async function initPlain(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "plain",
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

describe("story design intelligence", () => {
	it("SD1: same seed produces 3 structurally different candidates", async () => {
		await withProject("sd1", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			const result = await store.exploreStoryDirections({
				projectId,
				seed: "37 岁保险反欺诈调查员准备离婚，接到一份与丈夫家族企业有关的死亡理赔。",
				candidates: distinctDirections(),
				comparison: {
					dimensions: [
						{
							dimension: "mysteryPotential",
							assessment: "stronger",
							candidateIds: ["sd-a"],
							reason: "时间伪造有可验证的证明结构",
						},
					],
					recommendedCandidateIds: ["sd-a"],
					notes: [],
				},
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.blockers.some((blocker) => blocker.code === "STORY_DIRECTIONS_TOO_SIMILAR")).toBe(false);
			expect(result.createdArtifacts).toContain("work/authoring/story-directions.json");
			const status = await store.getNovelStatus({ projectId });
			expect(status.workflowPhase).toBe("direction");
			expect(status.hasDirections).toBe(true);
			expect(status.directionCount).toBe(3);
		});
	});

	it("SD2: pseudo candidates -> STORY_DIRECTIONS_TOO_SIMILAR", async () => {
		await withProject("sd2", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			const result = await store.exploreStoryDirections({
				projectId,
				seed: "同一个 seed",
				candidates: pseudoDirections(),
			});
			expect(result.status).toBe("blocked");
			expect(result.blockers.some((blocker) => blocker.code === "STORY_DIRECTIONS_TOO_SIMILAR")).toBe(true);
		});
	});

	it("SD3: author selection recorded as USER_CONFIRMED", async () => {
		await withProject("sd3", async (store, projectId, cwd) => {
			await initFull(store, projectId);
			await store.exploreStoryDirections({ projectId, seed: "seed", candidates: distinctDirections() });
			const result = await store.developStoryConcept({
				projectId,
				concept: {
					...concept(),
					selectedDirectionId: "sd-b",
					selectionConfirmation: "USER_CONFIRMED",
					authorNote: "作者选择 B",
				},
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			const directions = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "authoring", "story-directions.json"),
			);
			expect(directions).toBeDefined();
			const selection = (
				directions as { selection?: { selectedCandidateId: string; confirmation: string; authorNote?: string } }
			).selection;
			expect(selection?.selectedCandidateId).toBe("sd-b");
			expect(selection?.confirmation).toBe("USER_CONFIRMED");
			expect(selection?.authorNote).toBe("作者选择 B");
		});
	});

	it("SD4: system recommendation never fakes USER_CONFIRMED", async () => {
		await withProject("sd4", async (store, projectId, cwd) => {
			await initFull(store, projectId);
			await store.exploreStoryDirections({ projectId, seed: "seed", candidates: distinctDirections() });
			const result = await store.developStoryConcept({
				projectId,
				concept: { ...concept(), selectedDirectionId: "sd-c", selectionConfirmation: "SYSTEM_RECOMMENDED" },
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("SYSTEM_RECOMMENDED"))).toBe(true);
			const directions = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "authoring", "story-directions.json"),
			);
			const selection = (directions as { selection?: { selectedCandidateId: string; confirmation: string } })
				.selection;
			expect(selection?.selectedCandidateId).toBe("sd-c");
			expect(selection?.confirmation).toBe("SYSTEM_RECOMMENDED");
		});
	});

	it("SD5: core promise without payoff -> PROMISE_WITHOUT_PAYOFF_PLAN", async () => {
		await withProject("sd5", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.promiseLedger = {
				version: 1,
				promises: [
					{
						id: "P1",
						kind: "mystery",
						promise: "门禁记录最初看似证明死亡时间，后续必须被重新解释",
						introducedByMovementId: "m1",
						supportingRefs: [{ kind: "clue", ref: "C1" }],
					},
				],
			};
			const result = await store.developStoryBible({ projectId, foundation: base });
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("PROMISE_WITHOUT_PAYOFF_PLAN"))).toBe(true);
		});
	});

	it("SD6: professional promise without professional refs -> warning", async () => {
		await withProject("sd6", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.promiseLedger = {
				version: 1,
				promises: [
					{
						id: "P2",
						kind: "professional",
						promise: "职业判断必须被兑现",
						introducedByMovementId: "m1",
						expectedPayoffMovementId: "m3",
						supportingRefs: [{ kind: "clue", ref: "C1" }],
					},
				],
			};
			const result = await store.developStoryBible({ projectId, foundation: base });
			expect(
				result.warnings.some((warning) => warning.includes("PROFESSIONAL_PROMISE_WITHOUT_PROFESSIONAL_REFS")),
			).toBe(true);
		});
	});

	it("SD7: full promise trace passes", async () => {
		await withProject("sd7", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.promiseLedger = {
				version: 1,
				promises: [
					{
						id: "P1",
						kind: "mystery",
						promise: "门禁记录将被重新解释",
						introducedByMovementId: "m1",
						expectedPayoffMovementId: "m3",
						supportingRefs: [
							{ kind: "clue", ref: "C1" },
							{ kind: "claim", ref: "T1" },
						],
					},
				],
			};
			const bible = await store.developStoryBible({ projectId, foundation: base });
			expect(bible.warnings.some((warning) => warning.includes("PROMISE_"))).toBe(false);
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				promiseTrace: [
					{
						promiseId: "P1",
						setup: { movementId: "m1", eventId: 1 },
						escalation: { movementId: "m2", eventId: 3 },
						payoff: { movementId: "m3", eventId: 6 },
					},
				],
				causalLinks: [
					{ fromEventId: 1, toEventId: 2, relation: "causes" },
					{ fromEventId: 2, toEventId: 3, relation: "enables" },
					{ fromEventId: 3, toEventId: 4, relation: "reveals" },
					{ fromEventId: 4, toEventId: 5, relation: "escalates" },
					{ fromEventId: 5, toEventId: 6, relation: "pays-off" },
				],
				anchorSpine: [
					{
						id: "a1",
						movementId: "m1",
						eventId: 1,
						anchorKind: "opening-disturbance",
						purpose: "扰动",
						triggeringState: "接到理赔",
						protagonistAction: "核验",
						opposition: "审批链",
						irreversibleChange: "调查启动",
						irreversible: false,
						engineRefs: [{ kind: "professional", ref: "PA-1" }],
						collisionType: "cross-engine",
						downstreamConsequences: ["进入调查"],
						requiredSetup: [],
					},
					{
						id: "a6",
						movementId: "m3",
						eventId: 6,
						anchorKind: "climax-choice",
						purpose: "高潮选择",
						triggeringState: "真相在手",
						protagonistAction: "选择",
						opposition: "家族压力",
						irreversibleChange: "结论归档",
						irreversible: true,
						engineRefs: [{ kind: "mystery", ref: "T1" }],
						collisionType: "character-choice",
						downstreamConsequences: ["结局结算"],
						requiredSetup: ["3"],
					},
				],
			});
			expect(graph.status, JSON.stringify(graph)).toBe("completed");
			expect(
				[...graph.blockers, ...graph.warnings].some((item) =>
					(typeof item === "string" ? item : item.message).includes("PROMISE_"),
				),
			).toBe(false);
		});
	});

	it("SD8: engines exist but no cross links -> FOUNDATION_ENGINES_ISOLATED", async () => {
		await withProject("sd8", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.links = [
				{
					id: "L1",
					from: { domain: "mystery", ref: "T1" },
					relation: "reveals",
					to: { domain: "mystery", ref: "C1" },
					narrativeReason: "线索指向真相",
				},
			];
			const result = await store.developStoryBible({ projectId, foundation: base });
			expect(result.blockers.some((blocker) => blocker.code === "FOUNDATION_ENGINES_ISOLATED")).toBe(true);
		});
	});

	it("SD9: professional -> observation -> mystery -> marriage links pass", async () => {
		await withProject("sd9", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.links = [
				{
					id: "L1",
					from: { domain: "professional", ref: "PA-1" },
					relation: "exposes",
					to: { domain: "mystery", ref: "C1" },
					narrativeReason: "调档动作暴露门禁记录",
				},
				{
					id: "L2",
					from: { domain: "mystery", ref: "C1" },
					relation: "pressures",
					to: { domain: "marriage", ref: "E1" },
					narrativeReason: "线索指向共同财产",
				},
				{
					id: "L3",
					from: { domain: "marriage", ref: "E1" },
					relation: "forces-choice",
					to: { domain: "professional", ref: "PA-1" },
					narrativeReason: "经济控制逼她压案",
				},
				{
					id: "L4",
					from: { domain: "social", ref: "M1" },
					relation: "enables",
					to: { domain: "professional", ref: "PA-1" },
					narrativeReason: "考核机制制造压案动机",
				},
				{
					id: "L5",
					from: { domain: "chase", ref: "H1" },
					relation: "harms",
					to: { domain: "character", ref: "heroine" },
					narrativeReason: "伤害来自婚姻结构",
				},
			];
			const result = await store.developStoryBible({ projectId, foundation: base });
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.blockers.some((blocker) => blocker.code.startsWith("FOUNDATION_"))).toBe(false);
			expect(result.warnings.some((warning) => warning.includes("FOUNDATION_"))).toBe(false);
		});
	});

	it("SD10: critical truth without feasible acquisition -> CLUE_WITHOUT_LEGAL_ACQUISITION (P0)", async () => {
		await withProject("sd10", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.mystery = {
				case: {
					id: "case-sd10",
					centralQuestion: "谁伪造了时间",
					truthSummary: "时间被伪造",
					truthClaims: [
						{
							id: "T9",
							statement: "伪造者是内部人",
							category: "identity",
							dependsOnClaimIds: [],
							proofRequirement: "内部权限记录",
							proofPaths: [{ id: "p1", clueIds: ["C9"], prerequisiteClaimIds: [] }],
							importance: 5,
						},
					],
					finalAnswerClaimIds: ["T9"],
					socialCore: {
						socialQuestion: "谁放任",
						institutionalContext: "外包",
						powerAsymmetry: "信息差",
						beneficiaries: ["负责人"],
						costBearers: ["投保人"],
						stakesBeyondRelationship: ["声誉"],
					},
				},
				clues: [
					{
						id: "C9",
						observableFact: "内部系统权限被使用",
						sourceType: "digital",
						sourceDescription: "系统日志",
						firstAvailableChapter: 1,
						truthClaimIds: ["T9"],
						reliability: "high",
						interpretationOptions: [],
						actualImplication: "内部人操作",
						clueRole: "fair",
					},
				],
			};
			// 不提供 acquisition，也不挂到 professional observation -> 关键线索无合法获取路径
			const bible = await store.developStoryBible({ projectId, foundation: base });
			expect(bible.status, JSON.stringify(bible)).toBe("completed");
			const review = await store.reviewStoryDesign({ projectId, findings: [] });
			expect(review.diagnosis.verdict).toBe("major-revision");
			expect(
				review.diagnosis.findings.some(
					(finding) => finding.code === "CLUE_WITHOUT_LEGAL_ACQUISITION" && finding.priority === "P0",
				),
			).toBe(true);
		});
	});

	it("SD11: false model explains nothing -> warning", async () => {
		await withProject("sd11", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			const arch = architecture();
			arch.falseModel = {
				statement: "丈夫只是隐瞒了外遇",
				collapsesAtMovementId: "m2",
				replacedByClaimIds: ["T99"],
			};
			await store.developStoryBible({ projectId, foundation: base });
			await store.designStoryArchitecture({ projectId, architecture: arch });
			const review = await store.reviewStoryDesign({ projectId, findings: [] });
			expect(review.diagnosis.findings.some((finding) => finding.code === "FALSE_MODEL_EXPLAINS_NOTHING")).toBe(
				true,
			);
		});
	});

	it("SD12: proof-first valid mystery passes", async () => {
		await withProject("sd12", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.mysteryAcquisition = [
				{ clueId: "C1", source: "professional-observation", refs: ["OBS-1"], note: "门禁记录由调查动作取得" },
			];
			base.mysteryLadders = [
				{
					clueId: "C1",
					observableFact: "02:17 门禁凭证被使用",
					initialInterpretation: "死者凌晨回公司",
					contradiction: "死者已死亡",
					reinterpretation: "手机持有人不等于在场人",
					actualImplication: "凭证被他人使用",
				},
			];
			const bible = await store.developStoryBible({ projectId, foundation: base });
			expect(bible.status, JSON.stringify(bible)).toBe("completed");
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const review = await store.reviewStoryDesign({ projectId, findings: [] });
			expect(review.diagnosis.findings.some((finding) => finding.code === "CLUE_WITHOUT_LEGAL_ACQUISITION")).toBe(
				false,
			);
			expect(review.diagnosis.findings.some((finding) => finding.code === "FALSE_MODEL_EXPLAINS_NOTHING")).toBe(
				false,
			);
		});
	});

	it("SD13: heroine turning point without decision cause", async () => {
		await withProject("sd13", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.characterDecisionPatterns = [
				{
					id: "d1",
					characterId: "heroine",
					movementId: "m2",
					situation: "证据指向夫家",
					currentGoal: "查清真相",
					currentBelief: "丈夫无辜",
					hiddenFear: "家散人亡",
					perceivedOptions: ["上报", "压下"],
					preferredStrategy: "先核实",
					avoidedChoice: "离婚",
					decisionThreshold: "拿到铁证",
					likelyCost: "失去婚姻",
					relevantRefs: [],
				},
			];
			const result = await store.developStoryBible({ projectId, foundation: base });
			expect(result.warnings.some((warning) => warning.includes("TURNING_POINT_WITHOUT_DECISION_CAUSE"))).toBe(true);
		});
	});

	it("SD14: spouse mid-story goal only pursuit; independentGoal clears", async () => {
		await withProject("sd14", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const bad = foundation();
			bad.characterDecisionPatterns = [
				{
					id: "h1",
					characterId: "husband",
					movementId: "m2",
					situation: "她搬走",
					currentGoal: "追回女主",
					currentBelief: "她会回来",
					hiddenFear: "失去面子",
					perceivedOptions: ["施压", "示弱"],
					preferredStrategy: "控制行踪",
					avoidedChoice: "承认错误",
					decisionThreshold: "她彻底离开",
					likelyCost: "家族形象",
					relevantRefs: [],
				},
			];
			const blocked = await store.developStoryBible({ projectId, foundation: bad });
			expect(blocked.warnings.some((warning) => warning.includes("SPOUSE_PLOT_COLLAPSES_TO_PURSUIT"))).toBe(true);
			const good = foundation();
			good.characterDecisionPatterns = [
				{
					id: "h2",
					characterId: "husband",
					movementId: "m2",
					situation: "她搬走",
					currentGoal: "保住家族企业控制权",
					currentBelief: "企业高于婚姻",
					hiddenFear: "失去继承权",
					perceivedOptions: ["追回女主", "稳住董事会"],
					preferredStrategy: "先稳住董事会",
					avoidedChoice: "公开认错",
					decisionThreshold: "董事会发难",
					likelyCost: "婚姻破裂",
					relevantRefs: [{ kind: "professional", ref: "PA-1" }],
					independentGoal: "保住家族企业的控制权",
				},
			];
			const result = await store.developStoryBible({ projectId, foundation: good });
			expect(result.warnings.some((warning) => warning.includes("SPOUSE_PLOT_COLLAPSES_TO_PURSUIT"))).toBe(false);
		});
	});

	it("SD15: ending payoff without prerequisite -> ENDING_PAYOFF_UNEARNED", async () => {
		await withProject("sd15", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			const base = foundation();
			base.endingArchitecture = {
				mysteryResolution: "真相归档",
				heroineResolution: "搬出",
				marriageResolution: "离婚",
				professionalResolution: "被调离",
				costDistribution: "她承担职业代价",
				unresolvedResidue: ["复核制形同虚设"],
				finalImageOrState: "她在新部门整理档案",
				requiredPrerequisites: [{ payoffRef: "丈夫公开承担家族责任", prerequisite: "他必须先经历真实后果" }],
			};
			const result = await store.developStoryBible({ projectId, foundation: base });
			expect(result.blockers.some((blocker) => blocker.code === "ENDING_PAYOFF_UNEARNED")).toBe(true);
		});
	});

	it("SD16: climax evidence not prepared -> CLIMAX_NOT_PREPARED", async () => {
		await withProject("sd16", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				anchorSpine: [
					{
						id: "a6",
						movementId: "m3",
						eventId: 6,
						anchorKind: "climax-choice",
						purpose: "高潮",
						triggeringState: "真相",
						protagonistAction: "选择",
						opposition: "家族",
						irreversibleChange: "归档",
						irreversible: true,
						engineRefs: [],
						collisionType: "character-choice",
						downstreamConsequences: ["结算"],
						requiredSetup: [],
					},
				],
			});
			expect(graph.blockers.some((blocker) => blocker.code === "CLIMAX_NOT_PREPARED")).toBe(true);
		});
	});

	it("SD17: valid backward ending passes", async () => {
		await withProject("sd17", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			const ending: EndingArchitecture = {
				mysteryResolution: "真相归档",
				heroineResolution: "搬出",
				marriageResolution: "离婚",
				professionalResolution: "调离",
				costDistribution: "她承担代价",
				unresolvedResidue: [],
				finalImageOrState: "新部门",
				requiredPrerequisites: [
					{ payoffRef: "丈夫公开承担", prerequisite: "真实后果", satisfiedByMovementId: "m2" },
				],
				climaxChoice: {
					protagonistChoice: "公开归档",
					options: ["公开", "压下"],
					costOfEach: ["失去婚姻", "违背职业"],
					informationRequired: "铁证",
					irreversibleResult: "结论归档",
				},
			};
			const result = await store.designStoryArchitecture({
				projectId,
				architecture: architecture(),
				endingArchitecture: ending,
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.blockers.some((blocker) => blocker.code === "ENDING_PAYOFF_UNEARNED")).toBe(false);
		});
	});

	it("SD18: 2-3 architecture candidates comparable", async () => {
		await withProject("sd18", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			const movements = architecture().movements;
			const candidates = [
				{
					id: "c1",
					conceptRef: "concept",
					movements,
					anchorSpine: [],
					majorReframes: [],
					pressureShape: "持续上升",
					falseModelStrategy: "假象延续到 m3",
					relationshipArcStrategy: "破裂提前到 m2",
					professionalArcStrategy: "职业风险后置",
					climaxStrategy: "证据+关系汇合",
					endingStrategy: "不复合",
					advantages: ["张力大"],
					risks: ["转折生硬"],
				},
				{
					id: "c2",
					conceptRef: "concept",
					movements,
					anchorSpine: [],
					majorReframes: [],
					pressureShape: "波浪式",
					falseModelStrategy: "假象在 m1 末即破",
					relationshipArcStrategy: "破裂在 m3 结算",
					professionalArcStrategy: "职业风险全程在场",
					climaxStrategy: "制度对质",
					endingStrategy: "开放结局",
					advantages: ["公平性好"],
					risks: ["悬念弱"],
				},
			];
			const result = await store.designStoryArchitecture({
				projectId,
				architecture: architecture(),
				candidates: candidates as Parameters<typeof store.designStoryArchitecture>[0]["candidates"],
				comparison: {
					dimensions: [
						{
							dimension: "mysteryFairnessPotential",
							assessment: "strong",
							candidateIds: ["c2"],
							reason: "假象短则公平",
						},
					],
					recommendedCandidateIds: ["c2"],
					notes: [],
				},
				selectedCandidateId: "c2",
				selectionConfirmation: "USER_CONFIRMED",
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.blockers.some((blocker) => blocker.code === "ARCHITECTURE_CANDIDATES_TOO_SIMILAR")).toBe(false);
		});
	});

	it("SD19: candidates only differ by movement names -> too similar", async () => {
		await withProject("sd19", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			const rename = (id: string): StoryArchitecture["movements"] =>
				architecture().movements.map((movement) => ({ ...movement, id: `${movement.id}-${id}` }));
			const candidates = [
				{
					id: "c1",
					conceptRef: "concept",
					movements: rename("a"),
					anchorSpine: [],
					majorReframes: [],
					pressureShape: "上升",
					falseModelStrategy: "S",
					relationshipArcStrategy: "R",
					professionalArcStrategy: "P",
					climaxStrategy: "C",
					endingStrategy: "E",
					advantages: [],
					risks: [],
				},
				{
					id: "c2",
					conceptRef: "concept",
					movements: rename("b"),
					anchorSpine: [],
					majorReframes: [],
					pressureShape: "上升",
					falseModelStrategy: "S",
					relationshipArcStrategy: "R",
					professionalArcStrategy: "P",
					climaxStrategy: "C",
					endingStrategy: "E",
					advantages: [],
					risks: [],
				},
			];
			const result = await store.designStoryArchitecture({
				projectId,
				architecture: architecture(),
				candidates: candidates as Parameters<typeof store.designStoryArchitecture>[0]["candidates"],
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("ARCHITECTURE_CANDIDATES_TOO_SIMILAR"))).toBe(true);
		});
	});

	it("SD20: selected architecture maintains revision lineage", async () => {
		await withProject("sd20", async (store, projectId, cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const revised = architecture();
			revised.movements = revised.movements.map((movement) =>
				movement.id === "m2" ? { ...movement, dominantQuestion: "谁替换了时间戳（修订）" } : movement,
			);
			const r1 = await store.reviseStoryArchitecture({
				projectId,
				revisionPlan: {
					revisionId: "rev-1",
					goals: [
						{
							id: "g1",
							findingIds: ["DESIGN-1"],
							changeType: "movement",
							targetRefs: ["m2"],
							strategy: "强化中段转折",
							expectedEffect: "P1 收敛",
						},
					],
				},
				architecture: revised,
			});
			expect(r1.status, JSON.stringify(r1)).toBe("completed");
			const r2 = await store.reviseStoryArchitecture({
				projectId,
				revisionPlan: {
					revisionId: "rev-2",
					goals: [
						{
							id: "g2",
							findingIds: ["DESIGN-2"],
							changeType: "anchor",
							targetRefs: ["m3"],
							strategy: "补 setup",
							expectedEffect: "高潮有铺垫",
						},
					],
				},
				architecture: revised,
			});
			expect(r2.status, JSON.stringify(r2)).toBe("completed");
			const current = await readJsonIfExists(join(cwd, "novels", projectId, "outline", "story-architecture.json"));
			expect((current as { version?: number }).version).toBe(3);
			const v1 = await readJsonIfExists(join(cwd, "novels", projectId, "outline", "story-architecture-v1.json"));
			const v2 = await readJsonIfExists(join(cwd, "novels", projectId, "outline", "story-architecture-v2.json"));
			expect(v1).toBeDefined();
			expect(v2).toBeDefined();
			const lineage = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "authoring", "architecture-lineage.json"),
			);
			const revisions = (lineage as { revisions?: Array<{ revisionId: string; changeTypes: string[] }> }).revisions;
			expect(revisions?.length).toBe(2);
			expect(revisions?.[0]?.revisionId).toBe("rev-1");
			expect(revisions?.[0]?.changeTypes).toContain("movement");
		});
	});

	it("SD21: anchor without cause -> ANCHOR_WITHOUT_CAUSE", async () => {
		await withProject("sd21", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				anchorSpine: [
					{
						id: "a4",
						movementId: "m2",
						eventId: 4,
						anchorKind: "midpoint-reframe",
						purpose: "转折",
						triggeringState: "证据矛盾",
						protagonistAction: "重估",
						opposition: "家族",
						irreversibleChange: "搬出",
						irreversible: true,
						engineRefs: [],
						collisionType: "cross-engine",
						downstreamConsequences: ["离婚摊牌"],
						requiredSetup: [],
					},
				],
			});
			expect(graph.blockers.some((blocker) => blocker.code === "ANCHOR_WITHOUT_CAUSE")).toBe(true);
		});
	});

	it("SD22: bridge event removable without effect -> EVENT_FILLER_RISK", async () => {
		await withProject("sd22", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				narrativeQuestions: [],
			});
			expect(graph.status, JSON.stringify(graph)).toBe("completed");
			expect(graph.warnings.some((warning) => warning.includes("EVENT_FILLER_RISK"))).toBe(true);
			expect(graph.fillerRisks).toBeGreaterThan(0);
		});
	});

	it("SD23: event depends on coincidence", async () => {
		await withProject("sd23", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				causalLinks: [
					{ fromEventId: 1, toEventId: 2, relation: "causes" },
					{ fromEventId: 2, toEventId: 3, relation: "coincidence" },
				],
			});
			expect(graph.warnings.some((warning) => warning.includes("EVENT_DEPENDS_ON_COINCIDENCE"))).toBe(true);
		});
	});

	it("SD24: valid causal spine passes", async () => {
		await withProject("sd24", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				causalLinks: [
					{ fromEventId: 1, toEventId: 2, relation: "causes" },
					{ fromEventId: 2, toEventId: 3, relation: "enables" },
					{ fromEventId: 3, toEventId: 4, relation: "reveals" },
					{ fromEventId: 4, toEventId: 5, relation: "escalates" },
					{ fromEventId: 5, toEventId: 6, relation: "pays-off" },
				],
				anchorSpine: [
					{
						id: "a1",
						movementId: "m1",
						eventId: 1,
						anchorKind: "opening-disturbance",
						purpose: "扰动",
						triggeringState: "理赔",
						protagonistAction: "核验",
						opposition: "审批链",
						irreversibleChange: "启动",
						irreversible: false,
						engineRefs: [],
						collisionType: "mystery",
						downstreamConsequences: ["调查"],
						requiredSetup: [],
					},
					{
						id: "a4",
						movementId: "m2",
						eventId: 4,
						anchorKind: "midpoint-reframe",
						purpose: "转折",
						triggeringState: "矛盾",
						protagonistAction: "重估",
						opposition: "家族",
						irreversibleChange: "搬出",
						irreversible: true,
						engineRefs: [],
						collisionType: "cross-engine",
						downstreamConsequences: ["摊牌"],
						requiredSetup: ["2"],
					},
					{
						id: "a6",
						movementId: "m3",
						eventId: 6,
						anchorKind: "climax-choice",
						purpose: "高潮",
						triggeringState: "真相",
						protagonistAction: "选择",
						opposition: "家族",
						irreversibleChange: "归档",
						irreversible: true,
						engineRefs: [],
						collisionType: "character-choice",
						downstreamConsequences: ["结算"],
						requiredSetup: ["3"],
					},
				],
			});
			expect(graph.status, JSON.stringify(graph)).toBe("completed");
			for (const code of [
				"ANCHOR_WITHOUT_CAUSE",
				"ANCHOR_WITHOUT_DOWNSTREAM_EFFECT",
				"CLIMAX_NOT_PREPARED",
				"EVENT_CAUSALLY_WEAK",
				"EVENT_FILLER_RISK",
			]) {
				expect(
					[...graph.blockers.map((blocker) => blocker.code), ...graph.warnings].some((item) =>
						(typeof item === "string" ? item : item).includes(code),
					),
				).toBe(false);
			}
		});
	});

	it("SD25: pressure plateau", async () => {
		await withProject("sd25", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				pressureChanges: [
					{ movementId: "m1", dominantPressure: "mystery", change: "stable" },
					{ movementId: "m2", dominantPressure: "relationship", change: "stable" },
					{ movementId: "m3", dominantPressure: "professional", change: "stable" },
				],
			});
			expect(graph.warnings.some((warning) => warning.includes("PRESSURE_PLATEAU"))).toBe(true);
		});
	});

	it("SD26: all major questions close before climax", async () => {
		await withProject("sd26", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: eventGraph(),
				narrativeQuestions: [
					{
						id: "q1",
						question: "死亡时间为什么矛盾",
						kind: "mystery",
						openedAtMovementId: "m1",
						deepenedAtMovementIds: ["m2"],
						partialAnswerRefs: ["C1"],
						closedAtMovementId: "m2",
						finalAnswerRef: "T1",
					},
					{
						id: "q2",
						question: "她会不会离开",
						kind: "relationship",
						openedAtMovementId: "m1",
						deepenedAtMovementIds: ["m2"],
						partialAnswerRefs: ["E1"],
						closedAtMovementId: "m2",
						finalAnswerRef: "E1",
					},
				],
			});
			expect(graph.warnings.some((warning) => warning.includes("ALL_MAJOR_QUESTIONS_CLOSE_BEFORE_CLIMAX"))).toBe(
				true,
			);
		});
	});

	it("SD27: information without decision run", async () => {
		await withProject("sd27", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			// 6 个纯信息事件（无 irreversible / 无决策角色 / 无 agency 变化）
			const infoEvents = [1, 2, 3, 4, 5, 6].map((eventId) => ({
				eventId,
				chapter: Math.ceil(eventId / 2),
				chronology: "present" as const,
				pov: "heroine-first-person" as const,
				storyGoal: "继续核实",
				conflict: "材料不齐",
				action: "翻看材料",
				consequence: "记录疑点",
				mysteryDelta: { ...emptyMystery, interpretationChanges: ["C1"] },
				characterDeltas: [],
				resourceDeltas: [],
				riskDeltas: [],
				causes: eventId === 1 ? [] : [eventId - 1],
				irreversible: false,
				cannotRemoveBecause: "临时记录",
			}));
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events: infoEvents as UnifiedEvent[],
				narrativeQuestions: [],
			});
			expect(graph.warnings.some((warning) => warning.includes("INFORMATION_WITHOUT_DECISION_RUN"))).toBe(true);
		});
	});

	it("SD28: weak architecture -> review produces P1/P2/P3 findings", async () => {
		await withProject("sd28", async (store, projectId, _cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const review = await store.reviewStoryDesign({
				projectId,
				findings: [
					{
						priority: "P1",
						category: "causality-architecture",
						problem: "Midpoint reframe 没有改变任何目标",
						targetRefs: ["m2"],
						recommendedStrategy: "让转折改变目标/约束",
					},
					{
						priority: "P2",
						category: "character-relationship",
						problem: "丈夫从中段开始没有独立目标",
						targetRefs: ["husband"],
						recommendedStrategy: "给男方独立利益目标",
					},
					{
						priority: "P3",
						category: "suspense-pacing-commercial",
						problem: "中段连续 7 个事件只是信息增加",
						targetRefs: [],
						recommendedStrategy: "插入决策事件",
					},
				],
			});
			expect(review.diagnosis.verdict).toBe("needs-revision");
			const priorities = new Set(review.diagnosis.findings.map((finding) => finding.priority));
			expect(priorities.has("P1")).toBe(true);
			expect(priorities.has("P2")).toBe(true);
			expect(priorities.has("P3")).toBe(true);
		});
	});

	it("SD29: revise only targets movement / anchor", async () => {
		await withProject("sd29", async (store, projectId, cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const revised = architecture();
			const result = await store.reviseStoryArchitecture({
				projectId,
				revisionPlan: {
					revisionId: "rev-sd29",
					goals: [
						{
							id: "g1",
							findingIds: ["DESIGN-9"],
							changeType: "movement",
							targetRefs: ["m2"],
							strategy: "局部调整",
							expectedEffect: "中段有转折",
						},
					],
				},
				architecture: revised,
			});
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("不在新 architecture"))).toBe(false);
			const lineage = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "authoring", "architecture-lineage.json"),
			);
			const revisions = (
				lineage as { revisions?: Array<{ revisionId: string; changeTypes: string[]; targetRefs: string[] }> }
			).revisions;
			expect(revisions?.[0]?.targetRefs).toContain("m2");
		});
	});

	it("SD30: truth change -> FOUNDATION_REVISION_REQUIRED, no silent truth edit", async () => {
		await withProject("sd30", async (store, projectId, cwd) => {
			await initFull(store, projectId);
			await store.developStoryConcept({ projectId, concept: concept() });
			await store.developStoryBible({ projectId, foundation: foundation() });
			await store.designStoryArchitecture({ projectId, architecture: architecture() });
			const before = await readJsonIfExists(join(cwd, "novels", projectId, "outline", "story-architecture.json"));
			const result = await store.reviseStoryArchitecture({
				projectId,
				revisionPlan: {
					revisionId: "rev-truth",
					goals: [
						{
							id: "g1",
							findingIds: ["DESIGN-1"],
							changeType: "change-mystery-truth",
							targetRefs: ["T1"],
							strategy: "改真相",
							expectedEffect: "更公平",
						},
					],
				},
				architecture: architecture(),
			});
			expect(result.status).toBe("blocked");
			expect(result.blockers.some((blocker) => blocker.code === "FOUNDATION_REVISION_REQUIRED")).toBe(true);
			const after = await readJsonIfExists(join(cwd, "novels", projectId, "outline", "story-architecture.json"));
			expect(JSON.stringify(after)).toBe(JSON.stringify(before));
		});
	});

	it("SD31: explicit scene context -> no placeholder warnings", async () => {
		await withProject("sd31", async (store, projectId, cwd) => {
			await initProject(store, projectId);
			const plan = planProposal([1, 2]);
			plan.sceneDesign[0] = {
				...plan.sceneDesign[0],
				time: "晚上九点",
				emotionalStateBefore: "疲惫",
				emotionalStateAfter: "下定决心",
			};
			const result = await store.planChapter({ projectId, chapter: 1, plan });
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("SCENE_CONTRACT_UNRESOLVED_FIELD"))).toBe(false);
			const contracts = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "scene-contracts", "chapter-001.json"),
			);
			const first = (contracts as { contracts?: Array<{ time?: string; emotionalStateBefore?: string }> })
				.contracts?.[0];
			expect(first?.time).toBe("晚上九点");
			expect(first?.emotionalStateBefore).toBe("疲惫");
		});
	});

	it("SD32: unknown necessary field -> SCENE_CONTRACT_UNRESOLVED_FIELD", async () => {
		await withProject("sd32", async (store, projectId, cwd) => {
			await initProject(store, projectId);
			const result = await store.planChapter({ projectId, chapter: 1, plan: planProposal([1, 2]) });
			expect(result.warnings.some((warning) => warning.includes("SCENE_CONTRACT_UNRESOLVED_FIELD"))).toBe(true);
			const contracts = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "scene-contracts", "chapter-001.json"),
			);
			const first = (contracts as { contracts?: Array<{ time?: string }> }).contracts?.[0];
			expect(first?.time).toBe("TBD");
		});
	});

	it("SD33: manuscript summary scan -> targeted 7-11 prose only", async () => {
		await withProject("sd33", async (store, projectId, cwd) => {
			await initFull(store, projectId);
			// 11 章事件：8-11 章只有关系线（外部情节停滞，最后一段连续停滞）
			for (let chapter = 1; chapter <= 11; chapter += 1) {
				const external = chapter < 8;
				await store.saveUnifiedEventMap({
					projectId,
					chapter,
					events: [
						{
							eventId: chapter,
							chapter,
							chronology: "present",
							pov: "heroine-first-person",
							storyGoal: "推进",
							conflict: "阻力",
							action: "行动",
							consequence: "后果",
							mysteryDelta: external ? { ...emptyMystery, interpretationChanges: ["C1"] } : undefined,
							marriageDelta: { ...emptyMarriage, economicItemChanges: ["E1"] },
							characterDeltas: [],
							resourceDeltas: [],
							riskDeltas: [],
							causes: chapter === 1 ? [] : [chapter - 1],
							irreversible: false,
							cannotRemoveBecause: "x",
						} as UnifiedEvent,
					],
				});
			}
			// 7-11 章正文
			for (const chapter of [7, 8, 9, 10, 11]) {
				const name = `chapter-${String(chapter).padStart(3, "0")}`;
				await mkdir(join(cwd, "novels", projectId, "work", "drafts"), { recursive: true });
				await writeFile(
					join(cwd, "novels", projectId, "work", "drafts", `${name}-r01.md`),
					`正文内容${chapter}`,
					"utf8",
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
					revisionPriorities: ["修复中段停滞"],
					storyRevisionPlan: undefined,
				},
			});
			expect(review.inspectedChapters).toEqual([7, 8, 9, 10, 11]);
			expect(review.targetedProse.map((entry) => entry.chapter)).toEqual([7, 8, 9, 10, 11]);
			const document = await readJsonIfExists(
				join(cwd, "novels", projectId, "evaluations", "manuscript", "review.json"),
			);
			expect(
				(document as { proseInspection?: { mode: string; inspectedChapters: number[] } }).proseInspection?.mode,
			).toBe("targeted");
		});
	});

	it("SD34: budget/format issues -> AUTO_REPAIRABLE", () => {
		expect(classifyDraftFailure("mechanical", "event draft has 120 characters; expected 60-1500")).toBe(
			"AUTO_REPAIRABLE",
		);
		expect(classifyDraftFailure("mechanical", "event contains planning labels instead of narrative prose")).toBe(
			"AUTO_REPAIRABLE",
		);
		expect(
			classifyDraftFailure(
				"semantic",
				"chase-wife events require chaseEvidence (roleShown, conflictShown, relationshipDeltasShown)",
				{ prose: "旧约定出现裂缝。", relationshipDeltas: ["旧约定出现裂缝"] },
			),
		).toBe("AUTO_REPAIRABLE");
		expect(classifyDraftFailure("mechanical", "event draft has 40 characters; expected 60-1500")).toBe(
			"MODEL_REWRITE_REQUIRED",
		);
	});

	it("SD35: illegal professional action -> PLANNING_REVISION_REQUIRED", async () => {
		await withProject("sd35", async (store, projectId, _cwd) => {
			await initProject(store, projectId);
			// 直接写入引用不存在职业动作的事件（绕过 graph 工具，模拟 planning 错误）
			await store.saveUnifiedEventMap({
				projectId,
				chapter: 1,
				events: [
					{
						eventId: 1,
						chapter: 1,
						chronology: "present",
						pov: "heroine-first-person",
						storyGoal: "核实",
						conflict: "材料矛盾",
						action: "调取档案",
						consequence: "发现时间戳问题",
						mysteryDelta: { ...emptyMystery, discoveredClueIds: ["C1"] },
						professionalDelta: { ...emptyProfessional, actionIds: ["PA-999"] },
						characterDeltas: [],
						resourceDeltas: [],
						riskDeltas: [],
						causes: [],
						irreversible: false,
						cannotRemoveBecause: "x",
					} as UnifiedEvent,
				],
			});
			await store.planChapter({ projectId, chapter: 1, plan: planProposal([1]) });
			const prose =
				"我拨通调查科电话先报备，把保单材料摊在桌上核对时间戳。门禁记录与死亡证明叠在一起，矛盾自己跳出来。他要求我放弃调查这件理赔，我没有同意。".repeat(
					2,
				);
			const draft = await store.draftChapter({
				projectId,
				chapter: 1,
				eventDrafts: [{ eventId: 1, content: prose }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose, 0) }],
					},
				],
			});
			expect(draft.status).toBe("blocked");
			expect(draft.blockers.some((blocker) => blocker.code === "DRAFT_PLANNING_REVISION_REQUIRED")).toBe(true);
			expect(draft.repairability?.classification).toBe("PLANNING_REVISION_REQUIRED");
		});
	});

	it("SD36: weak event prose -> MODEL_REWRITE_REQUIRED", async () => {
		await withProject("sd36", async (store, projectId, _cwd) => {
			await initProject(store, projectId);
			await store.planChapter({ projectId, chapter: 1, plan: planProposal([1, 2]) });
			const prose1 =
				"他要求我放弃调查这件理赔，我没有同意。我把保单材料摊在桌上核对时间戳。旧约定出现裂缝，门禁记录与死亡证明叠在一起，矛盾自己跳出来。我拨通调查科电话先报备，把第一页复印件收进档案袋。回家的路上我数了数手里的钥匙，最后把材料锁进抽屉。".repeat(
					2,
				);
			const prose2 =
				"我把钥匙从钥匙圈上取下来放进抽屉，他问我要去哪里，我说只是分开住一段。夜风很凉，我走完整条街，到妹妹家时她在门口等我。我坐下把水喝完，妹妹问我想清楚没有，我说先这样。".repeat(
					2,
				);
			const draft = await store.draftChapter({
				projectId,
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
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose1, 0) }],
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
						consequenceShown: false,
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose2, 0) }],
					},
				],
			});
			expect(draft.status).toBe("blocked");
			expect(draft.blockers.some((blocker) => blocker.code === "DRAFT_SEMANTIC_FAIL")).toBe(true);
			expect(draft.repairability?.classification).toBe("MODEL_REWRITE_REQUIRED");
		});
	});

	it("second fixture: story design runs without insurance domain", async () => {
		await withProject("sf2", async (store, projectId, _cwd) => {
			await initPlain(store, projectId);
			// 非保险 premise：拆迁补偿名单里出现十年前去世的人
			const directions: StoryDirectionCandidate[] = [
				{
					id: "f1",
					logline: "名单伪造来自基层指标摊派",
					centralMystery: "已故者为何在补偿名单上",
					socialMechanism: "拆迁指标摊派到社区",
					protagonistGoal: "讨回公道",
					protagonistBlindSpot: "以为只是笔误",
					relationshipFaultLine: "丈夫是社区干部",
					spouseCoreBelief: "工作优先",
					professionalDependency: "她掌握台账底册",
					centralDilemma: "揭发会连累丈夫",
					majorCost: "家庭破裂",
					climaxIdea: "当众对质",
					endingShape: "她离开社区",
					distinctiveMechanism: "底册与公示表两套账",
					majorRisks: [],
				},
				{
					id: "f2",
					logline: "名单是套取补偿款的通道",
					centralMystery: "补偿款流向",
					socialMechanism: "补偿发放无人复核",
					protagonistGoal: "追回款项",
					protagonistBlindSpot: "信任老邻居",
					relationshipFaultLine: "邻居是经手人",
					spouseCoreBelief: "和气生财",
					professionalDependency: "她能核对外勤记录",
					centralDilemma: "追查会伤及恩人",
					majorCost: "被孤立",
					climaxIdea: "公开账目",
					endingShape: "制度补漏",
					distinctiveMechanism: "外勤签到与名单交叉",
					majorRisks: [],
				},
				{
					id: "f3",
					logline: "名单是历史遗留的顶替",
					centralMystery: "谁顶替了名额",
					socialMechanism: "早期登记混乱无人清理",
					protagonistGoal: "查明顶替",
					protagonistBlindSpot: "以为对方也是受害者",
					relationshipFaultLine: "嫂子是顶替者",
					spouseCoreBelief: "家丑不可外扬",
					professionalDependency: "她保管档案室钥匙",
					centralDilemma: "揭发嫂子等于揭发全家",
					majorCost: "被家族驱逐",
					climaxIdea: "让档案说话",
					endingShape: "真相但不和解",
					distinctiveMechanism: "档案笔迹与签名对比",
					majorRisks: [],
				},
			];
			const explore = await store.exploreStoryDirections({
				projectId,
				seed: "一位中学教师发现旧楼拆迁补偿名单里出现了十年前去世的人。",
				candidates: directions,
			});
			expect(explore.status, JSON.stringify(explore)).toBe("completed");
			const conceptResult = await store.developStoryConcept({
				projectId,
				concept: {
					...concept(),
					premise: "拆迁补偿名单里出现已故者",
					selectedDirectionId: "f1",
					selectionConfirmation: "USER_CONFIRMED",
				},
			});
			expect(conceptResult.status, JSON.stringify(conceptResult)).toBe("completed");
			const minimalFoundation: StoryFoundation = {
				premise: "拆迁补偿名单里出现已故者",
				corePromises: ["名单必须被重新解释"],
				endingDirection: "制度补漏而她离开",
				themes: ["基层治理"],
				characterProfiles: [],
				supportingCharacters: [],
				endingArchitecture: {
					mysteryResolution: "名单真相",
					heroineResolution: "离开社区",
					marriageResolution: "面对裂痕",
					professionalResolution: "移交档案",
					costDistribution: "她承担孤立",
					unresolvedResidue: ["摊派仍在"],
					finalImageOrState: "她在新学校教书",
					requiredPrerequisites: [
						{ payoffRef: "公开账目", prerequisite: "先掌握底册", satisfiedByMovementId: "m2" },
					],
				},
			};
			const bible = await store.developStoryBible({ projectId, foundation: minimalFoundation });
			expect(bible.status, JSON.stringify(bible)).toBe("completed");
			const simpleArchitecture: StoryArchitecture = {
				movements: [
					{
						id: "m1",
						chapters: [1],
						dominantQuestion: "名单为什么有死人",
						protagonistGoal: "核对底册",
						falseModel: "笔误",
						externalPressure: "发放时限",
						relationshipPressure: "丈夫劝退",
						professionalPressure: "无",
						irreversibleChange: "借出底册",
						exitCondition: "发现异常",
						eventIds: [1, 2],
					},
					{
						id: "m2",
						chapters: [2],
						dominantQuestion: "谁经手了名单",
						protagonistGoal: "追查经手人",
						falseModel: "邻居失误",
						externalPressure: "封档",
						relationshipPressure: "丈夫摊牌",
						professionalPressure: "无",
						irreversibleChange: "拿走复印件",
						exitCondition: "锁定目标",
						eventIds: [3, 4],
					},
					{
						id: "m3",
						chapters: [3],
						dominantQuestion: "制度为什么放任",
						protagonistGoal: "公开账目",
						externalPressure: "施压",
						relationshipPressure: "决裂",
						professionalPressure: "无",
						irreversibleChange: "移交档案",
						exitCondition: "补漏",
						eventIds: [5, 6],
					},
				],
				majorQuestions: [{ question: "名单为何有死人", answeredByClaimIds: ["T1"], movementId: "m1" }],
				majorReframes: [{ chapter: 2, reframe: "不是笔误是通道" }],
				falseModel: { statement: "只是登记笔误", collapsesAtMovementId: "m2", replacedByClaimIds: ["T1"] },
				pressureEscalation: [],
				relationshipTurningPoints: [{ chapter: 2, kind: "摊牌", marriageRefs: [], chaseRefs: [] }],
				professionalDilemmas: [],
				irreversibleDecisions: [{ chapter: 2, decision: "拿走复印件", cannotRemoveBecause: "原件被没收" }],
				climaxArchitecture: { chapter: 3, engines: ["mystery"], resolutionRefs: ["T1"] },
				endingSettlement: {
					chapter: 3,
					personalResolution: "离开社区",
					caseResolution: "名单纠正",
					unresolvedResidue: ["摊派仍在"],
				},
				socialResidue: ["基层摊派"],
				characterArc: [{ characterId: "heroine", arc: "从教师到揭发者", keyChapters: [1, 3] }],
			};
			const arch = await store.designStoryArchitecture({ projectId, architecture: simpleArchitecture });
			expect(arch.status, JSON.stringify(arch)).toBe("completed");
			const review = await store.reviewStoryDesign({ projectId, findings: [] });
			expect(review.diagnosis.verdict).not.toBe("major-revision");
			// Anchor Spine：非保险故事同样先设计核心事件再扩展
			const events: UnifiedEvent[] = [1, 2, 3, 4, 5, 6].map((eventId) => ({
				eventId,
				chapter: Math.ceil(eventId / 2),
				chronology: "present" as const,
				pov: "heroine-first-person" as const,
				storyGoal: "推进",
				conflict: "阻力",
				action: "行动",
				consequence: "后果",
				characterDeltas: [
					{ characterId: "heroine", dimension: "knowledge", from: `b${eventId}`, to: `a${eventId}` },
				],
				resourceDeltas: [],
				riskDeltas: [],
				causes: eventId === 1 ? [] : [eventId - 1],
				irreversible: eventId === 2 || eventId === 5,
				cannotRemoveBecause: "x",
			})) as UnifiedEvent[];
			const graph = await store.buildNarrativeEventGraph({
				projectId,
				events,
				anchorSpine: [
					{
						id: "a1",
						movementId: "m1",
						eventId: 1,
						anchorKind: "opening-disturbance",
						purpose: "扰动",
						triggeringState: "名单",
						protagonistAction: "核对",
						opposition: "发放时限",
						irreversibleChange: "借出底册",
						irreversible: false,
						engineRefs: [],
						collisionType: "mystery",
						downstreamConsequences: ["发现异常"],
						requiredSetup: [],
					},
					{
						id: "a4",
						movementId: "m2",
						eventId: 4,
						anchorKind: "midpoint-reframe",
						purpose: "转折",
						triggeringState: "矛盾",
						protagonistAction: "重估",
						opposition: "封档",
						irreversibleChange: "拿走复印件",
						irreversible: true,
						engineRefs: [],
						collisionType: "cross-engine",
						downstreamConsequences: ["锁定目标"],
						requiredSetup: ["2"],
					},
					{
						id: "a6",
						movementId: "m3",
						eventId: 6,
						anchorKind: "climax-choice",
						purpose: "高潮",
						triggeringState: "账目",
						protagonistAction: "公开",
						opposition: "家族",
						irreversibleChange: "移交档案",
						irreversible: true,
						engineRefs: [],
						collisionType: "character-choice",
						downstreamConsequences: ["补漏"],
						requiredSetup: ["3"],
					},
				],
			});
			expect(graph.status, JSON.stringify(graph)).toBe("completed");
		});
	});
});
