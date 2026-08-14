import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { NarrativeRealizationRecord, UnifiedEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

const PROJECT_ID = "divorce-policy";

function anchor(content: string, start: number): { startChar: number; endChar: number; excerpt: string } {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 8));
	const endChar = Math.min(normalized.length, safeStart + 8);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

function unifiedEvent(eventId: number, chapter: number, overrides: Partial<UnifiedEvent> = {}): UnifiedEvent {
	return {
		eventId,
		chapter,
		chronology: "present",
		pov: "heroine-first-person",
		storyGoal: "查清最后一份保单的真相并保住自己的生活",
		conflict: "真相与婚姻、职业相互牵扯",
		action: "查证保单时间矛盾",
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

// 10 种事件类型：引擎 delta 组合 + 不可逆 + 倒叙 + 资源/风险/角色状态
function chapterOneEvents(): UnifiedEvent[] {
	return [
		unifiedEvent(1, 1, {
			action: "调出保单材料核对时间矛盾",
			consequence: "发现死亡时间与门禁记录矛盾",
			mysteryDelta: {
				discoveredClueIds: ["C1"],
				readerRevealedClueIds: [],
				claimKnowledgeChanges: [],
				suspectChanges: [],
				interpretationChanges: [],
				proofProgressClaimIds: [],
				revealClaimIds: [],
			},
			professionalDelta: {
				actionIds: ["PA-1"],
				evidenceSourceIds: ["EV-1"],
				conflictIds: [],
				escalationPathIds: [],
				consequenceIds: [],
				observationIds: ["OBS-1"],
			},
		}),
		unifiedEvent(2, 1, {
			action: "核对家庭账户与住房支配",
			consequence: "确认经济控制权在丈夫手里",
			marriageDelta: {
				economicItemChanges: ["E1"],
				responsibilityChanges: [],
				decisionRightChanges: [],
				socialTieChanges: [],
				inertiaChanges: [],
				exitConstraintChanges: [],
				restructuringProgress: [],
			},
			characterDeltas: [{ characterId: "heroine", dimension: "agency", from: "被动", to: "行动" }],
			resourceDeltas: [{ itemRef: "E1", change: "支配权确认" }],
		}),
		unifiedEvent(3, 1, {
			action: "提交调档申请进入调查阶段",
			consequence: "案件从受理推进到调查核验",
			professionalDelta: {
				actionIds: ["PA-1"],
				evidenceSourceIds: ["EV-1"],
				workflowFromStageId: "S1",
				workflowToStageId: "S2",
				conflictIds: [],
				escalationPathIds: [],
				consequenceIds: [],
				observationIds: [],
			},
		}),
		unifiedEvent(4, 1, {
			action: "对照门禁与死亡证明时间戳",
			consequence: "记下时间矛盾作为证据",
			mysteryDelta: {
				discoveredClueIds: [],
				readerRevealedClueIds: [],
				claimKnowledgeChanges: [],
				suspectChanges: [],
				interpretationChanges: ["C1"],
				proofProgressClaimIds: ["T1"],
				revealClaimIds: [],
			},
		}),
		unifiedEvent(5, 1, {
			action: "重新谈接送与投资决策",
			consequence: "责任与决策权出现裂痕",
			marriageDelta: {
				economicItemChanges: [],
				responsibilityChanges: ["R1"],
				decisionRightChanges: ["D1"],
				socialTieChanges: [],
				inertiaChanges: [],
				exitConstraintChanges: [],
				restructuringProgress: [],
			},
		}),
		unifiedEvent(6, 1, {
			action: "复印关键单据留档",
			consequence: "决定不再给自己留退路",
			irreversible: true,
			cannotRemoveBecause: "复印件已经交到第三方手里",
			riskDeltas: [{ label: "职业风险", change: "升级" }],
		}),
	];
}

function chapterTwoEvents(): UnifiedEvent[] {
	return [
		unifiedEvent(7, 2, {
			action: "回想去年被替换的保单",
			consequence: "意识到替换早已发生",
			chronology: "flashback",
			mysteryDelta: {
				discoveredClueIds: [],
				readerRevealedClueIds: ["C2"],
				claimKnowledgeChanges: [],
				suspectChanges: [],
				interpretationChanges: [],
				proofProgressClaimIds: [],
				revealClaimIds: [],
			},
		}),
		unifiedEvent(8, 2, {
			action: "核验第二条门禁凭证",
			consequence: "确认另一时间也存在矛盾",
			mysteryDelta: {
				discoveredClueIds: ["C2"],
				readerRevealedClueIds: [],
				claimKnowledgeChanges: [],
				suspectChanges: [],
				interpretationChanges: [],
				proofProgressClaimIds: [],
				revealClaimIds: [],
			},
			professionalDelta: {
				actionIds: ["PA-1"],
				evidenceSourceIds: ["EV-1"],
				conflictIds: [],
				escalationPathIds: [],
				consequenceIds: [],
				observationIds: ["OBS-2"],
			},
		}),
		unifiedEvent(9, 2, {
			action: "告诉妹妹分居安排",
			consequence: "家庭压力转移到明面",
			marriageDelta: {
				economicItemChanges: [],
				responsibilityChanges: [],
				decisionRightChanges: [],
				socialTieChanges: ["S1"],
				inertiaChanges: [],
				exitConstraintChanges: [],
				restructuringProgress: ["分居安排"],
			},
		}),
		unifiedEvent(10, 2, {
			action: "提交完整意见书",
			consequence: "职业风险压到肩头",
			characterDeltas: [{ characterId: "heroine", dimension: "reputation", from: "稳健", to: "被质疑" }],
			riskDeltas: [{ label: "职业风险", change: "压到肩头" }],
			resourceDeltas: [{ itemRef: "保单", change: "意见书归档" }],
		}),
	];
}

const PROSE: Record<number, string> = {
	1: "我调出保单理赔材料，核对死亡时间与门禁记录，发现矛盾。",
	2: "他把家庭账户里的钱转走，我确认共同住房的支配权在谁手里。",
	3: "我按流程提交调档申请，从受理核验进入调查核验阶段。",
	4: "门禁记录的时间戳与死亡证明对不上，我记下这条证据。",
	5: "接送孩子的时间没有商量余地，家庭投资的决策权也要重新谈。",
	6: "我把关键单据复印留档，这次决定不再给自己留退路。",
	7: "我回想去年秋天，那张被替换的保单在柜子里放了很久。",
	8: "我再次核验门禁记录，第二条凭证指向另一个时间。",
	9: "父母开始试探我的态度，我决定把分居安排先告诉妹妹。",
	10: "我向领导提交了完整意见书，职业风险已经压到肩头。",
};

const CHAPTER_PLANS: Record<number, string> = {
	1: "第一章计划：女主以理赔调查员的身份发现保单时间矛盾，同时确认婚姻经济控制。",
	2: "第二章计划：倒叙揭示保单早已被替换，职业意见书提交，分居安排浮出水面。",
};

async function saveEngineArtifacts(store: NovelProjectStore): Promise<void> {
	await store.saveMysteryCase({
		projectId: PROJECT_ID,
		status: "proposed",
		case: {
			id: "case-policy",
			centralQuestion: "为什么最后一份保单的死亡时间与门禁记录矛盾？",
			truthSummary: "死亡时间被伪造，替换发生在去年秋天",
			truthClaims: [
				{
					id: "T1",
					statement: "死亡发生在等待期内",
					category: "timeline",
					dependsOnClaimIds: [],
					proofRequirement: "门禁记录",
					supportingClueIds: ["C1", "C2"],
					plannedRevealChapter: 1,
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
		projectId: PROJECT_ID,
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
			{
				id: "C2",
				observableFact: "去年秋天的保单替换记录",
				sourceType: "document",
				sourceDescription: "保单档案",
				firstAvailableChapter: 1,
				plannedRealizationChapter: 2,
				truthClaimIds: ["T1"],
				reliability: "high",
				interpretationOptions: [],
				actualImplication: "替换早已发生",
				clueRole: "corroborating",
			},
		],
	});
	await store.saveMatureMarriageStructure({
		projectId: PROJECT_ID,
		status: "proposed",
		structure: {
			id: "m-policy",
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
					failureConsequence: "孩子无人接送",
					recognizedByBoth: "unknown",
					relatedEconomicItemIds: [],
				},
			],
			decisionRights: [
				{
					id: "D1",
					domain: "finance",
					decisionDescription: "家庭资金投资",
					formalExpectation: "共同",
					practicalController: "spouse",
					affectedResponsibilityIds: [],
					affectedEconomicItemIds: ["E1"],
					consequenceOfDisagreement: "僵局",
				},
			],
			socialTies: [
				{
					id: "S1",
					kind: "family",
					description: "双方父母",
					connection: "shared",
					dependenceOrLeverage: "家庭地位",
					informationExposure: "婚姻状态",
					exitConsequence: "家族压力",
				},
			],
			inertiaFactors: [],
			exitConstraints: [
				{
					id: "X1",
					category: "housing",
					description: "住房绑定",
					sourceRefIds: ["E1"],
					affectedParties: ["heroine"],
					severity: "high",
					timeHorizon: "immediate",
					reducibility: "reducible",
					mitigationOptions: [],
					unresolvedConsequence: "无替代住所",
				},
			],
		},
	});
	await store.saveProfessionalDomainModel({
		projectId: PROJECT_ID,
		status: "proposed",
		model: {
			id: "dm-policy",
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
			organizationContext: "某财产险公司理赔中心",
			authorityBoundaries: [
				{
					id: "AUTH-1",
					category: "inspect-internal-record",
					scopeDescription: "查询内部理赔档案",
					authorityLevel: "direct",
					conditions: [],
					escalationPathIds: [],
					violationConsequence: "合规警告",
				},
			],
			workflowStages: [
				{
					id: "S1",
					name: "受理核验",
					objective: "核对材料",
					isEntry: true,
					entryConditions: ["报案录入"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["理赔申请"],
					possibleNextStageIds: ["S2"],
					terminal: false,
				},
				{
					id: "S2",
					name: "调查核验",
					objective: "核验矛盾",
					isEntry: false,
					entryConditions: ["风险提示"],
					allowedAuthorityIds: ["AUTH-1"],
					requiredInputs: ["理赔档案"],
					possibleNextStageIds: ["S3"],
					terminal: false,
				},
				{
					id: "S3",
					name: "审批结案",
					objective: "审批归档",
					isEntry: false,
					entryConditions: ["意见提交"],
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
	});
	await store.saveProfessionalCasePlan({
		projectId: PROJECT_ID,
		status: "proposed",
		plan: {
			id: "cp-policy",
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
				{
					id: "OBS-2",
					actionId: "PA-1",
					evidenceSourceId: "EV-1",
					observableFact: "去年秋天的保单替换记录",
					limitations: [],
					discoveredByCharacterId: "heroine",
					reliability: "high",
					intendedChapter: 2,
					mysteryClueId: "C2",
				},
			],
			unresolvedQuestions: [],
		},
	});
}

async function draftChapterEvents(
	store: NovelProjectStore,
	cwd: string,
	chapter: number,
	events: UnifiedEvent[],
): Promise<{ revision: number; content: string }> {
	await store.saveUnifiedEventMap({ projectId: PROJECT_ID, chapter, events });
	for (const event of events) {
		const content = PROSE[event.eventId]!.repeat(9);
		await store.saveUnifiedEventDraft({ projectId: PROJECT_ID, chapter, eventId: event.eventId, content });
		const checked = await store.checkUnifiedEventDraft({ projectId: PROJECT_ID, chapter, eventId: event.eventId });
		expect(checked.status, JSON.stringify(checked)).toBe("ok");
		await store.saveUnifiedEventSemanticReport({
			projectId: PROJECT_ID,
			chapter,
			eventId: event.eventId,
			actionShown: true,
			consequenceShown: true,
			deltaEvidence: [
				{ dimension: "information", evidence: anchor(content, 0) },
				{ dimension: "risk", evidence: anchor(content, 20) },
			],
		});
	}
	const assembled = await store.assembleUnifiedChapter({ projectId: PROJECT_ID, chapter });
	const content = await readFile(join(cwd, "novels", PROJECT_ID, assembled.path), "utf8");
	return { revision: assembled.draftRevision, content };
}

function realizationSpecs(
	chapter: number,
): Array<{ recordId: string; contentType: string; engineRef: string; offset: number }> {
	const base: Array<{ recordId: string; contentType: string; engineRef: string; offset: number }> = [];
	for (const eventId of chapter === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10]) {
		base.push({
			recordId: `ev${eventId}`,
			contentType: "unified-event",
			engineRef: String(eventId),
			offset: (eventId % 10) * 30,
		});
	}
	if (chapter === 1) {
		base.push({ recordId: "mar-e1", contentType: "marriage-transition", engineRef: "E1", offset: 60 });
		base.push({ recordId: "mar-r1", contentType: "marriage-transition", engineRef: "R1", offset: 90 });
		base.push({ recordId: "mar-d1", contentType: "marriage-transition", engineRef: "D1", offset: 120 });
		base.push({ recordId: "clue-c1", contentType: "mystery-clue", engineRef: "C1", offset: 150 });
		base.push({ recordId: "reveal-t1", contentType: "mystery-reveal", engineRef: "T1", offset: 180 });
		base.push({ recordId: "obs-1", contentType: "professional-observation", engineRef: "OBS-1", offset: 210 });
	} else {
		base.push({ recordId: "mar-s1", contentType: "marriage-transition", engineRef: "S1", offset: 60 });
		base.push({ recordId: "clue-c2", contentType: "mystery-clue", engineRef: "C2", offset: 90 });
		base.push({ recordId: "obs-2", contentType: "professional-observation", engineRef: "OBS-2", offset: 120 });
	}
	return base;
}

function realizationRecords(
	content: string,
	specs: Array<{ recordId: string; contentType: string; engineRef: string; offset: number }>,
): NarrativeRealizationRecord[] {
	return specs.map((spec) => ({
		recordId: spec.recordId,
		contentType: spec.contentType as NarrativeRealizationRecord["contentType"],
		engineRef: spec.engineRef,
		anchor: anchor(content, spec.offset),
	}));
}

async function prepareChapter(store: NovelProjectStore, chapter: number, draftRevision: number): Promise<void> {
	await store.saveChapterPlan({ projectId: PROJECT_ID, chapter, content: CHAPTER_PLANS[chapter]! });
	await store.saveSceneContract({
		projectId: PROJECT_ID,
		chapter,
		contracts: [
			{
				sceneId: `scene-${chapter}`,
				chapter,
				order: 1,
				pov: "heroine",
				time: chapter === 1 ? "白天" : "秋天",
				location: "理赔办公室",
				goal: "查清保单真相",
				opposition: "时间被替换",
				stakes: "婚姻与职业",
				knowledgeBefore: [],
				informationReveal: ["时间矛盾"],
				emotionalStateBefore: "平静",
				emotionalTurn: "决定不再退让",
				emotionalStateAfter: "清醒",
				stateChanges: ["knowledge", "agency"],
				setups: [],
				payoffs: [],
				exitHook: "下一次选择没有退路",
			},
		],
	});
	await store.checkContinuity({ projectId: PROJECT_ID, chapter });
	await store.saveContinuityReport({ projectId: PROJECT_ID, chapter, draftRevision, status: "ok", issues: [] });
}

describe("integrated benchmark story", () => {
	it("《离婚前，我替丈夫查最后一份保单》runs the full unified pipeline end to end", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-benchmark-policy-"));
		try {
			const store = new NovelProjectStore(cwd);
			// 1. Story DNA
			await store.initializeNovel({
				projectId: PROJECT_ID,
				title: "离婚前，我替丈夫查最后一份保单",
				genre: "female-social-suspense",
				storyProfile: {
					primaryGenre: "female-social-suspense",
					relationshipMechanisms: ["mature-marriage-crisis"],
					professionalDomain: "insurance-fraud-investigation",
					storyForm: "mid-length",
					audience: "female",
					setting: "contemporary-china",
				},
			});
			// 2. 引擎 artifacts
			await saveEngineArtifacts(store);
			const mysteryDesign = await store.checkMysteryDesign({ projectId: PROJECT_ID });
			expect(mysteryDesign.status, JSON.stringify(mysteryDesign)).toBe("ok");
			const marriageCheck = await store.checkMatureMarriageStructure({ projectId: PROJECT_ID });
			expect(marriageCheck.status, JSON.stringify(marriageCheck)).not.toBe("error");
			const professionalDomain = await store.checkProfessionalDomain({ projectId: PROJECT_ID });
			expect(professionalDomain.status, JSON.stringify(professionalDomain)).toBe("ok");
			const professionalCase = await store.checkProfessionalCase({ projectId: PROJECT_ID });
			expect(professionalCase.status, JSON.stringify(professionalCase)).toBe("ok");
			// 3. Unified event map：10 种事件类型 + 全引擎校验（含 professional authority gate）
			await store.saveUnifiedEventMap({ projectId: PROJECT_ID, chapter: 1, events: chapterOneEvents() });
			await store.saveUnifiedEventMap({ projectId: PROJECT_ID, chapter: 2, events: chapterTwoEvents() });
			const unifiedReport = await store.checkUnifiedEventMap({ projectId: PROJECT_ID });
			expect(unifiedReport.status, JSON.stringify(unifiedReport)).toBe("ok");
			expect(unifiedReport.metrics.totalEvents).toBe(10);
			expect(unifiedReport.metrics.collisionEvents).toBe(2);
			// 4. 每章事件草稿 → 语义报告 → 装配
			const chapter1 = await draftChapterEvents(store, cwd, 1, chapterOneEvents());
			const chapter2 = await draftChapterEvents(store, cwd, 2, chapterTwoEvents());
			// 5. 章节预置 + 正文兑现记录（planned ≠ realized）
			await prepareChapter(store, 1, chapter1.revision);
			await prepareChapter(store, 2, chapter2.revision);
			await store.saveNarrativeRealizations({
				projectId: PROJECT_ID,
				chapter: 1,
				draftRevision: chapter1.revision,
				records: realizationRecords(chapter1.content, realizationSpecs(1)),
			});
			await store.saveNarrativeRealizations({
				projectId: PROJECT_ID,
				chapter: 2,
				draftRevision: chapter2.revision,
				records: realizationRecords(chapter2.content, realizationSpecs(2)),
			});
			for (const chapter of [1, 2]) {
				const realization = await store.checkNarrativeRealizations({ projectId: PROJECT_ID, chapter });
				expect(realization.status, JSON.stringify(realization)).toBe("ok");
			}
			// 6. finalize 两章（realization 门 + 各引擎 gate）
			for (const chapter of [1, 2]) {
				const assembled = chapter === 1 ? chapter1 : chapter2;
				const result = await store.finalizeChapter({
					projectId: PROJECT_ID,
					chapter,
					title: `第${chapter}章`,
					content: assembled.content,
					summary: {
						pov: "heroine",
						time: chapter === 1 ? "白天" : "秋天",
						locations: ["理赔办公室"],
						characters: ["heroine", "husband"],
						events: ["发现保单时间矛盾"],
						newFacts: ["死亡时间被伪造"],
						relationshipChanges: ["经济控制确认"],
						cluesIntroduced: chapter === 1 ? ["C1"] : ["C2"],
						cluesResolved: [],
						itemsChanged: ["保单"],
						openQuestions: [],
					},
					draftRevision: assembled.revision,
					confirmation: "USER_CONFIRMED",
				});
				expect(result.transactionId).toBeTruthy();
			}
			const status = await store.getNovelStatus({ projectId: PROJECT_ID });
			expect(status.finalizedChapters).toEqual([1, 2]);
			// 7. Distinctiveness 评审 + 确定性交叉验证
			await store.saveStoryDistinctiveness({
				projectId: PROJECT_ID,
				profile: {
					verdict: "distinctive",
					premises: ["死亡时间伪造由核赔环节促成，而核赔环节正是女主职业"],
					engineBlendEvidence: ["理赔核验动作同时推进线索、职业风险与婚姻经济控制"],
					risks: [{ risk: "C1 承担过重证明负担", evidence: "门禁凭证是唯一强证据" }],
					strongestMoves: [{ move: "女主借职业调查获取婚姻证据", evidence: "专业动作与婚姻破裂互为因果" }],
				},
			});
			const distinctiveness = await store.checkStoryDistinctiveness({ projectId: PROJECT_ID });
			expect(distinctiveness.status, JSON.stringify(distinctiveness)).toBe("ok");
			expect(distinctiveness.stats.totalEvents).toBe(10);
			expect(distinctiveness.stats.collisionEvents).toBe(2);
			expect(distinctiveness.stats.repeatEvents).toBe(0);
			// 8. 上下文与读者隔离
			const authorContext = await store.readStoryContext({
				projectId: PROJECT_ID,
				chapter: 3,
				task: "chapter-writing",
			});
			expect(authorContext.includedFiles).toContain("outline/unified/event-map.json");
			const readerContext = await store.readStoryContext({
				projectId: PROJECT_ID,
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(
				readerContext.includedFiles.some((file) => file.includes("/unified/") || file.includes("\\unified\\")),
			).toBe(false);
			// 9. 导出
			const exported = await store.exportManuscript({ projectId: PROJECT_ID });
			expect(exported.chapters).toBe(2);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
