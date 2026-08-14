import type {
	MysteryCase,
	MysteryClue,
	MysteryInformationCheckpoint,
	MysterySuspect,
	TruthClaim,
} from "../schemas.ts";

// Mystery Engine 确定性检查：只做逻辑、引用、因果、信息边界与公平性；
// 不做审美偏好（嫌疑人数量、反转次数、章节线索密度等）硬性要求。

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

export interface FairnessReport {
	verdict: "fair" | "needs-work" | "unfair";
	issues: MysteryIssue[];
	supportedFinalClaims: string[];
	unsupportedFinalClaims: UnsupportedFinalClaim[];
	clueCoverage: Record<string, { available: number; total: number }>;
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
			for (const dependency of claim.dependsOnClaimIds) {
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
	}
	if (hasCycle(caseData.truthClaims)) issues.push(issue("TRUTH_CLAIM_CYCLE", "error", "truth claim dependency graph contains a cycle"));
	for (const finalId of caseData.finalAnswerClaimIds) {
		if (!claimsById.has(finalId)) issues.push(issue("INVALID_FINAL_ANSWER_CLAIM", "error", `final answer claim "${finalId}" does not exist`));
	}
	for (const claim of caseData.truthClaims) {
		const isFinal = caseData.finalAnswerClaimIds.includes(claim.id);
		const isCritical = claim.importance >= 4 || isFinal;
		if (isCritical && claim.supportingClueIds.length === 0) {
			issues.push(issue("UNSUPPORTED_CRITICAL_TRUTH", "error", `claim "${claim.id}" is a final answer or critical truth but has no supporting clue`));
		} else if (!isCritical && claim.supportingClueIds.length === 0) {
			issues.push(issue("UNSUPPORTED_TRUTH", "warning", `claim "${claim.id}" has no supporting clue; reveal must be justified by another claim`));
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
		if (clue.firstAvailableChapter > clue.intendedDiscoveryChapter) {
			issues.push(issue("INVALID_REVEAL_TIMING", "error", `clue "${clue.id}" becomes available in chapter ${clue.firstAvailableChapter} but is expected to be discovered in chapter ${clue.intendedDiscoveryChapter}`));
		}
		for (const claimId of clue.truthClaimIds) {
			const claim = claimsById.get(claimId);
			if (claim?.plannedRevealChapter !== undefined && clue.firstAvailableChapter > claim.plannedRevealChapter) {
				issues.push(issue("CLUE_APPEARS_AFTER_CLAIM_REVEAL", "warning", `clue "${clue.id}" becomes available in chapter ${clue.firstAvailableChapter} after claim "${claimId}" is planned to be revealed in chapter ${claim.plannedRevealChapter}`));
			}
		}
		if (clue.clueRole === "red-herring" && (clue.interpretationOptions.length === 0 || clue.actualImplication.trim().length === 0)) {
			issues.push(issue("RED_HERRING_WITHOUT_FACTUAL_BASIS", "error", `red-herring clue "${clue.id}" must have a real observable fact, a plausible wrong interpretation, and an actual implication`));
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
function earliestClueAvailability(claim: TruthClaim, cluesById: Map<string, MysteryClue>): number | undefined {
	const chapters = claim.supportingClueIds
		.map((clueId) => cluesById.get(clueId))
		.filter((clue): clue is MysteryClue => clue !== undefined)
		.map((clue) => clue.firstAvailableChapter);
	return chapters.length === 0 ? undefined : Math.min(...chapters);
}

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
		const states = [
			{ label: `checkpoint ${checkpoint.id} heroine`, state: checkpoint.heroine },
			{ label: `checkpoint ${checkpoint.id} reader`, state: checkpoint.reader },
			...checkpoint.characterKnowledge.map((item) => ({ label: `checkpoint ${checkpoint.id} character ${item.characterId}`, state: item })),
		];
		for (const { label, state } of states) {
			for (const claimId of [...state.knowsClaimIds, ...state.suspectsClaimIds, ...state.believesClaimIds]) {
				if (!claimsById.has(claimId)) issues.push(issue("INFO_INVALID_ID", "error", `${label} references missing claim "${claimId}"`));
			}
			for (const claimId of state.knowsClaimIds) {
				const claim = claimsById.get(claimId);
				if (claim === undefined) continue;
				const earliest = earliestClueAvailability(claim, cluesById);
				if (earliest !== undefined && checkpoint.afterChapter < earliest) {
					issues.push(issue("INFO_KNOWLEDGE_BEFORE_SOURCE", "error", `${label} knows claim "${claimId}" at chapter ${checkpoint.afterChapter} before its earliest supporting clue is available at chapter ${earliest}`));
				} else if (earliest === undefined && claim.supportingClueIds.length === 0) {
					issues.push(issue("INFO_KNOWLEDGE_BEFORE_SOURCE", "error", `${label} knows claim "${claimId}" but the claim has no supporting clue anywhere in the plan`));
				}
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
		...checkClueIntegrity(caseData, claimsById, clues),
		...checkSuspectIntegrity(caseData, claimsById, cluesById, suspects),
		...checkInformationState(claimsById, cluesById, checkpoints),
		...checkSocialCore(caseData),
	];
}

// ---- Fairness 检查 ----
export function checkMysteryFairness(
	caseData: MysteryCase | undefined,
	clues: MysteryClue[],
	checkpoints: MysteryInformationCheckpoint[],
): FairnessReport {
	if (caseData === undefined) {
		return { verdict: "unfair", issues: [issue("MISSING_TRUTH_MODEL", "error", "a confirmed or proposed mystery case (truth model) is required")], supportedFinalClaims: [], unsupportedFinalClaims: [], clueCoverage: {} };
	}
	const issues: MysteryIssue[] = [];
	const claimsById = claimMap(caseData);
	const cluesById = clueMap(clues);
	const latestCheckpointChapter = checkpoints.reduce((max, checkpoint) => Math.max(max, checkpoint.afterChapter), 0);
	const supportedFinalClaims: string[] = [];
	const unsupportedFinalClaims: UnsupportedFinalClaim[] = [];
	const clueCoverage: Record<string, { available: number; total: number }> = {};
	for (const finalId of caseData.finalAnswerClaimIds) {
		const claim = claimsById.get(finalId);
		if (claim === undefined) continue;
		const supporting = claim.supportingClueIds.map((clueId) => cluesById.get(clueId)).filter((clue): clue is MysteryClue => clue !== undefined);
		const revealChapter = claim.plannedRevealChapter ?? latestCheckpointChapter;
		// 公平性要求证据在揭示章之前就可用：揭示章第一次出现的证据对读者没有推断时间，视为 deus ex machina。
		const available = supporting.filter((clue) => clue.firstAvailableChapter < revealChapter);
		clueCoverage[finalId] = { available: available.length, total: supporting.length };
		if (supporting.length === 0) {
			unsupportedFinalClaims.push({ claimId: finalId, reason: "no supporting clue exists anywhere in the plan" });
		} else if (available.length === 0) {
			unsupportedFinalClaims.push({ claimId: finalId, reason: `all supporting clues appear no earlier than the reveal chapter ${revealChapter}` });
			issues.push(issue("DEUS_EX_MACHINA_CLUE", "error", `final answer claim "${finalId}" can only be proven by evidence that first appears at or after the reveal chapter ${revealChapter}`));
		} else {
			supportedFinalClaims.push(finalId);
		}
		// reveal-before-proof：检查点里出现“知道最终答案”时，证据必须已经可用
		for (const checkpoint of checkpoints) {
			const knowsFinal = [checkpoint.heroine, checkpoint.reader, ...checkpoint.characterKnowledge.map((item) => item)].some((state) => state.knowsClaimIds.includes(finalId));
			if (!knowsFinal) continue;
			const earliest = supporting.length === 0 ? undefined : Math.min(...supporting.map((clue) => clue.firstAvailableChapter));
			if (earliest !== undefined && checkpoint.afterChapter < earliest) {
				issues.push(issue("REVEAL_BEFORE_PROOF", "error", `final answer claim "${finalId}" is known at chapter ${checkpoint.afterChapter} but its earliest evidence is only available at chapter ${earliest}`));
			}
		}
	}
	const invalidRedHerrings = clues.filter((clue) => clue.clueRole === "red-herring" && (clue.interpretationOptions.length === 0 || clue.actualImplication.trim().length === 0));
	if (invalidRedHerrings.length > 0) issues.push(issue("RED_HERRING_WITHOUT_FACTUAL_BASIS", "error", `${invalidRedHerrings.length} red-herring clue(s) lack a real factual basis or actual implication`));
	const verdict = issues.some((item) => item.severity === "error") ? "unfair" : issues.length > 0 ? "needs-work" : "fair";
	return { verdict, issues, supportedFinalClaims, unsupportedFinalClaims, clueCoverage };
}
