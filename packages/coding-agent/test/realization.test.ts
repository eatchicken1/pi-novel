import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { NarrativeRealizationRecord, UnifiedEvent } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

const CHAPTER_PROSE =
	"我翻开理赔档案，把死亡证明与门禁记录并排放在桌上。门禁凭证显示凌晨两点十七分有人刷卡进入大楼，可死亡证明写着前一日傍晚。我把两页纸叠在一起，指给负责人看：要么门禁记录错了，要么死亡时间被人改过。负责人沉默了一会儿，让我重新核对每一张单据。我逐条抄录时间戳，发现其中一页被人替换过。孩子放学的时间到了，我先去接孩子，把档案锁进抽屉。那天晚上我告诉丈夫，我在查一单异常理赔，他问我要不要他出面，我说不用，这是我的工作。";

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

async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "realization",
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
}

async function saveEngineArtifacts(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.saveMysteryCase({
		projectId,
		status: "proposed",
		case: {
			id: "case-1",
			centralQuestion: "为什么异常死亡理赔存在时间矛盾？",
			truthSummary: "死亡时间被伪造",
			truthClaims: [
				{
					id: "T1",
					statement: "死亡发生在等待期内",
					category: "timeline",
					dependsOnClaimIds: [],
					proofRequirement: "门禁记录",
					supportingClueIds: ["C1"],
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
		projectId,
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
	});
	await store.saveMatureMarriageStructure({
		projectId,
		status: "proposed",
		structure: {
			id: "m1",
			protagonistCharacterId: "heroine",
			spouseCharacterId: "husband",
			economicItems: [
				{
					id: "E1",
					kind: "housing",
					description: "共同住房",
					control: "shared",
					protagonistAccess: "full",
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
			decisionRights: [],
			socialTies: [],
			inertiaFactors: [],
			exitConstraints: [],
		},
	});
	await store.saveProfessionalDomainModel({
		projectId,
		status: "proposed",
		model: {
			id: "dm1",
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
		projectId,
		status: "proposed",
		plan: {
			id: "cp1",
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
	});
}

async function saveChapterMap(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.saveUnifiedEventMap({
		projectId,
		chapter: 1,
		events: [
			unifiedEvent(1, 1, {
				mysteryDelta: {
					discoveredClueIds: ["C1"],
					readerRevealedClueIds: [],
					claimKnowledgeChanges: [{ claimId: "T1", audience: "heroine", knowledge: "suspects" }],
					suspectChanges: [],
					interpretationChanges: [],
					proofProgressClaimIds: ["T1"],
					revealClaimIds: [],
				},
				marriageDelta: {
					economicItemChanges: ["E1"],
					responsibilityChanges: [],
					decisionRightChanges: [],
					socialTieChanges: [],
					inertiaChanges: [],
					exitConstraintChanges: [],
					restructuringProgress: [],
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
			unifiedEvent(2, 1),
		],
	});
}

function realizationRecords(offsets: Record<string, number>): NarrativeRealizationRecord[] {
	return [
		{
			recordId: "ev1",
			contentType: "unified-event",
			engineRef: "1",
			anchor: anchor(CHAPTER_PROSE, offsets.ev1 ?? 0),
		},
		{
			recordId: "ev2",
			contentType: "unified-event",
			engineRef: "2",
			anchor: anchor(CHAPTER_PROSE, offsets.ev2 ?? 40),
		},
		{
			recordId: "clue-c1",
			contentType: "mystery-clue",
			engineRef: "C1",
			anchor: anchor(CHAPTER_PROSE, offsets.c1 ?? 18),
		},
		{
			recordId: "reveal-t1",
			contentType: "mystery-reveal",
			engineRef: "T1",
			anchor: anchor(CHAPTER_PROSE, offsets.t1 ?? 60),
		},
		{
			recordId: "obs-1",
			contentType: "professional-observation",
			engineRef: "OBS-1",
			anchor: anchor(CHAPTER_PROSE, offsets.obs ?? 30),
		},
		{
			recordId: "mar-e1",
			contentType: "marriage-transition",
			engineRef: "E1",
			anchor: anchor(CHAPTER_PROSE, offsets.e1 ?? 90),
		},
	];
}

async function prepareChapter(
	store: NovelProjectStore,
	projectId: string,
	draftRevision: number,
	content: string,
): Promise<void> {
	await store.saveChapterPlan({ projectId, chapter: 1, content: "第一章计划：核验材料并发现矛盾。" });
	await store.saveSceneContract({
		projectId,
		chapter: 1,
		contracts: [
			{
				sceneId: "scene-1",
				chapter: 1,
				order: 1,
				pov: "heroine",
				time: "白天",
				location: "理赔办公室",
				goal: "核验矛盾",
				opposition: "材料被改",
				stakes: "真相与职业风险",
				knowledgeBefore: [],
				informationReveal: ["门禁与死亡时间矛盾"],
				emotionalStateBefore: "平静",
				emotionalTurn: "发现材料被替换",
				emotionalStateAfter: "警觉",
				stateChanges: ["knowledge"],
				setups: [],
				payoffs: [],
				exitHook: "档案锁进抽屉",
			},
		],
	});
	await store.saveChapterDraft({ projectId, chapter: 1, content });
	const integrity = await store.checkContinuity({ projectId, chapter: 1 });
	expect(integrity.status, JSON.stringify(integrity)).toBe("ok");
	await store.saveContinuityReport({ projectId, chapter: 1, draftRevision, status: "ok", issues: [] });
}

async function finalizeChapter(
	store: NovelProjectStore,
	projectId: string,
	draftRevision: number,
	content = CHAPTER_PROSE,
): Promise<void> {
	await store.finalizeChapter({
		projectId,
		chapter: 1,
		title: "第一章 时间矛盾",
		content,
		summary: {
			pov: "heroine",
			time: "白天",
			locations: ["理赔办公室"],
			characters: ["heroine"],
			events: ["发现门禁与死亡时间矛盾"],
			newFacts: ["死亡时间被伪造"],
			relationshipChanges: [],
			cluesIntroduced: ["C1"],
			cluesResolved: [],
			itemsChanged: [],
			openQuestions: [],
		},
		draftRevision,
		confirmation: "USER_CONFIRMED",
	});
}

describe("narrative realization gates", () => {
	it("R1: invalid prose anchors are rejected on save", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realization-r1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r1");
			await store.saveChapterDraft({ projectId: "r1", chapter: 1, content: CHAPTER_PROSE });
			const badRecords = realizationRecords({});
			badRecords[0]!.anchor.excerpt = "完全对不上的摘录";
			await expect(
				store.saveNarrativeRealizations({ projectId: "r1", chapter: 1, draftRevision: 1, records: badRecords }),
			).rejects.toThrow("excerpt does not match");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R2: planned items without realization records fail check and finalize", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realization-r2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r2");
			await saveEngineArtifacts(store, "r2");
			await saveChapterMap(store, "r2");
			await prepareChapter(store, "r2", 1, CHAPTER_PROSE);
			const report = await store.checkNarrativeRealizations({ projectId: "r2", chapter: 1 });
			expect(report.status).toBe("error");
			expect(report.issues.some((item) => item.code === "REALIZATION_MISSING")).toBe(true);
			expect(report.plannedCount).toBe(6);
			await expect(finalizeChapter(store, "r2", 1)).rejects.toThrow("requires narrative realization records");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R3: full realization records pass check and finalize", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realization-r3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r3");
			await saveEngineArtifacts(store, "r3");
			await saveChapterMap(store, "r3");
			await prepareChapter(store, "r3", 1, CHAPTER_PROSE);
			await store.saveNarrativeRealizations({
				projectId: "r3",
				chapter: 1,
				draftRevision: 1,
				records: realizationRecords({}),
			});
			const report = await store.checkNarrativeRealizations({ projectId: "r3", chapter: 1 });
			expect(report.status, JSON.stringify(report)).toBe("ok");
			expect(report.plannedCount).toBe(6);
			expect(report.realizedCount).toBe(6);
			await finalizeChapter(store, "r3", 1);
			const status = await store.getNovelStatus({ projectId: "r3" });
			expect(status.finalizedChapters).toEqual([1]);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R4: stale hash bindings block finalize until records are re-saved", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realization-r4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r4");
			await saveEngineArtifacts(store, "r4");
			await saveChapterMap(store, "r4");
			await prepareChapter(store, "r4", 1, CHAPTER_PROSE);
			await store.saveNarrativeRealizations({
				projectId: "r4",
				chapter: 1,
				draftRevision: 1,
				records: realizationRecords({}),
			});
			// 草稿修订为 2：旧兑现记录必须失效
			const revisedProse = `${CHAPTER_PROSE}我把替换页单独收好。`;
			await store.saveChapterDraft({ projectId: "r4", chapter: 1, content: revisedProse });
			await store.checkContinuity({ projectId: "r4", chapter: 1 });
			await store.saveContinuityReport({ projectId: "r4", chapter: 1, draftRevision: 2, status: "ok", issues: [] });
			const stale = await store.checkNarrativeRealizations({ projectId: "r4", chapter: 1 });
			expect(stale.status).toBe("error");
			expect(stale.issues.some((item) => item.code === "REALIZATION_CONTENT_HASH_STALE")).toBe(true);
			await expect(finalizeChapter(store, "r4", 2, revisedProse)).rejects.toThrow(
				"narrative realization gate failed",
			);
			// 为新修订重新保存兑现记录后放行
			await store.saveNarrativeRealizations({
				projectId: "r4",
				chapter: 1,
				draftRevision: 2,
				records: realizationRecords({}),
			});
			const fresh = await store.checkNarrativeRealizations({ projectId: "r4", chapter: 1 });
			expect(fresh.status, JSON.stringify(fresh)).toBe("ok");
			await finalizeChapter(store, "r4", 2, revisedProse);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R5: unplanned records fail the check", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realization-r5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r5");
			await saveEngineArtifacts(store, "r5");
			await saveChapterMap(store, "r5");
			await store.saveChapterDraft({ projectId: "r5", chapter: 1, content: CHAPTER_PROSE });
			const records: NarrativeRealizationRecord[] = [
				...realizationRecords({}),
				{ recordId: "extra", contentType: "mystery-reveal", engineRef: "T2", anchor: anchor(CHAPTER_PROSE, 20) },
			];
			await store.saveNarrativeRealizations({ projectId: "r5", chapter: 1, draftRevision: 1, records });
			const report = await store.checkNarrativeRealizations({ projectId: "r5", chapter: 1 });
			expect(report.issues.some((item) => item.code === "REALIZATION_UNPLANNED")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("R6: duplicate records are rejected on save", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-realization-r6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "r6");
			await store.saveChapterDraft({ projectId: "r6", chapter: 1, content: CHAPTER_PROSE });
			const records = [
				{
					recordId: "ev1",
					contentType: "unified-event" as const,
					engineRef: "1",
					anchor: anchor(CHAPTER_PROSE, 0),
				},
				{
					recordId: "ev1b",
					contentType: "unified-event" as const,
					engineRef: "1",
					anchor: anchor(CHAPTER_PROSE, 10),
				},
			];
			await expect(
				store.saveNarrativeRealizations({ projectId: "r6", chapter: 1, draftRevision: 1, records }),
			).rejects.toThrow("duplicate realization record");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
