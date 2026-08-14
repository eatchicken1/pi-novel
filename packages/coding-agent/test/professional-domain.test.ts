import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProfessionalCasePlan, ProfessionalDomainModel } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { isProfessionalPrivatePath } from "../../../.pi/extensions/novel-agent/services/professional-checker.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function domainModel(overrides: Partial<ProfessionalDomainModel> = {}): ProfessionalDomainModel {
	return {
		id: "domain-1",
		domain: "insurance-fraud-investigation",
		protagonistRole: {
			title: "理赔反欺诈调查员",
			departmentOrFunction: "理赔调查科",
			organizationType: "商业保险公司",
			coreResponsibilities: ["核验理赔材料", "现场调查", "形成风险意见"],
			reportsTo: "调查科负责人",
			decisionScope: "形成调查意见与风险建议",
			cannotDecide: ["终审拒赔", "刑事移送"],
			collaboratesWith: ["核赔岗", "法务"],
			professionalRisk: "证据不足时坚持意见可能被问责",
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
			{
				id: "AUTH-2",
				category: "data-query",
				scopeDescription: "查询银行流水",
				authorityLevel: "not-authorized",
				conditions: [],
				escalationPathIds: [],
				violationConsequence: "解职",
			},
			{
				id: "AUTH-3",
				category: "request-record",
				scopeDescription: "申请外部数据/公安回执",
				authorityLevel: "approval-required",
				conditions: ["部门负责人审批"],
				approvalRole: "调查科负责人",
				escalationPathIds: ["ESC-1"],
				violationConsequence: "流程违规",
			},
		],
		workflowStages: [
			{
				id: "S1",
				name: "受理核验",
				objective: "核对理赔材料完整性",
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
				objective: "核验时间线与材料矛盾",
				isEntry: false,
				entryConditions: ["风险提示"],
				allowedAuthorityIds: ["AUTH-1"],
				requiredInputs: ["理赔档案"],
				possibleNextStageIds: ["S3", "S1"],
				terminal: false,
			},
			{
				id: "S3",
				name: "风险意见",
				objective: "形成调查意见",
				isEntry: false,
				entryConditions: ["调查完成"],
				allowedAuthorityIds: ["AUTH-1"],
				requiredInputs: ["调查记录"],
				possibleNextStageIds: ["S4"],
				terminal: false,
			},
			{
				id: "S4",
				name: "审批结案",
				objective: "审批并归档",
				isEntry: false,
				entryConditions: ["意见提交"],
				allowedAuthorityIds: ["AUTH-3"],
				requiredInputs: ["意见书"],
				possibleNextStageIds: [],
				terminal: true,
			},
		],
		evidenceSources: [
			{
				id: "EV-1",
				category: "internal-claim-file",
				description: "理赔申请与材料时间戳",
				holder: "本公司",
				accessMode: "direct-role-access",
				requiredAuthorityIds: ["AUTH-1"],
				privacyOrSensitivity: "sensitive",
				verificationLimitations: ["材料可能被逆向修改"],
				chainOrProvenanceNote: "内部档案",
			},
			{
				id: "EV-2",
				category: "financial-record",
				description: "银行账户流水",
				holder: "银行",
				accessMode: "regulator-or-law-enforcement-only",
				requiredAuthorityIds: ["AUTH-2"],
				privacyOrSensitivity: "highly-sensitive",
				verificationLimitations: ["需监管/执法接口"],
				chainOrProvenanceNote: "外部数据",
			},
			{
				id: "EV-3",
				category: "internal-system-log",
				description: "门禁系统日志",
				holder: "本公司物业",
				accessMode: "internal-approval",
				requiredAuthorityIds: ["AUTH-3"],
				privacyOrSensitivity: "sensitive",
				verificationLimitations: [],
				chainOrProvenanceNote: "内部系统",
			},
		],
		guardrails: [
			{
				id: "GR-1",
				category: "consumer-protection",
				description: "不得仅以怀疑拖延正常理赔",
				appliesToStageIds: ["S1"],
				requiredAuthorityIds: [],
				violationConsequence: "投诉与合规风险",
				sourceBasis: "《反保险欺诈工作办法》结构原则",
			},
		],
		escalationPaths: [
			{
				id: "ESC-1",
				trigger: "涉及外部数据或公安接口",
				fromRoleOrFunction: "调查员",
				toRoleOrOrganization: "调查科负责人/监管执法接口",
				purpose: "申请外部协作",
				requiredInformation: ["调查记录"],
				possibleOutcomes: ["获批", "驳回"],
				limitations: ["主角无权直接对接执法部门"],
			},
		],
		...overrides,
	};
}

function action(
	id: string,
	overrides: Partial<ProfessionalCasePlan["actions"][number]> = {},
): ProfessionalCasePlan["actions"][number] {
	return {
		id,
		stageId: "S2",
		description: `action ${id}`,
		purpose: "核验矛盾",
		authorityIds: ["AUTH-1"],
		authoritySatisfactions: [],
		evidenceSourceIds: ["EV-1"],
		guardrailIds: ["GR-1"],
		expectedInformationGain: "材料时间线是否矛盾",
		decisionOrWorkflowEffect: "推进调查意见形成",
		ifBlocked: "升级审批",
		professionalRisk: "误判风险",
		...overrides,
	};
}

function casePlan(overrides: Partial<ProfessionalCasePlan> = {}): ProfessionalCasePlan {
	return {
		id: "plan-1",
		domain: "insurance-fraud-investigation",
		mandate: "核验异常死亡理赔的时间与数字证据矛盾",
		startingStageId: "S1",
		actions: [action("A1")],
		conflictsOfInterest: [],
		escalations: [],
		professionalConsequences: [],
		unresolvedQuestions: [],
		...overrides,
	};
}

async function initProject(
	store: NovelProjectStore,
	projectId: string,
	mechanisms: string[],
	genre: string,
	primaryGenre: string,
	professionalDomain?: string,
): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "professional",
		genre,
		storyProfile: {
			primaryGenre,
			relationshipMechanisms: mechanisms,
			...(professionalDomain === undefined ? {} : { professionalDomain }),
		},
	});
}

describe("professional domain engine", () => {
	it("PD1: projects without a professional domain cannot call professional tools", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await store.initializeNovel({ projectId: "pd1", title: "plain", genre: "urban-romance" });
			await expect(
				store.saveProfessionalDomainModel({ projectId: "pd1", status: "proposed", model: domainModel() }),
			).rejects.toThrow("only available");
			await expect(store.checkProfessionalDomain({ projectId: "pd1" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD2: insurance-fraud-investigation enables professional tools while other capabilities stay independent", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd2", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await expect(
				store.saveProfessionalDomainModel({ projectId: "pd2", status: "proposed", model: domainModel() }),
			).resolves.toBeTruthy();
			await expect(store.checkProfessionalDomain({ projectId: "pd2" })).resolves.toBeTruthy();
			await expect(store.checkMysteryDesign({ projectId: "pd2" })).rejects.toThrow("only available");
			await expect(store.checkChaseWifeArc({ projectId: "pd2" })).rejects.toThrow("only available");
			await expect(store.checkMatureMarriageStructure({ projectId: "pd2" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD3: female-social-suspense + insurance gets mystery and professional tools", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd3",
				[],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await expect(
				store.saveProfessionalDomainModel({ projectId: "pd3", status: "proposed", model: domainModel() }),
			).resolves.toBeTruthy();
			await expect(store.checkMysteryDesign({ projectId: "pd3" })).resolves.toBeTruthy();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD4: FSS + mature + insurance enables three engines but not chase-wife", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd4",
				["mature-marriage-crisis"],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await expect(
				store.saveProfessionalDomainModel({ projectId: "pd4", status: "proposed", model: domainModel() }),
			).resolves.toBeTruthy();
			await expect(
				store.saveMatureMarriageStructure({
					projectId: "pd4",
					status: "proposed",
					structure: {
						id: "m1",
						protagonistCharacterId: "heroine",
						spouseCharacterId: "husband",
						economicItems: [],
						responsibilities: [],
						decisionRights: [],
						socialTies: [],
						inertiaFactors: [],
						exitConstraints: [],
					},
				}),
			).resolves.toBeTruthy();
			await expect(store.checkMysteryDesign({ projectId: "pd4" })).resolves.toBeTruthy();
			await expect(store.checkChaseWifeArc({ projectId: "pd4" })).rejects.toThrow("only available");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD5: full composition loads all four engine contexts", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd5",
				["mature-marriage-crisis", "chase-wife"],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await store.saveProfessionalDomainModel({ projectId: "pd5", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({ projectId: "pd5", status: "proposed", plan: casePlan() });
			await store.saveMatureMarriageStructure({
				projectId: "pd5",
				status: "proposed",
				structure: {
					id: "m1",
					protagonistCharacterId: "heroine",
					spouseCharacterId: "husband",
					economicItems: [],
					responsibilities: [],
					decisionRights: [],
					socialTies: [],
					inertiaFactors: [],
					exitConstraints: [],
				},
			});
			await store.saveMysteryClueLedger({
				projectId: "pd5",
				clues: [
					{
						id: "C1",
						observableFact: "f",
						sourceType: "digital",
						sourceDescription: "s",
						firstAvailableChapter: 1,
						truthClaimIds: [],
						reliability: "medium",
						interpretationOptions: [],
						actualImplication: "i",
						clueRole: "fair",
					},
				],
			});
			const projectRoot = join(cwd, "novels", "pd5");
			await mkdir(join(projectRoot, "outline", "genre"), { recursive: true });
			await writeFile(
				join(projectRoot, "outline", "genre", "chase-wife-beat-sheet.json"),
				JSON.stringify({ version: 2, genre: "chase-wife", beats: [] }),
				"utf8",
			);
			const context = await store.readStoryContext({ projectId: "pd5", chapter: 1, task: "chapter-writing" });
			expect(context.includedFiles).toContain("outline/mystery/clue-ledger.json");
			expect(context.includedFiles).toContain("work/marriage/structure-proposed.json");
			expect(context.includedFiles).toContain("outline/genre/chase-wife-beat-sheet.json");
			expect(context.includedFiles).toContain("work/professional/domain-model-proposed.json");
			expect(context.includedFiles).toContain("work/professional/case-plan-proposed.json");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD6: an action referencing a missing authority fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd6", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd6", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({
				projectId: "pd6",
				status: "proposed",
				plan: casePlan({ actions: [action("A1", { authorityIds: ["AUTH-9"] })] }),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd6" });
			expect(report.issues.some((item) => item.code === "PROFESSIONAL_REFERENCE_MISSING")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD7: executing a not-authorized authority fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd7", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd7", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({
				projectId: "pd7",
				status: "proposed",
				plan: casePlan({ actions: [action("A1", { authorityIds: ["AUTH-2"] })] }),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd7" });
			expect(report.issues.some((item) => item.code === "ACTION_OUTSIDE_AUTHORITY")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD8: using an unavailable evidence source fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd8", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			const model = domainModel({
				evidenceSources: [
					...domainModel().evidenceSources,
					{
						id: "EV-4",
						category: "medical-record",
						description: "死者病历",
						holder: "医院",
						accessMode: "unavailable",
						requiredAuthorityIds: [],
						privacyOrSensitivity: "highly-sensitive",
						verificationLimitations: [],
						chainOrProvenanceNote: "无权访问",
					},
				],
			});
			await store.saveProfessionalDomainModel({ projectId: "pd8", status: "proposed", model });
			await store.saveProfessionalCasePlan({
				projectId: "pd8",
				status: "proposed",
				plan: casePlan({ actions: [action("A1", { evidenceSourceIds: ["EV-4"] })] }),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd8" });
			expect(report.issues.some((item) => item.code === "ACTION_EVIDENCE_INACCESSIBLE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD9: restricted evidence without the required authority fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd9", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd9", status: "proposed", model: domainModel() });
			// EV-3 需要 AUTH-3，但 action 只有 AUTH-1
			await store.saveProfessionalCasePlan({
				projectId: "pd9",
				status: "proposed",
				plan: casePlan({ actions: [action("A1", { evidenceSourceIds: ["EV-3"] })] }),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd9" });
			expect(report.issues.some((item) => item.code === "ACTION_EVIDENCE_INACCESSIBLE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD10: a legal evidence access passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd10-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd10", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd10", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({ projectId: "pd10", status: "proposed", plan: casePlan() });
			const report = await store.checkProfessionalCase({ projectId: "pd10" });
			expect(report.status, JSON.stringify(report.issues)).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD11: a workflow without an entry stage fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd11-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd11", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			const model = domainModel({
				workflowStages: domainModel().workflowStages.map((stage) => ({ ...stage, isEntry: false })),
			});
			await store.saveProfessionalDomainModel({ projectId: "pd11", status: "proposed", model });
			const report = await store.checkProfessionalDomain({ projectId: "pd11" });
			expect(report.issues.some((item) => item.code === "WORKFLOW_ENTRY_MISSING")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD12: a workflow with a missing next-stage reference fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd12-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd12", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			const model = domainModel({
				workflowStages: domainModel().workflowStages.map((stage) =>
					stage.id === "S2" ? { ...stage, possibleNextStageIds: ["S9"] } : stage,
				),
			});
			await store.saveProfessionalDomainModel({ projectId: "pd12", status: "proposed", model });
			const report = await store.checkProfessionalDomain({ projectId: "pd12" });
			expect(report.issues.some((item) => item.code === "PROFESSIONAL_REFERENCE_MISSING")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD13: an unreachable workflow stage warns", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd13-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd13", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			const model = domainModel({
				workflowStages: [
					...domainModel().workflowStages,
					{
						id: "SX",
						name: "孤立阶段",
						objective: "无人可达",
						isEntry: false,
						entryConditions: [],
						allowedAuthorityIds: ["AUTH-1"],
						requiredInputs: [],
						possibleNextStageIds: ["SX"],
						terminal: true,
					},
				],
			});
			await store.saveProfessionalDomainModel({ projectId: "pd13", status: "proposed", model });
			const report = await store.checkProfessionalDomain({ projectId: "pd13" });
			expect(
				report.issues.some((item) => item.code === "WORKFLOW_STAGE_UNREACHABLE" && item.severity === "warning"),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD14: a workflow with no reachable terminal fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd14-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd14", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			const model = domainModel({
				workflowStages: domainModel().workflowStages.map((stage) =>
					stage.id === "S4" ? { ...stage, terminal: false, possibleNextStageIds: ["S2"] } : stage,
				),
			});
			await store.saveProfessionalDomainModel({ projectId: "pd14", status: "proposed", model });
			const report = await store.checkProfessionalDomain({ projectId: "pd14" });
			expect(report.issues.some((item) => item.code === "WORKFLOW_NO_REACHABLE_TERMINAL")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD15: a rework cycle is legal as long as a terminal is reachable", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd15-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd15", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			// 基础模型已包含 S1→S2→S1 的 rework cycle，且 S4 terminal 可达
			await store.saveProfessionalDomainModel({ projectId: "pd15", status: "proposed", model: domainModel() });
			const report = await store.checkProfessionalDomain({ projectId: "pd15" });
			expect(report.issues.some((item) => item.code.startsWith("WORKFLOW"))).toBe(false);
			expect(report.status).toBe("ok");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD16: an unmitigated high conflict with active actions fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd16-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd16", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd16", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({
				projectId: "pd16",
				status: "proposed",
				plan: casePlan({
					conflictsOfInterest: [
						{
							id: "CF-1",
							description: "调查指向丈夫家族企业",
							source: "spouse",
							affectedActionIds: ["A1"],
							affectedStageIds: ["S2"],
							severity: "high",
							disclosureRequired: true,
							mitigation: "unresolved",
							mitigationDescription: "尚未决定",
							remainingRisk: "调查公正性",
						},
					],
				}),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd16" });
			expect(report.issues.some((item) => item.code === "UNMITIGATED_PROFESSIONAL_CONFLICT")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD17: actions after recusal fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd17-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd17", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd17", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({
				projectId: "pd17",
				status: "proposed",
				plan: casePlan({
					conflictsOfInterest: [
						{
							id: "CF-1",
							description: "调查指向丈夫家族企业",
							source: "spouse",
							affectedActionIds: ["A1"],
							affectedStageIds: ["S2"],
							severity: "high",
							disclosureRequired: true,
							mitigation: "recusal",
							mitigationDescription: "回避该案调查",
							remainingRisk: "交接成本",
						},
					],
				}),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd17" });
			expect(report.issues.some((item) => item.code === "ACTION_AFTER_RECUSAL")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD18: an effective mitigation like second-review passes", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd18-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd18", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({ projectId: "pd18", status: "proposed", model: domainModel() });
			await store.saveProfessionalCasePlan({
				projectId: "pd18",
				status: "proposed",
				plan: casePlan({
					conflictsOfInterest: [
						{
							id: "CF-1",
							description: "调查指向丈夫家族企业",
							source: "spouse",
							affectedActionIds: ["A1"],
							affectedStageIds: ["S2"],
							severity: "high",
							disclosureRequired: true,
							mitigation: "second-review",
							mitigationDescription: "由部门负责人复核",
							remainingRisk: "低",
						},
					],
				}),
			});
			const report = await store.checkProfessionalCase({ projectId: "pd18" });
			expect(
				report.issues.some(
					(item) => item.code === "UNMITIGATED_PROFESSIONAL_CONFLICT" || item.code === "ACTION_AFTER_RECUSAL",
				),
			).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD19: professional evidence never auto-creates mystery clues", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd19-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd19",
				[],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await store.saveProfessionalDomainModel({
				projectId: "pd19",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				model: domainModel(),
			});
			const cluePath = join(cwd, "novels", "pd19", "outline", "mystery", "clue-ledger.json");
			await expect(readFile(cluePath, "utf8")).rejects.toThrow();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD20: a case plan never modifies the truth model", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd20-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd20",
				[],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await store.saveProfessionalCasePlan({
				projectId: "pd20",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				plan: casePlan(),
			});
			await expect(
				readFile(join(cwd, "novels", "pd20", "canon", "mystery", "truth-model.json"), "utf8"),
			).rejects.toThrow();
			await expect(
				readFile(join(cwd, "novels", "pd20", "work", "mystery", "truth-model-proposed.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD21: a spouse-involved professional conflict never creates marriage or chase-wife artifacts", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd21-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd21",
				["mature-marriage-crisis", "chase-wife"],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await store.saveProfessionalCasePlan({
				projectId: "pd21",
				status: "proposed",
				plan: casePlan({
					conflictsOfInterest: [
						{
							id: "CF-1",
							description: "调查指向丈夫家族企业",
							source: "spouse",
							affectedActionIds: ["A1"],
							affectedStageIds: ["S2"],
							severity: "high",
							disclosureRequired: true,
							mitigation: "disclose",
							mitigationDescription: "上报披露",
							remainingRisk: "家庭压力",
						},
					],
				}),
			});
			await expect(
				readFile(join(cwd, "novels", "pd21", "canon", "marriage", "restructuring.json"), "utf8"),
			).rejects.toThrow();
			await expect(
				readFile(join(cwd, "novels", "pd21", "continuity", "chase-wife-harm-ledger.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD22: relationship-pressure consequences never write the harm ledger", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd22-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(
				store,
				"pd22",
				["chase-wife"],
				"female-social-suspense",
				"female-social-suspense",
				"insurance-fraud-investigation",
			);
			await store.saveProfessionalCasePlan({
				projectId: "pd22",
				status: "proposed",
				plan: casePlan({
					professionalConsequences: [
						{
							id: "PC-1",
							triggerRefIds: ["A1"],
							category: "relationship-pressure",
							description: "坚持升级调查引发家庭压力",
							reversibility: "reversible",
							affectedParties: ["heroine"],
						},
					],
				}),
			});
			await expect(
				readFile(join(cwd, "novels", "pd22", "continuity", "chase-wife-harm-ledger.json"), "utf8"),
			).rejects.toThrow();
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PD23: reader-sim never exposes professional author planning, including Windows paths", async () => {
		expect(isProfessionalPrivatePath("canon\\professional\\domain-model.json")).toBe(true);
		expect(isProfessionalPrivatePath("work/professional/case-plan-proposed.json")).toBe(true);
		expect(isProfessionalPrivatePath("outline\\professional\\future.json")).toBe(true);
		expect(isProfessionalPrivatePath("outline/overview.md")).toBe(false);
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-professional-pd23-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pd23", [], "urban-romance", "urban-romance", "insurance-fraud-investigation");
			await store.saveProfessionalDomainModel({
				projectId: "pd23",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				model: domainModel(),
			});
			await store.saveProfessionalCasePlan({
				projectId: "pd23",
				status: "confirmed",
				confirmation: "USER_CONFIRMED",
				plan: casePlan({ mandate: "秘密计划：核验丈夫家族关联" }),
			});
			const context = await store.readStoryContext({
				projectId: "pd23",
				task: "reader-sim",
				sections: ["outline", "project"],
			});
			expect(
				context.includedFiles.some((file) => file.includes("/professional/") || file.includes("\\professional\\")),
			).toBe(false);
			expect(context.text).not.toContain("秘密计划");
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
