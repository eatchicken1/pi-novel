import type {
	MysteryCase,
	MysteryClue,
	MysteryInformationCheckpoint,
	MysterySuspect,
	TruthClaim,
	TruthProofPath,
} from "../schemas.ts";

// Mystery Engine 确定性检查：只做逻辑、引用、因果、信息边界与公平性；
// 不做审美偏好（嫌疑人数量、反转次数、章节线索密度等）硬性要求。
//
// Round 2.5 语义升级：
// - Claim 的证明 = 多条 Proof Path 的 OR；单条 Path 内 = Clue AND 前置 Claim 的 AND；
// - reader 公平性基于 readerRevealChapter（读者曝光），不是 firstAvailableChapter（世界存在）；
// - 角色私有知识（含凶手）不经过 heroine/reader 的证据门禁；
// - 派生声明（proof path 只有前置 claim）允许在无 direct clue 时被证明。

export type MysteryIssueSeverity = "error" | "warning";

export interface MysteryIssue {
	code: string;
	severity: MysteryIssueSeverity;
	message: string;
}

export interface UnsupportedFinalClaim {
	claimId: string;
	reason: string;
}

export interface ProofCoverageEntry {
	completePaths: number;
	totalPaths: number;
	directClueIds: string[];
	transitiveClueIds: string[];
}

export interface FairnessReport {
	verdict: "fair" | "needs-work" | "unfair";
	issues: MysteryIssue[];
	supportedFinalClaims: string[];
	unsupportedFinalClaims: UnsupportedFinalClaim[];
	// legacy 兼容字段：direct clue 覆盖（文档说明其局限）。
	clueCoverage: Record<string, { available: number; total: number }>;
	// 结构事实报告：每条 final claim 的完整路径数、直接/传递线索（不计算概率或评分）。
	proofCoverage: Record<string, ProofCoverageEntry>;
}

function issue(code: string, severity: MysteryIssueSeverity, message: string): MysteryIssue {
	return { code, severity, message };
}

function claimMap(caseData: MysteryCase): Map<string, TruthClaim> {
	const map = new Map<string, TruthClaim>();
	for (const claim of caseData.truthClaims) map.set(claim.id, claim);
	return map;
}

function clueMap(clues: MysteryClue[]): Map<string, MysteryClue> {
	return new Map(clues.map((clue) => [clue.id, clue]));
}

// ---- Proof Path 归一化 ----
// 权威来源：claim.proofPaths。若不存在，legacy supportingClueIds + dependsOnClaimIds 归一化为单一路径。
// 空路径（既无 clue 也无前置 claim）不构成证明，直接丢弃。
export interface NormalizedProofPath {
	id: string;
	clueIds: string[];
	prerequisiteClaimIds: string[];
}

export function normalizeProofPaths(claim: TruthClaim): NormalizedProofPath[] {
	// proofPaths !== undefined（包括显式 []）时它是唯一权威：作者明确配置"无证明路径"，
	// 不允许再回退到 legacy supportingClueIds。
	if (claim.proofPaths !== undefined) {
		return claim.proofPaths
			.map((path) => ({ id: path.id, clueIds: path.clueIds, prerequisiteClaimIds: path.prerequisiteClaimIds }))
			.filter((path) => path.clueIds.length > 0 || path.prerequisiteClaimIds.length > 0);
	}
	const clues = claim.supportingClueIds ?? [];
	const prereqs = claim.dependsOnClaimIds ?? [];
	return clues.length > 0 || prereqs.length > 0
		? [{ id: `${claim.id}-legacy`, clueIds: clues, prerequisiteClaimIds: prereqs }]
		: [];
}

// ---- 可见性模型 ----
// world：firstAvailableChapter（证据在世界中最早存在）
// heroine：heroineDiscoveryChapter ?? intendedDiscoveryChapter(legacy) ?? firstAvailableChapter，且不小于 firstAvailable
// reader：readerRevealChapter ?? heroine 可见章（heroine-first-person 默认回退，文档化）
export function resolveClueVisibility(clue: MysteryClue): { heroine: number; reader: number } {
	const heroineDiscovery = clue.heroineDiscoveryChapter ?? clue.intendedDiscoveryChapter ?? clue.firstAvailableChapter;
	const heroine = Math.max(clue.firstAvailableChapter, heroineDiscovery);
	// reader 曝光不得早于世界可用；配置错误（readerRevealChapter < firstAvailableChapter）由 design checker 报 READER_EXPOSURE_BEFORE_WORLD_AVAILABILITY。
	const reader = clue.readerRevealChapter === undefined ? heroine : Math.max(clue.firstAvailableChapter, clue.readerRevealChapter);
	return { heroine, reader };
}

export type MysteryAudience = "reader" | "heroine";

// reader-sim 硬隔离的路径判定：先把反斜杠统一为斜杠，再按 author-private roots 匹配（含 outline/mystery 计划内容）。
export function isMysteryPrivatePath(relativePath: string): boolean {
	const normalized = relativePath.replace(/\\/gu, "/");
	return normalized.startsWith("canon/mystery/") || normalized.startsWith("work/mystery/") || normalized.startsWith("outline/mystery/");
}

// 递归证明解析：Claim 可证明 ⟺ 存在一条完整 Proof Path（strict=false 时 visible <= chapter；strict=true 时 visible < chapter）。
// 环由 design checker 负责报告；解析器遇到环保守返回不可证明。
export function isClaimProvable(
	claimId: string,
	chapter: number,
	audience: MysteryAudience,
	claimsById: Map<string, TruthClaim>,
	cluesById: Map<string, MysteryClue>,
	strict: boolean,
): boolean {
	const resolve = (id: string, visiting: Set<string>): boolean => {
		if (visiting.has(id)) return false;
		const claim = claimsById.get(id);
		if (claim === undefined) return false;
		const paths = normalizeProofPaths(claim);
		if (paths.length === 0) return false;
		const nextVisiting = new Set(visiting).add(id);
		for (const path of paths) {
			const cluesVisible = path.clueIds.every((clueId) => {
				const clue = cluesById.get(clueId);
				if (clue === undefined) return false;
				const visible = audience === "reader" ? resolveClueVisibility(clue).reader : resolveClueVisibility(clue).heroine;
				return strict ? visible < chapter : visible <= chapter;
			});
			if (!cluesVisible) continue;
			const prereqsProvable = path.prerequisiteClaimIds.every((prereqId) => resolve(prereqId, nextVisiting));
			if (prereqsProvable) return true;
		}
		return false;
	};
	return resolve(claimId, new Set());
}

// Truth dependency graph = union(dependsOnClaimIds, 所有 proofPath.prerequisiteClaimIds)。
// dependsOnClaimIds 是显式元数据；证明前置同样构成依赖边，必须参与环检测。
function truthDependencyIds(claim: TruthClaim): string[] {
	const dependencyIds = new Set(claim.dependsOnClaimIds);
	for (const path of claim.proofPaths ?? []) {
		for (const prereqId of path.prerequisiteClaimIds) dependencyIds.add(prereqId);
	}
	return [...dependencyIds];
}

function hasCycle(claims: TruthClaim[]): boolean {
	const ids = new Set(claims.map((claim) => claim.id));
	const visited = new Set<string>();
	const active = new Set<string>();
	const visit = (id: string): boolean => {
		if (active.has(id)) return true;
		if (visited.has(id)) return false;
		active.add(id);
		const claim = claims.find((candidate) => candidate.id === id);
		if (claim !== undefined) {
			for (const dependency of truthDependencyIds(claim)) {
				if (ids.has(dependency) && visit(dependency)) return true;
			}
		}
		active.delete(id);
		visited.add(id);
		return false;
	};
	for (const claim of claims) if (visit(claim.id)) return true;
	return false;
}

// ---- Truth graph 检查 ----
function checkTruthGraph(caseData: MysteryCase, claimsById: Map<string, TruthClaim>): MysteryIssue[] {
	const issues: MysteryIssue[] = [];
	const seen = new Set<string>();
	for (const claim of caseData.truthClaims) {
		if (seen.has(claim.id)) issues.push(issue("DUPLICATE_CLAIM_ID", "error", `duplicate truth claim id "${claim.id}"`));
		seen.add(claim.id);
		for (const dependency of claim.dependsOnClaimIds) {
			if (!claimsById.has(dependency)) issues.push(issue("MISSING_CLAIM_DEPENDENCY", "error", `claim "${claim.id}" depends on missing claim "${dependency}"`));
		}
		const pathIds = new Set<string>();
		for (const path of claim.proofPaths ?? []) {
			if (pathIds.has(path.id)) issues.push(issue("DUPLICATE_PROOF_PATH_ID", "error", `claim "${claim.id}" declares duplicate proof path id "${path.id}"`));
			pathIds.add(path.id);
			for (const prereqId of path.prerequisiteClaimIds) {
				if (!claimsById.has(prereqId)) issues.push(issue("MISSING_CLAIM_DEPENDENCY", "error", `proof path "${path.id}" of claim "${claim.id}" references missing claim "${prereqId}"`));
			}
		}
	}
	if (hasCycle(caseData.truthClaims)) issues.push(issue("TRUTH_CLAIM_CYCLE", "error", "truth claim dependency graph (dependsOnClaimIds + proof prerequisiteClaimIds) contains a cycle"));
	for (const finalId of caseData.finalAnswerClaimIds) {
		if (!claimsById.has(finalId)) issues.push(issue("INVALID_FINAL_ANSWER_CLAIM", "error", `final answer claim "${finalId}" does not exist`));
	}
	for (const claim of caseData.truthClaims) {
		const isFinal = caseData.finalAnswerClaimIds.includes(claim.id);
		const isCritical = claim.importance >= 4 || isFinal;
		const hasProofPath = normalizeProofPaths(claim).length > 0;
		if (isCritical && !hasProofPath) {
			issues.push(issue("UNSUPPORTED_CRITICAL_TRUTH", "error", `claim "${claim.id}" is a final answer or critical truth but has no proof path (no clue and no prerequisite claim)`));
		} else if (!isCritical && !hasProofPath) {
			issues.push(issue("UNSUPPORTED_TRUTH", "warning", `claim "${claim.id}" has no proof path; reveal must be justified by another claim`));
		}
	}
	return issues;
}

// ---- Claim / Clue 双向引用一致性 ----
// source of truth：claim 侧 proofPaths（证明）；clue.truthClaimIds 是元数据。
// 方向 1（error）：proof 引用了不在 clue.truthClaimIds 里的线索；
// 方向 2（warning）：clue 声称支撑某 claim，但该 claim 的任何 proof path 都不引用它（red-herring 豁免：误导性线索故意指向错误方向）。
function checkClaimClueLinks(caseData: MysteryCase, claimsById: Map<string, TruthClaim>, cluesById: Map<string, MysteryClue>): MysteryIssue[] {
	const issues: MysteryIssue[] = [];
	const proofClueIds = new Map<string, Set<string>>();
	for (const claim of caseData.truthClaims) {
		const clueIds = new Set<string>();
		for (const path of normalizeProofPaths(claim)) for (const clueId of path.clueIds) clueIds.add(clueId);
		proofClueIds.set(claim.id, clueIds);
		for (const clueId of clueIds) {
			const clue = cluesById.get(clueId);
			if (clue === undefined) {
				issues.push(issue("CLAIM_REFERENCES_MISSING_CLUE", "error", `claim "${claim.id}" proof references missing clue "${clueId}"`));
			} else if (!clue.truthClaimIds.includes(claim.id)) {
				issues.push(issue("CLAIM_CLUE_LINK_MISMATCH", "error", `claim "${claim.id}" proof uses clue "${clueId}" but the clue does not list claim "${claim.id}" in truthClaimIds`));
			}
		}
	}
	for (const clue of cluesById.values()) {
		if (clue.clueRole === "red-herring") continue;
		for (const claimId of clue.truthClaimIds) {
			const proofIds = proofClueIds.get(claimId);
			if (proofIds !== undefined && !proofIds.has(clue.id)) {
				issues.push(issue("CLAIM_CLUE_LINK_MISMATCH", "warning", `clue "${clue.id}" lists claim "${claimId}" but no proof path of that claim references the clue`));
			}
		}
	}
	return issues;
}

// ---- Clue integrity 检查 ----
function checkClueIntegrity(caseData: MysteryCase, claimsById: Map<string, TruthClaim>, clues: MysteryClue[]): MysteryIssue[] {
	const issues: MysteryIssue[] = [];
	const seen = new Set<string>();
	for (const clue of clues) {
		if (seen.has(clue.id)) issues.push(issue("DUPLICATE_CLUE_ID", "error", `duplicate clue id "${clue.id}"`));
		seen.add(clue.id);
		for (const claimId of clue.truthClaimIds) {
			if (!claimsById.has(claimId)) issues.push(issue("CLUE_REFERENCES_MISSING_CLAIM", "error", `clue "${clue.id}" references missing claim "${claimId}"`));
		}
		const discoveryChapter = clue.heroineDiscoveryChapter ?? clue.intendedDiscoveryChapter ?? clue.firstAvailableChapter;
		if (clue.firstAvailableChapter > discoveryChapter) {
			issues.push(issue("INVALID_REVEAL_TIMING", "error", `clue "${clue.id}" becomes available in chapter ${clue.firstAvailableChapter} before it can be discovered (chapter ${discoveryChapter})`));
		}
		if (clue.readerRevealChapter !== undefined && clue.readerRevealChapter < clue.firstAvailableChapter) {
			issues.push(issue("READER_EXPOSURE_BEFORE_WORLD_AVAILABILITY", "error", `clue "${clue.id}" is exposed to the reader in chapter ${clue.readerRevealChapter} before it exists in the world (chapter ${clue.firstAvailableChapter})`));
		}
		for (const claimId of clue.truthClaimIds) {
			const claim = claimsById.get(claimId);
			if (claim?.plannedRevealChapter !== undefined && clue.firstAvailableChapter > claim.plannedRevealChapter) {
				issues.push(issue("CLUE_APPEARS_AFTER_CLAIM_REVEAL", "warning", `clue "${clue.id}" becomes available in chapter ${clue.firstAvailableChapter} after claim "${claimId}" is planned to be revealed in chapter ${claim.plannedRevealChapter}`));
			}
		}
		if (clue.clueRole === "red-herring") {
			const misleading = (clue.misleadingInterpretation ?? "").trim();
			if (clue.interpretationOptions.length === 0 || clue.actualImplication.trim().length === 0 || misleading.length === 0) {
				issues.push(issue("RED_HERRING_WITHOUT_FACTUAL_BASIS", "error", `red-herring clue "${clue.id}" must have a real observable fact, a plausible wrong interpretation (interpretationOptions / misleadingInterpretation), and an actual implication`));
			}
			if (misleading.length > 0 && misleading === clue.actualImplication.trim()) {
				issues.push(issue("RED_HERRING_INTERPRETATION_EQUALS_ACTUAL", "error", `red-herring clue "${clue.id}" declares a misleading interpretation identical to its actual implication`));
			}
		}
	}
	return issues;
}

// ---- Suspect integrity 检查 ----
function checkSuspectIntegrity(caseData: MysteryCase, claimsById: Map<string, TruthClaim>, cluesById: Map<string, MysteryClue>, suspects: MysterySuspect[]): MysteryIssue[] {
	const issues: MysteryIssue[] = [];
	const finalIds = new Set(caseData.finalAnswerClaimIds);
	for (const suspect of suspects) {
		for (const clueId of [...suspect.supportingClueIds, ...suspect.exculpatoryClueIds]) {
			if (!cluesById.has(clueId)) issues.push(issue("SUSPECT_INVALID_CLUE_REF", "error", `suspect "${suspect.id}" references missing clue "${clueId}"`));
		}
		for (const claimId of suspect.knowledgeClaimIds) {
			if (!claimsById.has(claimId)) issues.push(issue("SUSPECT_INVALID_CLAIM_REF", "error", `suspect "${suspect.id}" references missing claim "${claimId}"`));
		}
		if (suspect.actualRole === "culprit" && suspect.supportingClueIds.length === 0 && suspect.knowledgeClaimIds.length === 0) {
			issues.push(issue("CULPRIT_WITHOUT_EVIDENTIARY_PATH", "error", `culprit suspect "${suspect.id}" has no supporting clue or knowledge claim establishing an evidentiary path`));
		}
		if ((suspect.actualRole === "innocent" || suspect.actualRole === "red-herring") && suspect.knowledgeClaimIds.some((claimId) => finalIds.has(claimId))) {
			issues.push(issue("INNOCENT_KNOWS_FINAL_ANSWER", "warning", `suspect "${suspect.id}" is marked ${suspect.actualRole} but knows a final answer claim`));
		}
	}
	return issues;
}

// ---- Information state 检查 ----
// heroine/reader 的 knows 必须可证明（含派生推导）；
// 任意角色（characterKnowledge）只验证引用与顺序，不要求通过故事线索获得知识（凶手可以因为亲自实施而提前知道）。
function checkInformationState(claimsById: Map<string, TruthClaim>, cluesById: Map<string, MysteryClue>, checkpoints: MysteryInformationCheckpoint[]): MysteryIssue[] {
	const issues: MysteryIssue[] = [];
	let previousChapter = 0;
	for (const checkpoint of checkpoints) {
		if (checkpoint.afterChapter < previousChapter) {
			issues.push(issue("INFO_IMPLAUSIBLE_CHRONOLOGY", "error", `checkpoint "${checkpoint.id}" chapter ${checkpoint.afterChapter} is before an earlier checkpoint at chapter ${previousChapter}`));
		}
		previousChapter = checkpoint.afterChapter;
		for (const clueId of checkpoint.newlyAvailableClueIds) {
			if (!cluesById.has(clueId)) issues.push(issue("INFO_INVALID_ID", "error", `checkpoint "${checkpoint.id}" references missing clue "${clueId}"`));
		}
		const audienceStates = [
			{ label: `checkpoint ${checkpoint.id} heroine`, audience: "heroine" as const, state: checkpoint.heroine },
			{ label: `checkpoint ${checkpoint.id} reader`, audience: "reader" as const, state: checkpoint.reader },
		];
		for (const { label, audience, state } of audienceStates) {
			for (const claimId of [...state.knowsClaimIds, ...state.suspectsClaimIds, ...state.believesClaimIds]) {
				if (!claimsById.has(claimId)) issues.push(issue("INFO_INVALID_ID", "error", `${label} references missing claim "${claimId}"`));
			}
			for (const claimId of state.knowsClaimIds) {
				if (!claimsById.has(claimId)) continue;
				if (!isClaimProvable(claimId, checkpoint.afterChapter, audience, claimsById, cluesById, false)) {
					issues.push(issue("INFO_KNOWLEDGE_BEFORE_SOURCE", "error", `${label} knows claim "${claimId}" at chapter ${checkpoint.afterChapter} but no complete proof path is available to the ${audience} by then (direct clues or derived claims)`));
				}
			}
		}
		for (const item of checkpoint.characterKnowledge) {
			for (const claimId of [...item.knowsClaimIds, ...item.suspectsClaimIds, ...item.believesClaimIds]) {
				if (!claimsById.has(claimId)) issues.push(issue("INFO_INVALID_ID", "error", `checkpoint ${checkpoint.id} character ${item.characterId} references missing claim "${claimId}"`));
			}
		}
	}
	return issues;
}

// ---- Social core 检查 ----
function checkSocialCore(caseData: MysteryCase): MysteryIssue[] {
	const issues: MysteryIssue[] = [];
	const core = caseData.socialCore;
	if (core.socialQuestion.trim().length === 0) issues.push(issue("MISSING_SOCIAL_QUESTION", "error", "mystery case must define a central social question beyond the relationship line"));
	if (core.institutionalContext.trim().length === 0) issues.push(issue("MISSING_INSTITUTIONAL_CONTEXT", "warning", "social core should name the institutional context of the case"));
	if (core.stakesBeyondRelationship.length === 0) issues.push(issue("MISSING_STAKES_BEYOND_RELATIONSHIP", "warning", "social core must list stakes that exist beyond the romantic or marital relationship"));
	return issues;
}

export function checkMysteryDesign(
	caseData: MysteryCase | undefined,
	clues: MysteryClue[],
	suspects: MysterySuspect[],
	checkpoints: MysteryInformationCheckpoint[],
): MysteryIssue[] {
	if (caseData === undefined) return [issue("MISSING_TRUTH_MODEL", "error", "a confirmed or proposed mystery case (truth model) is required")];
	const claimsById = claimMap(caseData);
	const cluesById = clueMap(clues);
	return [
		...checkTruthGraph(caseData, claimsById),
		...checkClaimClueLinks(caseData, claimsById, cluesById),
		...checkClueIntegrity(caseData, claimsById, clues),
		...checkSuspectIntegrity(caseData, claimsById, cluesById, suspects),
		...checkInformationState(claimsById, cluesById, checkpoints),
		...checkSocialCore(caseData),
	];
}

// 单条 Proof Path 对 reader 是否在揭示章前完整成立（strict：visible < chapter）。
function isPathCompleteForReader(path: NormalizedProofPath, claimId: string, chapter: number, claimsById: Map<string, TruthClaim>, cluesById: Map<string, MysteryClue>, visiting: Set<string>): boolean {
	if (visiting.has(claimId)) return false;
	const nextVisiting = new Set(visiting).add(claimId);
	const cluesVisible = path.clueIds.every((clueId) => {
		const clue = cluesById.get(clueId);
		if (clue === undefined) return false;
		return resolveClueVisibility(clue).reader < chapter;
	});
	if (!cluesVisible) return false;
	return path.prerequisiteClaimIds.every((prereqId) => isClaimProvable(prereqId, chapter, "reader", claimsById, cluesById, true));
}

// 传递收集：直接线索 + 递归收集 truth dependency（dependsOn + proof prerequisite）的证明线索。
function collectTransitiveClues(claimId: string, claimsById: Map<string, TruthClaim>, cluesById: Map<string, MysteryClue>, visited: Set<string>): string[] {
	if (visited.has(claimId)) return [];
	visited.add(claimId);
	const claim = claimsById.get(claimId);
	if (claim === undefined) return [];
	const collected = new Set<string>();
	for (const path of normalizeProofPaths(claim)) for (const clueId of path.clueIds) collected.add(clueId);
	for (const dependency of truthDependencyIds(claim)) {
		for (const clueId of collectTransitiveClues(dependency, claimsById, cluesById, visited)) collected.add(clueId);
	}
	return [...collected];
}

// ---- Fairness 检查 ----
// 揭示章：claim.plannedRevealChapter；缺失时取读者最早知道该 final claim 的检查点章节；两者都缺失 → FAIRNESS_UNVERIFIABLE（不猜测 latestCheckpoint）。
// 公平性 = 至少一条完整 Proof Path 在揭示前对 reader 可见（strict：visible < revealChapter）。
export function checkMysteryFairness(
	caseData: MysteryCase | undefined,
	clues: MysteryClue[],
	checkpoints: MysteryInformationCheckpoint[],
): FairnessReport {
	if (caseData === undefined) {
		return { verdict: "unfair", issues: [issue("MISSING_TRUTH_MODEL", "error", "a confirmed or proposed mystery case (truth model) is required")], supportedFinalClaims: [], unsupportedFinalClaims: [], clueCoverage: {}, proofCoverage: {} };
	}
	const issues: MysteryIssue[] = [];
	const claimsById = claimMap(caseData);
	const cluesById = clueMap(clues);
	const supportedFinalClaims: string[] = [];
	const unsupportedFinalClaims: UnsupportedFinalClaim[] = [];
	const clueCoverage: Record<string, { available: number; total: number }> = {};
	const proofCoverage: Record<string, ProofCoverageEntry> = {};
	let unverifiableCount = 0;
	for (const finalId of caseData.finalAnswerClaimIds) {
		const claim = claimsById.get(finalId);
		if (claim === undefined) continue;
		const paths = normalizeProofPaths(claim);
		const allClueIds = new Set<string>();
		for (const path of paths) for (const clueId of path.clueIds) allClueIds.add(clueId);
		const directClueIds = [...allClueIds];
		const transitiveClueIds = collectTransitiveClues(finalId, claimsById, cluesById, new Set());
		const totalPaths = paths.length;
		const revealChapter = claim.plannedRevealChapter ?? checkpoints.find((checkpoint) => checkpoint.reader.knowsClaimIds.includes(finalId))?.afterChapter;
		if (revealChapter === undefined) {
			unverifiableCount += 1;
			unsupportedFinalClaims.push({ claimId: finalId, reason: "no plannedRevealChapter and no checkpoint reveals this claim to the reader; fairness is unverifiable" });
			issues.push(issue("FAIRNESS_UNVERIFIABLE", "warning", `final answer claim "${finalId}" has no planned reveal chapter and no reader-knows checkpoint; planned fairness cannot be verified`));
			clueCoverage[finalId] = { available: 0, total: allClueIds.size };
			proofCoverage[finalId] = { completePaths: 0, totalPaths, directClueIds, transitiveClueIds };
			continue;
		}
		const provableBeforeReveal = isClaimProvable(finalId, revealChapter, "reader", claimsById, cluesById, true);
		const completePaths = paths.filter((path) => isPathCompleteForReader(path, finalId, revealChapter, claimsById, cluesById, new Set())).length;
		const availableClues = [...allClueIds].filter((clueId) => {
			const clue = cluesById.get(clueId);
			return clue !== undefined && resolveClueVisibility(clue).reader < revealChapter;
		}).length;
		clueCoverage[finalId] = { available: availableClues, total: allClueIds.size };
		proofCoverage[finalId] = { completePaths, totalPaths, directClueIds, transitiveClueIds };
		if (paths.length === 0) {
			unsupportedFinalClaims.push({ claimId: finalId, reason: "no proof path exists anywhere in the plan" });
		} else if (!provableBeforeReveal) {
			unsupportedFinalClaims.push({ claimId: finalId, reason: `no complete proof path is reader-visible before the reveal chapter ${revealChapter}` });
			issues.push(issue("DEUS_EX_MACHINA_CLUE", "error", `final answer claim "${finalId}" cannot be proven by the reader before the reveal chapter ${revealChapter}; core evidence is not exposed in time`));
		} else {
			supportedFinalClaims.push(finalId);
		}
		// reveal-before-proof（BUG A 修复）：reader 与 heroine 分别验证，不能互相替代
		for (const checkpoint of checkpoints) {
			if (checkpoint.reader.knowsClaimIds.includes(finalId) && !isClaimProvable(finalId, checkpoint.afterChapter, "reader", claimsById, cluesById, false)) {
				issues.push(issue("REVEAL_BEFORE_PROOF", "error", `reader knows final answer claim "${finalId}" at chapter ${checkpoint.afterChapter} before any complete proof path is available to the reader`));
			}
			if (checkpoint.heroine.knowsClaimIds.includes(finalId) && !isClaimProvable(finalId, checkpoint.afterChapter, "heroine", claimsById, cluesById, false)) {
				issues.push(issue("REVEAL_BEFORE_PROOF", "error", `heroine knows final answer claim "${finalId}" at chapter ${checkpoint.afterChapter} before any complete proof path is available to the heroine`));
			}
		}
	}
	const invalidRedHerrings = clues.filter((clue) => clue.clueRole === "red-herring" && (clue.interpretationOptions.length === 0 || clue.actualImplication.trim().length === 0 || (clue.misleadingInterpretation ?? "").trim().length === 0));
	if (invalidRedHerrings.length > 0) issues.push(issue("RED_HERRING_WITHOUT_FACTUAL_BASIS", "error", `${invalidRedHerrings.length} red-herring clue(s) lack a real factual basis, a plausible wrong interpretation, or an actual implication`));
	const verdict = issues.some((item) => item.severity === "error") ? "unfair" : issues.length > 0 || unverifiableCount > 0 ? "needs-work" : "fair";
	return { verdict, issues, supportedFinalClaims, unsupportedFinalClaims, clueCoverage, proofCoverage };
}
