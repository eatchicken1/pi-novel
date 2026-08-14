import type { MysteryCase, MysteryClue, NarrativeRealizationRecord, UnifiedEventMap } from "../schemas.ts";

// Realized Mystery Fairness：与 planned fairness（冻结的 mystery-checker）不同，
// 这里只使用「实际」章节：
// - 线索实际兑现章：来自 unified 事件（discoveredClueIds / readerRevealedClueIds）或 realization 记录（mystery-clue）；
// - 真相实际揭示章：来自 unified 事件（claimKnowledgeChanges knows / revealClaimIds）或 realization 记录（mystery-reveal）。
// 不允许用 plannedRealizationChapter / plannedRevealChapter 代替实际兑现。
// 判定：claim 在第 N 章实际揭示时，必须存在一条 Proof Path，
// 路径内所有 clue 在该 audience 下于 ≤N 章实际兑现、所有前置 claim 于 ≤N 章实际可证明。
// Proof Paths = OR；单条路径内部 = Clue AND 前置 Claim。

export type RealizedFairnessSeverity = "error" | "warning";

export interface RealizedFairnessIssue {
	code: string;
	severity: RealizedFairnessSeverity;
	message: string;
}

export interface RealizedProofPath {
	id: string;
	clueIds: string[];
	prerequisiteClaimIds: string[];
}

export interface RealizedFairnessInput {
	caseData: MysteryCase | undefined;
	clues: MysteryClue[];
	unifiedMap: UnifiedEventMap | undefined;
	realizations: Array<{ chapter: number; records: NarrativeRealizationRecord[] }>;
}

export interface ActualChapterMap {
	clue: Map<string, { reader?: number; heroine?: number }>;
	claim: Map<string, { reader?: number; heroine?: number }>;
}

function issue(code: string, severity: RealizedFairnessSeverity, message: string): RealizedFairnessIssue {
	return { code, severity, message };
}

// 与 mystery-checker 相同的归一化规则（不修改 frozen checker）：proofPaths 显式 [] 是权威；undefined 才回退 legacy supportingClueIds。
export function normalizeRealizedProofPaths(claim: { id: string; proofPaths?: RealizedProofPath[]; supportingClueIds?: string[] }): RealizedProofPath[] | undefined {
	if (claim.proofPaths !== undefined) return claim.proofPaths;
	if (claim.supportingClueIds !== undefined) return [{ id: `legacy-${claim.id}`, clueIds: claim.supportingClueIds, prerequisiteClaimIds: [] }];
	return undefined;
}

// 从 unified 事件与 realization 记录恢复实际章（planned 字段一律不参与）。
export function collectActualChapters(input: RealizedFairnessInput): ActualChapterMap {
	const clueMap = new Map<string, { reader?: number; heroine?: number }>();
	const claimMap = new Map<string, { reader?: number; heroine?: number }>();
	const recordChapter = (map: Map<string, { reader?: number; heroine?: number }>, id: string, audience: "reader" | "heroine", chapter: number): void => {
		const entry = map.get(id) ?? {};
		if (entry[audience] === undefined || chapter < (entry[audience] as number)) entry[audience] = chapter;
		map.set(id, entry);
	};
	if (input.unifiedMap !== undefined) {
		for (const event of input.unifiedMap.events) {
			const mystery = event.mysteryDelta;
			if (mystery === undefined) continue;
			for (const clueId of mystery.discoveredClueIds) recordChapter(clueMap, clueId, "heroine", event.chapter);
			for (const clueId of mystery.readerRevealedClueIds) recordChapter(clueMap, clueId, "reader", event.chapter);
			for (const change of mystery.claimKnowledgeChanges) {
				if (change.knowledge === "knows" && (change.audience === "reader" || change.audience === "heroine")) recordChapter(claimMap, change.claimId, change.audience, event.chapter);
			}
		}
	}
	for (const realization of input.realizations) {
		for (const record of realization.records) {
			if (record.contentType === "mystery-clue") recordChapter(clueMap, record.engineRef, "heroine", realization.chapter);
			if (record.contentType === "mystery-reveal") recordChapter(claimMap, record.engineRef, "heroine", realization.chapter);
		}
	}
	// heroine-first-person 默认：读者看到女主所见（文档化回退）；显式 readerRevealedClueIds / reader-knows 优先。
	for (const [clueId, entry] of clueMap) {
		if (entry.reader === undefined && entry.heroine !== undefined) entry.reader = entry.heroine;
	}
	for (const [claimId, entry] of claimMap) {
		if (entry.reader === undefined && entry.heroine !== undefined) entry.reader = entry.heroine;
	}
	return { clue: clueMap, claim: claimMap };
}

export interface RealizedFairnessResult {
	verdict: "fair" | "needs-work" | "unfair";
	issues: RealizedFairnessIssue[];
	supportedFinalClaims: string[];
	unsupportedFinalClaims: Array<{ claimId: string; reason: string }>;
	proofCoverage: Record<string, { audience: "reader" | "heroine"; revealChapter?: number; completePaths: number; totalPaths: number; blockedPaths: Array<{ pathId: string; reason: string }> }>;
}

export function checkRealizedFairness(input: RealizedFairnessInput): RealizedFairnessResult {
	const issues: RealizedFairnessIssue[] = [];
	const supportedFinalClaims: string[] = [];
	const unsupportedFinalClaims: Array<{ claimId: string; reason: string }> = [];
	const proofCoverage: RealizedFairnessResult["proofCoverage"] = {};
	if (input.caseData === undefined) {
		return { verdict: "needs-work", issues: [issue("REALIZED_CASE_MISSING", "warning", "no mystery case exists; realized fairness cannot be verified")], supportedFinalClaims, unsupportedFinalClaims, proofCoverage };
	}
	const actual = collectActualChapters(input);
	const claimById = new Map(input.caseData.truthClaims.map((claim) => [claim.id, claim]));
	const clueIds = new Set(input.clues.map((clue) => clue.id));
	const audiences: Array<"reader" | "heroine"> = ["reader", "heroine"];
	let anyVerifiable = false;
	let anyUnfair = false;
	for (const claimId of input.caseData.finalAnswerClaimIds) {
		const claim = claimById.get(claimId);
		if (claim === undefined) {
			unsupportedFinalClaims.push({ claimId, reason: "final answer claim does not exist in the truth model" });
			continue;
		}
		const paths = normalizeRealizedProofPaths(claim) ?? [];
		for (const audience of audiences) {
			const actualReveal = actual.claim.get(claimId)?.[audience];
			if (actualReveal === undefined) {
				proofCoverage[`${claimId}:${audience}`] = { audience, completePaths: 0, totalPaths: paths.length, blockedPaths: [{ pathId: "unknown", reason: "no actual reveal chapter found for this audience" }] };
				if (claim.plannedRevealChapter !== undefined) issues.push(issue("REALIZED_CLAIM_NEVER_REVEALED", "warning", `final claim ${claimId} is planned to be revealed but no actual reveal exists for the ${audience} audience`));
				else issues.push(issue("REALIZED_FAIRNESS_UNVERIFIABLE", "warning", `no actual reveal chapter is known for final claim ${claimId} (${audience} audience)`));
				continue;
			}
			anyVerifiable = true;
			let completePaths = 0;
			const blockedPaths: Array<{ pathId: string; reason: string }> = [];
			for (const path of paths) {
				const missingClue = path.clueIds.find((clueId) => !clueIds.has(clueId));
				if (missingClue !== undefined) {
					blockedPaths.push({ pathId: path.id, reason: `path references unknown clue ${missingClue}` });
					continue;
				}
				const neverClue = path.clueIds.find((clueId) => actual.clue.get(clueId)?.[audience] === undefined);
				const neverPrerequisite = path.prerequisiteClaimIds.find((prerequisiteId) => actual.claim.get(prerequisiteId)?.[audience] === undefined);
				const lateClue = path.clueIds.find((clueId) => (actual.clue.get(clueId)?.[audience] ?? Number.POSITIVE_INFINITY) > actualReveal);
				const latePrerequisite = path.prerequisiteClaimIds.find((prerequisiteId) => (actual.claim.get(prerequisiteId)?.[audience] ?? Number.POSITIVE_INFINITY) > actualReveal);
				if (neverClue !== undefined) {
					blockedPaths.push({ pathId: path.id, reason: `clue ${neverClue} is never actually realized for the ${audience} audience before the reveal` });
					issues.push(issue("REALIZED_CLUE_NEVER_REALIZED", "warning", `clue ${neverClue} is required by path ${path.id} but is never actually realized in prose`));
					continue;
				}
				if (neverPrerequisite !== undefined) {
					blockedPaths.push({ pathId: path.id, reason: `prerequisite claim ${neverPrerequisite} is never actually revealed for the ${audience} audience` });
					continue;
				}
				if (lateClue !== undefined) {
					blockedPaths.push({ pathId: path.id, reason: `clue ${lateClue} is realized in chapter ${actual.clue.get(lateClue)?.[audience]} after the reveal in chapter ${actualReveal} (${audience})` });
					continue;
				}
				if (latePrerequisite !== undefined) {
					blockedPaths.push({ pathId: path.id, reason: `prerequisite claim ${latePrerequisite} is revealed after the reveal in chapter ${actualReveal} (${audience})` });
					continue;
				}
				completePaths += 1;
			}
			proofCoverage[`${claimId}:${audience}`] = { audience, revealChapter: actualReveal, completePaths, totalPaths: paths.length, blockedPaths };
			if (completePaths === 0) {
				const reason = blockedPaths.length > 0 ? blockedPaths.map((item) => `${item.pathId}: ${item.reason}`).join("; ") : "no proof path exists for this claim";
				unsupportedFinalClaims.push({ claimId, reason: `${audience}: ${reason}` });
				issues.push(issue("REALIZED_REVEAL_BEFORE_PROOF", "error", `final claim ${claimId} is actually revealed in chapter ${actualReveal} for the ${audience} audience before any proof path is fully realized`));
				anyUnfair = true;
			} else {
				supportedFinalClaims.push(claimId);
			}
		}
	}
	const verdict = anyUnfair ? "unfair" : anyVerifiable && issues.filter((item) => item.severity === "error").length === 0 && issues.filter((item) => item.severity === "warning").length === 0 ? "fair" : "needs-work";
	return { verdict, issues, supportedFinalClaims: [...new Set(supportedFinalClaims)], unsupportedFinalClaims, proofCoverage };
}
