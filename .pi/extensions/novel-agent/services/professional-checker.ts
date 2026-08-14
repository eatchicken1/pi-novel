import type {
	ProfessionalAuthorityBoundary,
	ProfessionalCasePlan,
	ProfessionalDomainModel,
	ProfessionalEscalationPath,
	ProfessionalEvidenceSource,
	ProfessionalGuardrail,
	ProfessionalWorkflowStage,
} from "../schemas.ts";

// Professional Domain Engine 确定性检查：
// 只验证职业系统的权限、流程、证据访问、冲突与后果结构是否自洽；
// 不做法律结论（罪责/应否拒赔/法院判决），不自动创建 Mystery clue / Marriage harm / Chase Wife harm。

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

export function checkProfessionalDomain(model: ProfessionalDomainModel | undefined): ProfessionalIssue[] {
	if (model === undefined) return [issue("MISSING_PROFESSIONAL_DOMAIN_MODEL", "error", "a confirmed or proposed professional domain model is required")];
	const issues: ProfessionalIssue[] = [];
	issues.push(...checkUniqueProfessionalIds(model));
	const index = indexDomain(model);
	const authorityIds = new Set(index.authorities.keys());
	const stageIds = new Set(index.stages.keys());
	const escalationIds = new Set(index.escalations.keys());
	for (const authority of model.authorityBoundaries) {
		for (const pathId of authority.escalationPathIds) {
			if (!escalationIds.has(pathId)) issues.push(issue("AUTHORITY_ESCALATION_REF_MISSING", "error", `authority "${authority.id}" references missing escalation path "${pathId}"`));
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

export function checkProfessionalCase(
	model: ProfessionalDomainModel | undefined,
	plan: ProfessionalCasePlan | undefined,
): ProfessionalIssue[] {
	if (model === undefined) return [issue("MISSING_PROFESSIONAL_DOMAIN_MODEL", "error", "case checks require a confirmed or proposed professional domain model")];
	if (plan === undefined) return [issue("MISSING_PROFESSIONAL_CASE_PLAN", "error", "a confirmed or proposed professional case plan is required")];
	const issues: ProfessionalIssue[] = [];
	if (plan.domain.trim().toLowerCase() !== model.domain.trim().toLowerCase()) {
		issues.push(issue("PROFESSIONAL_DOMAIN_MISMATCH", "error", `case plan domain "${plan.domain}" does not match domain model "${model.domain}"`));
	}
	const index = indexDomain(model);
	const authorityIds = new Set(index.authorities.keys());
	const stageIds = new Set(index.stages.keys());
	const evidenceIds = new Set(index.evidence.keys());
	const guardrailIds = new Set(index.guardrails.keys());
	const escalationIds = new Set(index.escalations.keys());
	if (!stageIds.has(plan.startingStageId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `case plan references missing starting stage "${plan.startingStageId}"`));
	const actionIds = new Set(plan.actions.map((action) => action.id));
	for (const action of plan.actions) {
		if (!stageIds.has(action.stageId)) issues.push(issue("ACTION_STAGE_MISSING", "error", `action "${action.id}" references missing workflow stage "${action.stageId}"`));
		if (action.authorityIds.length === 0) {
			issues.push(issue("ACTION_AUTHORITY_MISSING", "error", `action "${action.id}" declares no authority`));
		} else {
			for (const authorityId of action.authorityIds) {
				const authority = index.authorities.get(authorityId);
				if (authority === undefined) {
					issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `action "${action.id}" references missing authority "${authorityId}"`));
				} else if (authority.authorityLevel === "not-authorized") {
					issues.push(issue("ACTION_OUTSIDE_AUTHORITY", "error", `action "${action.id}" executes authority "${authorityId}" which is declared not-authorized`));
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
				} else if (RESTRICTED_ACCESS_MODES.has(evidence.accessMode) && !evidence.requiredAuthorityIds.some((authorityId) => action.authorityIds.includes(authorityId))) {
					issues.push(issue("ACTION_EVIDENCE_INACCESSIBLE", "error", `action "${action.id}" lacks an authority required by restricted evidence source "${evidenceId}" (${evidence.accessMode})`));
				}
			}
		}
		for (const guardrailId of action.guardrailIds) {
			if (!guardrailIds.has(guardrailId)) issues.push(issue("ACTION_GUARDRAIL_MISSING_REF", "error", `action "${action.id}" references missing guardrail "${guardrailId}"`));
		}
		if (action.escalationPathId !== undefined && !escalationIds.has(action.escalationPathId)) {
			issues.push(issue("CASE_ESCALATION_REF_MISSING", "error", `action "${action.id}" references missing escalation path "${action.escalationPathId}"`));
		}
	}
	const conflictIds = new Set(plan.conflictsOfInterest.map((conflict) => conflict.id));
	for (const conflict of plan.conflictsOfInterest) {
		for (const actionId of conflict.affectedActionIds) {
			if (!actionIds.has(actionId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `conflict "${conflict.id}" references missing action "${actionId}"`));
		}
		for (const stageId of conflict.affectedStageIds) {
			if (!stageIds.has(stageId)) issues.push(issue("PROFESSIONAL_REFERENCE_MISSING", "error", `conflict "${conflict.id}" references missing stage "${stageId}"`));
		}
		if ((conflict.severity === "high" || conflict.severity === "critical") && conflict.mitigation === "unresolved" && conflict.affectedActionIds.some((actionId) => actionIds.has(actionId))) {
			issues.push(issue("UNMITIGATED_PROFESSIONAL_CONFLICT", "error", `high/critical conflict "${conflict.id}" is unresolved but its affected actions remain in the plan`));
		}
		if (conflict.mitigation === "recusal" && conflict.affectedActionIds.some((actionId) => actionIds.has(actionId))) {
			issues.push(issue("ACTION_AFTER_RECUSAL", "error", `conflict "${conflict.id}" requires recusal but affected actions remain in the plan`));
		}
	}
	const escalationIdsInPlan = new Set(plan.escalations.map((escalation) => escalation.escalationPathId));
	for (const escalation of plan.escalations) {
		if (!escalationIds.has(escalation.escalationPathId)) issues.push(issue("CASE_ESCALATION_REF_MISSING", "error", `case plan references missing escalation path "${escalation.escalationPathId}"`));
	}
	const consequenceIds = new Set(plan.professionalConsequences.map((consequence) => consequence.id));
	for (const consequence of plan.professionalConsequences) {
		for (const triggerRefId of consequence.triggerRefIds) {
			if (!actionIds.has(triggerRefId) && !conflictIds.has(triggerRefId) && !escalationIdsInPlan.has(triggerRefId)) {
				issues.push(issue("PROFESSIONAL_CONSEQUENCE_REF_MISSING", "error", `professional consequence "${consequence.id}" references missing trigger "${triggerRefId}"`));
			}
		}
	}
	return issues;
}
