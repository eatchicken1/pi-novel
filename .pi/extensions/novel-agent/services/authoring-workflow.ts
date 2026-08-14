// Author Workflow Service：编排能力层，不复制任何引擎事实。
import type { RepairabilityInfo } from "./story-design.ts";

export type AuthoringPhase =
	| "idea"
	| "direction"
	| "concept"
	| "foundation"
	| "architecture"
	| "design-review"
	| "event-design"
	| "chapter-planning"
	| "drafting"
	| "local-revision"
	| "structural-review"
	| "manuscript-revision"
	| "finalization"
	| "export";

export type WorkflowStatus = "ready" | "completed" | "blocked" | "needs-review";
export interface WorkflowBlocker { code: string; message: string; source?: string }
export interface WorkflowNextAction { tool: string; reason: string; chapter?: number }
export interface WorkflowResult { projectId: string; workflowPhase: AuthoringPhase; status: WorkflowStatus; createdArtifacts: string[]; updatedArtifacts: string[]; reports: string[]; blockers: WorkflowBlocker[]; warnings: string[]; confirmationRequired?: boolean; awaitingConfirmation?: string[]; recommendedNextActions: WorkflowNextAction[]; repairability?: RepairabilityInfo; }
export interface WorkflowFacts { hasConcept: boolean; hasDirections: boolean; hasFoundation: boolean; hasArchitecture: boolean; hasDesignReview: boolean; hasDesignBlockers: boolean; hasEventGraph: boolean; hasPlanForNext: boolean; hasDraftForNext: boolean; hasDiagnosisForNext: boolean; diagnosisHasBlockers: boolean; allChaptersFinalized: boolean; hasManuscriptReview: boolean; hasUnifiedSeal: boolean; nextChapter: number; foundationMissing: string[]; foundationBlockers: string[]; eventGraphBlockers: string[]; chapterBlockers: number[]; }

export function computeAuthoringPhase(facts: WorkflowFacts): AuthoringPhase {
	if (!facts.hasConcept) return facts.hasDirections ? "direction" : "idea";
	if (!facts.hasFoundation || facts.foundationMissing.length > 0) return "concept";
	if (!facts.hasArchitecture) return "foundation";
	if (!facts.hasEventGraph) return facts.hasDesignReview ? "design-review" : "architecture";
	if (!facts.hasPlanForNext) return "event-design";
	if (!facts.hasDraftForNext) return "chapter-planning";
	if (facts.diagnosisHasBlockers) return "local-revision";
	if (!facts.allChaptersFinalized) return "drafting";
	if (!facts.hasManuscriptReview) return "structural-review";
	if (!facts.hasUnifiedSeal) return "manuscript-revision";
	return "finalization";
}

export function computeFoundationReadiness(facts: WorkflowFacts): { ready: boolean; missing: string[]; blockingIssues: string[] } {
	return { ready: facts.foundationMissing.length === 0 && facts.foundationBlockers.length === 0, missing: facts.foundationMissing, blockingIssues: facts.foundationBlockers };
}

export function computeRecommendedNextActions(facts: WorkflowFacts): WorkflowNextAction[] {
	const actions: WorkflowNextAction[] = [];
	if (!facts.hasConcept) return facts.hasDirections
		? [{ tool: "develop_story_concept", reason: "方向已探索；从选定/推荐方向构建故事概念（作者确认选择或接受系统推荐）" }]
		: [{ tool: "develop_story_concept", reason: "先从一个模糊创意发展成可继续开发的故事概念；只有一句 premise 时可先 explore_story_directions" }];
	if (!facts.hasFoundation || facts.foundationMissing.length > 0 || facts.foundationBlockers.length > 0) return [{ tool: "develop_story_bible", reason: "故事概念需要发展成 proposed foundation（不会自动确认 canon）" }];
	if (!facts.hasArchitecture) return [{ tool: "design_story_architecture", reason: "foundation 已就绪，设计全书宏观结构（可先生成 2-3 个 candidate 再比较）" }];
	if (facts.hasDesignReview && facts.hasDesignBlockers) return [{ tool: "revise_story_architecture", reason: "设计评审存在 P0 问题；按 ArchitectureRevisionPlan 局部修订架构" }];
	if (!facts.hasEventGraph) return [{ tool: "build_narrative_event_graph", reason: "架构已就绪，构建全书 unified 事件图（先 Anchor Spine 再扩展）" }];
	if (!facts.hasPlanForNext) return [{ tool: "plan_chapter", reason: "事件图已就绪，规划下一章", chapter: facts.nextChapter }];
	if (!facts.hasDraftForNext) return [{ tool: "draft_chapter", reason: "章节计划已就绪，起草本章", chapter: facts.nextChapter }];
	if (facts.chapterBlockers.includes(facts.nextChapter)) return [{ tool: "revise_chapter", reason: "本章存在 P0 阻塞问题，先修订", chapter: facts.nextChapter }];
	if (!facts.hasDiagnosisForNext) return [{ tool: "diagnose_chapter", reason: "草稿已就绪，先诊断再决定是否修订", chapter: facts.nextChapter }];
	if (facts.diagnosisHasBlockers) return [{ tool: "revise_chapter", reason: "诊断发现阻塞问题", chapter: facts.nextChapter }];
	if (!facts.allChaptersFinalized) return [{ tool: "finalize_chapter", reason: "本章草稿与诊断已通过，可以定稿", chapter: facts.nextChapter }];
	if (!facts.hasManuscriptReview) return [{ tool: "review_manuscript", reason: "全部章节已定稿，做全书级结构评审" }];
	if (!facts.hasUnifiedSeal) return [{ tool: "finalize_manuscript", reason: "全书评审完成，封存手稿（Unified seal）" }];
	return [{ tool: "export_manuscript", reason: "手稿已封存，导出成稿" }];
}

export function workflowResult(projectId: string, phase: AuthoringPhase, status: WorkflowStatus, options: { createdArtifacts?: string[]; updatedArtifacts?: string[]; reports?: string[]; blockers?: WorkflowBlocker[]; warnings?: string[]; confirmationRequired?: boolean; awaitingConfirmation?: string[]; nextActions?: WorkflowNextAction[] }): WorkflowResult {
	return { projectId, workflowPhase: phase, status, createdArtifacts: options.createdArtifacts ?? [], updatedArtifacts: options.updatedArtifacts ?? [], reports: options.reports ?? [], blockers: options.blockers ?? [], warnings: options.warnings ?? [], confirmationRequired: options.confirmationRequired, awaitingConfirmation: options.awaitingConfirmation, recommendedNextActions: options.nextActions ?? [] };
}
export type DiagnosisPriority = "P0" | "P1" | "P2" | "P3" | "P4";
export interface DiagnosisSourceIssue { code: string; severity: string; message: string; eventId?: number }
export interface DiagnosisFinding { id: string; priority: DiagnosisPriority; problem: string; sourceIssues: string[]; affectedEventIds: number[]; recommendedStrategy: string }

const P0_CODES = new Set<string>(["REALIZED_REVEAL_BEFORE_PROOF", "UNIFIED_REFERENCE_MISSING", "UNIFIED_CAUSE_INVALID", "CAPABILITY_DELTA_NOT_ALLOWED", "EVENT_WITHOUT_STATE_CHANGE", "IRREVERSIBLE_WITHOUT_CONSEQUENCE", "LEGACY_EVENT_AUTHORITY_CONFLICT", "REALIZATION_MISSING", "REALIZATION_CONTENT_HASH_STALE", "REALIZATION_DRAFT_STALE", "REALIZATION_ANCHOR_INVALID", "REALIZATION_DUPLICATE", "REALIZATION_PLANNED_BUT_MISSING", "REALIZATION_UNPLANNED", "SOCIAL_QUESTION_WITHOUT_MECHANISM", "POWER_STRUCTURE_WITHOUT_BENEFICIARY", "POWER_STRUCTURE_WITHOUT_COST_BEARER", "ACTION_OUTSIDE_AUTHORITY", "ACTION_EVIDENCE_INACCESSIBLE", "EVIDENCE_ACCESS_WITHOUT_AUTHORITY", "CONDITIONAL_AUTHORITY_WITHOUT_CONDITION", "APPROVAL_AUTHORITY_WITHOUT_APPROVER", "ACTION_MISSING_APPLICABLE_GUARDRAIL", "GUARDRAIL_AUTHORITY_UNSATISFIED", "UNMITIGATED_PROFESSIONAL_CONFLICT", "ACTION_AFTER_RECUSAL", "ACTION_AFTER_REASSIGNMENT", "DUPLICATE_PROFESSIONAL_CASE_ID", "CASE_START_STAGE_NOT_ENTRY", "VERTICAL_EVIDENCE_INVALID", "REALIZED_CASE_MISSING", "REALIZED_CLUE_NEVER_REALIZED", "REALIZED_CLAIM_NEVER_REVEALED", "REALIZED_FAIRNESS_UNVERIFIABLE", "MISSING_UNIFIED_EVENT_MAP", "CLUE_APPEARS_AFTER_CLAIM_REVEAL", "DEUS_EX_MACHINA_CLUE", "REVEAL_BEFORE_PROOF", "FAIRNESS_UNVERIFIABLE", "PROFESSIONAL_DOMAIN_MISMATCH", "ACTION_AUTHORITY_NOT_ALLOWED_IN_STAGE", "missing-draft", "missing-chapter-plan", "missing-scene-contract", "missing-chapter-draft", "event draft is missing", "event draft has"]);
const P1_CODES = new Set<string>(["COLLISION_SHALLOW", "MOVEMENT_WITHOUT_CHANGE", "EXTERNAL_PLOT_STALL", "RELATIONSHIP_PLOT_DETACHED", "PROFESSIONAL_PLOT_DISAPPEARS", "CLIMAX_SINGLE_ENGINE", "SOCIAL_MECHANISM_WITHOUT_EVENT_EFFECT", "SOCIAL_PROBLEM_ONLY_BACKGROUND", "SOCIAL_STAKES_ONLY_RELATIONSHIP", "SYSTEMIC_PROBLEM_COLLAPSES_TO_SINGLE_VILLAIN", "SOCIAL_ENDING_TOO_CLEAN", "MARRIAGE_CRISIS_WITHOUT_HISTORY", "MARRIAGE_CONFLICT_TOO_EVENT_SPECIFIC", "MARRIAGE_PATTERN_WITHOUT_PAYOFF", "MARRIAGE_EXIT_WITHOUT_ACCUMULATION", "SUSPENSE_INFORMATION_WITHOUT_REINTERPRETATION", "SUSPENSE_STAKES_STAGNANT", "FALSE_MODEL_MISSING", "PROFESSION_REPLACEABLE", "THEME_ONLY_STATED", "THEME_WITHOUT_ACTIONAL_PROOF", "DISTINCTIVE_EVENT_REPEAT", "DISTINCTIVENESS_VERDICT_OVERSTATED", "DISTINCTIVENESS_BLEND_CLAIM_UNSUPPORTED", "DISTINCTIVENESS_ENGINE_UNUSED", "DISTINCTIVENESS_MAP_MISSING", "DISTINCTIVENESS_PROFILE_MISSING"]);
const P2_CODES = new Set<string>(["HEROINE_TOO_INFALLIBLE", "HEROINE_EMOTIONALLY_FLAT", "AGENCY_WITHOUT_COST", "SELF_GROWTH_ONLY_EXTERNAL_EXIT", "SUPPORTING_CHARACTER_AS_TOOL", "SIDE_CHARACTER_SINGLE_FUNCTION", "ALLIES_TOO_CONVENIENT", "HEROINE_COMPLEXITY_MISSING"]);
const P3_CODES = new Set<string>(["SECOND_ACT_FLATLINE", "OPENING_DELAYED", "EARLY_STAKES_WEAK", "MIDPOINT_WITHOUT_REFRAME", "LATE_EXPOSITION_DUMP", "ENDING_AFTERSHOCK_MISSING", "FORWARD_PRESSURE_WEAK", "agency-late", "opening-conflict-late", "event-budget", "causal-exit-late", "stale-assembly-manifest", "missing-assembly-manifest", "missing-event-draft", "repeated-injury-mechanism", "interchangeable-event-prose", "memory-overuse", "pure-psychology-run"]);
const P4_CODES = new Set<string>(["repeated-sentence-start", "template-expression", "em-dash", "repeated-psychology-or-apology", "psychology-without-action", "action-then-explanation", "uniform-paragraph-length", "epiphany-cliche", "calm-heroine", "body-cliche", "phone-turn", "short-sentence-parallelism", "repeated-sentence", "narrative-label", "agency-without-action", "missing-first-person-evidence", "role-unsatisfied", "conflict-missing", "state-delta-missing"]);

function priorityFor(code: string, severity: string): DiagnosisPriority {
	if (P0_CODES.has(code)) return "P0";
	if (P1_CODES.has(code)) return "P1";
	if (P2_CODES.has(code)) return "P2";
	if (P3_CODES.has(code)) return "P3";
	if (P4_CODES.has(code)) return "P4";
	return severity === "error" ? "P0" : "P1";
}

function eventIdFromMessage(message: string): number | undefined {
	const match = message.match(/event\s+(\d+)/iu);
	return match === null ? undefined : Number(match[1]);
}

const STRATEGIES: Record<string, string> = {
	REALIZED_REVEAL_BEFORE_PROOF: "推迟实际揭示章，或把缺失线索/前置 claim 在揭示前实际兑现进正文",
	UNIFIED_REFERENCE_MISSING: "先在对应引擎 ledger 显式补齐缺失引用，再重新检查事件图；不得静默创建",
	EVENT_WITHOUT_STATE_CHANGE: "给事件补充真实状态 delta（信息/关系/资源/风险/角色）",
	REALIZATION_CONTENT_HASH_STALE: "草稿已改，对当前修订重新保存 realization 记录",
	REALIZATION_PLANNED_BUT_MISSING: "把计划项写进本章正文并保存正文锚点",
	COLLISION_SHALLOW: "把 co-occurrence 升级为 causal/dilemma/identity 碰撞（一个选择同时改变两个引擎）",
	FORWARD_PRESSURE_WEAK: "重写本章结尾：用问题、决定、新证据、威胁或成本收尾",
	PROFESSION_REPLACEABLE: "让职业动作/权限/后果进入更多事件；替换为普通职业后故事应不成立",
	AGENCY_WITHOUT_COST: "给女主的关键选择附加可观察代价",
	HEROINE_TOO_INFALLIBLE: "给女主增加错误判断或代价高昂的选择",
	"template-expression": "重写高频模板表达，让语义通过动作与后果传递",
	"repeated-sentence-start": "打破重复句式开头，变化句长与句式",
};

export function aggregateDiagnosis(issues: DiagnosisSourceIssue[], chapter: number): DiagnosisFinding[] {
	const findings: DiagnosisFinding[] = [];
	const groups = new Map<string, { priority: DiagnosisPriority; eventIds: Set<number>; codes: Set<string>; messages: string[] }>();
	for (const issue of issues) {
		const priority = priorityFor(issue.code, issue.severity);
		const eventId = issue.eventId ?? eventIdFromMessage(issue.message);
		const subject = eventId === undefined ? "chapter" : `event:${eventId}`;
		const key = `${priority}:${subject}`;
		const group = groups.get(key) ?? { priority, eventIds: new Set<number>(), codes: new Set<string>(), messages: [] };
		if (eventId !== undefined) group.eventIds.add(eventId);
		group.codes.add(issue.code);
		group.messages.push(issue.message);
		groups.set(key, group);
	}
	let index = 1;
	for (const group of groups.values()) {
		const primaryCode = group.codes.values().next().value as string;
		findings.push({
			id: `DIAG-${chapter}-${index}`,
			priority: group.priority,
			problem: group.messages[0] ?? primaryCode,
			sourceIssues: [...group.codes],
			affectedEventIds: [...group.eventIds].sort((left, right) => left - right),
			recommendedStrategy: STRATEGIES[primaryCode] ?? "结合来源问题定位到具体事件/章节后局部修订，重跑受影响门禁",
		});
		index += 1;
	}
	return findings.sort((left, right) => left.priority.localeCompare(right.priority));
}
