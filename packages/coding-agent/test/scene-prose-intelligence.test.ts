import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import type {
	ChapterPlanProposal,
	FemaleSocialSuspenseDesign,
	SceneDesign,
	StoryArchitecture,
	StoryConcept,
	StoryFoundation,
	UnifiedChaseWifeDelta,
	UnifiedEvent,
	VoiceProfile,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

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

async function withProject<T>(
	name: string,
	setup: (store: NovelProjectStore, projectId: string, cwd: string) => Promise<T>,
): Promise<T> {
	const cwd = await mkdtemp(join(tmpdir(), `pi-novel-sp-${name}-`));
	try {
		return await setup(new NovelProjectStore(cwd), name, cwd);
	} finally {
		await rm(cwd, { recursive: true, force: true });
	}
}

// 组装一个"干净"的 scene design：high-value 场景（事件 2 irreversible）具备 goal/opposition/turn/state change/exit。
function cleanSceneDesigns(overrides: Array<Partial<SceneDesign> | undefined> = []): SceneDesign[] {
	const eventsByChapter = (chapter: number): number[] =>
		eventGraph()
			.filter((event) => event.chapter === chapter)
			.map((event) => event.eventId);
	return [
		{
			sceneId: "s1",
			chapter: 1,
			eventIds: eventsByChapter(1),
			scenePurpose: { kind: "confront", description: "逼丈夫明确回答他什么时候知道保单被改过" },
			povCharacterId: "heroine",
			location: "家中客厅",
			time: "晚上九点",
			entryState: "她刚核完门禁记录",
			focalCharacterGoal: "逼丈夫明确回答他什么时候知道保单被改过",
			opposingForce: "丈夫用工作电话打断提问",
			stakes: "婚姻与职业",
			tactic: "direct-question",
			beatPlan: [
				{
					beatId: "b1",
					actor: "heroine",
					intent: "确认知情时间",
					action: "直接提问",
					response: "丈夫转移话题",
					tacticChange: false,
				},
				{
					beatId: "b2",
					actor: "heroine",
					intent: "堵住退路",
					action: "拿出复印件",
					response: "丈夫沉默",
					tacticChange: true,
					speechIntent: "逼",
				},
			],
			informationPlan: [],
			emotionalMovement: "从克制到清醒",
			turn: "她本想确认 A，却发现丈夫已经知道她查到了什么",
			decisionOrDiscovery: "她决定保留复印件",
			stateChange: "她拿到知情时间并决定不再隐瞒调查",
			exitPressure: "丈夫威胁要找她的领导",
			cannotRemoveBecause: "复印件已经亮出来",
			mode: "full-scene",
			tensionSources: ["relationship discovery"],
			professionalDetailBeats: [],
			...(overrides[0] ?? {}),
		},
	];
}

function scenePlan(sceneDesigns: SceneDesign[]): ChapterPlanProposal {
	const plan = planProposal(
		eventGraph()
			.filter((event) => event.chapter === 1)
			.map((event) => event.eventId),
	);
	return { ...plan, sceneDesigns };
}

// 完整 setup：project → plan（scene designs）→ draft（事件 1/2 正文）。
async function sceneProjectSetup(
	store: NovelProjectStore,
	projectId: string,
	prose1: string,
	prose2: string,
	sceneDesigns?: SceneDesign[],
	extra?: { sceneSemanticReports?: unknown[]; voiceProfile?: VoiceProfile; planChapter?: boolean },
): Promise<void> {
	await initProject(store, projectId);
	const plan = sceneDesigns === undefined ? scenePlan(cleanSceneDesigns()) : scenePlan(sceneDesigns);
	if (extra?.voiceProfile !== undefined) {
		const base = foundation();
		base.voiceProfile = extra.voiceProfile;
		await store.developStoryBible({ projectId, foundation: base });
	}
	if (extra?.planChapter !== false) {
		const planResult = await store.planChapter({ projectId, chapter: 1, plan });
		expect(planResult.status, JSON.stringify(planResult)).toBe("completed");
	}
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
				consequenceShown: true,
				deltaEvidence: [{ dimension: "information", evidence: anchor(prose2, 0) }],
			},
		],
		...(extra?.sceneSemanticReports === undefined
			? {}
			: { sceneSemanticReports: extra.sceneSemanticReports as never }),
	});
	expect(draft.status, JSON.stringify(draft)).toBe("completed");
}

function cleanProse1(extra: string): string {
	return `他要求我放弃调查这件理赔，我没有同意。我把保单材料摊在桌上核对时间戳。${extra}旧约定出现裂缝，门禁记录与死亡证明叠在一起，矛盾自己跳出来。我拨通调查科电话先报备，把第一页复印件收进档案袋。`.repeat(
		2,
	);
}

function cleanProse2(extra: string): string {
	return `我把钥匙从钥匙圈上取下来放进抽屉，他问我要去哪里，我说只是分开住一段。${extra}夜风很凉，我走完整条街，到妹妹家时她在门口等我。`.repeat(
		2,
	);
}

describe("scene and prose intelligence", () => {
	// ==== Dialogue ====
	it("SP1: shared-knowledge exposition -> DIALOGUE_SHARED_KNOWLEDGE_EXPOSITION", async () => {
		await withProject("sp1", async (store, projectId) => {
			await sceneProjectSetup(
				store,
				projectId,
				cleanProse1("“我们结婚九年了，你一直是律师，我一直做反欺诈。”我说。"),
				cleanProse2(""),
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("DIALOGUE_SHARED_KNOWLEDGE_EXPOSITION")),
			).toBe(true);
		});
	});

	it("SP2: consecutive Q/A -> DIALOGUE_TOO_TRANSACTIONAL", async () => {
		await withProject("sp2", async (store, projectId) => {
			const dialogue =
				"“门禁记录是几点？”他问。\n“两点十七分。”我说。\n“死亡证明呢？”他追问。\n“当天上午。”我说。\n“保险员什么时候来的？”我问。\n“下午三点。”他说。\n“你核对过原件吗？”\n“核对过。”\n“指纹呢？”\n“还在比对。”\n“结论什么时候出？”\n“周五。”";
			await sceneProjectSetup(store, projectId, cleanProse1(dialogue), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("DIALOGUE_TOO_TRANSACTIONAL"))).toBe(
				true,
			);
		});
	});

	it("SP3: relationship dialogue too explicit", async () => {
		await withProject("sp3", async (store, projectId) => {
			await sceneProjectSetup(
				store,
				projectId,
				cleanProse1("“我不信任你。你不尊重我的职业。”我说。"),
				cleanProse2(""),
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("RELATIONSHIP_DIALOGUE_TOO_EXPLICIT")),
			).toBe(true);
		});
	});

	it("SP4: subtext with behavior evidence passes; without evidence -> SUBTEXT_WITHOUT_BEHAVIOR", async () => {
		await withProject("sp4", async (store, projectId) => {
			const scenes = cleanSceneDesigns([
				{ subtext: { surfaceMeaning: "问几点回来", underlyingIntent: "确认他是否又去了公司" } },
			]);
			const prose1 = cleanProse1("“今天几点回来？”他问。“说不准。”我答，把手机屏幕扣在桌上。");
			const prose2 = cleanProse2("");
			// 无语义报告 -> SUBTEXT_WITHOUT_BEHAVIOR
			await sceneProjectSetup(store, projectId, prose1, prose2, scenes);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("SUBTEXT_WITHOUT_BEHAVIOR"))).toBe(
				true,
			);
			// 带 evidence 的语义报告 -> pass
			await store.draftChapter({
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
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose2, 0) }],
					},
				],
				sceneSemanticReports: [
					{
						sceneId: "s1",
						goalRealized: true,
						oppositionRealized: true,
						turnRealized: true,
						stateChangeRealized: true,
						exitPressureRealized: true,
						dialogueFindings: [],
						emotionalFindings: [],
						informationFindings: [],
						professionalFindings: [],
						relationshipFindings: [],
						evidence: [{ label: "subtext behavior", anchor: anchor(prose1, 0) }],
					},
				],
			});
			const diagnosis2 = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis2.findings.some((finding) => finding.sourceIssues.includes("SUBTEXT_WITHOUT_BEHAVIOR"))).toBe(
				false,
			);
		});
	});

	it("SP5: interchangeable character dialogue -> CHARACTER_VOICES_CONVERGE (model finding)", async () => {
		await withProject("sp5", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({
				projectId,
				chapter: 1,
				modelFindings: [
					{
						code: "CHARACTER_VOICES_CONVERGE",
						priority: "P3",
						message: "丈夫、上司、妹妹的对白句长与回避方式高度同质",
					},
				],
			});
			const finding = diagnosis.findings.find((item) => item.sourceIssues.includes("CHARACTER_VOICES_CONVERGE"));
			expect(finding).toBeDefined();
			expect(finding?.priority).toBe("P3");
		});
	});

	// ==== Scene Structure ====
	it("SP6: anchor scene without opposition -> SCENE_WITHOUT_MEANINGFUL_OPPOSITION", async () => {
		await withProject("sp6", async (store, projectId) => {
			await initProject(store, projectId);
			const scenes = cleanSceneDesigns([{ opposingForce: "对方不愿意说" }]);
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.warnings.some((warning) => warning.includes("SCENE_WITHOUT_MEANINGFUL_OPPOSITION"))).toBe(true);
		});
	});

	it("SP7: anchor scene without turn -> SCENE_WITHOUT_TURN", async () => {
		await withProject("sp7", async (store, projectId) => {
			await initProject(store, projectId);
			const scenes = cleanSceneDesigns([{ turn: "无" }]);
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.warnings.some((warning) => warning.includes("SCENE_WITHOUT_TURN"))).toBe(true);
		});
	});

	it("SP8: scene without state change -> warning/error by importance", async () => {
		await withProject("sp8", async (store, projectId) => {
			await initProject(store, projectId);
			// high-value（事件 2 irreversible）场景缺 state change -> error blocker
			const high = cleanSceneDesigns([{ stateChange: "无" }]);
			const blocked = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(high) });
			expect(blocked.blockers.some((blocker) => blocker.code === "SCENE_WITHOUT_STATE_CHANGE")).toBe(true);
			// 普通桥接场景缺 state change -> warning
			const bridge: SceneDesign[] = [
				{
					sceneId: "b1",
					chapter: 1,
					eventIds: [1],
					scenePurpose: { kind: "verify", description: "核对一份材料" },
					povCharacterId: "heroine",
					location: "办公室",
					time: "下午",
					entryState: "材料在桌上",
					focalCharacterGoal: "核对材料编号",
					opposingForce: "复印机排队",
					stakes: "低",
					tactic: "observe",
					beatPlan: [{ beatId: "x1", actor: "heroine", intent: "核对", action: "翻看" }],
					informationPlan: [],
					emotionalMovement: "平稳",
					turn: "发现编号对不上",
					decisionOrDiscovery: "记录差异",
					stateChange: "无",
					exitPressure: "把差异记进笔记本",
					cannotRemoveBecause: "差异已记录",
					mode: "full-scene",
					tensionSources: [],
					professionalDetailBeats: [],
				},
			];
			const warned = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(bridge), force: true });
			expect(warned.warnings.some((warning) => warning.includes("SCENE_WITHOUT_STATE_CHANGE"))).toBe(true);
		});
	});

	it("SP9: major rupture summarized -> SCENE_UNDERDRAMATIZED", async () => {
		await withProject("sp9", async (store, projectId) => {
			await initProject(store, projectId);
			const scenes = cleanSceneDesigns([{ mode: "summary-transition" }]);
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.warnings.some((warning) => warning.includes("SCENE_UNDERDRAMATIZED"))).toBe(true);
		});
	});

	it("SP10: low-value bridge overexpanded -> SCENE_OVEREXPANDED", async () => {
		await withProject("sp10", async (store, projectId) => {
			await initProject(store, projectId);
			const beats = [1, 2, 3, 4, 5, 6].map((index) => ({
				beatId: `x${index}`,
				actor: "heroine",
				intent: "翻看",
				action: "翻看材料",
			}));
			const scenes = cleanSceneDesigns([
				{
					eventIds: [1],
					scenePurpose: { kind: "verify", description: "查一次资料" },
					opposingForce: "无",
					turn: "无",
					beatPlan: beats as never,
					stateChange: "记录了一条信息",
					focalCharacterGoal: "查资料",
					decisionOrDiscovery: "记下时间",
				},
			]);
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.warnings.some((warning) => warning.includes("SCENE_OVEREXPANDED"))).toBe(true);
		});
	});

	// ==== Emotion ====
	it("SP11: emotion labels without effect -> EMOTION_LABEL_WITHOUT_EFFECT", async () => {
		await withProject("sp11", async (store, projectId) => {
			await sceneProjectSetup(
				store,
				projectId,
				cleanProse1("她很愤怒。她感到悲伤。她很失望。她震惊。她害怕。"),
				cleanProse2(""),
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("EMOTION_LABEL_WITHOUT_EFFECT")),
			).toBe(true);
		});
	});

	it("SP12: strong emotion without decision effect -> EMOTION_WITHOUT_DECISION_EFFECT", async () => {
		await withProject("sp12", async (store, projectId) => {
			await initProject(store, projectId);
			const scenes = cleanSceneDesigns([
				{
					decisionOrDiscovery: "无",
					beatPlan: [
						{ beatId: "b1", actor: "heroine", intent: "确认", action: "提问", emotionalShift: "恐惧加剧" },
					],
				},
			]);
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.warnings.some((warning) => warning.includes("EMOTION_WITHOUT_DECISION_EFFECT"))).toBe(true);
		});
	});

	it("SP13: action over-explained by interiority", async () => {
		await withProject("sp13", async (store, projectId) => {
			await sceneProjectSetup(
				store,
				projectId,
				cleanProse1(
					"她关掉手机。她这么做，是因为她终于意识到丈夫在隐瞒。她放下杯子。她之所以放下，是因为她忽然明白自己不能退。她起身。她终于明白，这份材料必须交出去。",
				),
				cleanProse2(""),
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("ACTION_OVEREXPLAINED_BY_INTERIORITY")),
			).toBe(true);
		});
	});

	// ==== Information ====
	it("SP14: professional exposition dump", async () => {
		await withProject("sp14", async (store, projectId) => {
			const dump =
				"赔付率的计算方式是这样的：核赔部门先看承保时点的告知义务履行情况，再比对该险种的免责期与等待期约定，理赔档案里留存的是审批链的完整记录与再保险的分摊比例，证据链的完整性由反欺诈调查科复核，权限边界以门禁记录为准，结算时还要复查承保时的免责期与等待期是否重新计算过，理赔时效的考核口径以审批链的签批时间为准，反欺诈调查科的介入节点在核赔结案之前，这些都是理赔档案里写得清清楚楚的流程。";
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(dump));
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("PROFESSIONAL_EXPOSITION_DUMP")),
			).toBe(true);
		});
	});

	it("SP15: social commentary dump", async () => {
		await withProject("sp15", async (store, projectId) => {
			const commentary =
				"说白了，这个制度就是让基层把风险往上推。这个制度就是一套让核赔部门永远可以免责的流程，规则就是这样写的，系统就是这样运转的，说到底受损失的都是最没有话语权的人。";
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(commentary));
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("SOCIAL_COMMENTARY_DUMP"))).toBe(
				true,
			);
		});
	});

	it("SP16: clue delivered too explicitly", async () => {
		await withProject("sp16", async (store, projectId) => {
			await sceneProjectSetup(
				store,
				projectId,
				cleanProse1("门禁记录摊在桌上。这就是关键证据。关键证据是时间戳被改过。这就是真相。"),
				cleanProse2(""),
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("CLUE_DELIVERY_TOO_EXPLICIT"))).toBe(
				true,
			);
		});
	});

	// ==== Professional ====
	it("SP17: decorative professional detail -> PROFESSIONAL_DETAIL_DECORATIVE (model finding)", async () => {
		await withProject("sp17", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({
				projectId,
				chapter: 1,
				modelFindings: [
					{
						code: "PROFESSIONAL_DETAIL_DECORATIVE",
						priority: "P3",
						message: "术语删除后任何行动、信息、冲突都不变化",
					},
				],
			});
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("PROFESSIONAL_DETAIL_DECORATIVE")),
			).toBe(true);
		});
	});

	it("SP18: professional procedure creates access constraint -> pass", async () => {
		await withProject("sp18", async (store, projectId) => {
			await initProject(store, projectId);
			const scenes = cleanSceneDesigns([
				{
					opposingForce: "调档需要科长双签，科长出差",
					professionalDetailBeats: [
						{
							detail: "调档申请需科长与风控双签",
							function: "constraint",
							sourceRef: "PA-1",
							whatItChanges: "取证被推迟一天",
						},
					],
				},
			]);
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("SCENE_WITHOUT_MEANINGFUL_OPPOSITION"))).toBe(false);
		});
	});

	it("SP19: professional expertise absent from POV -> PROFESSIONAL_EXPERTISE_NOT_IN_POV (model finding)", async () => {
		await withProject("sp19", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({
				projectId,
				chapter: 1,
				modelFindings: [
					{
						code: "PROFESSIONAL_EXPERTISE_NOT_IN_POV",
						priority: "P2",
						message: "职业调查员的 POV 观察与普通人完全相同",
					},
				],
			});
			expect(
				diagnosis.findings.some(
					(finding) =>
						finding.sourceIssues.includes("PROFESSIONAL_EXPERTISE_NOT_IN_POV") && finding.priority === "P2",
				),
			).toBe(true);
		});
	});

	// ==== Chase Wife 场景化 ====
	async function chaseChapterSetup(
		store: NovelProjectStore,
		projectId: string,
		role: UnifiedChaseWifeDelta["role"],
		prose3: string,
		prose4: string,
	): Promise<void> {
		await initProject(store, projectId);
		// 覆盖第 2 章事件：事件 3（信息）与事件 4（指定 chase 角色）
		await store.saveUnifiedEventMap({
			projectId,
			chapter: 2,
			events: [
				{
					eventId: 3,
					chapter: 2,
					chronology: "present",
					pov: "heroine-first-person",
					storyGoal: "推进",
					conflict: "阻力",
					action: "行动",
					consequence: "后果",
					mysteryDelta: { ...emptyMystery, proofProgressClaimIds: ["T1"] },
					characterDeltas: [],
					resourceDeltas: [],
					riskDeltas: [],
					causes: [],
					irreversible: false,
					cannotRemoveBecause: "x",
				} as UnifiedEvent,
				{
					eventId: 4,
					chapter: 2,
					chronology: "present",
					pov: "heroine-first-person",
					storyGoal: "回应",
					conflict: "纠缠",
					action: "应对",
					consequence: "后果",
					professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
					chaseWifeDelta: { ...chaseDelta(role, 5), harmRefs: [], repairRefs: [] },
					characterDeltas: [],
					resourceDeltas: [],
					riskDeltas: [],
					causes: [3],
					irreversible: false,
					cannotRemoveBecause: "x",
				} as UnifiedEvent,
			],
		});
		const plan = planProposal([3, 4]);
		const planResult = await store.planChapter({ projectId, chapter: 2, plan });
		expect(planResult.status, JSON.stringify(planResult)).toBe("completed");
		const draft = await store.draftChapter({
			projectId,
			chapter: 2,
			eventDrafts: [
				{ eventId: 3, content: prose3.repeat(2) },
				{ eventId: 4, content: prose4.repeat(2) },
			],
			semanticReports: [
				{
					eventId: 3,
					actionShown: true,
					consequenceShown: true,
					deltaEvidence: [{ dimension: "information", evidence: anchor(prose3.repeat(2), 0) }],
				},
				{
					eventId: 4,
					actionShown: true,
					consequenceShown: true,
					deltaEvidence: [{ dimension: "information", evidence: anchor(prose4.repeat(2), 0) }],
					chaseEvidence: {
						roleShown: true,
						conflictShown: true,
						relationshipDeltasShown: ["旧约定出现裂缝"],
						agencyActionShown: true,
						wrongPursuitShown: true,
						repairActionShown: true,
					},
				},
			],
		});
		expect(draft.status, JSON.stringify(draft)).toBe("completed");
	}

	it("SP20: wrong pursuit only verbal -> PURSUIT_WITHOUT_SPECIFIC_ACTION", async () => {
		await withProject("sp20", async (store, projectId) => {
			await chaseChapterSetup(
				store,
				projectId,
				"pursuit-control",
				"我继续核对材料，把时间戳抄进笔记本，又把门禁记录和死亡证明并排放在桌上。",
				"他道歉，他保证以后不再翻我的手机。他说对不起，是我不好，我会改。旧约定出现裂缝。我没理他。",
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 2 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("PURSUIT_WITHOUT_SPECIFIC_ACTION")),
			).toBe(true);
		});
	});

	it("SP21: repair only verbal -> REPAIR_ONLY_VERBAL", async () => {
		await withProject("sp21", async (store, projectId) => {
			await chaseChapterSetup(
				store,
				projectId,
				"repair-attempt",
				"我继续核对材料，把时间戳抄进笔记本，又把门禁记录和死亡证明并排放在桌上。",
				"他说对不起，都是我不好，我会改，以后一定好好过日子。旧约定出现裂缝。我听完没有说话。",
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 2 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("REPAIR_ONLY_VERBAL"))).toBe(true);
		});
	});

	it("SP22: recognition only interior -> RECOGNITION_ONLY_INTERIOR", async () => {
		await withProject("sp22", async (store, projectId) => {
			await chaseChapterSetup(
				store,
				projectId,
				"recognition",
				"我继续核对材料，把时间戳抄进笔记本，又把门禁记录和死亡证明并排放在桌上。",
				"他终于明白，自己失去的不只是一段婚姻。他意识到自己错了。旧约定出现裂缝。他把烟掐灭。",
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 2 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("RECOGNITION_ONLY_INTERIOR"))).toBe(
				true,
			);
		});
	});

	it("SP23: real repair with action + cost + boundary -> pass", async () => {
		await withProject("sp23", async (store, projectId) => {
			await chaseChapterSetup(
				store,
				projectId,
				"credible-repair",
				"我继续核对材料，把时间戳抄进笔记本，又把门禁记录和死亡证明并排放在桌上。",
				"他把共同账户的密码改了，把房子过户的手续递到法院，按月把孩子的抚养费转过去。旧约定出现裂缝。他只在每周三下午发一条短信问孩子的情况。",
			);
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 2 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("REPAIR_ONLY_VERBAL"))).toBe(false);
		});
	});

	// ==== Voice ====
	it("SP24: chapter drifts from voice profile -> VOICE_DRIFT", async () => {
		await withProject("sp24", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1("网络金句。爽文腔。"), cleanProse2(""), undefined, {
				voiceProfile: {
					distance: "贴近",
					sentenceRhythm: "短句为主",
					observationBias: "职业观察",
					emotionalExplicitness: "low",
					professionalDensity: "high",
					metaphorDensity: "low",
					humorLevel: "dry",
					preferredTensionMode: "procedural risk",
					avoidPatterns: ["网络金句", "爽文腔"],
					characterVoiceNotes: [],
				},
			});
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("VOICE_DRIFT"))).toBe(true);
		});
	});

	it("SP25: minimalist fragment overuse", async () => {
		await withProject("sp25", async (store, projectId) => {
			const fragments =
				"她关上门。\n他站着。\n她没有说话。\n他也没有。\n风吹进来。\n灯灭了。\n她坐下。\n他又站了一会儿。";
			await sceneProjectSetup(store, projectId, cleanProse1(fragments), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("MINIMALIST_FRAGMENT_OVERUSE")),
			).toBe(true);
		});
	});

	it("SP26: decorative metaphors without function", async () => {
		await withProject("sp26", async (store, projectId) => {
			const metaphors =
				"她的声音像水，目光像刀，动作像风，脚步像钟摆，沉默像墙，呼吸像潮汐，影子像旧照片，手指像冰，心跳像鼓点，灯光像雾。";
			await sceneProjectSetup(store, projectId, cleanProse1(metaphors), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("PROSE_DECORATIVE_WITHOUT_FUNCTION")),
			).toBe(true);
		});
	});

	// ==== POV ====
	it("SP27: first-person knowledge leak -> POV_KNOWLEDGE_LEAK", async () => {
		await withProject("sp27", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1("她不知道的是，丈夫已经签了字。"), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(diagnosis.findings.some((finding) => finding.sourceIssues.includes("POV_KNOWLEDGE_LEAK"))).toBe(true);
		});
	});

	it("SP28: heroine wrong interpretation does not pollute truth; P4 never blocks", async () => {
		await withProject("sp28", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(""));
			const diagnosis = await store.diagnoseChapter({
				projectId,
				chapter: 1,
				modelFindings: [
					{ code: "DIALOGUE_VOICE_INTERCHANGEABLE", priority: "P4", message: "换名字后对白完全成立" },
				],
			});
			// P4 文风问题永远不升级为 P0
			const voiceFinding = diagnosis.findings.find((finding) =>
				finding.sourceIssues.includes("DIALOGUE_VOICE_INTERCHANGEABLE"),
			);
			expect(voiceFinding?.priority).toBe("P4");
			expect(
				diagnosis.findings
					.filter((finding) => finding.priority === "P0")
					.every((finding) => !finding.sourceIssues.includes("DIALOGUE_VOICE_INTERCHANGEABLE")),
			).toBe(true);
		});
	});

	// ==== Scene Sequence ====
	it("SP29: three parallel info scenes -> SCENE_SEQUENCE_CAUSALLY_WEAK", async () => {
		await withProject("sp29", async (store, projectId) => {
			await initProject(store, projectId);
			const base = cleanSceneDesigns()[0];
			const scenes: SceneDesign[] = [1, 2, 3].map((index) => ({
				...base,
				sceneId: `p${index}`,
				decisionOrDiscovery: "无",
				stateChange: "记录了一条信息",
				exitPressure: "继续查下一份",
				turn: "发现一条记录",
			}));
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.warnings.some((warning) => warning.includes("SCENE_SEQUENCE_CAUSALLY_WEAK"))).toBe(true);
		});
	});

	it("SP30: scene exit drives next objective -> pass", async () => {
		await withProject("sp30", async (store, projectId) => {
			await initProject(store, projectId);
			const base = cleanSceneDesigns()[0];
			const scenes: SceneDesign[] = [1, 2].map((index) => ({
				...base,
				sceneId: `q${index}`,
				decisionOrDiscovery: "她决定去找护士核对录入时间",
				stateChange: "拿到知情时间",
				exitPressure: "护士的名字出现在值班表上",
			}));
			const result = await store.planChapter({ projectId, chapter: 1, plan: scenePlan(scenes) });
			expect(result.status, JSON.stringify(result)).toBe("completed");
			expect(result.warnings.some((warning) => warning.includes("SCENE_SEQUENCE_CAUSALLY_WEAK"))).toBe(false);
		});
	});

	// ==== Revision ====
	it("SP31: dialogue issue -> scene-local revision, not whole chapter", async () => {
		await withProject("sp31", async (store, projectId, cwd) => {
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(""));
			const revisedProse1 = cleanProse1("“你什么时候知道的？”我问。他把烟掐灭。");
			const result = await store.reviseChapter({
				projectId,
				chapter: 1,
				revisionPlan: {
					chapter: 1,
					goals: [
						{
							id: "g1",
							priority: "P3",
							sourceDiagnosisIds: ["DIAG-1-1"],
							problem: "对话过于直白",
							strategy: "把直白对话改成行为与潜台词",
							affectedEventIds: [1],
							scope: "scene",
							proseGoal: "fix-dialogue-specificity",
							sceneIds: ["s1"],
						},
					],
				},
				eventDrafts: [{ eventId: 1, content: revisedProse1 }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(revisedProse1, 0) }],
						chaseEvidence: {
							roleShown: true,
							conflictShown: true,
							relationshipDeltasShown: ["旧约定出现裂缝"],
							agencyActionShown: true,
						},
					},
				],
			});
			expect(result.status, JSON.stringify(result)).toBe("needs-review");
			// 只改事件 1；事件 2 的 revision 未提交 -> 装配仍成功（scoped）
			const planDoc = await readJsonIfExists(
				join(cwd, "novels", projectId, "work", "revisions", "chapter-001-plan.json"),
			);
			const goals = (planDoc as { plan?: { goals?: Array<{ scope?: string; proseGoal?: string }> } }).plan?.goals;
			expect(goals?.[0]?.scope).toBe("scene");
			expect(goals?.[0]?.proseGoal).toBe("fix-dialogue-specificity");
		});
	});

	it("SP32: revision drops required fact -> PROSE_REVISION_CHANGED_FACT", async () => {
		await withProject("sp32", async (store, projectId) => {
			// 初始正文包含关键引用 C1
			await sceneProjectSetup(store, projectId, cleanProse1("门禁记录C1被调出。"), cleanProse2(""));
			const revisedProse1 = cleanProse1("门禁记录被调出。"); // 删掉了 C1
			const result = await store.reviseChapter({
				projectId,
				chapter: 1,
				revisionPlan: {
					chapter: 1,
					goals: [
						{
							id: "g1",
							priority: "P3",
							sourceDiagnosisIds: ["DIAG-1-1"],
							problem: "精简",
							strategy: "精简表述",
							affectedEventIds: [1],
						},
					],
				},
				eventDrafts: [{ eventId: 1, content: revisedProse1 }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(revisedProse1, 0) }],
						chaseEvidence: {
							roleShown: true,
							conflictShown: true,
							relationshipDeltasShown: ["旧约定出现裂缝"],
							agencyActionShown: true,
						},
					},
				],
			});
			expect(result.status).toBe("blocked");
			expect(result.blockers.some((blocker) => blocker.code === "PROSE_REVISION_CHANGED_FACT")).toBe(true);
		});
	});

	it("SP33: prose rewrite preserves unified event state -> pass", async () => {
		await withProject("sp33", async (store, projectId, cwd) => {
			await sceneProjectSetup(store, projectId, cleanProse1("门禁记录C1被调出。"), cleanProse2(""));
			const mapBefore = await readJsonIfExists(
				join(cwd, "novels", projectId, "outline", "unified", "event-map.json"),
			);
			const revisedProse1 = cleanProse1("门禁记录C1被调出。我把复印件锁进抽屉。");
			const result = await store.reviseChapter({
				projectId,
				chapter: 1,
				revisionPlan: {
					chapter: 1,
					goals: [
						{
							id: "g1",
							priority: "P3",
							sourceDiagnosisIds: ["DIAG-1-1"],
							problem: "补动作",
							strategy: "补充行动细节",
							affectedEventIds: [1],
							scope: "scene",
						},
					],
				},
				eventDrafts: [{ eventId: 1, content: revisedProse1 }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(revisedProse1, 0) }],
						chaseEvidence: {
							roleShown: true,
							conflictShown: true,
							relationshipDeltasShown: ["旧约定出现裂缝"],
							agencyActionShown: true,
						},
					},
				],
			});
			expect(result.status, JSON.stringify(result)).toBe("needs-review");
			const mapAfter = await readJsonIfExists(
				join(cwd, "novels", projectId, "outline", "unified", "event-map.json"),
			);
			expect(JSON.stringify(mapAfter)).toBe(JSON.stringify(mapBefore));
		});
	});

	it("full chapter benchmark: P1 scene issue + P4 prose issue found, scoped revised, resolved", async () => {
		await withProject("bench", async (store, projectId) => {
			await sceneProjectSetup(store, projectId, cleanProse1(""), cleanProse2(""));
			// 诊断 1：模型发现 P1 场景问题 + P4 文风问题
			const diagnosis = await store.diagnoseChapter({
				projectId,
				chapter: 1,
				modelFindings: [
					{
						code: "INTRA_CHAPTER_STATE_DISCONTINUITY",
						priority: "P1",
						message: "scene 2 的 entryState 与 scene 1 的 exit 不兼容",
					},
					{ code: "DIALOGUE_VOICE_INTERCHANGEABLE", priority: "P4", message: "对白换名字后完全成立" },
				],
			});
			expect(
				diagnosis.findings.some(
					(finding) =>
						finding.priority === "P1" && finding.sourceIssues.includes("INTRA_CHAPTER_STATE_DISCONTINUITY"),
				),
			).toBe(true);
			expect(
				diagnosis.findings.some(
					(finding) =>
						finding.priority === "P4" && finding.sourceIssues.includes("DIALOGUE_VOICE_INTERCHANGEABLE"),
				),
			).toBe(true);
			// scoped revise：只重写事件 1 的对白（scene-local）
			const revisedProse1 = cleanProse1("“你什么时候知道的？”我问。他没有回答，把烟掐灭。");
			const revise = await store.reviseChapter({
				projectId,
				chapter: 1,
				revisionPlan: {
					chapter: 1,
					goals: [
						{
							id: "g1",
							priority: "P4",
							sourceDiagnosisIds: [diagnosis.findings.find((item) => item.priority === "P4")?.id ?? ""],
							problem: "对白同质",
							strategy: "按人物身份重写对白",
							affectedEventIds: [1],
							scope: "scene",
							proseGoal: "fix-dialogue-specificity",
							sceneIds: ["s1"],
						},
					],
				},
				eventDrafts: [{ eventId: 1, content: revisedProse1 }],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(revisedProse1, 0) }],
						chaseEvidence: {
							roleShown: true,
							conflictShown: true,
							relationshipDeltasShown: ["旧约定出现裂缝"],
							agencyActionShown: true,
						},
					},
				],
			});
			expect(revise.status, JSON.stringify(revise)).toBe("needs-review");
			// 重新诊断：P4 已解决（不再提交该模型发现）；P1 场景问题仍需要修订 scene design
			const diagnosis2 = await store.diagnoseChapter({
				projectId,
				chapter: 1,
				modelFindings: [
					{
						code: "INTRA_CHAPTER_STATE_DISCONTINUITY",
						priority: "P1",
						message: "scene 2 的 entryState 与 scene 1 的 exit 不兼容",
					},
				],
			});
			expect(
				diagnosis2.findings.some((finding) => finding.sourceIssues.includes("DIALOGUE_VOICE_INTERCHANGEABLE")),
			).toBe(false);
			expect(diagnosis2.findings.some((finding) => finding.priority === "P1")).toBe(true);
		});
	});

	it("second fixture: scene intelligence runs without insurance domain", async () => {
		await withProject("spf2", async (store, projectId, _cwd) => {
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
			await store.exploreStoryDirections({
				projectId,
				seed: "一位中学教师发现旧楼拆迁补偿名单里出现了十年前去世的人。",
				candidates: [
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
				],
			});
			await store.developStoryConcept({
				projectId,
				concept: {
					...concept(),
					premise: "拆迁补偿名单里出现已故者",
					selectedDirectionId: "f1",
					selectionConfirmation: "USER_CONFIRMED",
				},
			});
			const minimalFoundation: StoryFoundation = {
				premise: "拆迁补偿名单里出现已故者",
				corePromises: ["名单必须被重新解释"],
				endingDirection: "制度补漏而她离开",
				themes: ["基层治理"],
				characterProfiles: [],
				supportingCharacters: [],
				voiceProfile: {
					distance: "贴近",
					sentenceRhythm: "短句为主",
					observationBias: "职业观察",
					emotionalExplicitness: "low",
					professionalDensity: "moderate",
					metaphorDensity: "low",
					humorLevel: "dry",
					preferredTensionMode: "uncertain answer",
					avoidPatterns: [],
					characterVoiceNotes: [],
				},
			};
			await store.developStoryBible({ projectId, foundation: minimalFoundation });
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
			await store.designStoryArchitecture({ projectId, architecture: simpleArchitecture });
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
			await store.buildNarrativeEventGraph({
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
			// 询问旧住户信息场景（非保险）：goal / opposition / turn / state change 齐备
			const inquiryScene: SceneDesign = {
				sceneId: "q1",
				chapter: 1,
				eventIds: [1, 2],
				scenePurpose: { kind: "investigate", description: "让旧住户李婶确认，名单上的人十年前是否真的去世" },
				povCharacterId: "heroine",
				location: "李婶家门口",
				time: "傍晚六点",
				entryState: "她刚拿到底册复印件",
				focalCharacterGoal: "让李婶确认名单上的人是否十年前就去世",
				opposingForce: "李婶怕惹麻烦，反复说记不清",
				stakes: "名单真假",
				tactic: "probe",
				beatPlan: [
					{
						beatId: "b1",
						actor: "heroine",
						intent: "确认",
						action: "问李婶",
						response: "李婶打岔",
						tacticChange: false,
					},
					{
						beatId: "b2",
						actor: "heroine",
						intent: "突破",
						action: "提起旧楼邻居的名字",
						response: "李婶说了实话",
						tacticChange: true,
					},
				],
				informationPlan: [],
				emotionalMovement: "从谨慎到难受",
				turn: "她本想确认去世时间，却发现李婶也知道名单的事",
				decisionOrDiscovery: "她决定把李婶的证词记进笔记本",
				stateChange: "她拿到关键证词",
				exitPressure: "李婶求她别把自己说出去",
				cannotRemoveBecause: "证词已经拿到",
				mode: "full-scene",
				tensionSources: ["uncertain answer"],
				professionalDetailBeats: [],
			};
			const plan = planProposal([1, 2]);
			plan.sceneDesigns = [inquiryScene];
			const planResult = await store.planChapter({ projectId, chapter: 1, plan });
			expect(planResult.status, JSON.stringify(planResult)).toBe("completed");
			const prose1 =
				"我蹲在李婶家门口，把底册复印件摊开。她看了两眼，说记不清。“名单上这个人，十年前就走了。”我说。“我们结婚那会儿，他家办过白事。”李婶摇头。旧约定出现裂缝，她忽然抓住我的手，说名单的事她知道。".repeat(
					2,
				);
			const prose2 = "我记下李婶的话，把复印件收进档案袋。夜风很凉，我走完整条街。".repeat(2);
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
					},
					{
						eventId: 2,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose2, 0) }],
					},
				],
			});
			expect(draft.status, JSON.stringify(draft)).toBe("completed");
			// 非保险故事同样适用 prose 诊断：共享知识式 exposition 被抓到
			const proseWithExposition = "“我们是老邻居，你一直是这条街的住户，我们认识二十年了。”我说。".repeat(2);
			await store.draftChapter({
				projectId,
				chapter: 1,
				eventDrafts: [
					{ eventId: 1, content: proseWithExposition },
					{ eventId: 2, content: prose2 },
				],
				semanticReports: [
					{
						eventId: 1,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(proseWithExposition, 0) }],
					},
					{
						eventId: 2,
						actionShown: true,
						consequenceShown: true,
						deltaEvidence: [{ dimension: "information", evidence: anchor(prose2, 0) }],
					},
				],
			});
			const diagnosis = await store.diagnoseChapter({ projectId, chapter: 1 });
			expect(
				diagnosis.findings.some((finding) => finding.sourceIssues.includes("DIALOGUE_SHARED_KNOWLEDGE_EXPOSITION")),
			).toBe(true);
		});
	});
});
