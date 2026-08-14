import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ProfessionalCasePlan, ProfessionalDomainModel } from "../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../.pi/extensions/novel-agent/services/project-store.ts";

function closureModel(overrides: Partial<ProfessionalDomainModel> = {}): ProfessionalDomainModel {
	return {
		id: "domain-closure",
		domain: "insurance-fraud-investigation",
		protagonistRole: {
			title: "理赔反欺诈调查员",
			departmentOrFunction: "理赔调查科",
			organizationType: "商业保险公司",
			coreResponsibilities: ["核验理赔材料", "形成风险意见"],
			reportsTo: "调查科负责人",
			decisionScope: "形成调查意见",
			cannotDecide: ["终审拒赔"],
			collaboratesWith: ["核赔岗"],
			professionalRisk: "坚持意见可能被问责",
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
				scopeDescription: "申请外部数据",
				authorityLevel: "approval-required",
				conditions: ["部门负责人审批"],
				approvalRole: "调查科负责人",
				escalationPathIds: ["ESC-1"],
				violationConsequence: "流程违规",
			},
			{
				id: "AUTH-C",
				category: "data-query",
				scopeDescription: "查询内部系统日志",
				authorityLevel: "conditional",
				conditions: ["已立案登记"],
				escalationPathIds: [],
				violationConsequence: "流程违规",
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
				allowedAuthorityIds: ["AUTH-1", "AUTH-3", "AUTH-C"],
				requiredInputs: ["理赔档案"],
				possibleNextStageIds: ["S3"],
				terminal: false,
			},
			{
				id: "S3",
				name: "风险意见",
				objective: "形成意见",
				isEntry: false,
				entryConditions: ["调查完成"],
				allowedAuthorityIds: ["AUTH-1"],
				requiredInputs: ["调查记录"],
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
			{
				id: "EV-5",
				category: "internal-system-log",
				description: "门禁日志",
				holder: "本公司物业",
				accessMode: "internal-approval",
				requiredAuthorityIds: ["AUTH-1", "AUTH-3"],
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
				violationConsequence: "投诉",
			},
		],
		escalationPaths: [
			{
				id: "ESC-1",
				trigger: "涉及外部数据",
				fromRoleOrFunction: "调查员",
				toRoleOrOrganization: "调查科负责人",
				purpose: "申请协作",
				requiredInformation: ["调查记录"],
				possibleOutcomes: ["获批"],
				limitations: [],
			},
		],
		...overrides,
	};
}

function closureAction(
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
		guardrailIds: [],
		expectedInformationGain: "材料时间线是否矛盾",
		decisionOrWorkflowEffect: "推进调查意见形成",
		ifBlocked: "升级审批",
		professionalRisk: "误判风险",
		...overrides,
	};
}

function closurePlan(overrides: Partial<ProfessionalCasePlan> = {}): ProfessionalCasePlan {
	return {
		id: "plan-closure",
		domain: "insurance-fraud-investigation",
		mandate: "核验异常死亡理赔",
		startingStageId: "S1",
		actions: [closureAction("A1")],
		conflictsOfInterest: [],
		escalations: [],
		professionalConsequences: [],
		observations: [],
		unresolvedQuestions: [],
		...overrides,
	};
}

async function initProject(store: NovelProjectStore, projectId: string): Promise<void> {
	await store.initializeNovel({
		projectId,
		title: "closure",
		genre: "urban-romance",
		storyProfile: {
			primaryGenre: "urban-romance",
			relationshipMechanisms: [],
			professionalDomain: "insurance-fraud-investigation",
		},
	});
}

async function saveModelAndPlan(
	store: NovelProjectStore,
	projectId: string,
	model: ProfessionalDomainModel,
	plan: ProfessionalCasePlan,
): Promise<void> {
	await store.saveProfessionalDomainModel({ projectId, status: "proposed", model });
	await store.saveProfessionalCasePlan({ projectId, status: "proposed", plan });
}

describe("professional authority closure", () => {
	it("PA1: an action cannot use an authority the stage does not allow", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa1-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa1");
			// AUTH-3 只在 S2 允许；把 action 放在只允许 AUTH-1 的 S1
			await saveModelAndPlan(
				store,
				"pa1",
				closureModel(),
				closurePlan({
					startingStageId: "S2",
					actions: [
						closureAction("A1", {
							stageId: "S1",
							authorityIds: ["AUTH-3", "AUTH-1"],
							authoritySatisfactions: [
								{
									authorityId: "AUTH-3",
									status: "approval-obtained",
									basis: "审批",
									approvedByRole: "调查科负责人",
								},
							],
						}),
					],
				}),
			);
			const report = await store.checkProfessionalCase({ projectId: "pa1" });
			expect(report.issues.some((item) => item.code === "ACTION_AUTHORITY_NOT_ALLOWED_IN_STAGE")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA2: evidence requiredAuthorityIds are AND - all must be satisfied", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa2-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa2");
			// EV-5 需要 AUTH-1 AND AUTH-3；action 只有 AUTH-1
			await saveModelAndPlan(
				store,
				"pa2",
				closureModel(),
				closurePlan({ startingStageId: "S2", actions: [closureAction("A1", { evidenceSourceIds: ["EV-5"] })] }),
			);
			const report = await store.checkProfessionalCase({ projectId: "pa2" });
			expect(
				report.issues.some(
					(item) => item.code === "ACTION_EVIDENCE_INACCESSIBLE" && item.message.includes("AUTH-3"),
				),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA3: conditional authorities require condition-satisfied", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa3-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa3");
			const unsatisfied = closurePlan({
				startingStageId: "S2",
				actions: [closureAction("A1", { authorityIds: ["AUTH-C"], evidenceSourceIds: ["EV-1", "AUTH-C"] })],
			});
			const plan = {
				...unsatisfied,
				actions: unsatisfied.actions.map((action) => ({
					...action,
					authorityIds: ["AUTH-C", "AUTH-1"],
					authoritySatisfactions: [],
				})),
			} as ProfessionalCasePlan;
			await saveModelAndPlan(store, "pa3", closureModel(), plan);
			const failed = await store.checkProfessionalCase({ projectId: "pa3" });
			expect(failed.issues.some((item) => item.code === "CONDITIONAL_AUTHORITY_UNSATISFIED")).toBe(true);
			// 满足条件后通过
			await saveModelAndPlan(store, "pa3", closureModel(), {
				...plan,
				actions: plan.actions.map((action) => ({
					...action,
					authoritySatisfactions: [{ authorityId: "AUTH-C", status: "condition-satisfied", basis: "已立案登记" }],
				})),
			});
			const passed = await store.checkProfessionalCase({ projectId: "pa3" });
			expect(passed.issues.some((item) => item.code === "CONDITIONAL_AUTHORITY_UNSATISFIED")).toBe(false);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA4: approval-required authorities need matching approval; missing approver role fails", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa4-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa4");
			const base = closurePlan({
				startingStageId: "S2",
				actions: [closureAction("A1", { authorityIds: ["AUTH-3", "AUTH-1"], evidenceSourceIds: ["EV-1"] })],
			});
			// 无 approval-obtained
			await saveModelAndPlan(store, "pa4", closureModel(), base);
			const failed = await store.checkProfessionalCase({ projectId: "pa4" });
			expect(failed.issues.some((item) => item.code === "APPROVAL_REQUIRED_NOT_SATISFIED")).toBe(true);
			// 审批人角色错误
			await saveModelAndPlan(store, "pa4", closureModel(), {
				...base,
				actions: base.actions.map((action) => ({
					...action,
					authoritySatisfactions: [
						{ authorityId: "AUTH-3", status: "approval-obtained", basis: "审批", approvedByRole: "核赔岗" },
					],
				})),
			});
			const wrongRole = await store.checkProfessionalCase({ projectId: "pa4" });
			expect(wrongRole.issues.some((item) => item.code === "APPROVAL_REQUIRED_NOT_SATISFIED")).toBe(true);
			// 正确审批通过
			await saveModelAndPlan(store, "pa4", closureModel(), {
				...base,
				actions: base.actions.map((action) => ({
					...action,
					authoritySatisfactions: [
						{ authorityId: "AUTH-3", status: "approval-obtained", basis: "审批", approvedByRole: "调查科负责人" },
					],
				})),
			});
			const passed = await store.checkProfessionalCase({ projectId: "pa4" });
			expect(passed.issues.some((item) => item.code === "APPROVAL_REQUIRED_NOT_SATISFIED")).toBe(false);
			// 缺少 approvalRole 的 approval-required 权限 → 配置错误
			const broken = closureModel({
				authorityBoundaries: closureModel().authorityBoundaries.map((authority) =>
					authority.id === "AUTH-3" ? { ...authority, approvalRole: undefined } : authority,
				),
			});
			await saveModelAndPlan(store, "pa4", broken, base);
			const domainReport = await store.checkProfessionalDomain({ projectId: "pa4" });
			expect(domainReport.issues.some((item) => item.code === "APPROVAL_AUTHORITY_WITHOUT_APPROVER")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA5: applicable guardrails must be referenced and their authorities satisfied", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa5-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa5");
			// GR-2 global（appliesToStageIds=[]）；GR-3 需要 AUTH-3
			const model = closureModel({
				guardrails: [
					{
						id: "GR-2",
						category: "evidence-integrity",
						description: "证据链必须留痕",
						appliesToStageIds: [],
						requiredAuthorityIds: [],
						violationConsequence: "证据作废",
					},
					{
						id: "GR-3",
						category: "approval",
						description: "外部数据须审批后使用",
						appliesToStageIds: ["S2"],
						requiredAuthorityIds: ["AUTH-3"],
						violationConsequence: "流程违规",
					},
				],
			});
			// action 只引用 GR-3 且缺 AUTH-3
			await saveModelAndPlan(
				store,
				"pa5",
				model,
				closurePlan({
					startingStageId: "S2",
					actions: [closureAction("A1", { authorityIds: ["AUTH-1"], guardrailIds: ["GR-3"] })],
				}),
			);
			const report = await store.checkProfessionalCase({ projectId: "pa5" });
			expect(
				report.issues.some(
					(item) => item.code === "ACTION_MISSING_APPLICABLE_GUARDRAIL" && item.message.includes("GR-2"),
				),
			).toBe(true);
			expect(
				report.issues.some(
					(item) => item.code === "GUARDRAIL_AUTHORITY_UNSATISFIED" && item.message.includes("GR-3"),
				),
			).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA6: actions remain effective after reassignment fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa6-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa6");
			await saveModelAndPlan(
				store,
				"pa6",
				closureModel(),
				closurePlan({
					startingStageId: "S2",
					conflictsOfInterest: [
						{
							id: "CF-1",
							description: "调查指向丈夫家族企业",
							source: "spouse",
							affectedActionIds: [],
							affectedStageIds: ["S2"],
							severity: "high",
							disclosureRequired: true,
							mitigation: "reassignment",
							mitigationDescription: "案件移交他人",
							remainingRisk: "交接成本",
						},
					],
				}),
			);
			const report = await store.checkProfessionalCase({ projectId: "pa6" });
			// effective affected action 包含 S2 上的 A1
			expect(report.issues.some((item) => item.code === "ACTION_AFTER_REASSIGNMENT")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA7: domains canonicalize across Chinese aliases; mismatches fail", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa7-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa7");
			// 中文别名与英文等价
			await saveModelAndPlan(
				store,
				"pa7",
				closureModel({ domain: "保险反欺诈调查" }),
				closurePlan({ domain: "保险欺诈调查" }),
			);
			const report = await store.checkProfessionalCase({ projectId: "pa7" });
			expect(report.issues.some((item) => item.code === "PROFESSIONAL_DOMAIN_MISMATCH")).toBe(false);
			const domainReport = await store.checkProfessionalDomain({ projectId: "pa7" });
			expect(domainReport.issues.some((item) => item.code === "PROFESSIONAL_DOMAIN_MISMATCH")).toBe(false);
			// 真正不匹配
			await saveModelAndPlan(store, "pa7", closureModel({ domain: "forensic-accounting" }), closurePlan());
			const mismatch = await store.checkProfessionalDomain({ projectId: "pa7" });
			expect(mismatch.issues.some((item) => item.code === "PROFESSIONAL_DOMAIN_MISMATCH")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA8: case ids share one namespace across actions, conflicts, and consequences", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa8-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa8");
			await saveModelAndPlan(
				store,
				"pa8",
				closureModel(),
				closurePlan({
					startingStageId: "S2",
					conflictsOfInterest: [
						{
							id: "A1",
							description: "冲突与 action 同名",
							source: "other",
							affectedActionIds: [],
							affectedStageIds: [],
							severity: "low",
							disclosureRequired: false,
							mitigation: "disclose",
							mitigationDescription: "披露",
							remainingRisk: "无",
						},
					],
				}),
			);
			const report = await store.checkProfessionalCase({ projectId: "pa8" });
			expect(report.issues.some((item) => item.code === "DUPLICATE_PROFESSIONAL_CASE_ID")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});

	it("PA9: the starting stage must be an entry stage", async () => {
		const cwd = await mkdtemp(join(tmpdir(), "pi-novel-pa9-"));
		try {
			const store = new NovelProjectStore(cwd);
			await initProject(store, "pa9");
			await saveModelAndPlan(store, "pa9", closureModel(), closurePlan({ startingStageId: "S2" }));
			const report = await store.checkProfessionalCase({ projectId: "pa9" });
			expect(report.issues.some((item) => item.code === "CASE_START_STAGE_NOT_ENTRY")).toBe(true);
		} finally {
			await rm(cwd, { recursive: true, force: true });
		}
	});
});
