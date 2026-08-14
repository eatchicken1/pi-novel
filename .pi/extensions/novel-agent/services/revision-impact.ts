// Revision Impact Analysis：早期修改对下游的影响分析（safe-local / downstream-review / structural-revision / authority-change）。
// 派生 memory 依赖图：Chapter K → Memory snapshot K+ → summaries → derived context → manuscript seal。
import type { MemoryLedgers } from "./narrative-memory.ts";

export type RevisionSeverity = "safe-local" | "downstream-review" | "structural-revision" | "authority-change";

export interface RevisionImpactReport {
	revisionId: string;
	severity: RevisionSeverity;
	changedChapter?: number;
	changedEventIds: number[];
	knowledgeChanges: Array<{ characterId: string; factRef: string; from: string; to: string }>;
	truthChanges: string[];
	affectedChapters: number[];
	affectedCharacters: string[];
	affectedThreads: string[];
	affectedPromises: string[];
	affectedClues: string[];
	affectedRelationshipStates: string[];
	affectedProfessionalActions: string[];
	affectedPayoffs: string[];
	affectedManuscriptReview: boolean;
	affectedSeal: boolean;
	dependencies: Array<{ chapter: number; reason: string }>;
	summary: string;
}

export function analyzeRevisionImpact(params: {
	revisionId: string;
	changedChapter?: number;
	changedEventIds?: number[];
	knowledgeChanges?: Array<{ characterId: string; factRef: string; from: string; to: string }>;
	truthChanges?: string[];
	proseOnly?: boolean;
	ledgers: MemoryLedgers;
	currentChapter: number;
	manuscriptReviewExists: boolean;
	sealExists: boolean;
	chapterHasFinalizedProse?: (chapter: number) => boolean;
}): RevisionImpactReport {
	const { revisionId, changedChapter, changedEventIds, knowledgeChanges, truthChanges, proseOnly, ledgers, currentChapter, manuscriptReviewExists, sealExists } = params;
	const affectedChapters = new Set<number>();
	const affectedCharacters = new Set<string>();
	const affectedThreads = new Set<string>();
	const affectedPromises = new Set<string>();
	const affectedClues = new Set<string>();
	const affectedRelationshipStates = new Set<string>();
	const affectedProfessionalActions = new Set<string>();
	const affectedPayoffs = new Set<string>();
	const dependencies: Array<{ chapter: number; reason: string }> = [];

	const truth = truthChanges ?? [];
	if (truth.length > 0) {
		for (const claimId of truth) {
			const related = ledgers.knowledge.filter((entry) => entry.factRef === claimId);
			for (const entry of related) {
				affectedCharacters.add(entry.knower);
				for (let chapter = entry.sinceChapter; chapter <= currentChapter; chapter += 1) affectedChapters.add(chapter);
			}
			const thread = ledgers.threads.find((candidate) => candidate.threadId === `claim-${claimId}`);
			if (thread !== undefined) affectedThreads.add(thread.threadId);
		}
		const report: RevisionImpactReport = {
			revisionId,
			severity: "authority-change",
			changedChapter,
			changedEventIds: changedEventIds ?? [],
			knowledgeChanges: knowledgeChanges ?? [],
			truthChanges: truthChanges ?? [],
			affectedChapters: [...affectedChapters].sort((left, right) => left - right),
			affectedCharacters: [...affectedCharacters],
			affectedThreads: [...affectedThreads],
			affectedPromises: [],
			affectedClues: [],
			affectedRelationshipStates: [],
			affectedProfessionalActions: [],
			affectedPayoffs: [],
			affectedManuscriptReview: manuscriptReviewExists,
			affectedSeal: sealExists,
			dependencies: [...affectedChapters].map((chapter) => ({ chapter, reason: `truth ${truth.join(",")} 被依赖` })),
			summary: `authority-change：TruthClaim（${truth.join("、")}）修改影响 ${affectedChapters.size} 章；必须走 develop_story_bible 的 foundation 修订流程`,
		};
		return report;
	}

	if (proseOnly === true && changedChapter !== undefined) {
		return {
			revisionId,
			severity: "safe-local",
			changedChapter,
			changedEventIds: changedEventIds ?? [],
			knowledgeChanges: knowledgeChanges ?? [],
			truthChanges: [],
			affectedChapters: [changedChapter],
			affectedCharacters: [],
			affectedThreads: [],
			affectedPromises: [],
			affectedClues: [],
			affectedRelationshipStates: [],
			affectedProfessionalActions: [],
			affectedPayoffs: [],
			affectedManuscriptReview: false,
			affectedSeal: sealExists,
			dependencies: [{ chapter: changedChapter, reason: "prose 措辞修订（safe-local）；seal 因 chapter hash 变化而 stale" }],
			summary: "safe-local：仅措辞修订；重新 finalize 本章并刷新 seal 即可",
		};
	}

	const knowledge = knowledgeChanges ?? [];
	if (knowledge.length > 0) {
		for (const change of knowledge) {
			affectedCharacters.add(change.characterId);
			affectedClues.add(change.factRef);
			for (const entry of ledgers.knowledge) {
				if (entry.factRef !== change.factRef) continue;
				if (entry.knower === change.characterId || entry.knower === "reader") {
					for (let chapter = Math.max(entry.sinceChapter, (changedChapter ?? 1) + 1); chapter <= currentChapter; chapter += 1) affectedChapters.add(chapter);
				}
			}
			for (const thread of ledgers.threads) {
				if (thread.sourceRefs.includes(change.factRef) || thread.threadId === `claim-${change.factRef}`) affectedThreads.add(thread.threadId);
			}
			for (const setup of ledgers.setupsPayoffs) {
				if (setup.setupRef === change.factRef && setup.payoffStatus === "pending") affectedPayoffs.add(setup.setupId);
			}
		}
		const report: RevisionImpactReport = {
			revisionId,
			severity: "downstream-review",
			changedChapter,
			changedEventIds: changedEventIds ?? [],
			knowledgeChanges: knowledge,
			truthChanges: [],
			affectedChapters: [...affectedChapters].sort((left, right) => left - right),
			affectedCharacters: [...affectedCharacters],
			affectedThreads: [...affectedThreads],
			affectedPromises: [],
			affectedClues: [...affectedClues],
			affectedRelationshipStates: [],
			affectedProfessionalActions: [],
			affectedPayoffs: [...affectedPayoffs],
			affectedManuscriptReview: manuscriptReviewExists,
			affectedSeal: sealExists,
			dependencies: [...affectedChapters].map((chapter) => ({ chapter, reason: `knowledge change（${knowledge.map((change) => `${change.characterId}:${change.factRef}`).join(",")}）下游依赖` })),
			summary: `downstream-review：${knowledge.length} 处 knowledge 变化影响 ${affectedChapters.size} 章；需复查受影响章节`,
		};
		return report;
	}

	if (changedChapter !== undefined) {
		for (let chapter = changedChapter + 1; chapter <= currentChapter; chapter += 1) affectedChapters.add(chapter);
		const report: RevisionImpactReport = {
			revisionId,
			severity: "structural-revision",
			changedChapter,
			changedEventIds: changedEventIds ?? [],
			knowledgeChanges: [],
			truthChanges: [],
			affectedChapters: [...affectedChapters].sort((left, right) => left - right),
			affectedCharacters: [],
			affectedThreads: [],
			affectedPromises: [],
			affectedClues: [],
			affectedRelationshipStates: [],
			affectedProfessionalActions: [],
			affectedPayoffs: [],
			affectedManuscriptReview: manuscriptReviewExists,
			affectedSeal: sealExists,
			dependencies: [...affectedChapters].map((chapter) => ({ chapter, reason: "章节内容/事件修改；派生 memory 从本章起 invalid" })),
			summary: `structural-revision：ch${changedChapter} 修改影响 ${affectedChapters.size} 章下游与全部派生 memory；需 repair_narrative_memory 后逐章复查`,
		};
		return report;
	}

	return {
		revisionId,
		severity: "safe-local",
		changedEventIds: changedEventIds ?? [],
		knowledgeChanges: knowledge,
		truthChanges: [],
		affectedChapters: [],
		affectedCharacters: [],
		affectedThreads: [],
		affectedPromises: [],
		affectedClues: [],
		affectedRelationshipStates: [],
		affectedProfessionalActions: [],
		affectedPayoffs: [],
		affectedManuscriptReview: false,
		affectedSeal: sealExists,
		dependencies: [],
		summary: "safe-local：无已知下游影响",
	};
}
