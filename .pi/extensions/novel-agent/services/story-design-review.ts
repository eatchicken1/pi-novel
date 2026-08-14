// Story Design Review：PRE-DRAFT 设计评审（P0-P4），合并确定性检查与模型发现。
// 注意：这是设计阶段评审，不混入 prose style；prose 在 chapter diagnosis 阶段处理。
import type { DesignFinding } from "../schemas.ts";
import type { DesignCheckFinding } from "./story-design.ts";

export type DesignFindingCategory = DesignFinding["category"];
export type DesignPriority = DesignFinding["priority"];

const DEFAULT_CATEGORY: DesignFindingCategory = "causality-architecture";

const CODE_CATEGORY: Record<string, DesignFindingCategory> = {
	// logical / authority
	CLUE_WITHOUT_LEGAL_ACQUISITION: "logical-authority",
	STORY_DIRECTIONS_TOO_SIMILAR: "logical-authority",
	STORY_DIRECTIONS_DUPLICATE_ID: "logical-authority",
	PROMISE_DUPLICATE_ID: "logical-authority",
	ARCHITECTURE_CANDIDATES_DUPLICATE_ID: "logical-authority",
	ARCHITECTURE_CANDIDATE_CHAPTER_OVERLAP: "logical-authority",
	COMPARISON_RECOMMENDATION_UNKNOWN: "logical-authority",
	COMPARISON_DIMENSION_CANDIDATE_UNKNOWN: "logical-authority",
	ANCHOR_EVENT_UNKNOWN: "logical-authority",
	ANCHOR_SETUP_MISSING: "logical-authority",
	CAUSAL_LINK_FROM_UNKNOWN: "logical-authority",
	CAUSAL_LINK_TO_UNKNOWN: "logical-authority",
	BRIDGE_REFERENCE_INVALID: "logical-authority",
	PROMISE_TRACE_UNKNOWN: "logical-authority",
	PROMISE_TRACE_EVENT_UNKNOWN: "logical-authority",
	QUESTION_MOVEMENT_UNKNOWN: "logical-authority",
	// causality / architecture
	FOUNDATION_ENGINES_ISOLATED: "causality-architecture",
	FOUNDATION_PROFESSIONAL_MYSTERY_DETACHED: "causality-architecture",
	FOUNDATION_MARRIAGE_CASE_DETACHED: "causality-architecture",
	FOUNDATION_SOCIAL_SYSTEM_DETACHED: "causality-architecture",
	FOUNDATION_CHASE_HARM_UNGROUNDED: "causality-architecture",
	ENDING_PAYOFF_UNEARNED: "causality-architecture",
	ANCHOR_WITHOUT_CAUSE: "causality-architecture",
	ANCHOR_WITHOUT_DOWNSTREAM_EFFECT: "causality-architecture",
	ANCHOR_ONLY_INFORMATIONAL: "causality-architecture",
	MIDPOINT_NOT_IRREVERSIBLE: "causality-architecture",
	CLIMAX_NOT_PREPARED: "causality-architecture",
	ENDING_NOT_CAUSED_BY_STORY: "causality-architecture",
	EVENT_CAUSALLY_WEAK: "causality-architecture",
	EVENT_DEPENDS_ON_COINCIDENCE: "causality-architecture",
	EVENT_ONLY_EXISTS_FOR_INFORMATION: "causality-architecture",
	EVENT_FILLER_RISK: "causality-architecture",
	CLUE_WITHOUT_STRATEGIC_EFFECT: "causality-architecture",
	CLIMAX_DECONVERGES: "causality-architecture",
	CASE_TRUTH_WITHOUT_PERSONAL_TRUTH: "causality-architecture",
	INFORMATION_WITHOUT_DECISION_RUN: "causality-architecture",
	// character / relationship
	TURNING_POINT_WITHOUT_DECISION_CAUSE: "character-relationship",
	SPOUSE_PLOT_COLLAPSES_TO_PURSUIT: "character-relationship",
	HEROINE_KNOWLEDGE_OUTRUNS_AGENCY: "character-relationship",
	// suspense / pacing / commercial
	PRESSURE_PLATEAU: "suspense-pacing-commercial",
	ALL_PRESSURES_MOVE_TOGETHER: "suspense-pacing-commercial",
	NO_RECOVERY_BEAT: "suspense-pacing-commercial",
	MIDPOINT_PRESSURE_UNCHANGED: "suspense-pacing-commercial",
	CLIMAX_PRESSURE_NOT_CONVERGED: "suspense-pacing-commercial",
	QUESTION_OPEN_TOO_LONG_WITHOUT_DEEPENING: "suspense-pacing-commercial",
	QUESTION_CLOSED_WITHOUT_PAYOFF: "suspense-pacing-commercial",
	TOO_MANY_SIMULTANEOUS_MAJOR_QUESTIONS: "suspense-pacing-commercial",
	ALL_MAJOR_QUESTIONS_CLOSE_BEFORE_CLIMAX: "suspense-pacing-commercial",
	PROMISE_WITHOUT_PAYOFF_PLAN: "suspense-pacing-commercial",
	PROMISE_PAYOFF_TOO_EARLY: "suspense-pacing-commercial",
	PROMISE_NOT_CONNECTED_TO_STORY: "suspense-pacing-commercial",
	PROMISE_SETUP_MISSING: "suspense-pacing-commercial",
	PROMISE_ESCALATION_MISSING: "suspense-pacing-commercial",
	PROMISE_PAYOFF_MISSING: "suspense-pacing-commercial",
	PROMISE_PAYOFF_NOT_CAUSED: "suspense-pacing-commercial",
	PROMISE_WITHOUT_TRACE: "suspense-pacing-commercial",
	FALSE_MODEL_EXPLAINS_NOTHING: "suspense-pacing-commercial",
	FALSE_MODEL_ONLY_EXISTS_FOR_TWIST: "suspense-pacing-commercial",
	TRUE_MODEL_TOO_EARLY_OBVIOUS: "suspense-pacing-commercial",
	CORE_CLUE_WITHOUT_REINTERPRETATION: "suspense-pacing-commercial",
	CLIMAX_CHOICE_WITHOUT_COST: "suspense-pacing-commercial",
	CLIMAX_CHOICE_COST_MISMATCH: "suspense-pacing-commercial",
	// distinctiveness / theme / voice
	PROFESSIONAL_PROMISE_WITHOUT_PROFESSIONAL_REFS: "distinctiveness-theme-voice",
	RELATIONSHIP_PROMISE_WITHOUT_RELATIONSHIP_REFS: "distinctiveness-theme-voice",
	SOCIAL_PROMISE_WITHOUT_SYSTEM_MECHANISM: "distinctiveness-theme-voice",
	ARCHITECTURE_CANDIDATES_TOO_SIMILAR: "distinctiveness-theme-voice",
	ARCHITECTURE_CANDIDATES_PARTIALLY_SIMILAR: "distinctiveness-theme-voice",
	STORY_DIRECTIONS_PARTIALLY_SIMILAR: "distinctiveness-theme-voice",
	FOUNDATION_LINK_REF_EMPTY: "distinctiveness-theme-voice",
};

const P0_CODES = new Set([
	"CLUE_WITHOUT_LEGAL_ACQUISITION",
	"STORY_DIRECTIONS_TOO_SIMILAR",
	"STORY_DIRECTIONS_DUPLICATE_ID",
	"PROMISE_DUPLICATE_ID",
	"ARCHITECTURE_CANDIDATES_DUPLICATE_ID",
	"ARCHITECTURE_CANDIDATE_CHAPTER_OVERLAP",
	"COMPARISON_RECOMMENDATION_UNKNOWN",
	"COMPARISON_DIMENSION_CANDIDATE_UNKNOWN",
	"ANCHOR_EVENT_UNKNOWN",
	"ANCHOR_SETUP_MISSING",
	"CAUSAL_LINK_FROM_UNKNOWN",
	"CAUSAL_LINK_TO_UNKNOWN",
	"BRIDGE_REFERENCE_INVALID",
	"PROMISE_TRACE_UNKNOWN",
	"PROMISE_TRACE_EVENT_UNKNOWN",
	"QUESTION_MOVEMENT_UNKNOWN",
]);

const P1_CODES = new Set([
	"FOUNDATION_ENGINES_ISOLATED",
	"FOUNDATION_PROFESSIONAL_MYSTERY_DETACHED",
	"FOUNDATION_MARRIAGE_CASE_DETACHED",
	"FOUNDATION_SOCIAL_SYSTEM_DETACHED",
	"FOUNDATION_CHASE_HARM_UNGROUNDED",
	"ENDING_PAYOFF_UNEARNED",
	"ANCHOR_WITHOUT_CAUSE",
	"CLIMAX_NOT_PREPARED",
	"ENDING_NOT_CAUSED_BY_STORY",
	"EVENT_CAUSALLY_WEAK",
	"EVENT_DEPENDS_ON_COINCIDENCE",
	"EVENT_ONLY_EXISTS_FOR_INFORMATION",
	"CLIMAX_DECONVERGES",
	"CASE_TRUTH_WITHOUT_PERSONAL_TRUTH",
	"INFORMATION_WITHOUT_DECISION_RUN",
]);

const P2_CODES = new Set([
	"TURNING_POINT_WITHOUT_DECISION_CAUSE",
	"SPOUSE_PLOT_COLLAPSES_TO_PURSUIT",
	"HEROINE_KNOWLEDGE_OUTRUNS_AGENCY",
	"ANCHOR_WITHOUT_DOWNSTREAM_EFFECT",
	"ANCHOR_ONLY_INFORMATIONAL",
	"MIDPOINT_NOT_IRREVERSIBLE",
	"CLUE_WITHOUT_STRATEGIC_EFFECT",
]);

const P3_CODES = new Set([
	"EVENT_FILLER_RISK",
	"PRESSURE_PLATEAU",
	"ALL_PRESSURES_MOVE_TOGETHER",
	"NO_RECOVERY_BEAT",
	"MIDPOINT_PRESSURE_UNCHANGED",
	"CLIMAX_PRESSURE_NOT_CONVERGED",
	"QUESTION_OPEN_TOO_LONG_WITHOUT_DEEPENING",
	"QUESTION_CLOSED_WITHOUT_PAYOFF",
	"TOO_MANY_SIMULTANEOUS_MAJOR_QUESTIONS",
	"ALL_MAJOR_QUESTIONS_CLOSE_BEFORE_CLIMAX",
	"PROMISE_WITHOUT_PAYOFF_PLAN",
	"PROMISE_PAYOFF_TOO_EARLY",
	"PROMISE_NOT_CONNECTED_TO_STORY",
	"PROMISE_SETUP_MISSING",
	"PROMISE_ESCALATION_MISSING",
	"PROMISE_PAYOFF_MISSING",
	"PROMISE_PAYOFF_NOT_CAUSED",
	"PROMISE_WITHOUT_TRACE",
	"FALSE_MODEL_EXPLAINS_NOTHING",
	"FALSE_MODEL_ONLY_EXISTS_FOR_TWIST",
	"TRUE_MODEL_TOO_EARLY_OBVIOUS",
	"CORE_CLUE_WITHOUT_REINTERPRETATION",
	"CLIMAX_CHOICE_WITHOUT_COST",
	"CLIMAX_CHOICE_COST_MISMATCH",
]);

export function priorityForDesignCode(code: string, severity: "error" | "warning"): DesignPriority {
	if (P0_CODES.has(code)) return "P0";
	if (P1_CODES.has(code)) return "P1";
	if (P2_CODES.has(code)) return "P2";
	if (P3_CODES.has(code)) return "P3";
	// 未登记代码：error → P1，warning → P3。
	return severity === "error" ? "P1" : "P3";
}

export function categoryForDesignCode(code: string): DesignFindingCategory {
	return CODE_CATEGORY[code] ?? DEFAULT_CATEGORY;
}

function deterministicToFinding(check: DesignCheckFinding, index: number): DesignFinding {
	return {
		id: `DESIGN-${index}`,
		priority: priorityForDesignCode(check.code, check.severity),
		category: categoryForDesignCode(check.code),
		problem: check.message,
		targetRefs: check.targetRefs ?? [],
		recommendedStrategy: "结合问题定位到具体 movement/anchor/event 后局部修订，重跑 review_story_design",
		source: "deterministic",
		code: check.code,
	};
}

export function mergeDesignFindings(deterministic: DesignCheckFinding[], modelFindings: DesignFinding[]): DesignFinding[] {
	const merged: DesignFinding[] = [];
	const deterministicCodes = new Set(deterministic.map((check) => check.code));
	deterministic.forEach((check, index) => merged.push(deterministicToFinding(check, index + 1)));
	// 模型发现：与确定性检查同 code 的去重（以确定性为准）；其余保留。
	const modelSeen = new Set<string>();
	for (const finding of modelFindings) {
		const key = finding.code !== undefined ? `code:${finding.code}` : `problem:${finding.problem}`;
		if (modelSeen.has(key)) continue;
		modelSeen.add(key);
		if (finding.code !== undefined && deterministicCodes.has(finding.code)) continue;
		merged.push({
			id: finding.id ?? `MODEL-${merged.length + 1}`,
			priority: finding.priority,
			category: finding.category,
			problem: finding.problem,
			targetRefs: finding.targetRefs,
			recommendedStrategy: finding.recommendedStrategy.length > 0 ? finding.recommendedStrategy : "按问题定位后局部修订，重跑 review_story_design",
			source: "model",
			code: finding.code,
		});
	}
	return merged.sort((left, right) => left.priority.localeCompare(right.priority));
}

export function verdictForFindings(findings: DesignFinding[]): "clean" | "needs-revision" | "major-revision" {
	if (findings.some((finding) => finding.priority === "P0")) return "major-revision";
	if (findings.some((finding) => finding.priority === "P1" || finding.priority === "P2")) return "needs-revision";
	return "clean";
}
