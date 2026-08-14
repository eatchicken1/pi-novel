// Narrative Memory：从 authoritative artifacts（finalized chapters / unified events / realization / canon / engine artifacts）
// 确定性/半确定性派生长期状态。所有产物是 DERIVED VIEW / INDEX / CACHE，不是第二 story authority。
// 每条 derived artifact 保存 source hashes + throughChapter + generatedAt；源变化 → stale。
import type { ChapterSummary, MysteryCase, MysteryClue, ProfessionalCasePlan, ProfessionalDomainModel, StoryArchitecture, StoryPromiseLedger, UnifiedEvent } from "../schemas.ts";

export const MEMORY_SCHEMA_VERSION = 1;
export const MEMORY_DERIVATION_VERSION = 1;

// ==== 派生类型 ====
export interface StateChange { ref: string; change: string; eventId?: number }
export interface ChapterStateDelta {
	chapter: number;
	sourceHashes: Record<string, string>;
	characterChanges: StateChange[];
	relationshipChanges: StateChange[];
	knowledgeChanges: StateChange[];
	beliefChanges: StateChange[];
	goalChanges: StateChange[];
	resourceChanges: StateChange[];
	objectChanges: StateChange[];
	locationChanges: StateChange[];
	obligationChanges: StateChange[];
	professionalChanges: StateChange[];
	mysteryChanges: StateChange[];
	openedThreads: string[];
	closedThreads: string[];
	setupsCreated: string[];
	payoffsCompleted: string[];
}

export interface KnowledgeEntry {
	factRef: string;
	knower: string;
	status: "knows" | "suspects" | "believes" | "misbelieves" | "does-not-know";
	sinceChapter: number;
	sourceEventId?: number;
	confidence?: string;
	supersededBy?: string;
}

export interface CharacterStateEntry {
	characterId: string;
	currentGoals: string[];
	activeBeliefs: string[];
	knownFactRefs: string[];
	falseBeliefs: string[];
	emotionalCommitments: string[];
	relationshipPosition: Record<string, string>;
	resources: string[];
	constraints: string[];
	secretsHeld: string[];
	secretsDisclosed: string[];
	professionalStatus: string;
	unresolvedPromises: string[];
	recentDecisions: string[];
	recentCosts: string[];
	lastChapter: number;
}

export interface RelationshipStateSnapshot {
	relationshipId: string;
	characters: string[];
	trust: string;
	access: string;
	communication: string;
	dependency: string;
	boundary: string;
	sharedResources: string[];
	activeConflict: string;
	unresolvedHarmRefs: string[];
	repairStatus: string;
	physicalDistance: string;
	socialPresentation: string;
	legalMaterialSeparation: string;
	lastChapter: number;
}

export interface NarrativeObjectEntry {
	objectId: string;
	kind: string;
	description: string;
	currentHolder?: string;
	currentLocation?: string;
	createdChapter?: number;
	introducedChapter: number;
	lastSeenChapter: number;
	destroyedChapter?: number;
	knownBy: string[];
	evidenceRefs: string[];
	state: string;
	sourceRefs: string[];
}

export interface CriticalFactEntry {
	factId: string;
	label: string;
	value: string;
	normalizedValue: string;
	unit: string;
	chapter: number;
	sourceRefs: string[];
	modifiedByChapter?: number;
}

export interface TimelineEntry {
	eventId: number;
	chapter: number;
	storyDate?: string;
	storyTime?: string;
	durationMinutes?: number;
	location?: string;
	participants: string[];
}

export type ThreadKind = "mystery-question" | "relationship-question" | "character-goal" | "professional-task" | "social-pressure" | "promise" | "threat" | "obligation" | "setup" | "pending-decision" | "unresolved-consequence";
export type ThreadStatus = "open" | "deepened" | "partially-resolved" | "resolved" | "abandoned-intentionally";

export interface NarrativeThreadEntry {
	threadId: string;
	kind: ThreadKind;
	openedChapter: number;
	sourceRefs: string[];
	description: string;
	involvedCharacters: string[];
	status: ThreadStatus;
	lastAdvancedChapter: number;
	expectedHorizon?: number;
	resolutionRefs: string[];
	importance: "major" | "minor";
}

export interface SetupPayoffEntry {
	setupId: string;
	setupChapter: number;
	setupRef: string;
	type: string;
	visibility: "explicit" | "subtle" | "background";
	expectedPayoffWindow?: number;
	payoffStatus: "pending" | "paid" | "intentional-open";
	payoffChapter?: number;
	payoffRefs: string[];
	reinterpretationRefs: string[];
	importance: "major" | "minor";
}

export interface ProfessionalStateSnapshot {
	currentStageId: string;
	authorizedActionIds: string[];
	pendingApprovalIds: string[];
	recusalState: "none" | "active" | "resolved";
	conflictIds: string[];
	openEvidenceRequestIds: string[];
	evidenceAccessState: string;
	professionalConsequenceIds: string[];
	caseDeadline?: string;
	supervisorPosition: string;
	lastChapter: number;
}

export interface HypothesisEntry {
	hypothesisId: string;
	claimIds: string[];
	status: "active" | "discarded" | "confirmed";
	openedChapter: number;
	discardedChapter?: number;
	sourceEventIds: number[];
	lastReferencedChapter: number;
}

export interface CharacterArcEntry {
	characterId: string;
	trajectory: Array<{ chapter: number; belief: string; goal: string; agencyDelta: number; fear: string; boundary: string; decision: string; cost: string }>;
	lessonsLearned: string[];
	lastChapter: number;
}

export interface MysteryStateSnapshot {
	currentHypotheses: string[];
	discardedHypotheses: string[];
	activeSuspectIds: string[];
	knownContradictions: string[];
	unexplainedClueIds: string[];
	reinterpretedClueIds: string[];
	proofProgressClaimIds: string[];
	readerAheadClaimIds: string[];
	heroineAheadClaimIds: string[];
}

export interface NarrativeMemorySnapshot {
	throughChapter: number;
	sourceRevisionHash: string;
	characters: CharacterStateEntry[];
	relationships: RelationshipStateSnapshot[];
	knowledge: KnowledgeEntry[];
	goals: Record<string, string[]>;
	resources: string[];
	objects: NarrativeObjectEntry[];
	locations: string[];
	obligations: string[];
	professionalState?: ProfessionalStateSnapshot;
	mysteryState: MysteryStateSnapshot;
	unresolvedThreads: string[];
	promises: string[];
	setups: string[];
	recentConsequences: string[];
}

export interface MemoryLedgers {
	characters: CharacterStateEntry[];
	knowledge: KnowledgeEntry[];
	relationships: RelationshipStateSnapshot[];
	objects: NarrativeObjectEntry[];
	criticalFacts: CriticalFactEntry[];
	timeline: TimelineEntry[];
	threads: NarrativeThreadEntry[];
	setupsPayoffs: SetupPayoffEntry[];
	professionalState?: ProfessionalStateSnapshot;
	hypotheses: HypothesisEntry[];
	characterArcs: CharacterArcEntry[];
}

// ==== 输入包（store 组装）====
export interface MemoryChapterInput {
	chapter: number;
	events: UnifiedEvent[];
	summary?: ChapterSummary;
	sourceHashes: Record<string, string>;
}

export interface MemoryInputs {
	chapters: MemoryChapterInput[];
	repairHarmMap?: Record<string, string>;
	throughChapter: number;
	mysteryCase?: MysteryCase;
	mysteryClues: MysteryClue[];
	professionalModel?: ProfessionalDomainModel;
	professionalPlan?: ProfessionalCasePlan;
	architecture?: StoryArchitecture;
	promiseLedger?: StoryPromiseLedger;
	harmRecords: Array<{ id: string; severity: string; recognizedByMale?: boolean }>;
	repairRecords: Array<{ id: string; harmId?: string; credible?: boolean }>;
	sourceRevisionHash: string;
}

const CHASE_PHASE_MAP: Record<string, string> = {
	"injury": "trust 受损",
	"recognition": "开始看清",
	"micro-withdrawal": "情感抽离",
	"boundary-test": "边界试探",
	"irreversible-exit": "关系破裂",
	"self-rebuild": "自我重建",
	"final-boundary": "最终边界",
};

// ==== Fact 归一化（限定场景，不做全 NLP）====
const CN_NUM: Record<string, number> = { "零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "百": 100, "千": 1000, "万": 10000 };

export function normalizeFactValue(raw: string): string {
	const value = raw.replace(/[，,、s]/gu, "").replace(/(?:人民币|元整|块钱)/gu, "元").replace(/约|大概|左右/gu, "");
	const num = value.match(/^([0-9０-９]+(?:.[0-9]+)?)([万亿千万百十元岁年天小时分钟个户张份次家层栋套条)]*)$/u);
	if (num !== null) {
		let number = Number(num[1].replace(/[０-９]/gu, (d) => String("0123456789".indexOf(d))));
		const unit = num[2];
		if (unit.includes("万")) number *= 10000;
		else if (unit.includes("亿")) number *= 100000000;
		else if (unit.includes("千")) number *= 1000;
		return String(number) + (unit.replace(/[万亿千]/gu, ""));
	}
	const cn = value.match(/^([零一二两三四五六七八九十百千万]+)([元岁年天小时分钟个户张份次家层栋套条万]*)$/u);
	if (cn !== null) {
		let number = 0;
		let section = 0;
		let lastUnit = 1;
		for (const ch of cn[1]) {
			const digit = CN_NUM[ch];
			if (digit === undefined) continue;
			if (digit >= 10) {
				if (digit === 10000 || digit === 100000000) { section = (section + number) * digit; number = 0; lastUnit = 1; }
				else { section += (number === 0 ? 1 : number) * digit; number = 0; lastUnit = digit; }
			} else if (lastUnit >= 10) {
				// 隐式单位：两千三 = 2300（3 承接 千 的十分之一）；一万二 = 12000
				number += digit * (lastUnit / 10);
			} else {
				number += digit;
			}
		}
		const total = section + number;
		return String(total) + (cn[2] ?? "");
	}
	return value;
}

// ==== 章节 Delta 派生 ====
function chaseRoleToPhase(role: string | undefined): string | undefined {
	if (role === undefined) return undefined;
	return CHASE_PHASE_MAP[role] ?? undefined;
}

export function deriveChapterDelta(input: MemoryChapterInput, repairHarmMap?: Record<string, string>): ChapterStateDelta {
	const delta: ChapterStateDelta = {
		chapter: input.chapter,
		sourceHashes: input.sourceHashes,
		characterChanges: [],
		relationshipChanges: [],
		knowledgeChanges: [],
		beliefChanges: [],
		goalChanges: [],
		resourceChanges: [],
		objectChanges: [],
		locationChanges: [],
		obligationChanges: [],
		professionalChanges: [],
		mysteryChanges: [],
		openedThreads: [],
		closedThreads: [],
		setupsCreated: [],
		payoffsCompleted: [],
	};
	for (const event of input.events) {
		const eventRef = { eventId: event.eventId };
		if (event.storyDate !== undefined) delta.locationChanges.push({ ref: "timeline", change: `storyDate ${event.storyDate}`, ...eventRef });
		if (event.chaseWifeDelta !== undefined) {
			const chase = event.chaseWifeDelta;
			delta.characterChanges.push({ ref: "heroine", change: `chase phase ${chase.heroinePhase ?? "unknown"}`, ...eventRef });
			if (chase.malePhase !== undefined) delta.characterChanges.push({ ref: "spouse", change: `chase phase ${chase.malePhase}`, ...eventRef });
			if (chase.heroineAgencyAfter !== chase.heroineAgencyBefore) delta.characterChanges.push({ ref: "heroine", change: `agency ${chase.heroineAgencyBefore}->${chase.heroineAgencyAfter}`, ...eventRef });
			for (const harmRef of chase.harmRefs) {
				delta.relationshipChanges.push({ ref: harmRef, change: `harmed by event ${event.eventId}`, ...eventRef });
				delta.obligationChanges.push({ ref: harmRef, change: "unresolved harm obligation", ...eventRef });
				delta.openedThreads.push(`harm-${harmRef}`);
			}
			for (const repairRef of chase.repairRefs) {
				delta.relationshipChanges.push({ ref: repairRef, change: `repair attempted at event ${event.eventId}`, ...eventRef });
				delta.closedThreads.push(`harm-${repairHarmMap?.[repairRef] ?? repairRef}`);
			}
			for (const info of chase.informationDelta) delta.knowledgeChanges.push({ ref: "chase-info", change: `heroine learned: ${info}`, ...eventRef });
			if (chase.role === "boundary-test" || chase.role === "boundary-respect") delta.beliefChanges.push({ ref: "heroine", change: `boundary ${chase.role}`, ...eventRef });
			if (chase.role === "irreversible-exit") delta.goalChanges.push({ ref: "heroine", change: "irreversible exit", ...eventRef });
			if (chase.role === "credible-repair") delta.relationshipChanges.push({ ref: "relationship", change: "credible repair", ...eventRef });
		}
		if (event.mysteryDelta !== undefined) {
			const mystery = event.mysteryDelta;
			for (const clueId of mystery.discoveredClueIds) delta.knowledgeChanges.push({ ref: clueId, change: "heroine knows clue", ...eventRef });
			for (const clueId of mystery.readerRevealedClueIds) delta.knowledgeChanges.push({ ref: clueId, change: "reader knows clue", ...eventRef });
			for (const change of mystery.claimKnowledgeChanges) delta.knowledgeChanges.push({ ref: change.claimId, change: `${change.audience} ${change.knowledge}`, ...eventRef });
			for (const claimId of mystery.proofProgressClaimIds) delta.mysteryChanges.push({ ref: claimId, change: "proof progress", ...eventRef });
			for (const claimId of mystery.revealClaimIds) {
				delta.mysteryChanges.push({ ref: claimId, change: "revealed", ...eventRef });
				delta.closedThreads.push(`claim-${claimId}`);
			}
			for (const clueId of mystery.interpretationChanges) delta.mysteryChanges.push({ ref: clueId, change: "reinterpreted", ...eventRef });
			for (const suspect of mystery.suspectChanges) delta.mysteryChanges.push({ ref: suspect, change: "suspect state changed", ...eventRef });
			if (mystery.claimKnowledgeChanges.some((change) => change.knowledge === "suspects" || change.knowledge === "believes")) delta.openedThreads.push(...mystery.claimKnowledgeChanges.filter((change) => change.knowledge === "suspects" || change.knowledge === "believes").map((change) => `claim-${change.claimId}`));
		}
		if (event.marriageDelta !== undefined) {
			const marriage = event.marriageDelta;
			for (const ref of [...marriage.economicItemChanges, ...marriage.responsibilityChanges, ...marriage.decisionRightChanges, ...marriage.socialTieChanges, ...marriage.inertiaChanges, ...marriage.exitConstraintChanges]) {
				delta.relationshipChanges.push({ ref, change: "marriage state changed", ...eventRef });
				if (marriage.exitConstraintChanges.includes(ref)) delta.goalChanges.push({ ref: "heroine", change: `exit constraint ${ref}`, ...eventRef });
			}
			if (marriage.economicItemChanges.length > 0) delta.resourceChanges.push({ ref: "marriage-economics", change: marriage.economicItemChanges.join(","), ...eventRef });
			if (marriage.restructuringProgress.length > 0) delta.goalChanges.push({ ref: "marriage", change: `restructuring: ${marriage.restructuringProgress.join(",")}`, ...eventRef });
		}
		if (event.professionalDelta !== undefined) {
			const professional = event.professionalDelta;
			for (const actionId of professional.actionIds) delta.professionalChanges.push({ ref: actionId, change: "action executed", ...eventRef });
			for (const observationId of professional.observationIds) delta.professionalChanges.push({ ref: observationId, change: "observation recorded", ...eventRef });
			for (const consequenceId of professional.consequenceIds) delta.professionalChanges.push({ ref: consequenceId, change: "consequence incurred", ...eventRef });
			for (const evidenceSourceId of professional.evidenceSourceIds) delta.objectChanges.push({ ref: evidenceSourceId, change: "evidence source accessed", ...eventRef });
		}
		for (const change of event.characterDeltas) delta.characterChanges.push({ ref: change.characterId, change: `${change.dimension} ${change.from}->${change.to}`, ...eventRef });
		for (const resource of event.resourceDeltas) {
			delta.resourceChanges.push({ ref: resource.itemRef, change: resource.change, ...eventRef });
			delta.objectChanges.push({ ref: resource.itemRef, change: resource.change, ...eventRef });
		}
		if (event.riskDeltas.length > 0) delta.characterChanges.push({ ref: "heroine", change: `risks: ${event.riskDeltas.map((risk) => risk.change).join(",")}`, ...eventRef });
		if (event.irreversible === true) delta.goalChanges.push({ ref: "heroine", change: `irreversible: ${event.cannotRemoveBecause}`, ...eventRef });
	}
	if (input.summary !== undefined) {
		const summary = input.summary;
		for (const ref of summary.threadsOpened ?? []) delta.openedThreads.push(ref);
		for (const ref of summary.threadsClosed ?? []) delta.closedThreads.push(ref);
		for (const ref of summary.setups ?? []) delta.setupsCreated.push(ref);
		for (const ref of summary.payoffs ?? []) delta.payoffsCompleted.push(ref);
		for (const ref of summary.whatHeroineLearned ?? []) delta.knowledgeChanges.push({ ref, change: "heroine learned (summary)", eventId: undefined });
		for (const ref of summary.whatSpouseLearned ?? []) delta.knowledgeChanges.push({ ref, change: "spouse learned (summary)", eventId: undefined });
		for (const ref of summary.whatReaderLearned ?? []) delta.knowledgeChanges.push({ ref, change: "reader learned (summary)", eventId: undefined });
		if (summary.professionalChange !== undefined) delta.professionalChanges.push({ ref: "case", change: summary.professionalChange, eventId: undefined });
		for (const ref of summary.mysteryProgress ?? []) delta.mysteryChanges.push({ ref, change: "progress (summary)", eventId: undefined });
	}
	return delta;
}

// ==== Ledger 派生（全量；增量 = 从 1..throughChapter 重算）====
function claimIdsFor(finalClaimIds: string[], caseModel: MysteryCase | undefined): Set<string> {
	const ids = new Set<string>(finalClaimIds);
	for (const claim of caseModel?.truthClaims ?? []) ids.add(claim.id);
	return ids;
}

export function deriveLedgers(inputs: MemoryInputs): MemoryLedgers {
	const ledgers: MemoryLedgers = { characters: [], knowledge: [], relationships: [], objects: [], criticalFacts: [], timeline: [], threads: [], setupsPayoffs: [], hypotheses: [], characterArcs: [] };
	const allClaims = claimIdsFor(inputs.mysteryCase?.finalAnswerClaimIds ?? [], inputs.mysteryCase);
	const harmById = new Map(inputs.harmRecords.map((harm) => [harm.id, harm]));
	const repairById = new Map(inputs.repairRecords.map((repair) => [repair.id, repair]));
	// 预扫描：每章 delta
	const deltas = new Map<number, ChapterStateDelta>();
	const repairHarmMap = inputs.repairHarmMap ?? Object.fromEntries(inputs.repairRecords.map((repair) => [repair.id, repair.harmId ?? repair.id]));
	for (const chapterInput of inputs.chapters) deltas.set(chapterInput.chapter, deriveChapterDelta(chapterInput, repairHarmMap));
	// Knowledge
	const knowledge = new Map<string, KnowledgeEntry>();
	const recordKnowledge = (factRef: string, knower: string, status: KnowledgeEntry["status"], chapter: number, eventId?: number) => {
		const key = `${knower}|${factRef}`;
		const previous = knowledge.get(key);
		if (previous !== undefined && previous.status === status && previous.sinceChapter <= chapter) return;
		knowledge.set(key, { factRef, knower, status, sinceChapter: previous === undefined ? chapter : previous.status === status ? Math.min(previous.sinceChapter, chapter) : chapter, sourceEventId: eventId, supersededBy: previous === undefined ? undefined : `${previous.status}@${previous.sinceChapter}` });
	};
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.mysteryDelta !== undefined) {
				for (const clueId of event.mysteryDelta.discoveredClueIds) recordKnowledge(clueId, "heroine", "knows", chapterInput.chapter, event.eventId);
				for (const clueId of event.mysteryDelta.readerRevealedClueIds) recordKnowledge(clueId, "reader", "knows", chapterInput.chapter, event.eventId);
				for (const change of event.mysteryDelta.claimKnowledgeChanges) {
					const knower = change.audience === "reader" ? "reader" : "heroine";
					recordKnowledge(change.claimId, knower, change.knowledge, chapterInput.chapter, event.eventId);
				}
				for (const claimId of event.mysteryDelta.revealClaimIds) {
					recordKnowledge(claimId, "reader", "knows", chapterInput.chapter, event.eventId);
					recordKnowledge(claimId, "heroine", "knows", chapterInput.chapter, event.eventId);
				}
			}
			if (event.chaseWifeDelta !== undefined) {
				for (const info of event.chaseWifeDelta.informationDelta) recordKnowledge(`chase:${info}`, "heroine", "knows", chapterInput.chapter, event.eventId);
			}
		}
		const summary = chapterInput.summary;
		if (summary !== undefined) {
			for (const ref of summary.whatHeroineLearned ?? []) recordKnowledge(ref, "heroine", "knows", chapterInput.chapter);
			for (const ref of summary.whatSpouseLearned ?? []) recordKnowledge(ref, "spouse", "knows", chapterInput.chapter);
			for (const ref of summary.whatReaderLearned ?? []) recordKnowledge(ref, "reader", "knows", chapterInput.chapter);
		}
	}
	ledgers.knowledge = [...knowledge.values()];
	// Characters
	const characterIds = new Set<string>(["heroine", "spouse"]);
	for (const chapterInput of inputs.chapters) for (const event of chapterInput.events) for (const change of event.characterDeltas) characterIds.add(change.characterId);
	for (const profile of inputs.mysteryCase?.truthClaims ?? []) void profile;
	for (const suspect of inputs.mysteryCase === undefined ? [] : ([] as string[])) void suspect;
	const secretsByCharacter = new Map<string, string[]>();
	if (inputs.mysteryCase !== undefined) {
		// 通过 suspect 的 privateSecret 推导 secretsHeld（半确定性：secret 归 suspect）
	}
	for (const characterId of characterIds) {
		const known = ledgers.knowledge.filter((entry) => entry.knower === characterId && entry.status === "knows").map((entry) => entry.factRef);
		const beliefs = ledgers.knowledge.filter((entry) => entry.knower === characterId && entry.status === "believes").map((entry) => entry.factRef);
		const decisions: string[] = [];
		const costs: string[] = [];
		let lastChapter = 1;
		let professionalStatus = "";
		for (const chapterInput of inputs.chapters) {
			for (const event of chapterInput.events) {
				if (event.irreversible === true) decisions.push(`ch${chapterInput.chapter}: ${event.cannotRemoveBecause}`);
				for (const risk of event.riskDeltas) costs.push(`ch${chapterInput.chapter}: ${risk.change}`);
				if (event.chaseWifeDelta !== undefined) lastChapter = chapterInput.chapter;
				if (event.professionalDelta !== undefined && characterId === "heroine") professionalStatus = `active through ch${chapterInput.chapter}`;
			}
			if (chapterInput.events.length > 0) lastChapter = chapterInput.chapter;
		}
		ledgers.characters.push({
			characterId,
			currentGoals: [],
			activeBeliefs: beliefs,
			knownFactRefs: [...new Set(known)],
			falseBeliefs: [],
			emotionalCommitments: [],
			relationshipPosition: {},
			resources: [],
			constraints: [],
			secretsHeld: secretsByCharacter.get(characterId) ?? [],
			secretsDisclosed: [],
			professionalStatus,
			unresolvedPromises: [],
			recentDecisions: decisions.slice(-5),
			recentCosts: [...new Set(costs)].slice(-5),
			lastChapter,
		});
	}
	// Relationship snapshot（heroine × spouse 为主）
	const relationship: RelationshipStateSnapshot = { relationshipId: "heroine-spouse", characters: ["heroine", "spouse"], trust: "established", access: "full", communication: "direct", dependency: "mutual", boundary: "undefined", sharedResources: [], activeConflict: "none", unresolvedHarmRefs: [], repairStatus: "none", physicalDistance: "living-together", socialPresentation: "married", legalMaterialSeparation: "none", lastChapter: 1 };
	let boundarySeen = false;
	let irreversibleExitSeen = false;
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.chaseWifeDelta === undefined) continue;
			const chase = event.chaseWifeDelta;
			relationship.lastChapter = chapterInput.chapter;
			if (chase.role === "irreversible-exit") { relationship.physicalDistance = "separated"; relationship.legalMaterialSeparation = "in-progress"; irreversibleExitSeen = true; }
			if (chase.role === "boundary-test") { relationship.boundary = "tested"; boundarySeen = true; relationship.activeConflict = "boundary dispute"; }
			if (chase.role === "boundary-respect" || chase.role === "final-boundary") { relationship.boundary = "respected"; relationship.activeConflict = "none"; }
			if (chase.role === "credible-repair") relationship.repairStatus = "credible";
			if (chase.role === "recognition") relationship.trust = "rebuilding";
			if (chase.role === "pursuit-control" || chase.role === "pursuit-failure") relationship.activeConflict = "pursuit pressure";
			for (const harmRef of chase.harmRefs) if (!relationship.unresolvedHarmRefs.includes(harmRef)) relationship.unresolvedHarmRefs.push(harmRef);
			for (const repairRef of chase.repairRefs) {
				const repair = repairById.get(repairRef);
				if (repair?.credible === true) relationship.unresolvedHarmRefs = relationship.unresolvedHarmRefs.filter((ref) => ref !== (repair.harmId ?? repairRef));
				relationship.repairStatus = repair?.credible === true ? "credible" : "attempted";
			}
		}
	}
	void boundarySeen; void irreversibleExitSeen;
	ledgers.relationships = [relationship];
	// Objects（evidence sources / clues / resourceDeltas）
	const objectSeen = new Map<string, NarrativeObjectEntry>();
	const upsertObject = (objectId: string, chapter: number, changeText: string, kind: string, sourceRef: string) => {
		const previous = objectSeen.get(objectId);
		if (previous === undefined) {
			objectSeen.set(objectId, { objectId, kind, description: sourceRef, introducedChapter: chapter, lastSeenChapter: chapter, knownBy: ["heroine"], evidenceRefs: [], state: "intact", sourceRefs: [sourceRef] });
			return;
		}
		previous.lastSeenChapter = Math.max(previous.lastSeenChapter, chapter);
		previous.sourceRefs.push(sourceRef);
		if (!previous.knownBy.includes("heroine")) previous.knownBy.push("heroine");
		const destroy = changeText.match(/(销毁|烧毁|撕毁|删除|冲走|扔进|丢弃)/u);
		if (destroy !== null) { previous.state = "destroyed"; previous.destroyedChapter = chapter; }
		const holder = changeText.match(/(?:给|交给|寄给|递给了|交给了)([^，。；]{1,6})(?:保管|拿着|收下)?/u);
		if (holder !== null && !holder[1].includes("我")) previous.currentHolder = holder[1].trim();
		const location = changeText.match(/(?:放回|锁进|收进|放进|留在|藏在)s*([^，。；]+)/u);
		if (location !== null) previous.currentLocation = location[1].trim();
	};
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.professionalDelta !== undefined) for (const evidenceSourceId of event.professionalDelta.evidenceSourceIds) upsertObject(evidenceSourceId, chapterInput.chapter, "accessed", "evidence", `event ${event.eventId}`);
			for (const resource of event.resourceDeltas) upsertObject(resource.itemRef, chapterInput.chapter, resource.change, "object", `event ${event.eventId}`);
		}
	}
	for (const clue of inputs.mysteryClues) {
		const previous = objectSeen.get(clue.id);
		if (previous === undefined) objectSeen.set(clue.id, { objectId: clue.id, kind: "evidence", description: clue.observableFact, introducedChapter: clue.firstAvailableChapter, lastSeenChapter: clue.firstAvailableChapter, knownBy: [], evidenceRefs: [clue.id], state: "intact", sourceRefs: [`clue ${clue.id}`] });
		else previous.evidenceRefs.push(clue.id);
	}
	ledgers.objects = [...objectSeen.values()];
	// Critical Facts：每次声明保留独立条目（跨章对比检测 FACT_VALUE_CONTRADICTION；合法修改需显式处理）
	const factEntries: CriticalFactEntry[] = [];
	for (const chapterInput of inputs.chapters) {
		for (const fact of chapterInput.summary?.criticalFacts ?? []) {
			factEntries.push({ factId: `fact-${fact.label}-ch${chapterInput.chapter}`, label: fact.label, value: fact.value, normalizedValue: normalizeFactValue(fact.value), unit: fact.unit ?? "", chapter: chapterInput.chapter, sourceRefs: [`summary ch${chapterInput.chapter}`] });
		}
	}
	ledgers.criticalFacts = factEntries;
	// Timeline
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			const participants = ["heroine"];
			if (event.chaseWifeDelta !== undefined || event.marriageDelta !== undefined) participants.push("spouse");
			ledgers.timeline.push({ eventId: event.eventId, chapter: event.chapter, storyDate: event.storyDate, storyTime: event.storyTime, durationMinutes: event.durationMinutes, location: event.scene, participants });
		}
	}
	// Threads
	const threads = new Map<string, NarrativeThreadEntry>();
	const upsertThread = (threadId: string, kind: ThreadKind, chapter: number, description: string, refs: string[], importance: "major" | "minor", involved: string[] = []) => {
		const previous = threads.get(threadId);
		if (previous === undefined) threads.set(threadId, { threadId, kind, openedChapter: chapter, sourceRefs: refs, description, involvedCharacters: involved, status: "open", lastAdvancedChapter: chapter, importance, resolutionRefs: [] });
		else previous.lastAdvancedChapter = Math.max(previous.lastAdvancedChapter, chapter);
	};
	const closeThread = (threadId: string, chapter: number, ref: string) => {
		const previous = threads.get(threadId);
		if (previous !== undefined) { previous.status = "resolved"; previous.lastAdvancedChapter = chapter; previous.resolutionRefs.push(ref); }
	};
	for (const claimId of allClaims) upsertThread(`claim-${claimId}`, "mystery-question", 1, `案件 claim ${claimId} 待验证`, [claimId], inputs.mysteryCase?.finalAnswerClaimIds.includes(claimId) === true ? "major" : "minor");
	for (const harm of inputs.harmRecords) upsertThread(`harm-${harm.id}`, "obligation", 1, `伤害 ${harm.id} 未偿还`, [harm.id], harm.severity === "relationship-breaking" || harm.severity === "major" ? "major" : "minor", ["heroine", "spouse"]);
	for (const promise of inputs.promiseLedger?.promises ?? []) upsertThread(`promise-${promise.id}`, "promise", 1, promise.promise, [promise.id], promise.kind === "mystery" || promise.kind === "relationship" ? "major" : "minor");
	for (const chapterInput of inputs.chapters) {
		const delta = deltas.get(chapterInput.chapter);
		if (delta === undefined) continue;
		for (const threadId of delta.openedThreads) upsertThread(threadId, threadId.startsWith("harm-") ? "obligation" : threadId.startsWith("claim-") ? "mystery-question" : "unresolved-consequence", chapterInput.chapter, threadId, [`ch${chapterInput.chapter}`], "minor");
		for (const threadId of delta.closedThreads) closeThread(threadId, chapterInput.chapter, `ch${chapterInput.chapter}`);
		// claim knowledge advance
		for (const event of chapterInput.events) {
			if (event.mysteryDelta === undefined) continue;
			for (const claimId of event.mysteryDelta.proofProgressClaimIds) { const thread = threads.get(`claim-${claimId}`); if (thread !== undefined) thread.lastAdvancedChapter = chapterInput.chapter; }
			if (event.mysteryDelta.revealClaimIds.length > 0) for (const claimId of event.mysteryDelta.revealClaimIds) closeThread(`claim-${claimId}`, chapterInput.chapter, `event ${event.eventId}`);
			for (const change of event.mysteryDelta.claimKnowledgeChanges) { const thread = threads.get(`claim-${change.claimId}`); if (thread !== undefined) thread.lastAdvancedChapter = chapterInput.chapter; }
		}
		for (const threadId of delta.closedThreads) void threadId;
	}
	// promise payoff: trace/event 支付
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.mysteryDelta !== undefined && event.mysteryDelta.revealClaimIds.length > 0) {
				for (const promise of inputs.promiseLedger?.promises ?? []) {
					if (promise.kind === "mystery" && promise.supportingRefs.some((ref) => ref.kind === "claim" && event.mysteryDelta?.revealClaimIds.includes(ref.ref))) closeThread(`promise-${promise.id}`, chapterInput.chapter, `event ${event.eventId}`);
				}
			}
		}
	}
	ledgers.threads = [...threads.values()];
	// Setups / Payoffs
	const setups = new Map<string, SetupPayoffEntry>();
	for (const clue of inputs.mysteryClues) {
		if (clue.plannedRealizationChapter !== undefined) setups.set(`clue-${clue.id}`, { setupId: `clue-${clue.id}`, setupChapter: clue.plannedRealizationChapter, setupRef: clue.id, type: "mystery", visibility: clue.clueRole === "red-herring" ? "subtle" : "explicit", expectedPayoffWindow: 8, payoffStatus: "pending", payoffRefs: [], reinterpretationRefs: [], importance: clue.truthClaimIds.length > 0 ? "major" : "minor" });
	}
	for (const trace of inputs.promiseLedger === undefined ? [] : ([] as unknown[])) void trace;
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.mysteryDelta === undefined) continue;
			for (const clueId of event.mysteryDelta.discoveredClueIds) {
				const setup = setups.get(`clue-${clueId}`);
				if (setup !== undefined && setup.payoffStatus === "pending") { setup.payoffStatus = "paid"; setup.payoffChapter = chapterInput.chapter; setup.payoffRefs.push(`event ${event.eventId}`); }
			}
			for (const clueId of event.mysteryDelta.interpretationChanges) { const setup = setups.get(`clue-${clueId}`); if (setup !== undefined) setup.reinterpretationRefs.push(`ch${chapterInput.chapter}`); }
		}
	}
	for (const chapterInput of inputs.chapters) {
		for (const ref of chapterInput.summary?.setups ?? []) {
			if (!setups.has(ref)) setups.set(ref, { setupId: ref, setupChapter: chapterInput.chapter, setupRef: ref, type: "summary", visibility: "explicit", expectedPayoffWindow: 8, payoffStatus: "pending", payoffRefs: [], reinterpretationRefs: [], importance: "major" });
		}
		for (const ref of chapterInput.summary?.payoffs ?? []) {
			const setup = setups.get(ref);
			if (setup !== undefined && setup.payoffStatus === "pending") { setup.payoffStatus = "paid"; setup.payoffChapter = chapterInput.chapter; setup.payoffRefs.push(`summary ch${chapterInput.chapter}`); }
		}
	}
	ledgers.setupsPayoffs = [...setups.values()];
	// Professional state
	if (inputs.professionalPlan !== undefined) {
		const stageById = new Map(inputs.professionalPlan.actions.map((action) => [action.id, action.stageId]));
		let currentStageId = inputs.professionalPlan.startingStageId;
		let lastChapter = 0;
		const executed: string[] = [];
		const consequences: string[] = [];
		const conflicts: string[] = [];
		let recusal = "none" as "none" | "active" | "resolved";
		for (const conflict of inputs.professionalPlan.conflictsOfInterest) { conflicts.push(conflict.id); if (conflict.mitigation === "recusal" || conflict.mitigation === "reassignment") recusal = "active"; }
		for (const chapterInput of inputs.chapters) {
			for (const event of chapterInput.events) {
				if (event.professionalDelta === undefined) continue;
				lastChapter = chapterInput.chapter;
				for (const actionId of event.professionalDelta.actionIds) {
					executed.push(actionId);
					const stageId = stageById.get(actionId);
					if (stageId !== undefined) currentStageId = stageId;
				}
				for (const consequenceId of event.professionalDelta.consequenceIds) consequences.push(consequenceId);
			}
		}
		ledgers.professionalState = { currentStageId, authorizedActionIds: inputs.professionalPlan.actions.filter((action) => action.stageId === currentStageId).map((action) => action.id), pendingApprovalIds: [], recusalState: recusal, conflictIds: conflicts, openEvidenceRequestIds: [], evidenceAccessState: executed.length > 0 ? "accessed" : "none", professionalConsequenceIds: [...new Set(consequences)], supervisorPosition: inputs.professionalModel?.protagonistRole.reportsTo ?? "unknown", lastChapter };
	}
	// Hypotheses：从 suspectChanges / interpretationChanges 派生（半确定性；不依赖 mysteryCase 是否存在）
	const hypotheses = new Map<string, HypothesisEntry>();
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.mysteryDelta === undefined) continue;
			for (const suspectChange of event.mysteryDelta.suspectChanges) {
				const match = suspectChange.match(/^(.+?)[:：]?(排除|洗清|澄清|不是凶手|重新怀疑|重新纳入|恢复怀疑)/u);
				if (match !== null) {
					const id = `hyp-${match[1]}`;
					const previous = hypotheses.get(id);
					if (match[2].includes("排除") || match[2].includes("洗清") || match[2].includes("澄清") || match[2].includes("不是")) {
						if (previous !== undefined) { previous.status = "discarded"; previous.discardedChapter = chapterInput.chapter; previous.lastReferencedChapter = chapterInput.chapter; }
						else hypotheses.set(id, { hypothesisId: id, claimIds: [], status: "discarded", openedChapter: chapterInput.chapter, discardedChapter: chapterInput.chapter, sourceEventIds: [event.eventId], lastReferencedChapter: chapterInput.chapter });
					} else if (previous !== undefined) { previous.status = "active"; previous.lastReferencedChapter = chapterInput.chapter; }
					else hypotheses.set(id, { hypothesisId: id, claimIds: [], status: "active", openedChapter: chapterInput.chapter, sourceEventIds: [event.eventId], lastReferencedChapter: chapterInput.chapter });
				}
			}
			for (const clueId of event.mysteryDelta.interpretationChanges) {
				const id = `hyp-clue-${clueId}`;
				if (!hypotheses.has(id)) hypotheses.set(id, { hypothesisId: id, claimIds: [], status: "active", openedChapter: chapterInput.chapter, sourceEventIds: [event.eventId], lastReferencedChapter: chapterInput.chapter });
			}
		}
	}
	ledgers.hypotheses = [...hypotheses.values()];
	// Character arcs
	const arcMap = new Map<string, CharacterArcEntry>();
	for (const characterId of characterIds) {
		arcMap.set(characterId, { characterId, trajectory: [], lessonsLearned: [], lastChapter: 1 });
	}
	for (const chapterInput of inputs.chapters) {
		for (const event of chapterInput.events) {
			if (event.chaseWifeDelta !== undefined) {
				const arc = arcMap.get("heroine");
				if (arc !== undefined) {
					arc.trajectory.push({ chapter: chapterInput.chapter, belief: event.chaseWifeDelta.heroinePhase ?? "unknown", goal: "查清真相", agencyDelta: event.chaseWifeDelta.heroineAgencyAfter - event.chaseWifeDelta.heroineAgencyBefore, fear: "", boundary: event.chaseWifeDelta.role === "boundary-test" || event.chaseWifeDelta.role === "final-boundary" ? "defined" : "undefined", decision: event.chaseWifeDelta.role ?? "", cost: "" });
					arc.lastChapter = chapterInput.chapter;
				}
			}
			for (const change of event.characterDeltas) {
				const arc = arcMap.get(change.characterId) ?? arcMap.get("heroine");
				if (arc !== undefined) {
					arc.trajectory.push({ chapter: chapterInput.chapter, belief: `${change.dimension} ${change.from}->${change.to}`, goal: "", agencyDelta: change.dimension === "agency" ? (Number(change.to) || 0) - (Number(change.from) || 0) : 0, fear: "", boundary: "", decision: "", cost: "" });
					arc.lastChapter = chapterInput.chapter;
				}
			}
		}
	}
	ledgers.characterArcs = [...arcMap.values()];
	return ledgers;
}

// ==== Snapshot 聚合 ====
export function aggregateSnapshot(ledgers: MemoryLedgers, throughChapter: number, sourceRevisionHash: string): NarrativeMemorySnapshot {
	const knowledge = ledgers.knowledge;
	const mysteryState: MysteryStateSnapshot = {
		currentHypotheses: ledgers.hypotheses.filter((hypothesis) => hypothesis.status === "active").map((hypothesis) => hypothesis.hypothesisId),
		discardedHypotheses: ledgers.hypotheses.filter((hypothesis) => hypothesis.status === "discarded").map((hypothesis) => hypothesis.hypothesisId),
		activeSuspectIds: [],
		knownContradictions: [],
		unexplainedClueIds: [],
		reinterpretedClueIds: [],
		proofProgressClaimIds: [],
		readerAheadClaimIds: knowledge.filter((entry) => entry.knower === "reader" && entry.status === "knows" && !knowledge.some((other) => other.knower === "heroine" && other.factRef === entry.factRef && other.status === "knows")).map((entry) => entry.factRef),
		heroineAheadClaimIds: knowledge.filter((entry) => entry.knower === "heroine" && entry.status === "knows" && !knowledge.some((other) => other.knower === "reader" && other.factRef === entry.factRef && other.status === "knows")).map((entry) => entry.factRef),
	};
	const unresolvedThreads = ledgers.threads.filter((thread) => thread.status === "open" || thread.status === "deepened" || thread.status === "partially-resolved").map((thread) => thread.threadId);
	const promises = ledgers.threads.filter((thread) => thread.kind === "promise" && thread.status !== "resolved").map((thread) => thread.threadId);
	const setups = ledgers.setupsPayoffs.filter((setup) => setup.payoffStatus === "pending").map((setup) => setup.setupId);
	return {
		throughChapter,
		sourceRevisionHash,
		characters: ledgers.characters,
		relationships: ledgers.relationships,
		knowledge,
		goals: Object.fromEntries(ledgers.characters.map((character) => [character.characterId, character.currentGoals])),
		resources: [...new Set(ledgers.characters.flatMap((character) => character.resources))],
		objects: ledgers.objects,
		locations: [...new Set(ledgers.timeline.map((entry) => entry.location ?? "").filter((value) => value.length > 0))],
		obligations: ledgers.threads.filter((thread) => thread.kind === "obligation" && thread.status !== "resolved").map((thread) => thread.threadId),
		professionalState: ledgers.professionalState,
		mysteryState,
		unresolvedThreads,
		promises,
		setups,
		recentConsequences: ledgers.characters.flatMap((character) => character.recentCosts).slice(-10),
	};
}
