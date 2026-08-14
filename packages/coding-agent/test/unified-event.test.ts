import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
	MatureMarriageStructure,
	ProfessionalCasePlan,
	ProfessionalDomainModel,
	UnifiedEvent,
} from "../../../.pi/extensions/novel-agent/schemas.ts";
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

async function initFullProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "unified",
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

function buildMarriageStructure(): MatureMarriageStructure {
	return {
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
	};
}

function buildDomainModel(): ProfessionalDomainModel {
	return {
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
	};
}

function buildCasePlan(): ProfessionalCasePlan {
	return {
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
				intendedChapter: 2,
				mysteryClueId: "C1",
			},
		],
		unresolvedQuestions: [],
	};
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
					plannedRevealChapter: 6,
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
				firstAvailableChapter: 2,
				truthClaimIds: ["T1"],
				reliability: "medium",
				interpretationOptions: ["死者凌晨回公司"],
				actualImplication: "手机持有人不等于在场人",
				clueRole: "ambiguous",
			},
		],
	});
	await store.saveMatureMarriageStructure({ projectId, status: "proposed", structure: buildMarriageStructure() });
	await store.saveProfessionalDomainModel({ projectId, status: "proposed", model: buildDomainModel() });
	await store.saveProfessionalCasePlan({ projectId, status: "proposed", plan: buildCasePlan() });
}

async function anchor(
	content: string,
	start: number,
): Promise<{ startChar: number; endChar: number; excerpt: string }> {
	const normalized = content.replace(/\s+/gu, "");
	const safeStart = Math.min(start, Math.max(0, normalized.length - 8));
	const endChar = Math.min(normalized.length, safeStart + 8);
	return { startChar: safeStart, endChar, excerpt: normalized.slice(safeStart, endChar) };
}

async function draftChapter(
	store: NovelProjectStore,
	projectId: string,
	chapter: number,
	events: UnifiedEvent[],
): Promise<number> {
	await store.saveUnifiedEventMap({ projectId, chapter, events });
	const prose: Record<number, string> = {
		1: Array.from({ length: 12 }, (_, index) => `我核对理赔材料，发现第${index + 1}处时间戳互相矛盾。`).join(""),
		2: Array.from({ length: 10 }, (_, index) => `我调取门禁记录，把第${index + 1}条凭证与死亡时间对照。`).join(""),
		3: Array.from({ length: 10 }, (_, index) => `我把意见书交给负责人，第${index + 1}次请求重新核验。`).join(""),
	};
	for (const event of events) {
		const content = prose[event.eventId] ?? `事件${event.eventId}${"正文：她做出选择，行动改变了局面。".repeat(6)}`;
		await store.saveUnifiedEventDraft({ projectId, chapter, eventId: event.eventId, content });
		const checked = await store.checkUnifiedEventDraft({ projectId, chapter, eventId: event.eventId });
		expect(checked.status, JSON.stringify(checked)).toBe("ok");
		const firstAnchor = await anchor(content, 0);
		await store.saveUnifiedEventSemanticReport({
			projectId,
			chapter,
			eventId: event.eventId,
			actionShown: true,
			consequenceShown: true,
			deltaEvidence: [
				{ dimension: "information", evidence: firstAnchor },
				{ dimension: "risk", evidence: await anchor(content, 24) },
			],
		});
	}
	return (await store.assembleUnifiedChapter({ projectId, chapter })).draftRevision;
}

describe("unified narrative event layer", () => {
	it("U1: capability-illegal deltas fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "u1", title: "plain", genre: "urban-romance" });
			await store.saveUnifiedEventMap({
				projectId: "u1",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						professionalDelta: {
							actionIds: ["PA-1"],
							evidenceSourceIds: [],
							conflictIds: [],
							escalationPathIds: [],
							consequenceIds: [],
							observationIds: [],
						},
					}),
				],
			});
			const report = await store.checkUnifiedEventMap({ projectId: "u1" });
			expect(
				report.issues.some((item) => item.code === "CAPABILITY_DELTA_NOT_ALLOWED" && item.severity === "error"),
			).toBe(true);
			expect(report.status).toBe("error");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U2: duplicate event ids are rejected on save", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u2");
			await expect(
				store.saveUnifiedEventMap({
					projectId: "u2",
					chapter: 1,
					events: [unifiedEvent(1, 1), unifiedEvent(1, 1)],
				}),
			).rejects.toThrow("Unified event IDs must be unique");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U3: invalid and self/forward causes fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u3");
			await store.saveUnifiedEventMap({
				projectId: "u3",
				chapter: 1,
				events: [unifiedEvent(1, 1), unifiedEvent(2, 1, { causes: [9] }), unifiedEvent(3, 1, { causes: [3] })],
			});
			const report = await store.checkUnifiedEventMap({ projectId: "u3" });
			expect(report.issues.filter((item) => item.code === "UNIFIED_CAUSE_INVALID").length).toBe(2);
			expect(report.issues.some((item) => item.message.includes("forward or self cause"))).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U4: label-only events fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u4");
			await store.saveUnifiedEventMap({
				projectId: "u4",
				chapter: 1,
				events: [unifiedEvent(1, 1, { characterDeltas: [], resourceDeltas: [], riskDeltas: [] })],
			});
			const report = await store.checkUnifiedEventMap({ projectId: "u4" });
			expect(
				report.issues.some((item) => item.code === "EVENT_WITHOUT_STATE_CHANGE" && item.message.includes("empty")),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U5: cross-domain and single-domain events validate with correct refs", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u5");
			await saveEngineArtifacts(store, "u5");
			const crossDomain = unifiedEvent(1, 1, {
				mysteryDelta: {
					discoveredClueIds: ["C1"],
					readerRevealedClueIds: [],
					claimKnowledgeChanges: [{ claimId: "T1", audience: "heroine", knowledge: "suspects" }],
					suspectChanges: [],
					interpretationChanges: [],
					proofProgressClaimIds: [],
					revealClaimIds: [],
				},
				marriageDelta: {
					economicItemChanges: ["E1"],
					responsibilityChanges: [],
					decisionRightChanges: ["D1"],
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
			});
			const singleDomain = unifiedEvent(2, 1, {
				mysteryDelta: {
					discoveredClueIds: [],
					readerRevealedClueIds: ["C1"],
					claimKnowledgeChanges: [],
					suspectChanges: [],
					interpretationChanges: ["C1"],
					proofProgressClaimIds: ["T1"],
					revealClaimIds: [],
				},
			});
			await store.saveUnifiedEventMap({ projectId: "u5", chapter: 1, events: [crossDomain, singleDomain] });
			const report = await store.checkUnifiedEventMap({ projectId: "u5" });
			expect(report.issues.filter((item) => item.code === "UNIFIED_REFERENCE_MISSING")).toEqual([]);
			expect(report.status).toBe("ok");
			expect(report.metrics.collisionEvents).toBe(1);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U6: invalid engine references fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u6");
			await saveEngineArtifacts(store, "u6");
			await store.saveUnifiedEventMap({
				projectId: "u6",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						mysteryDelta: {
							discoveredClueIds: ["C999"],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: [],
						},
					}),
				],
			});
			const report = await store.checkUnifiedEventMap({ projectId: "u6" });
			expect(
				report.issues.some((item) => item.code === "UNIFIED_REFERENCE_MISSING" && item.message.includes("C999")),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U7: observation bridging to a missing mystery clue fails without auto-sync", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u7");
			await saveEngineArtifacts(store, "u7");
			const brokenPlan = buildCasePlan();
			brokenPlan.observations[0]!.mysteryClueId = "C999";
			await store.saveProfessionalCasePlan({ projectId: "u7", status: "proposed", plan: brokenPlan });
			await store.saveUnifiedEventMap({
				projectId: "u7",
				chapter: 1,
				events: [
					unifiedEvent(1, 1, {
						professionalDelta: {
							actionIds: ["PA-1"],
							evidenceSourceIds: ["EV-1"],
							conflictIds: [],
							escalationPathIds: [],
							consequenceIds: [],
							observationIds: ["OBS-1"],
						},
					}),
				],
			});
			const report = await store.checkUnifiedEventMap({ projectId: "u7" });
			expect(
				report.issues.some((item) => item.code === "UNIFIED_REFERENCE_MISSING" && item.message.includes("C999")),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U8: drafting pipeline assembles and stale semantic reports block reassembly", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u8");
			await saveEngineArtifacts(store, "u8");
			const revision = await draftChapter(store, "u8", 1, [
				unifiedEvent(1, 1),
				unifiedEvent(2, 1),
				unifiedEvent(3, 1),
			]);
			const manifestPath = join(
				cwd,
				"novels",
				"u8",
				"work",
				"unified-assemblies",
				`chapter-001-r${String(revision).padStart(2, "0")}.json`,
			);
			const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
				eventDrafts: Array<{ eventId: number; startChar: number; endChar: number }>;
			};
			expect(manifest.eventDrafts.map((item) => item.eventId)).toEqual([1, 2, 3]);
			expect(manifest.eventDrafts[0]!.startChar).toBe(0);
			// 修改草稿后旧语义报告失效 → 重新组装被拒绝
			await store.saveUnifiedEventDraft({
				projectId: "u8",
				chapter: 1,
				eventId: 1,
				content: "我把证据重新归档，确认后再整理一次。".repeat(8),
			});
			await expect(store.assembleUnifiedChapter({ projectId: "u8", chapter: 1 })).rejects.toThrow(
				"must pass check_unified_event_draft",
			);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U9: unified context loads for authors and stays private for reader-sim", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u9");
			await store.saveUnifiedEventMap({ projectId: "u9", chapter: 1, events: [unifiedEvent(1, 1)] });
			const author = await store.readStoryContext({ projectId: "u9", chapter: 1, task: "chapter-writing" });
			expect(author.includedFiles).toContain("outline/unified/event-map.json");
			const reader = await store.readStoryContext({
				projectId: "u9",
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(reader.includedFiles.some((file) => file.includes("/unified/") || file.includes("\\unified\\"))).toBe(
				false,
			);
			// 显式遍历 outline 时 reader 仍不得读入作者规划（防御性隔离）
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U10: late mystery reveals warn", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u10-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u10");
			await saveEngineArtifacts(store, "u10");
			// T1 plannedRevealChapter=6；在第 8 章揭示 → 迟到 warning
			await store.saveUnifiedEventMap({
				projectId: "u10",
				chapter: 8,
				events: [
					unifiedEvent(1, 8, {
						mysteryDelta: {
							discoveredClueIds: [],
							readerRevealedClueIds: [],
							claimKnowledgeChanges: [],
							suspectChanges: [],
							interpretationChanges: [],
							proofProgressClaimIds: [],
							revealClaimIds: ["T1"],
						},
					}),
				],
			});
			const report = await store.checkUnifiedEventMap({ projectId: "u10" });
			expect(report.issues.some((item) => item.code === "MYSTERY_REVEAL_LATE" && item.severity === "warning")).toBe(
				true,
			);
			expect(report.status).toBe("warning");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("U11: context budget keeps the current chapter unified map and event draft (CURRENT-EVENT-SENTINEL)", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-unified-u11-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initFullProject(store, "u11");
			await store.saveUnifiedEventMap({ projectId: "u11", chapter: 1, events: [unifiedEvent(1, 1)] });
			const draftSentinel = "当前事件哨兵：她对照门禁与死亡时间，决定继续查下去。";
			await store.saveUnifiedEventDraft({
				projectId: "u11",
				chapter: 1,
				eventId: 1,
				content: draftSentinel.repeat(18),
			});
			await store.saveChapterPlan({
				projectId: "u11",
				chapter: 1,
				content: "低优先级计划哨兵：这段内容不应挤占当前事件的预算。",
			});
			const context = await store.readStoryContext({
				projectId: "u11",
				chapter: 1,
				task: "chapter-writing",
				maxChars: 1000,
			});
			expect(context.truncated).toBe(true);
			expect(context.text.includes("unified-event-map / outline/unified/event-map.json")).toBe(true);
			expect(context.text.includes(draftSentinel)).toBe(true);
			expect(context.text.includes("低优先级计划哨兵")).toBe(false);
			// 其他章节的事件草稿不会混入当前章
			await store.saveUnifiedEventMap({ projectId: "u11", chapter: 2, events: [unifiedEvent(2, 2)] });
			const chapter2 = await store.readStoryContext({
				projectId: "u11",
				chapter: 1,
				task: "chapter-writing",
				maxChars: 1000,
			});
			expect(chapter2.includedFiles.filter((file) => file.includes("unified-event-drafts")).length).toBe(1);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
