// Story Design Intelligence：设计层检查与分析（proposal / analysis，不构成新的 story authority）。
// 规则说明：模型负责创意判断；本模块只做确定性检查（引用 / 因果 / 覆盖 / 一致性 / 证据 / 生命周期）。
import type {
	ArchitectureCandidate,
	CharacterDecisionPattern,
	EndingArchitecture,
	FoundationLink,
	MysteryAcquisitionEntry,
	MysteryCase,
	MysteryClue,
	ReinterpretationLadder,
	StoryDirectionCandidate,
	StoryPromiseLedger,
} from "../schemas.ts";

export interface DesignCheckFinding {
	code: string;
	severity: "error" | "warning";
	message: string;
	targetRefs?: string[];
}

const NON_EMPTY = (value: string | undefined): boolean => value !== undefined && value.trim().length > 0;

// ==== Story Direction Exploration ====
// 核心维度：候选必须在多个维度上真正不同，禁止“换名字伪候选”。
const DIRECTION_CORE_DIMENSIONS: Array<keyof StoryDirectionCandidate> = [
	"centralMystery",
	"socialMechanism",
	"relationshipFaultLine",
	"professionalDependency",
	"endingShape",
	"centralDilemma",
];

export function checkStoryDirectionsSimilarity(candidates: StoryDirectionCandidate[]): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const ids = new Set(candidates.map((candidate) => candidate.id));
	if (ids.size !== candidates.length) findings.push({ code: "STORY_DIRECTIONS_DUPLICATE_ID", severity: "error", message: "story direction candidate id 必须唯一" });
	if (candidates.length < 3) return findings;
	let differingDimensions = 0;
	for (const dimension of DIRECTION_CORE_DIMENSIONS) {
		const values = new Set(candidates.map((candidate) => String(candidate[dimension] ?? "").trim()).filter((value) => value.length > 0));
		if (values.size >= 2) differingDimensions += 1;
	}
	if (differingDimensions < 3) {
		findings.push({
			code: "STORY_DIRECTIONS_TOO_SIMILAR",
			severity: "error",
			message: `候选只在 ${differingDimensions}/6 个核心维度上不同（centralMystery / socialMechanism / relationshipFaultLine / professionalDependency / endingShape / centralDilemma）；换人物名字不算新方向`,
			targetRefs: candidates.map((candidate) => candidate.id),
		});
	} else if (differingDimensions < 5) {
		findings.push({
			code: "STORY_DIRECTIONS_PARTIALLY_SIMILAR",
			severity: "warning",
			message: `候选在 ${differingDimensions}/6 个核心维度上不同；仍有维度高度雷同，建议确认不是同一故事的变体`,
			targetRefs: candidates.map((candidate) => candidate.id),
		});
	}
	return findings;
}

export function validateStoryDirectionComparison(comparison: { recommendedCandidateIds: string[]; dimensions: Array<{ candidateIds: string[] }> } | undefined, candidateIds: string[]): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	if (comparison === undefined) return findings;
	const ids = new Set(candidateIds);
	for (const candidateId of comparison.recommendedCandidateIds) {
		if (!ids.has(candidateId)) findings.push({ code: "COMPARISON_RECOMMENDATION_UNKNOWN", severity: "error", message: `comparison 推荐的候选 ${candidateId} 不存在`, targetRefs: [candidateId] });
	}
	for (const entry of comparison.dimensions) {
		for (const candidateId of entry.candidateIds) {
			if (!ids.has(candidateId)) findings.push({ code: "COMPARISON_DIMENSION_CANDIDATE_UNKNOWN", severity: "error", message: `comparison 维度条目引用了未知候选 ${candidateId}`, targetRefs: [candidateId] });
		}
	}
	return findings;
}

// ==== Story Promise Ledger ====
export function checkStoryPromiseLedger(ledger: StoryPromiseLedger): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const ids = new Set<string>();
	for (const promise of ledger.promises) {
		if (ids.has(promise.id)) findings.push({ code: "PROMISE_DUPLICATE_ID", severity: "error", message: `promise ${promise.id} 重复`, targetRefs: [promise.id] });
		ids.add(promise.id);
		if (!NON_EMPTY(promise.expectedPayoffMovementId)) findings.push({ code: "PROMISE_WITHOUT_PAYOFF_PLAN", severity: "warning", message: `promise ${promise.id}（${promise.kind}）没有 expectedPayoffMovementId；读者承诺必须有兑现计划`, targetRefs: [promise.id] });
		else if (promise.introducedByMovementId !== undefined && promise.expectedPayoffMovementId === promise.introducedByMovementId) findings.push({ code: "PROMISE_PAYOFF_TOO_EARLY", severity: "warning", message: `promise ${promise.id} 在同一 movement 引入并兑现；承诺没有蓄力`, targetRefs: [promise.id] });
		if (promise.supportingRefs.length === 0) findings.push({ code: "PROMISE_NOT_CONNECTED_TO_STORY", severity: "warning", message: `promise ${promise.id} 没有任何 supportingRefs；承诺没有挂到具体故事元素`, targetRefs: [promise.id] });
		if (promise.kind === "professional" && !promise.supportingRefs.some((ref) => ref.kind === "professional")) findings.push({ code: "PROFESSIONAL_PROMISE_WITHOUT_PROFESSIONAL_REFS", severity: "warning", message: `职业 promise ${promise.id} 没有 professional refs；承诺与职业机制脱钩`, targetRefs: [promise.id] });
		if (promise.kind === "relationship" && !promise.supportingRefs.some((ref) => ref.kind === "marriage" || ref.kind === "chase")) findings.push({ code: "RELATIONSHIP_PROMISE_WITHOUT_RELATIONSHIP_REFS", severity: "warning", message: `关系 promise ${promise.id} 没有 marriage/chase refs；承诺与婚姻机制脱钩`, targetRefs: [promise.id] });
		if (promise.kind === "social" && !promise.supportingRefs.some((ref) => ref.kind === "social" || ref.kind === "mechanism")) findings.push({ code: "SOCIAL_PROMISE_WITHOUT_SYSTEM_MECHANISM", severity: "warning", message: `社会 promise ${promise.id} 没有 social/mechanism refs；承诺没有落在系统机制上`, targetRefs: [promise.id] });
	}
	return findings;
}

// ==== Foundation Link Map ====
function linkedDomainPairs(links: FoundationLink[]): Set<string> {
	const pairs = new Set<string>();
	for (const link of links) {
		const left = link.from.domain;
		const right = link.to.domain;
		pairs.add(left === right ? left : [left, right].sort().join("|"));
	}
	return pairs;
}

function hasLinkBetween(links: FoundationLink[], left: string, right: string): boolean {
	return links.some((link) => {
		const from = link.from.domain;
		const to = link.to.domain;
		return (from === left && to === right) || (from === right && to === left);
	});
}

export function checkFoundationLinks(links: FoundationLink[], presentDomains: string[]): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const present = new Set(presentDomains);
	const domainPairs = linkedDomainPairs(links);
	const crossDomainPairs = [...domainPairs].filter((pair) => pair.includes("|"));
	if (present.size >= 2 && crossDomainPairs.length === 0) {
		findings.push({ code: "FOUNDATION_ENGINES_ISOLATED", severity: "error", message: `foundation 包含 ${presentDomains.join("/")} 但没有任何跨引擎 link；四份设计是拼装不是合成`, targetRefs: presentDomains });
	}
	if (present.has("professional") && present.has("mystery") && !hasLinkBetween(links, "professional", "mystery")) findings.push({ code: "FOUNDATION_PROFESSIONAL_MYSTERY_DETACHED", severity: "warning", message: "professional 与 mystery 之间没有 link；职业调查必须能暴露/阻塞案件真相" });
	if (present.has("marriage") && (present.has("mystery") || present.has("professional")) && !hasLinkBetween(links, "marriage", "mystery") && !hasLinkBetween(links, "marriage", "professional")) findings.push({ code: "FOUNDATION_MARRIAGE_CASE_DETACHED", severity: "warning", message: "marriage 与案件线（mystery/professional）之间没有 link；婚姻危机必须被案件影响或反向施压" });
	if (present.has("social") && (present.has("professional") || present.has("mystery")) && !hasLinkBetween(links, "social", "professional") && !hasLinkBetween(links, "social", "mystery")) findings.push({ code: "FOUNDATION_SOCIAL_SYSTEM_DETACHED", severity: "warning", message: "social system 与 professional/mystery 之间没有 link；社会机制必须进入调查因果" });
	if (present.has("chase") && !links.some((link) => (link.from.domain === "chase" || link.to.domain === "chase") && (link.from.domain === "marriage" || link.to.domain === "marriage" || link.from.domain === "mystery" || link.to.domain === "mystery" || link.from.domain === "professional" || link.to.domain === "professional" || link.from.domain === "character" || link.to.domain === "character"))) {
		findings.push({ code: "FOUNDATION_CHASE_HARM_UNGROUNDED", severity: "warning", message: "chase harm/repair 没有来自 marriage/mystery/professional/character 的 link；追妻线伤害没有因果土壤" });
	}
	if (links.some((link) => link.from.ref.trim().length === 0 || link.to.ref.trim().length === 0)) findings.push({ code: "FOUNDATION_LINK_REF_EMPTY", severity: "warning", message: "存在 from/to ref 为空的 foundation link" });
	return findings;
}

// ==== Ending-first Design ====
export function checkEndingDesign(ending: EndingArchitecture, movementIds: Set<string> | undefined): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	for (const prerequisite of ending.requiredPrerequisites) {
		const satisfiedBy = prerequisite.satisfiedByMovementId;
		if (satisfiedBy === undefined || satisfiedBy.trim().length === 0) {
			findings.push({ code: "ENDING_PAYOFF_UNEARNED", severity: "error", message: `ending payoff（${prerequisite.payoffRef}）缺少前置 prerequisite 的落点：${prerequisite.prerequisite}；必须回推到某个更早 movement`, targetRefs: [prerequisite.payoffRef] });
		} else if (movementIds !== undefined && movementIds.size > 0 && !movementIds.has(satisfiedBy)) {
			findings.push({ code: "ENDING_PAYOFF_UNEARNED", severity: "error", message: `ending payoff（${prerequisite.payoffRef}）的 prerequisite 落点 ${satisfiedBy} 不在 movement 集合中`, targetRefs: [prerequisite.payoffRef] });
		}
	}
	if (ending.climaxChoice !== undefined) {
		if (ending.climaxChoice.options.length < 2 || ending.climaxChoice.costOfEach.length < 2) findings.push({ code: "CLIMAX_CHOICE_WITHOUT_COST", severity: "warning", message: "climax choice 必须给每个选项列出代价（options 与 costOfEach 至少 2 项）" });
		if (ending.climaxChoice.options.length !== ending.climaxChoice.costOfEach.length) findings.push({ code: "CLIMAX_CHOICE_COST_MISMATCH", severity: "warning", message: "climax choice 的 options 与 costOfEach 数量不一致" });
	}
	return findings;
}

// ==== Character Decision Intelligence ====
const EXIT_DECISION_RE = /离婚|分开|离开|辞职|退出|放弃调查|放弃职业|递交辞呈|搬走|分居/gu;
const PURSUIT_GOAL_RE = /追回|挽回|复合|追妻|求她回来|让她回家|重修于好|求和/gu;

export function checkCharacterDecisions(patterns: CharacterDecisionPattern[], movementIds: Set<string>): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const heroinePatterns = patterns.filter((pattern) => pattern.characterId === "heroine" || pattern.characterId === "protagonist");
	for (const pattern of heroinePatterns) {
		const turningPoint = EXIT_DECISION_RE.test(`${pattern.avoidedChoice} ${pattern.likelyCost} ${pattern.currentGoal}`);
		if (turningPoint && pattern.relevantRefs.length === 0) {
			findings.push({ code: "TURNING_POINT_WITHOUT_DECISION_CAUSE", severity: "warning", message: `女主 turning point（${pattern.id}：${pattern.avoidedChoice}）没有 information/value/constraint 支撑；不能“剧情需要她突然决定”`, targetRefs: [pattern.id] });
		}
	}
	// Spouse 独立目标：中后段不得只剩追妻。
	const spouseIds = [...new Set(patterns.filter((pattern) => pattern.characterId !== "heroine" && pattern.characterId !== "protagonist").map((pattern) => pattern.characterId))];
	for (const spouseId of spouseIds) {
		const spousePatterns = patterns.filter((pattern) => pattern.characterId === spouseId);
		const positioned = spousePatterns.filter((pattern) => pattern.movementId !== undefined);
		const secondHalfPatterns = positioned.length > 0 ? positioned : spousePatterns;
		const hasIndependentGoal = secondHalfPatterns.some((pattern) => NON_EMPTY(pattern.independentGoal));
		if (!hasIndependentGoal && secondHalfPatterns.some((pattern) => PURSUIT_GOAL_RE.test(`${pattern.currentGoal} ${pattern.avoidedChoice}`))) {
			findings.push({ code: "SPOUSE_PLOT_COLLAPSES_TO_PURSUIT", severity: "warning", message: `${spouseId} 的中后段目标只有追回女主；必须保留独立利益目标（家族企业/控制权/保护某人/职业身份）`, targetRefs: [spouseId] });
		}
	}
	void movementIds;
	return findings;
}

// ==== Mystery Design Intelligence（proof-first）====
export function checkMysteryDesignIntelligence(params: {
	caseModel: MysteryCase;
	clues: MysteryClue[];
	falseModel?: { statement: string; collapsesAtMovementId?: string; replacedByClaimIds: string[] };
	acquisition?: MysteryAcquisitionEntry[];
	ladders?: ReinterpretationLadder[];
	movementIds: string[];
	professionalObservationClueIds: string[];
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { caseModel, clues, falseModel, acquisition, ladders, movementIds, professionalObservationClueIds } = params;
	const finalIds = new Set(caseModel.finalAnswerClaimIds);
	const criticalClaimIds = new Set(caseModel.truthClaims.filter((claim) => claim.importance >= 4 || finalIds.has(claim.id)).map((claim) => claim.id));
	const criticalClueIds = new Set<string>();
	for (const claim of caseModel.truthClaims) {
		if (!criticalClaimIds.has(claim.id)) continue;
		for (const path of claim.proofPaths ?? []) for (const clueId of path.clueIds) criticalClueIds.add(clueId);
		for (const clueId of claim.supportingClueIds ?? []) criticalClueIds.add(clueId);
	}
	if (criticalClueIds.size > 0) {
		const acquired = new Set(acquisition?.map((entry) => entry.clueId) ?? []);
		for (const clueId of criticalClueIds) {
			if (!acquired.has(clueId) && !professionalObservationClueIds.includes(clueId)) {
				findings.push({ code: "CLUE_WITHOUT_LEGAL_ACQUISITION", severity: "error", message: `关键线索 ${clueId} 没有合法获取路径（professional observation 或显式 acquisition entry）；线索不能“刚好被看到”`, targetRefs: [clueId] });
			}
		}
	}
	if (falseModel !== undefined) {
		if (falseModel.replacedByClaimIds.length === 0) {
			findings.push({ code: "FALSE_MODEL_ONLY_EXISTS_FOR_TWIST", severity: "warning", message: "false model 没有 replacedByClaimIds；反转必须替换读者/女主已有的解释，不能凭空存在" });
		} else {
			const clueClaims = new Set(clues.flatMap((clue) => clue.truthClaimIds));
			const explained = falseModel.replacedByClaimIds.some((claimId) => clueClaims.has(claimId));
			if (!explained) findings.push({ code: "FALSE_MODEL_EXPLAINS_NOTHING", severity: "warning", message: `false model 的 claim（${falseModel.replacedByClaimIds.join(", ")}）没有任何线索支撑；明显为反转而反转`, targetRefs: falseModel.replacedByClaimIds });
		}
		if (NON_EMPTY(falseModel.collapsesAtMovementId) && movementIds.length > 0 && falseModel.collapsesAtMovementId === movementIds[0]) {
			findings.push({ code: "TRUE_MODEL_TOO_EARLY_OBVIOUS", severity: "warning", message: "false model 在第一个 movement 就崩塌；读者在前 20% 就看穿真相" });
		}
	}
	if (criticalClueIds.size > 0 && ladders !== undefined && ladders.length > 0) {
		const laddered = new Set(ladders.map((ladder) => ladder.clueId));
		const coreWithoutLadder = [...criticalClueIds].filter((clueId) => !laddered.has(clueId));
		if (coreWithoutLadder.length === criticalClueIds.size) findings.push({ code: "CORE_CLUE_WITHOUT_REINTERPRETATION", severity: "warning", message: "核心线索全部只增加信息；至少一条关键线索应经历 observable fact → interpretation → contradiction → re-interpretation" });
	}
	return findings;
}

// ==== Architecture Candidates ====
export function checkArchitectureCandidatesSimilarity(candidates: ArchitectureCandidate[]): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	if (candidates.length < 2) return findings;
	const ids = new Set(candidates.map((candidate) => candidate.id));
	if (ids.size !== candidates.length) findings.push({ code: "ARCHITECTURE_CANDIDATES_DUPLICATE_ID", severity: "error", message: "architecture candidate id 必须唯一" });
	const strategyKeys = ["falseModelStrategy", "climaxStrategy", "endingStrategy", "relationshipArcStrategy", "professionalArcStrategy"] as const;
	const distinctCounts = strategyKeys.map((key) => new Set(candidates.map((candidate) => String(candidate[key]).trim())).size);
	const differingStrategies = distinctCounts.filter((count) => count >= 2).length;
	if (differingStrategies === 0) {
		findings.push({ code: "ARCHITECTURE_CANDIDATES_TOO_SIMILAR", severity: "warning", message: "候选的 falseModel/climax/ending/relationship/professional 策略全部相同；只有 movement 名称不同的候选不是真正候选" });
	} else if (differingStrategies <= 1) {
		findings.push({ code: "ARCHITECTURE_CANDIDATES_PARTIALLY_SIMILAR", severity: "warning", message: `候选仅在 ${differingStrategies}/5 项策略上不同；建议拉开 reveal timing / marriage rupture / climax structure 的差距` });
	}
	for (const candidate of candidates) {
		const allChapters = candidate.movements.flatMap((movement) => movement.chapters);
		if (new Set(allChapters).size !== allChapters.length) findings.push({ code: "ARCHITECTURE_CANDIDATE_CHAPTER_OVERLAP", severity: "error", message: `candidate ${candidate.id} 的 movement 章节范围互相重叠`, targetRefs: [candidate.id] });
	}
	return findings;
}

// ==== Draft Repairability ====
export type RepairabilityClass = "AUTO_REPAIRABLE" | "MODEL_REWRITE_REQUIRED" | "PLANNING_REVISION_REQUIRED";
export interface DraftFailureClassification {
	eventId: number;
	kind: "mechanical" | "semantic" | "map";
	classification: RepairabilityClass;
	message: string;
}
export interface RepairabilityInfo {
	classification: RepairabilityClass | "PASS";
	failures: DraftFailureClassification[];
	attempts: number;
	policy: string;
}

const BUDGET_RE = /event draft has (\d+) characters; expected 60-1500/u;

export function classifyDraftFailure(kind: "mechanical" | "semantic" | "map", message: string, opts: { prose?: string; relationshipDeltas?: string[] } = {}): RepairabilityClass {
	if (kind === "map") return "PLANNING_REVISION_REQUIRED";
	if (kind === "mechanical") {
		if (message.includes("planning labels")) return "AUTO_REPAIRABLE";
		if (message.includes("event draft is missing")) return "MODEL_REWRITE_REQUIRED";
		const budget = message.match(BUDGET_RE);
		if (budget !== null) {
			const chars = Number(budget[1]);
			// 小幅越界（50-1600）可以机械收尾；大幅偏差需要模型重写。
			return chars >= 50 && chars <= 1600 ? "AUTO_REPAIRABLE" : "MODEL_REWRITE_REQUIRED";
		}
		return "MODEL_REWRITE_REQUIRED";
	}
	// semantic
	if (message.includes("chase-wife events require chaseEvidence")) {
		// 正文已包含全部关系 delta 时，只是报告缺字段 → 机械补报即可。
		const deltas = opts.relationshipDeltas ?? [];
		const normalizedProse = (opts.prose ?? "").replace(/\s+/gu, "");
		return deltas.length > 0 && deltas.every((delta) => normalizedProse.includes(delta)) ? "AUTO_REPAIRABLE" : "MODEL_REWRITE_REQUIRED";
	}
	if (message.includes("must be a prose anchor") || message.includes("must fall within") || message.includes("does not match the draft")) return "AUTO_REPAIRABLE";
	if (message.includes("actionShown must be true") || message.includes("consequenceShown must be true")) return "MODEL_REWRITE_REQUIRED";
	if (message.includes("does not appear in the prose") || message.includes("is not shown in the prose")) return "MODEL_REWRITE_REQUIRED";
	if (message.includes("requires") && message.includes("evidence")) return "AUTO_REPAIRABLE";
	if (message.includes("declared")) return "MODEL_REWRITE_REQUIRED";
	return "MODEL_REWRITE_REQUIRED";
}

export function buildRepairabilityInfo(failures: DraftFailureClassification[], attempts: number): RepairabilityInfo {
	if (failures.length === 0) return { classification: "PASS", failures: [], attempts, policy: "" };
	const planning = failures.filter((failure) => failure.classification === "PLANNING_REVISION_REQUIRED");
	const rewrite = failures.filter((failure) => failure.classification === "MODEL_REWRITE_REQUIRED");
	const auto = failures.filter((failure) => failure.classification === "AUTO_REPAIRABLE");
	let classification: RepairabilityClass;
	let policy: string;
	if (planning.length > 0) {
		classification = "PLANNING_REVISION_REQUIRED";
		policy = "planning 层问题：不得用 prose 掩盖；先修订事件图/引擎引用/合法动作，再重试";
	} else if (rewrite.length > 0) {
		classification = "MODEL_REWRITE_REQUIRED";
		policy = "模型需针对受影响事件重写正文（每次事件最多 1 次重写尝试）；不得机械裁剪掩盖弱语义";
	} else {
		classification = "AUTO_REPAIRABLE";
		policy = `机械问题（预算/格式/报告字段）：允许最多 2 次局部修复，第 ${attempts + 1} 次仍失败则阻塞`;
	}
	return { classification, failures, attempts, policy };
}
