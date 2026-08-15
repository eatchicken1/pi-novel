import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FauxResponseFactory } from "@earendil-works/pi-ai/compat";
import { fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai/compat";
import { describe, expect, it } from "vitest";

import novelAgentExtension from "../../../.pi/extensions/novel-agent/index.ts";
import type {
	ChapterPlanProposal,
	ChapterSummary,
	StoryArchitecture,
	StoryConcept,
	StoryFoundation,
	UnifiedEvent,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
import { createHarness, getMessageText, type Harness } from "./suite/harness.ts";

const PROJECT = "acceptance";
const projectDir = (cwd: string) => join(cwd, "novels", PROJECT);
const projectFile = (cwd: string, relative: string) => join(projectDir(cwd), relative);

// ==== 固定剧情夹具（与 story-design / authoring-workflow 测试同构，保证通过全部确定性校验）====

const foundation: StoryFoundation = {
	premise: "37 岁保险调查员发现丈夫家族企业可能涉及骗保，结婚九年，正在考虑离婚",
	corePromises: ["职业调查与婚姻经济控制互为因果"],
	endingDirection: "案件解决，制度缓慢松动；她搬出共同住房",
	themes: ["职业原则不是婚后共同财产"],
	mystery: {
		case: {
			id: "case-a",
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
					plannedRevealChapter: 3,
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
	},
	marriage: {
		structure: {
			id: "m-a",
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
	},
	professional: {
		model: {
			id: "dm-a",
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
			id: "cp-a",
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
	},
	socialDesign: {
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
					eventIds: [1, 7],
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
				breakingEventIds: [2, 8],
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
			{ eventId: 3, type: "causal", engines: ["mystery", "professional"], rationale: "核验推进证明" },
			{ eventId: 9, type: "causal", engines: ["mystery", "professional"], rationale: "真相归档伴随职业后果" },
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
				chapters: [2, 3],
				dominantQuestion: "谁替换了时间戳",
				protagonistGoal: "证明替换",
				externalPressure: "门禁失效",
				relationshipPressure: "离婚摊牌",
				professionalPressure: "赔付率问责",
				irreversibleChange: "搬出住房",
				exitCondition: "拿到凭证",
				eventIds: [3, 4, 5, 6],
			},
			{
				id: "m3",
				chapters: [4, 5],
				dominantQuestion: "制度为何放任",
				protagonistGoal: "把真相归档",
				externalPressure: "公开压力",
				relationshipPressure: "边界划定",
				professionalPressure: "调离问责",
				irreversibleChange: "结论归档",
				exitCondition: "复核制试行",
				eventIds: [7, 8, 9, 10],
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
				{ chapter: 4, kind: "threat" },
				{ chapter: 5, kind: "irreversible-action" },
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
	},
	promiseLedger: {
		version: 1,
		promises: [
			{
				id: "p1",
				kind: "mystery",
				promise: "保险理赔真相必须查清",
				supportingRefs: [{ kind: "clue", ref: "C1" }],
			},
		],
	},
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

const architecture: StoryArchitecture = {
	movements: [
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
			chapters: [2, 3],
			dominantQuestion: "谁替换了时间戳",
			protagonistGoal: "证明替换",
			externalPressure: "门禁失效",
			relationshipPressure: "离婚摊牌",
			professionalPressure: "赔付率问责",
			irreversibleChange: "搬出住房",
			exitCondition: "拿到凭证",
			eventIds: [3, 4, 5, 6],
		},
		{
			id: "m3",
			chapters: [4, 5],
			dominantQuestion: "制度为何放任",
			protagonistGoal: "把真相归档",
			externalPressure: "公开压力",
			relationshipPressure: "边界划定",
			professionalPressure: "调离问责",
			irreversibleChange: "结论归档",
			exitCondition: "复核制试行",
			eventIds: [7, 8, 9, 10],
		},
	],
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
	climaxArchitecture: { chapter: 5, engines: ["mystery", "marriage", "professional"], resolutionRefs: ["T1"] },
	endingSettlement: {
		chapter: 5,
		personalResolution: "她搬出共同住房",
		caseResolution: "理赔结论被纠正",
		institutionalChange: "双人复核",
		institutionalResistance: "外包模式延续",
		unresolvedResidue: ["复核制形同虚设"],
	},
	socialResidue: ["外包模式仍在"],
	characterArc: [{ characterId: "heroine", arc: "从被安排到亲手决定", keyChapters: [1, 5] }],
};

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

function ev(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
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
	} as UnifiedEvent;
}

const events: UnifiedEvent[] = [
	ev(1, 1, {
		riskDeltas: [{ label: "职业风险", change: "升级" }],
		mysteryDelta: { ...emptyMystery, discoveredClueIds: ["C1"] },
		professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
	}),
	ev(2, 1, {
		irreversible: true,
		cannotRemoveBecause: "材料已经交出去",
		marriageDelta: { ...emptyMarriage, economicItemChanges: ["E1"] },
	}),
	ev(3, 2, {
		causes: [],
		mysteryDelta: { ...emptyMystery, proofProgressClaimIds: ["T1"] },
		professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
	}),
	ev(4, 2, {
		irreversible: true,
		cannotRemoveBecause: "意见书已归档",
		riskDeltas: [{ label: "职业风险", change: "升级" }],
	}),
	ev(5, 3, {
		causes: [],
		mysteryDelta: { ...emptyMystery, revealClaimIds: ["T1"] },
		riskDeltas: [{ label: "职业风险", change: "换岗" }],
	}),
	ev(6, 3, { marriageDelta: { ...emptyMarriage, responsibilityChanges: ["R1"] } }),
	ev(7, 4, {
		causes: [],
		professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
		riskDeltas: [{ label: "职业风险", change: "问责" }],
	}),
	ev(8, 4, {
		irreversible: true,
		cannotRemoveBecause: "结论已经上报",
		marriageDelta: { ...emptyMarriage, economicItemChanges: ["E1"] },
	}),
	ev(9, 5, {
		causes: [],
		mysteryDelta: { ...emptyMystery, revealClaimIds: ["T1"] },
		professionalDelta: { ...emptyProfessional, actionIds: ["PA-1"] },
	}),
	ev(10, 5, {
		irreversible: true,
		cannotRemoveBecause: "钥匙已经交还",
		marriageDelta: { ...emptyMarriage, responsibilityChanges: ["R1"] },
	}),
];

function eventIdsFor(chapter: number): number[] {
	return events.filter((event) => event.chapter === chapter).map((event) => event.eventId);
}

function proseFor(_chapter: number, eventId: number, revised: boolean): string {
	const lines = revised
		? [
				"她把保单材料摊开核对时间戳，死亡证明与门禁记录对不上。她问他什么时候看过这份材料，他没有回答。",
				"他要求她撤回调查，她没有接话，只是把复印件收进档案袋锁好，转身去开门。",
			]
		: [
				"她把保单材料摊开核对时间戳，死亡证明与门禁记录对不上，她给调查科打了电话。",
				"他要求她撤回调查，她没有同意，把复印件收进档案袋锁好。",
			];
	return (lines[eventId % lines.length] + lines[(eventId + 1) % lines.length]).repeat(2);
}

function contentFor(chapter: number, revised: boolean): string {
	return eventIdsFor(chapter)
		.map((eventId) => proseFor(chapter, eventId, revised).trim())
		.join("\n\n");
}

function planFor(chapter: number): ChapterPlanProposal {
	return {
		chapterGoal: "查清时间矛盾并确认经济控制",
		openingState: "她在理赔办公室核对材料",
		eventIds: eventIdsFor(chapter),
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

function semanticReportsFor(chapter: number, revised: boolean) {
	return eventIdsFor(chapter).map((eventId) => ({
		eventId,
		actionShown: true,
		consequenceShown: true,
		deltaEvidence: [{ dimension: "information", evidence: anchor(proseFor(chapter, eventId, revised), 0) }],
	}));
}

function draftArgs(chapter: number, revised: boolean) {
	return {
		projectId: PROJECT,
		chapter,
		eventDrafts: eventIdsFor(chapter).map((eventId) => ({ eventId, content: proseFor(chapter, eventId, revised) })),
		semanticReports: semanticReportsFor(chapter, revised),
	};
}

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 10));
	const endChar = Math.min(normalized.length, safeStart + 10);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

function extraPlannedRecords(chapter: number, content: string) {
	const records: Array<{
		recordId: string;
		contentType: string;
		engineRef: string;
		anchor: { startChar: number; endChar: number; excerpt: string };
	}> = [];
	if (chapter === 1 || chapter === 4)
		records.push({
			recordId: "mar-e1",
			contentType: "marriage-transition",
			engineRef: "E1",
			anchor: anchor(content, 30),
		});
	if (chapter === 3 || chapter === 5)
		records.push({
			recordId: "mar-r1",
			contentType: "marriage-transition",
			engineRef: "R1",
			anchor: anchor(content, 60),
		});
	if (chapter === 1)
		records.push({ recordId: "clue-c1", contentType: "mystery-clue", engineRef: "C1", anchor: anchor(content, 90) });
	if (chapter === 1)
		records.push({
			recordId: "obs-1",
			contentType: "professional-observation",
			engineRef: "OBS-1",
			anchor: anchor(content, 150),
		});
	if (chapter === 3)
		records.push({
			recordId: "reveal-t1",
			contentType: "mystery-reveal",
			engineRef: "T1",
			anchor: anchor(content, 120),
		});
	return records;
}

function realizationArgs(chapter: number, draftRevision: number, content: string) {
	return {
		projectId: PROJECT,
		chapter,
		draftRevision,
		records: [
			...eventIdsFor(chapter).map((eventId) => ({
				recordId: `ev${String(eventId)}-r${String(draftRevision)}`,
				contentType: "unified-event",
				engineRef: String(eventId),
				anchor: anchor(content, (eventId % 8) * 30),
			})),
			...extraPlannedRecords(chapter, content),
		],
	};
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
		events: ["查清保单真相"],
		newFacts: [],
		relationshipChanges: [],
		cluesIntroduced: [],
		cluesResolved: [],
		itemsChanged: [],
		openQuestions: [],
		whatChanged: [],
		whatHeroineLearned: opts.heroineLearned ?? [],
		whatReaderLearned: opts.readerLearned ?? [],
		whatSpouseLearned: opts.spouseLearned ?? [],
		threadsOpened: opts.opened ?? [],
		threadsAdvanced: opts.advanced ?? [],
		threadsClosed: opts.closed ?? [],
		setups: opts.setups ?? [],
		payoffs: opts.payoffs ?? [],
		criticalFacts: opts.criticalFacts ?? [],
	} as ChapterSummary;
}

const summaries: Record<number, ChapterSummary> = {
	1: summaryFor(1, {
		heroineLearned: ["材料时间被改"],
		spouseLearned: ["她在查保单"],
		opened: ["保险理赔真相"],
		criticalFacts: [{ label: "死亡时间", value: "3月12日" }],
	}),
	2: summaryFor(2, {
		heroineLearned: ["门禁记录与死亡证明矛盾"],
		advanced: ["保险理赔真相"],
		criticalFacts: [{ label: "死亡时间", value: "3月12日" }],
	}),
	3: summaryFor(3, {
		heroineLearned: ["丈夫家族是受益人"],
		readerLearned: ["死亡时间被伪造"],
		advanced: ["保险理赔真相"],
	}),
	4: summaryFor(4, {
		heroineLearned: ["外包核赔放任伪造"],
		advanced: ["保险理赔真相"],
		setups: ["婚前协议"],
	}),
	5: summaryFor(5, {
		heroineLearned: ["制度缓慢松动"],
		closed: ["保险理赔真相", "claim-T1", "promise-p1"],
		payoffs: ["婚前协议"],
		criticalFacts: [{ label: "死亡时间", value: "3月12日" }],
	}),
};

function finalizeArgs(chapter: number, draftRevision: number, content: string) {
	return {
		projectId: PROJECT,
		chapter,
		title: `第${chapter}章`,
		content,
		summary: summaries[chapter],
		draftRevision,
		confirmation: "USER_CONFIRMED",
	};
}

const concept: StoryConcept = {
	premise: "37 岁保险调查员发现丈夫家族企业可能涉及骗保，结婚九年，正在考虑离婚",
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
	selectedDirectionId: "d2",
	selectionConfirmation: "USER_CONFIRMED",
	authorNote: "丈夫不能是直接凶手；责任更复杂：他不是动手的人，而是利用家族资源让调查失效",
};

const directionCandidates = [
	{
		id: "d1",
		logline: "丈夫是直接凶手，女主亲手把他送进监狱",
		centralMystery: "谁伪造了死亡时间",
		socialMechanism: "家族企业掩盖事故",
		protagonistGoal: "把凶手绳之以法",
		protagonistBlindSpot: "低估丈夫的狠",
		relationshipFaultLine: "欺骗",
		spouseCoreBelief: "他以为她能原谅",
		professionalDependency: "职业权限查档案",
		centralDilemma: "情与法",
		majorCost: "离婚",
		climaxIdea: "法庭对峙",
		endingShape: "定罪",
		distinctiveMechanism: "证据链反转",
		majorRisks: ["刑侦剧模板"],
	},
	{
		id: "d2",
		logline: "丈夫不是直接凶手，而是用家族资源让调查失效的人",
		centralMystery: "为什么死亡时间与门禁记录矛盾",
		socialMechanism: "外包核赔与赔付率考核放任伪造",
		protagonistGoal: "把真相归档并保住自己的生活",
		protagonistBlindSpot: "误以为丈夫不知情",
		relationshipFaultLine: "职业原则被当成家庭资源",
		spouseCoreBelief: "妻子的能力应该为家庭利益让步",
		professionalDependency: "只有调查员能调取档案",
		centralDilemma: "上报会得罪丈夫家族，压住违背职业原则",
		majorCost: "被调离、失去住所",
		climaxIdea: "结论归档与搬出共同住房同时发生",
		endingShape: "个案澄清，制度缓慢松动",
		distinctiveMechanism: "制度机制进因果链",
		majorRisks: ["万能调查员"],
	},
	{
		id: "d3",
		logline: "第三人伪造理赔，夫妻联手查出真相",
		centralMystery: "谁在伪造理赔材料",
		socialMechanism: "理赔外包腐败",
		protagonistGoal: "洗清丈夫的嫌疑",
		protagonistBlindSpot: "忽略内部人",
		relationshipFaultLine: "信任危机",
		spouseCoreBelief: "家庭高于一切",
		professionalDependency: "职业权限查材料",
		centralDilemma: "查下去会毁掉丈夫",
		majorCost: "家族反目",
		climaxIdea: "内部人落网",
		endingShape: "复合",
		distinctiveMechanism: "夫妻合谋调查",
		majorRisks: ["家庭和解过于顺利"],
	},
];

// ==== 脚本化"模型"：确定性路由器（替代真实 LLM，验证工具路由与工作流机器）====

let cwd = "";
const flowState: { nextChapter: number; lastDraftRevision: number; statusDetails: Record<string, unknown> } = {
	nextChapter: 1,
	lastDraftRevision: 1,
	statusDetails: {},
};

type CallSpec = { name: string; args: (details: unknown) => unknown };
type Pending = { kind: string; chapter: number; step: number; specs: CallSpec[] };
let pending: Pending | null = null;

function sequences(kind: string, chapter: number): CallSpec[] {
	switch (kind) {
		case "new-novel":
			return [
				{
					name: "initialize_novel",
					args: () => ({
						projectId: PROJECT,
						title: "妻子的调查",
						genre: "female-social-suspense",
						storyProfile: {
							primaryGenre: "female-social-suspense",
							relationshipMechanisms: ["mature-marriage-crisis"],
							professionalDomain: "insurance-fraud-investigation",
							storyForm: "mid-length",
							audience: "female",
							setting: "contemporary-china",
						},
					}),
				},
			];
		case "continue-status":
			return [{ name: "get_novel_status", args: () => ({ projectId: PROJECT }) }];
		case "directions":
			return [
				{
					name: "explore_story_directions",
					args: () => ({
						projectId: PROJECT,
						seed: "37 岁保险调查员，结婚九年考虑离婚，接到一宗异常死亡理赔，可能与丈夫家族企业有关",
						candidates: directionCandidates,
					}),
				},
			];
		case "select-direction":
			return [{ name: "develop_story_concept", args: () => ({ projectId: PROJECT, concept }) }];
		case "full-design":
			return [
				{ name: "develop_story_bible", args: () => ({ projectId: PROJECT, foundation }) },
				{ name: "design_story_architecture", args: () => ({ projectId: PROJECT, architecture }) },
				{ name: "build_narrative_event_graph", args: () => ({ projectId: PROJECT, events }) },
			];
		case "check-design":
			return [
				{
					name: "review_story_design",
					args: () => ({
						projectId: PROJECT,
						findings: [
							{
								id: "f1",
								priority: "P2",
								category: "character-relationship",
								problem: "丈夫的责任链条偏简单",
								targetRefs: ["E1"],
								recommendedStrategy: "把家族资源介入写进因果链",
								source: "model",
							},
						],
					}),
				},
			];
		case "fix-design":
			return [
				{
					name: "revise_story_architecture",
					args: () => ({
						projectId: PROJECT,
						revisionPlan: {
							revisionId: "rev-a1",
							goals: [
								{
									id: "g1",
									findingIds: ["f1"],
									changeType: "character-goal",
									targetRefs: ["E1"],
									strategy: "把家族资源介入写进因果链",
									expectedEffect: "责任链条复杂化",
								},
							],
						},
						architecture,
					}),
				},
			];
		case "plan-chapter":
			return [{ name: "plan_chapter", args: () => ({ projectId: PROJECT, chapter, plan: planFor(chapter) }) }];
		case "draft-chapter":
			return [{ name: "draft_chapter", args: () => draftArgs(chapter, false) }];
		case "diagnose":
			return [
				{
					name: "diagnose_chapter",
					args: () => ({
						projectId: PROJECT,
						chapter: 1,
						modelFindings: [
							{
								code: "DIALOGUE_TOO_DIRECT",
								priority: "P2",
								message: "夫妻对话太直白；职业调查段落像说明书",
								sceneId: "s1",
							},
						],
					}),
				},
			];
		case "revise":
			return [
				{
					name: "revise_chapter",
					args: () => ({
						revisionPlan: {
							chapter: 1,
							goals: [
								{
									id: "g1",
									priority: "P2",
									sourceDiagnosisIds: ["d1"],
									problem: "对话直白、职业段落说明书化",
									strategy: "直白质问改为行为与停顿；职业信息改为动作承载",
									affectedEventIds: [1, 2],
									scope: "scene",
									proseGoal: "increase-subtext",
									sceneIds: ["s1"],
								},
							],
						},
						...draftArgs(1, true),
					}),
				},
				{
					name: "check_continuity",
					args: (details: unknown) => {
						const revision = Number((details as { draftRevision?: unknown })?.draftRevision ?? 2);
						flowState.lastDraftRevision = revision;
						return { projectId: PROJECT, chapter: 1 };
					},
				},
				{
					name: "save_continuity_report",
					args: () => ({
						projectId: PROJECT,
						chapter: 1,
						draftRevision: flowState.lastDraftRevision,
						status: "ok",
						issues: [],
					}),
				},
				{
					name: "save_narrative_realization",
					args: () => realizationArgs(1, flowState.lastDraftRevision, contentFor(1, true)),
				},
				{
					name: "finalize_chapter",
					args: () => finalizeArgs(1, flowState.lastDraftRevision, contentFor(1, true)),
				},
			];
		case "continue-write":
			return [
				{ name: "continue_novel", args: () => ({ projectId: PROJECT }) },
				{ name: "plan_chapter", args: () => ({ projectId: PROJECT, chapter, plan: planFor(chapter) }) },
				{ name: "draft_chapter", args: () => draftArgs(chapter, false) },
				{
					name: "check_continuity",
					args: (details: unknown) => {
						const revision = Number((details as { draftRevision?: unknown })?.draftRevision ?? 1);
						flowState.lastDraftRevision = revision;
						return { projectId: PROJECT, chapter };
					},
				},
				{
					name: "save_continuity_report",
					args: () => ({
						projectId: PROJECT,
						chapter,
						draftRevision: flowState.lastDraftRevision,
						status: "ok",
						issues: [],
					}),
				},
				{
					name: "save_narrative_realization",
					args: () => realizationArgs(chapter, flowState.lastDraftRevision, contentFor(chapter, false)),
				},
				{
					name: "finalize_chapter",
					args: () => {
						flowState.nextChapter = chapter + 1;
						return finalizeArgs(chapter, flowState.lastDraftRevision, contentFor(chapter, false));
					},
				},
			];
		case "recover":
			return [
				{
					name: "get_novel_status",
					args: () => ({ projectId: PROJECT }),
				},
				{
					name: "read_story_context",
					args: (details: unknown) => {
						flowState.statusDetails = (details ?? {}) as Record<string, unknown>;
						return {
							projectId: PROJECT,
							task: "chapter-writing",
							sections: ["project", "summaries", "continuity"],
							recentSummaryCount: 10,
							maxChars: 60000,
						};
					},
				},
			];
		case "impact":
			return [
				{
					name: "analyze_revision_impact",
					args: () => ({
						projectId: PROJECT,
						changedChapter: 2,
						changedEventIds: [3, 4],
						knowledgeChanges: [{ characterId: "spouse", factRef: "她在查保单", from: "knows", to: "unknown" }],
					}),
				},
			];
		case "final-check":
			return [
				{
					name: "review_manuscript",
					args: () => ({
						projectId: PROJECT,
						review: {
							verdict: "ready-for-final-revision",
							strongestElements: ["职业调查与婚姻经济控制互为因果"],
							structuralIssues: [],
							characterIssues: [],
							suspenseIssues: [],
							relationshipIssues: [],
							professionalIssues: [],
							socialRealityIssues: [],
							pacingIssues: [],
							endingIssues: [],
							revisionPriorities: ["结算未决线程"],
						},
					}),
				},
				{
					name: "finalize_manuscript_unified",
					args: () => ({ projectId: PROJECT, confirmation: "USER_CONFIRMED" }),
				},
			];
		case "finalize-export":
			return [
				{ name: "plan_chapter", args: () => ({ projectId: PROJECT, chapter: 5, plan: planFor(5) }) },
				{ name: "draft_chapter", args: () => draftArgs(5, false) },
				{
					name: "check_continuity",
					args: (details: unknown) => {
						const revision = Number((details as { draftRevision?: unknown })?.draftRevision ?? 1);
						flowState.lastDraftRevision = revision;
						return { projectId: PROJECT, chapter: 5 };
					},
				},
				{
					name: "save_continuity_report",
					args: () => ({
						projectId: PROJECT,
						chapter: 5,
						draftRevision: flowState.lastDraftRevision,
						status: "ok",
						issues: [],
					}),
				},
				{
					name: "save_narrative_realization",
					args: () => realizationArgs(5, flowState.lastDraftRevision, contentFor(5, false)),
				},
				{
					name: "finalize_chapter",
					args: () => finalizeArgs(5, flowState.lastDraftRevision, contentFor(5, false)),
				},
				{
					name: "review_manuscript",
					args: () => ({
						projectId: PROJECT,
						review: {
							verdict: "ready-for-final-revision",
							strongestElements: ["职业调查与婚姻经济控制互为因果"],
							structuralIssues: [],
							characterIssues: [],
							suspenseIssues: [],
							relationshipIssues: [],
							professionalIssues: [],
							socialRealityIssues: [],
							pacingIssues: [],
							endingIssues: [],
							revisionPriorities: ["无"],
						},
					}),
				},
				{
					name: "finalize_manuscript_unified",
					args: () => ({ projectId: PROJECT, confirmation: "USER_CONFIRMED" }),
				},
				{ name: "export_manuscript", args: () => ({ projectId: PROJECT }) },
			];
		default:
			return [];
	}
}

function classify(text: string): { kind: string; chapter: number } {
	if (text.includes("新建一本小说")) return { kind: "new-novel", chapter: 1 };
	if (text.includes("故事方向")) return { kind: "directions", chapter: 1 };
	if (text.includes("选第二个")) return { kind: "select-direction", chapter: 1 };
	if (text.includes("暂时不要写正文")) return { kind: "full-design", chapter: 1 };
	if (text.includes("检查一下现在的故事设计")) return { kind: "check-design", chapter: 1 };
	if (text.includes("最重要的问题修掉")) return { kind: "fix-design", chapter: 1 };
	if (text.includes("规划第一章")) return { kind: "plan-chapter", chapter: 1 };
	if (text.includes("写第一章")) return { kind: "draft-chapter", chapter: 1 };
	if (text.includes("夫妻之间的对话太直白")) return { kind: "diagnose", chapter: 1 };
	if (text.includes("按检查结果修改")) return { kind: "revise", chapter: 1 };
	if (text.includes("写到哪里了")) return { kind: "recover", chapter: 0 };
	if (text.includes("最终检查")) return { kind: "final-check", chapter: 0 };
	if (text.includes("完稿并导出")) return { kind: "finalize-export", chapter: 5 };
	if (text.includes("继续写下一章")) return { kind: "continue-write", chapter: flowState.nextChapter };
	if (text.includes("继续写第二章")) return { kind: "continue-write", chapter: 2 };
	if (text.includes("继续写第三章")) return { kind: "continue-write", chapter: 3 };
	if (text.includes("先不要直接修改")) return { kind: "impact", chapter: 0 };
	if (text.startsWith("继续")) return { kind: "continue-status", chapter: 0 };
	return { kind: "unknown", chapter: 0 };
}

const router: FauxResponseFactory = (context) => {
	const messages = context.messages;
	const last = messages[messages.length - 1];
	if (last === undefined) return fauxAssistantMessage("继续。");
	if (last.role === "user") {
		const parsed = classify(getMessageText(last));
		const specs = sequences(parsed.kind, parsed.chapter);
		pending = { kind: parsed.kind, chapter: parsed.chapter, step: 0, specs };
		if (specs.length === 0) {
			pending = null;
			return fauxAssistantMessage("我不太确定该做什么，请再说明一下。");
		}
		const call = specs[0];
		pending.step = 1;
		return fauxAssistantMessage(fauxToolCall(call.name, call.args(undefined) as never), { stopReason: "toolUse" });
	}
	if (last.role === "toolResult") {
		if (pending === null) return fauxAssistantMessage("继续。");
		const details = (last as { details?: unknown }).details;
		const isError = (last as { isError?: boolean }).isError === true;
		const call = pending.specs[pending.step];
		if (call !== undefined) {
			pending.step += 1;
			return fauxAssistantMessage(fauxToolCall(call.name, call.args(details) as never), { stopReason: "toolUse" });
		}
		const kind = pending.kind;
		const chapter = pending.chapter;
		const text = getMessageText(last);
		pending = null;
		switch (kind) {
			case "new-novel":
				return fauxAssistantMessage(`新项目已初始化：${PROJECT}`);
			case "continue-status":
				return fauxAssistantMessage(
					"状态检查完成：阶段 " +
						String((details as { workflowPhase?: string })?.workflowPhase ?? "?") +
						"；内存 " +
						String((details as { memoryStatus?: string })?.memoryStatus ?? "?") +
						"；下一步 " +
						String(
							(details as { recommendedNextActions?: Array<{ tool?: string }> })?.recommendedNextActions?.[0]
								?.tool ?? "?",
						) +
						"。",
				);
			case "directions":
				return fauxAssistantMessage("已给出 3 个真正不同的故事方向，建议选择 d2。");
			case "select-direction":
				return fauxAssistantMessage("已按你的要求深化：丈夫不是直接凶手，责任设计为利用家族资源让调查失效。");
			case "full-design":
				return fauxAssistantMessage("完整故事设计已保存：foundation + 案件/线索台账 + 架构 + 10 事件图。");
			case "check-design":
				return fauxAssistantMessage(`设计检查完成：${text.slice(0, 200)}`);
			case "fix-design":
				return fauxAssistantMessage("已修复最重要问题（责任链条复杂化）。");
			case "plan-chapter":
				return fauxAssistantMessage(`第${chapter}章已规划完成。`);
			case "draft-chapter":
				return fauxAssistantMessage(`第${chapter}章草稿完成，建议下一步诊断。`);
			case "diagnose":
				return fauxAssistantMessage("诊断完成：对话直白（P2）、职业段落说明书化（P2）。");
			case "revise":
				return fauxAssistantMessage(
					"已按检查结果修改第1章（场景级、未改案件事实）并定稿" +
						((details as { memoryCommitted?: boolean })?.memoryCommitted === true ? "，章节内存已提交。" : "。"),
				);
			case "continue-write":
				return fauxAssistantMessage(`第${chapter}章已写完并定稿。`);
			case "recover":
				return fauxAssistantMessage(
					"已从项目文件恢复（非会话记忆）：\n内存状态：" +
						String(flowState.statusDetails.memoryStatus ?? "?") +
						"\n未解决线程数：" +
						String(flowState.statusDetails.openThreads ?? "?") +
						"\n上下文：" +
						(() => {
							const flat = text.replace(/\\/gu, "/");
							const marker = flat.indexOf("summary / summaries/");
							return marker >= 0 ? text.slice(marker, marker + 9000) : text.slice(-4000);
						})(),
				);
			case "impact":
				return fauxAssistantMessage(
					"影响分析（未做任何修改）：severity=" +
						String((details as { severity?: string })?.severity ?? "?") +
						"，受影响章节=" +
						JSON.stringify((details as { affectedChapters?: number[] })?.affectedChapters ?? []) +
						"；先重审这些章节再动笔。",
				);
			case "final-check":
				return fauxAssistantMessage(
					isError ? `最终检查：finalization 被阻断，无法导出——${text.slice(0, 800)}` : "最终检查通过。",
				);
			case "finalize-export":
				return fauxAssistantMessage(`已完稿并导出：${text.slice(0, 400)}`);
			default:
				return fauxAssistantMessage(`处理完成：${text.slice(0, 300)}`);
		}
	}
	return fauxAssistantMessage("继续。");
};

// ==== 断言辅助 ====

interface TurnSnapshot {
	calls: Array<{ name: string; args: unknown }>;
	results: Array<{ name: string; text: string; details: unknown; isError: boolean }>;
	finalText: string;
}

function turnSnapshot(h: Harness, startMessageCount: number): TurnSnapshot {
	const calls: Array<{ name: string; args: unknown }> = [];
	const results: Array<{ name: string; text: string; details: unknown; isError: boolean }> = [];
	let finalText = "";
	for (const message of h.session.messages.slice(startMessageCount)) {
		if (message.role === "assistant") {
			const content = message.content as unknown as Array<{
				type?: string;
				name?: string;
				arguments?: unknown;
				text?: string;
			}>;
			for (const part of content) {
				if (part.type === "toolCall" && part.name !== undefined)
					calls.push({ name: part.name, args: part.arguments });
				if (part.type === "text" && part.text !== undefined) finalText += part.text;
			}
		} else if (message.role === "toolResult") {
			const text = getMessageText(message);
			let parsed: unknown;
			try {
				parsed = JSON.parse(text);
			} catch {
				parsed = undefined;
			}
			results.push({
				name: (message as { toolName: string }).toolName,
				text,
				details:
					parsed !== undefined && typeof parsed === "object" ? parsed : (message as { details?: unknown }).details,
				isError: (message as { isError: boolean }).isError,
			});
		}
	}
	return { calls, results, finalText };
}

async function runTurn(h: Harness, prompt: string): Promise<TurnSnapshot> {
	const startMessageCount = h.session.messages.length;
	h.appendResponses(Array.from({ length: 24 }, () => router));
	await h.session.prompt(prompt);
	return turnSnapshot(h, startMessageCount);
}

function assertCalls(snapshot: TurnSnapshot, expected: string[]): void {
	const names = snapshot.calls.map((call) => call.name);
	expect(names, JSON.stringify(snapshot.results.map((result) => result.text.slice(0, 160)))).toEqual(expected);
}

function listDraftFiles(dir: string, chapter: number): string[] {
	const base = projectFile(dir, `work/unified-event-drafts/chapter-${String(chapter).padStart(3, "0")}`);
	if (!existsSync(base)) return [];
	return readdirSync(base);
}

describe("natural-language acceptance flow (scripted router, no real LLM)", () => {
	it("walks the ordinary-author journey across two sessions: design -> chapters -> recovery -> revision impact -> finalization", async () => {
		cwd = await mkdtemp(join(tmpdir(), "pi-novel-acceptance-"));
		const h1 = await createHarness({ extensionFactories: [novelAgentExtension], cwd });
		try {
			// ---- Session 1：普通作者，只讲普通话 ----
			let snapshot = await runTurn(
				h1,
				"新建一本小说。我想写一部女性社会派悬疑中篇。女主37岁，是保险公司反欺诈调查员，结婚九年，正在考虑离婚。她接到一宗异常死亡理赔，调查后逐渐发现案件可能和丈夫家族企业有关。丈夫不是简单出轨，也不是直接杀人，他真正的问题是长期认为妻子的职业能力、关系和原则在婚后也应该为家庭利益让步。请按照系统正常的小说创作流程，从零开始帮我开发，不要让我手动选择内部工具。",
			);
			assertCalls(snapshot, ["initialize_novel"]);
			expect(existsSync(projectFile(cwd, "project.json"))).toBe(true);

			snapshot = await runTurn(h1, "继续。");
			assertCalls(snapshot, ["get_novel_status"]);
			expect(snapshot.finalText).toContain("下一步");

			snapshot = await runTurn(h1, "把目前的几个故事方向给我比较一下，我想选一个。");
			assertCalls(snapshot, ["explore_story_directions"]);

			snapshot = await runTurn(h1, "我选第二个，但是丈夫不能是直接凶手，把他的责任设计得更复杂一点。");
			assertCalls(snapshot, ["develop_story_concept"]);

			snapshot = await runTurn(h1, "继续把完整故事设计好，暂时不要写正文。");
			assertCalls(snapshot, ["develop_story_bible", "design_story_architecture", "build_narrative_event_graph"]);
			expect(existsSync(projectFile(cwd, "outline/story-architecture.json"))).toBe(true);

			snapshot = await runTurn(h1, "检查一下现在的故事设计有没有明显问题。");
			assertCalls(snapshot, ["review_story_design"]);

			snapshot = await runTurn(h1, "把最重要的问题修掉。");
			assertCalls(snapshot, ["revise_story_architecture"]);

			snapshot = await runTurn(h1, "规划第一章。");
			assertCalls(snapshot, ["plan_chapter"]);
			expect(snapshot.results[0]?.details).toMatchObject({ status: "completed" });

			snapshot = await runTurn(h1, "写第一章。");
			assertCalls(snapshot, ["draft_chapter"]);
			expect(snapshot.results[0]?.details).toMatchObject({ status: "completed" });

			snapshot = await runTurn(h1, "我觉得这一章夫妻之间的对话太直白了，而且职业调查部分像说明书，帮我检查一下。");
			assertCalls(snapshot, ["diagnose_chapter"]);

			snapshot = await runTurn(h1, "按检查结果修改，但不要改案件事实，只修改有问题的场景。");
			assertCalls(snapshot, [
				"revise_chapter",
				"check_continuity",
				"save_continuity_report",
				"save_narrative_realization",
				"finalize_chapter",
			]);
			const finalizeResult = snapshot.results.find((result) => result.name === "finalize_chapter");
			expect(finalizeResult?.details).toMatchObject({ memoryCommitted: true });

			snapshot = await runTurn(h1, "继续写第二章。");
			assertCalls(snapshot, [
				"continue_novel",
				"plan_chapter",
				"draft_chapter",
				"check_continuity",
				"save_continuity_report",
				"save_narrative_realization",
				"finalize_chapter",
			]);
			expect(snapshot.results.find((result) => result.name === "finalize_chapter")?.details).toMatchObject({
				memoryCommitted: true,
			});

			snapshot = await runTurn(h1, "继续写第三章。");
			assertCalls(snapshot, [
				"continue_novel",
				"plan_chapter",
				"draft_chapter",
				"check_continuity",
				"save_continuity_report",
				"save_narrative_realization",
				"finalize_chapter",
			]);
			expect(snapshot.results.find((result) => result.name === "finalize_chapter")?.details).toMatchObject({
				memoryCommitted: true,
			});

			expect(existsSync(projectFile(cwd, "continuity/memory/current-snapshot.json"))).toBe(true);
		} finally {
			// 不清理：第二个 session 需要同一目录
		}

		// ---- Session 2：全新会话（新 harness 实例，只读磁盘）----
		const h2 = await createHarness({ extensionFactories: [novelAgentExtension], cwd });
		try {
			let snapshot = await runTurn(
				h2,
				"我之前这本小说写到哪里了？帮我恢复当前状态，告诉我主要人物现在分别知道什么、夫妻关系发展到了哪里、案件还有哪些未解决问题，以及下一步应该做什么。",
			);
			assertCalls(snapshot, ["get_novel_status", "read_story_context"]);
			// Narrative Memory 从磁盘恢复：知识（材料时间被改）与线程（保险理赔真相）都来自项目文件
			expect(snapshot.finalText).toContain("材料时间被改");
			expect(snapshot.finalText).toContain("保险理赔真相");
			expect(snapshot.finalText).toContain("内存状态");

			snapshot = await runTurn(h2, "继续写下一章。");
			assertCalls(snapshot, [
				"continue_novel",
				"plan_chapter",
				"draft_chapter",
				"check_continuity",
				"save_continuity_report",
				"save_narrative_realization",
				"finalize_chapter",
			]);
			expect(snapshot.results.find((result) => result.name === "finalize_chapter")?.details).toMatchObject({
				memoryCommitted: true,
			});
			expect(existsSync(projectFile(cwd, "chapters/chapter-004.md"))).toBe(true);

			// ---- 破坏性修改测试：只分析影响，不直接改 ----
			const draftsBefore = listDraftFiles(cwd, 2);
			snapshot = await runTurn(
				h2,
				"我想修改第2章：原来丈夫在这一章已经看过那份材料，现在改成他当时根本没看过。先不要直接修改，告诉我这会影响后面哪些剧情。",
			);
			assertCalls(snapshot, ["analyze_revision_impact"]);
			const impactDetails = snapshot.results[0]?.details as {
				severity?: string;
				affectedChapters?: number[];
				downstreamReviewRequired?: boolean;
			};
			expect(impactDetails?.severity).toBe("downstream-review");
			expect(impactDetails?.affectedChapters ?? []).toContain(3);
			expect(listDraftFiles(cwd, 2)).toEqual(draftsBefore);
			expect(existsSync(projectFile(cwd, "continuity/revision-impact-current.json"))).toBe(true);

			// ---- 完稿检查：故意留 open 的 major thread 应该卡住 finalization ----
			snapshot = await runTurn(h2, "我准备完稿了，帮我做最终检查。");
			assertCalls(snapshot, ["review_manuscript", "finalize_manuscript_unified"]);
			const finalizeAttempt = snapshot.results.find((result) => result.name === "finalize_manuscript_unified");
			expect(finalizeAttempt?.isError).toBe(true);
			expect(finalizeAttempt?.text).toContain("MANUSCRIPT_DANGLING_MAJOR_THREAD");
			expect(snapshot.calls.some((call) => call.name === "export_manuscript")).toBe(false);
			expect(existsSync(projectFile(cwd, "evaluations/manuscript/unified-seal.json"))).toBe(false);

			// ---- 修复后完稿并导出：第5章结算线程 -> 重新评审 -> seal + export ----
			snapshot = await runTurn(h2, "现在完稿并导出。");
			assertCalls(snapshot, [
				"plan_chapter",
				"draft_chapter",
				"check_continuity",
				"save_continuity_report",
				"save_narrative_realization",
				"finalize_chapter",
				"review_manuscript",
				"finalize_manuscript_unified",
				"export_manuscript",
			]);
			const finalFinalize = snapshot.results.find((result) => result.name === "finalize_manuscript_unified");
			expect(finalFinalize?.isError).toBe(false);
			expect(finalFinalize?.details).toMatchObject({ status: "finalized" });
			const exportResult = snapshot.results.find((result) => result.name === "export_manuscript");
			expect(exportResult?.isError).toBe(false);
			expect(existsSync(projectFile(cwd, "evaluations/manuscript/unified-seal.json"))).toBe(true);
			const seal = JSON.parse(readFileSync(projectFile(cwd, "evaluations/manuscript/unified-seal.json"), "utf8"));
			expect(seal).toMatchObject({ status: "finalized", projectId: PROJECT });
			expect(typeof seal.memorySnapshotHash).toBe("string");
			expect(existsSync(projectFile(cwd, "exports/manuscript.md"))).toBe(true);
		} finally {
			h2.cleanup();
		}
		h1.cleanup();
		await rm(cwd, { recursive: true, force: true });
	}, 180_000);
});
