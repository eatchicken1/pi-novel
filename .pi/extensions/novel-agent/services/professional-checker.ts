import type {
	ProfessionalAuthorityBoundary,
	ProfessionalCasePlan,
	ProfessionalDomainModel,
	ProfessionalEscalationPath,
	ProfessionalEvidenceSource,
	ProfessionalGuardrail,
	ProfessionalWorkflowStage,
} from "../schemas.ts";
import { normalizeProfessionalDomain } from "./story-profile.ts";

// Professional Domain Engine 确定性检查：
// 只验证职业系统的权限、流程、证据访问、冲突与后果结构是否自洽；
// 不做法律结论（罪责/应否拒赔/法院判决），不自动创建 Mystery clue / Marriage harm / Chase Wife harm。
//
// Authority closure：
// - stage allowedAuthorityIds 真正约束 action；
// - evidence requiredAuthorityIds 是 AND（全部满足），且所有 accessMode 都尊重它；
// - authority level（direct/conditional/approval-required/not-authorized）全部产生机械行为；
// - guardrail：appliesToStageIds 为空 = global，applicable guardrail 必须被 action 引用；
// - conflict：effective affected action = affectedActionIds ∪ 受影响 stage 上的全部 action；recusal/reassignment 均禁止继续执行；
// - domain canonicalize（中文别名等价）；case 内 action/conflict/consequence 共享唯一 namespace；
// - startingStageId 必须是 isEntry 阶段。

export type ProfessionalIssueSeverity = "error" | "warning";

export interface ProfessionalIssue {
	code: string;
	severity: ProfessionalIssueSeverity;
	message: string;
}

function issue(code: string, severity: ProfessionalIssueSeverity, message: string): ProfessionalIssue {
	return { code, severity, message };
}

// reader-sim 硬隔离：统一反斜杠后按 author-private roots 匹配（professional 规划同属作者秘密）。
export function isProfessionalPrivatePath(relativePath: string): boolean {
	const normalized = relativePath.replace(/\\/gu, "/");
	return normalized.startsWith("canon/professional/") || normalized.startsWith("work/professional/") || normalized.startsWith("outline/professional/");
}

interface DomainIndex {
	authorities: Map<string, ProfessionalAuthorityBoundary>;
	stages: Map<string, ProfessionalWorkflowStage>;
	evidence: Map<string, ProfessionalEvidenceSource>;
	guardrails: Map<string, ProfessionalGuardrail>;
	escalations: Map<string, ProfessionalEscalationPath>;
}

function indexDomain(model: ProfessionalDomainModel): DomainIndex {
	return {
		authorities: new Map(model.authorityBoundaries.map((item) => [item.id, item])),
		stages: new Map(model.workflowStages.map((item) => [item.id, item])),
		evidence: new Map(model.evidenceSources.map((item) => [item.id, item])),
		guardrails: new Map(model.guardrails.map((item) => [item.id, item])),
		escalations: new Map(model.escalationPaths.map((item) => [item.id, item])),
	};
}

function checkUniqueProfessionalIds(model: ProfessionalDomainModel): ProfessionalIssue[] {
	const issues: ProfessionalIssue[] = [];
	const seen = new Map<string, string>();
	const collections: Array<[string, Array<{ id: string }>]> = [
		["authority", model.authorityBoundaries],
		["workflow stage", model.workflowStages],
		["evidence source", model.evidenceSources],
		["guardrail", model.guardrails],
		["escalation path", model.escalationPaths],
	];
	for (const [kind, items] of collections) {
		for (const item of items) {
			const previous = seen.get(item.id);
			if (previous !== undefined) issues.push(issue("DUPLICATE_PROFESSIONAL_ID", "error", `duplicate ${kind} id "${item.id}" (also used by ${previous})`));
			else seen.set(item.id, kind);
		}
	}
	return issues;
}

const RESTRICTED_ACCESS_MODES = new Set([
	"internal-approval",
	"consent-based",
	"contractual-request",
	"collaboration-request",
	"regulator-or-law-enforcement-only",
]);

export function checkProfessionalDomain(model: ProfessionalDomainModel | undefined, expectedDomain?: string): ProfessionalIssue[] {
	if (model === undefined) return [issue("MISSING_PROFESSIONAL_DOMAIN_MODEL", "error", "a confirmed or proposed professional domain model is required")];
	const issues: ProfessionalIssue[] = [];
	if (expectedDomain !== undefined && normalizeProfessionalDomain(model.domain) !== normalizeProfessionalDomain(expectedDomain)) {
		issues.push(issue("PROFESSIONAL_DOMAIN_MISMATCH", "error", `domain model "${model.domain}" does not match the project professional domain "${expectedDomain}"`));
	}
	issues.push(...checkUniqueProfessionalIds(model));
	const index = indexDomain(model);
	const authorityIds = new Set(index.authorities.keys());
	const stageIds = new Set(index.stages.keys());
	const escalationIds = new Set(index.escalations.keys());
	for (const authority of model.authorityBoundaries) {
		for (const pathId of authority.escalationPathIds) {
			if (!escalationIds.has(pathId)) issues.push(issue("AUTHORITY_ESCALATION_REF_MISSING", "error", `authority "${authority.id}" references missing escalation path "${pathId}"`));
		}
		if (authority.authorityLevel === "conditional" && authority.conditions.length === 0) {
			issues.push(issue("CONDITIONAL_AUTHORITY_WITHOUT_CONDITION", "error", `authority "${authority.id}" is conditional but declares no conditions`));
		}
		if (authority.authorityLevel === "approval-required" && authority.approvalRole === undefined) {
			issues.push(issue("APPROVAL_AUTHORITY_WITHOUT_APPROVER", "error", `authority "${authority.id}" is approval-required but declares no approvalRole`));
		}
	}
	for (const stage of model.workflowStages) {
		for (const authorityId of stage.allowedAuthorityIds) {
			if (!authorityIds.has(authorityId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `workflow stage "${stage.id}" references missing authority "${authorityId}"`));
		}
		for (const nextId of stage.possibleNextStageIds) {
			if (!stageIds.has(nextId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `workflow stage "${stage.id}" references missing next stage "${nextId}"`));
		}
	}
	for (const evidence of model.evidenceSources) {
		for (const authorityId of evidence.requiredAuthorityIds) {
			if (!authorityIds.has(authorityId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `evidence source "${evidence.id}" references missing authority "${authorityId}"`));
		}
		if (RESTRICTED_ACCESS_MODES.has(evidence.accessMode) && evidence.requiredAuthorityIds.length === 0) {
			issues.push(issue("EVIDENCE_ACCESS_WITHOUT_AUTHORITY", "error", `evidence source "${evidence.id}" declares restricted access mode "${evidence.accessMode}" but no required authority`));
		}
	}
	for (const guardrail of model.guardrails) {
		for (const stageId of guardrail.appliesToStageIds) {
			if (!stageIds.has(stageId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `guardrail "${guardrail.id}" references missing stage "${stageId}"`));
		}
		for (const authorityId of guardrail.requiredAuthorityIds) {
			if (!authorityIds.has(authorityId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `guardrail "${guardrail.id}" references missing authority "${authorityId}"`));
		}
	}
	// workflow 结构
	const entryStages = model.workflowStages.filter((stage) => stage.isEntry);
	if (entryStages.length === 0) issues.push(issue("WORKFLOW_ENTRY_MISSING", "error", "workflow has no entry stage (isEntry=true)"));
	const reachable = new Set<string>();
	const queue = entryStages.map((stage) => stage.id);
	while (queue.length > 0) {
		const current = queue.shift() ?? "";
		if (reachable.has(current)) continue;
		reachable.add(current);
		const stage = index.stages.get(current);
		if (stage === undefined) continue;
		for (const nextId of stage.possibleNextStageIds) {
			if (stageIds.has(nextId) && !reachable.has(nextId)) queue.push(nextId);
		}
	}
	for (const stage of model.workflowStages) {
		if (!stage.isEntry && !reachable.has(stage.id)) {
			issues.push(issue("WORKFLOW_STAGE_UNREACHABLE", "warning", `workflow stage "${stage.id}" is not reachable from any entry stage`));
		}
		if (!stage.terminal && stage.possibleNextStageIds.length === 0) {
			issues.push(issue("WORKFLOW_DEAD_END", "error", `non-terminal workflow stage "${stage.id}" has no possible next stage`));
		}
	}
	const reachableTerminal = model.workflowStages.some((stage) => stage.terminal && reachable.has(stage.id));
	if (entryStages.length > 0 && !reachableTerminal) issues.push(issue("WORKFLOW_NO_REACHABLE_TERMINAL", "error", "workflow has no terminal stage reachable from the entry stages"));
	return issues;
}

// 权限是否满足：direct 直接可用；conditional 需 condition-satisfied；approval-required 需 approval-obtained 且 approvedByRole 与 approvalRole 一致；not-authorized 永不可用。
function authorityUsable(
	authority: ProfessionalAuthorityBoundary,
	satisfactions: Array<{ authorityId: string; status: string; approvedByRole?: string }>,
): { usable: boolean; code?: string; message?: string } {
	if (authority.authorityLevel === "not-authorized") return { usable: false, code: "ACTION_OUTSIDE_AUTHORITY", message: `authority "${authority.id}" is declared not-authorized` };
	const satisfaction = satisfactions.find((item) => item.authorityId === authority.id);
	if (authority.authorityLevel === "conditional") {
		if (satisfaction?.status === "condition-satisfied") return { usable: true };
		return { usable: false, code: "CONDITIONAL_AUTHORITY_UNSATISFIED", message: `conditional authority "${authority.id}" lacks a condition-satisfied satisfaction` };
	}
	if (authority.authorityLevel === "approval-required") {
		if (satisfaction?.status === "approval-obtained" && (authority.approvalRole === undefined || satisfaction.approvedByRole === authority.approvalRole)) return { usable: true };
		return { usable: false, code: "APPROVAL_REQUIRED_NOT_SATISFIED", message: `approval-required authority "${authority.id}" lacks an approval-obtained satisfaction from "${authority.approvalRole ?? "unknown"}"` };
	}
	return { usable: true };
}

export function checkProfessionalCase(
	model: ProfessionalDomainModel | undefined,
	plan: ProfessionalCasePlan | undefined,
): ProfessionalIssue[] {
	if (model === undefined) return [issue("MISSING_PROFESSIONAL_DOMAIN_MODEL", "error", "case checks require a confirmed or proposed professional domain model")];
	if (plan === undefined) return [issue("MISSING_PROFESSIONAL_CASE_PLAN", "error", "a confirmed or proposed professional case plan is required")];
	const issues: ProfessionalIssue[] = [];
	if (normalizeProfessionalDomain(plan.domain) !== normalizeProfessionalDomain(model.domain)) {
		issues.push(issue("PROFESSIONAL_DOMAIN_MISMATCH", "error", `case plan domain "${plan.domain}" does not match domain model "${model.domain}"`));
	}
	// case 内 action/conflict/consequence 共享唯一 namespace
	const namespace = new Map<string, string>();
	const collections: Array<[string, Array<{ id: string }>]> = [
		["action", plan.actions],
		["conflict", plan.conflictsOfInterest],
		["professional consequence", plan.professionalConsequences],
		["observation", plan.observations],
	];
	for (const [kind, items] of collections) {
		for (const item of items) {
			const previous = namespace.get(item.id);
			if (previous !== undefined) issues.push(issue("DUPLICATE_PROFESSIONAL_CASE_ID", "error", `duplicate case id "${item.id}" (${previous} and ${kind})`));
			else namespace.set(item.id, kind);
		}
	}
	const index = indexDomain(model);
	const authorityIds = new Set(index.authorities.keys());
	const stageIds = new Set(index.stages.keys());
	const evidenceIds = new Set(index.evidence.keys());
	const guardrailIds = new Set(index.guardrails.keys());
	const escalationIds = new Set(index.escalations.keys());
	// startingStageId 必须存在且 isEntry
	const startingStage = index.stages.get(plan.startingStageId);
	if (startingStage === undefined) {
		issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `case plan references missing starting stage "${plan.startingStageId}"`));
	} else if (!startingStage.isEntry) {
		issues.push(issue("CASE_START_STAGE_NOT_ENTRY", "error", `starting stage "${plan.startingStageId}" is not an entry stage`));
	}
	const actionIds = new Set(plan.actions.map((action) => action.id));
	const conflictIds = new Set(plan.conflictsOfInterest.map((conflict) => conflict.id));
	const escalationIdsInPlan = new Set(plan.escalations.map((escalation) => escalation.escalationPathId));
	for (const action of plan.actions) {
		const stage = index.stages.get(action.stageId);
		if (stage === undefined) {
			issues.push(issue("ACTION_STAGE_MISSING", "error", `action "${action.id}" references missing workflow stage "${action.stageId}"`));
		} else {
			// stage allowedAuthorityIds 真正约束 action
			for (const authorityId of action.authorityIds) {
				if (!stage.allowedAuthorityIds.includes(authorityId)) {
					issues.push(issue("ACTION_AUTHORITY_NOT_ALLOWED_IN_STAGE", "error", `action "${action.id}" uses authority "${authorityId}" which is not allowed in stage "${stage.id}"`));
				}
			}
		}
		if (action.authorityIds.length === 0) {
			issues.push(issue("ACTION_AUTHORITY_MISSING", "error", `action "${action.id}" declares no authority`));
		} else {
			for (const authorityId of action.authorityIds) {
				const authority = index.authorities.get(authorityId);
				if (authority === undefined) {
					issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `action "${action.id}" references missing authority "${authorityId}"`));
				} else {
					// authority level 机械执行
					const usability = authorityUsable(authority, action.authoritySatisfactions);
					if (!usability.usable && usability.code !== undefined) issues.push(issue(usability.code, "error", `action "${action.id}" ${usability.message ?? ""}`));
				}
			}
		}
		if (action.evidenceSourceIds.length === 0) {
			issues.push(issue("ACTION_EVIDENCE_MISSING", "error", `action "${action.id}" declares no evidence source`));
		} else {
			for (const evidenceId of action.evidenceSourceIds) {
				const evidence = index.evidence.get(evidenceId);
				if (evidence === undefined) {
					issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `action "${action.id}" references missing evidence source "${evidenceId}"`));
					continue;
				}
				if (evidence.accessMode === "unavailable") {
					issues.push(issue("ACTION_EVIDENCE_INACCESSIBLE", "error", `action "${action.id}" uses evidence source "${evidenceId}" which is declared unavailable`));
					continue;
				}
				// requiredAuthorityIds 是 AND；所有 accessMode 都尊重它
				const missingRequired = evidence.requiredAuthorityIds.filter((authorityId) => !action.authorityIds.includes(authorityId));
				if (missingRequired.length > 0) {
					issues.push(issue("ACTION_EVIDENCE_INACCESSIBLE", "error", `action "${action.id}" lacks required authorities ${missingRequired.join(", ")} for evidence source "${evidenceId}" (${evidence.accessMode})`));
				}
			}
		}
		// applicable guardrail（global 或包含当前 stage）必须被引用；requiredAuthorityIds 同样 AND
		const applicableGuardrails = [...index.guardrails.values()].filter((guardrail) => guardrail.appliesToStageIds.length === 0 || (stage !== undefined && guardrail.appliesToStageIds.includes(stage.id)));
		for (const guardrail of applicableGuardrails) {
			if (!action.guardrailIds.includes(guardrail.id)) {
				issues.push(issue("ACTION_MISSING_APPLICABLE_GUARDRAIL", "error", `action "${action.id}" does not reference applicable guardrail "${guardrail.id}"`));
			}
			const missingGuardrailAuthority = guardrail.requiredAuthorityIds.filter((authorityId) => !action.authorityIds.includes(authorityId));
			if (missingGuardrailAuthority.length > 0) {
				issues.push(issue("GUARDRAIL_AUTHORITY_UNSATISFIED", "error", `action "${action.id}" lacks guardrail "${guardrail.id}" required authorities ${missingGuardrailAuthority.join(", ")}`));
			}
		}
		for (const guardrailId of action.guardrailIds) {
			if (!guardrailIds.has(guardrailId)) issues.push(issue("ACTION_GUARDRAIL_MISSING_REF", "error", `action "${action.id}" references missing guardrail "${guardrailId}"`));
		}
		if (action.escalationPathId !== undefined && !escalationIds.has(action.escalationPathId)) {
			issues.push(issue("CASE_ESCALATION_REF_MISSING", "error", `action "${action.id}" references missing escalation path "${action.escalationPathId}"`));
		}
	}
	// effective affected action = affectedActionIds ∪ 受影响 stage 上的全部 action
	const effectiveAffectedActions = (affectedActionIds: string[], affectedStageIds: string[]): Set<string> => {
		const effective = new Set(affectedActionIds.filter((actionId) => actionIds.has(actionId)));
		for (const action of plan.actions) {
			if (affectedStageIds.includes(action.stageId)) effective.add(action.id);
		}
		return effective;
	};
	for (const conflict of plan.conflictsOfInterest) {
		for (const actionId of conflict.affectedActionIds) {
			if (!actionIds.has(actionId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `conflict "${conflict.id}" references missing action "${actionId}"`));
		}
		for (const stageId of conflict.affectedStageIds) {
			if (!stageIds.has(stageId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `conflict "${conflict.id}" references missing stage "${stageId}"`));
		}
		const effective = effectiveAffectedActions(conflict.affectedActionIds, conflict.affectedStageIds);
		if ((conflict.severity === "high" || conflict.severity === "critical") && conflict.mitigation === "unresolved" && effective.size > 0) {
			issues.push(issue("UNMITIGATED_PROFESSIONAL_CONFLICT", "error", `high/critical conflict "${conflict.id}" is unresolved but ${effective.size} affected action(s) remain`));
		}
		if (conflict.mitigation === "recusal" && effective.size > 0) {
			issues.push(issue("ACTION_AFTER_RECUSAL", "error", `conflict "${conflict.id}" requires recusal but ${effective.size} affected action(s) remain`));
		}
		if (conflict.mitigation === "reassignment" && effective.size > 0) {
			issues.push(issue("ACTION_AFTER_REASSIGNMENT", "error", `conflict "${conflict.id}" requires reassignment but ${effective.size} affected action(s) remain`));
		}
	}
	for (const escalation of plan.escalations) {
		if (!escalationIds.has(escalation.escalationPathId)) issues.push(issue("CASE_ESCALATION_REF_MISSING", "error", `case plan references missing escalation path "${escalation.escalationPathId}"`));
	}
	for (const consequence of plan.professionalConsequences) {
		for (const triggerRefId of consequence.triggerRefIds) {
			if (!actionIds.has(triggerRefId) && !conflictIds.has(triggerRefId) && !escalationIdsInPlan.has(triggerRefId)) {
				issues.push(issue("PROFESSIONAL_CONSEQUENCE_REF_MISSING", "error", `professional consequence "${consequence.id}" references missing trigger "${triggerRefId}"`));
			}
		}
	}
	// Observation 桥接：EvidenceSource → Action → Observation（mysteryClueId 由 unified 层校验）
	for (const observation of plan.observations) {
		if (!actionIds.has(observation.actionId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `observation "${observation.id}" references missing action "${observation.actionId}"`));
		if (!evidenceIds.has(observation.evidenceSourceId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `observation "${observation.id}" references missing evidence source "${observation.evidenceSourceId}"`));
	}
	return issues;
}
