// Long-form Continuity Checks：基于 derived ledgers 的跨章检查（MEMORY / KNOWLEDGE / RELATIONSHIP / OBJECT / FACT /
// TIMELINE / THREAD / SETUP-PAYOFF / PROFESSIONAL / MYSTERY / CHARACTER）。只检查可确定结构问题；语义问题由 model finding 兜底。
import type { UnifiedEvent } from "../schemas.ts";
import type { DesignCheckFinding } from "./story-design.ts";
import type { CharacterArcEntry, CharacterStateEntry, CriticalFactEntry, HypothesisEntry, MemoryLedgers, NarrativeObjectEntry, NarrativeThreadEntry, ProfessionalStateSnapshot, RelationshipStateSnapshot, SetupPayoffEntry, TimelineEntry } from "./narrative-memory.ts";

export interface LongFormCheckContext {
	currentChapter: number;
	totalChapters: number;
	chapters: Array<{ chapter: number; events: UnifiedEvent[] }>;
}

function finding(code: string, severity: "error" | "warning", message: string, targetRefs?: string[]): DesignCheckFinding {
	return { code, severity, message, targetRefs };
}

// ==== Knowledge ====
export function checkKnowledgeLedger(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	// CHARACTER_FORGETS_CRITICAL_KNOWLEDGE：已 knows 的 fact 在后续章节被当作新知识再次获取（re-learn）
	for (const entry of ledgers.knowledge) {
		if (entry.status !== "knows") continue;
		const laterRelearn = ledgers.knowledge.find((other) => other.factRef === entry.factRef && other.knower === entry.knower && other.status === "knows" && other.sinceChapter > entry.sinceChapter && other.supersededBy !== undefined);
		if (laterRelearn !== undefined) findings.push(finding("CHARACTER_FORGETS_CRITICAL_KNOWLEDGE", "warning", `${entry.knower} 自 ch${entry.sinceChapter} 已知 ${entry.factRef}，却被重复当作新知识（ch${laterRelearn.sinceChapter}）`, [entry.factRef]));
	}
	// FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER：believes → knows 但同章无信息暴露事件
	for (const entry of ledgers.knowledge) {
		if (entry.status !== "knows" || entry.supersededBy === undefined || !/^believes@\d+$/u.test(entry.supersededBy)) continue;
		if (entry.knower !== "heroine" && entry.knower !== "reader") continue;
		const chapterInput = context.chapters.find((chapter) => chapter.chapter === entry.sinceChapter);
		// 触发 = 本章有新的信息暴露（任何新 clue/reveal 都可能推翻 belief；具体关联由 model semantic 兜底）
		const hasExposure = (chapterInput?.events ?? []).some((event) => event.mysteryDelta !== undefined && (event.mysteryDelta.discoveredClueIds.length > 0 || event.mysteryDelta.readerRevealedClueIds.length > 0 || event.mysteryDelta.revealClaimIds.length > 0));
		if (!hasExposure) findings.push(finding("FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER", "warning", `${entry.knower} 对 ${entry.factRef} 的 belief（@${entry.supersededBy}）在 ch${entry.sinceChapter} 直接转为 knows，但没有信息暴露事件`, [entry.factRef]));
	}
	return findings;
}

// ==== Relationship ====
export function checkRelationshipLedger(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const boundaryEvents: Array<{ chapter: number; role: string }> = [];
	const repairEvents: Array<{ chapter: number; role: string }> = [];
	const recognitionChapters: number[] = [];
	for (const chapterInput of context.chapters) {
		for (const event of chapterInput.events) {
			const role = event.chaseWifeDelta?.role;
			if (role === "boundary-test" || role === "boundary-respect" || role === "final-boundary") boundaryEvents.push({ chapter: chapterInput.chapter, role });
			if (role === "repair-attempt" || role === "credible-repair") repairEvents.push({ chapter: chapterInput.chapter, role });
			if (role === "recognition") recognitionChapters.push(chapterInput.chapter);
		}
	}
	// REPEATED_BOUNDARY_DISCOVERY：女主再次“第一次”提出边界
	let lastBoundaryTest = -1;
	for (const event of boundaryEvents) {
		if (event.role === "boundary-test") {
			if (lastBoundaryTest >= 0) {
				const hasRespectBetween = boundaryEvents.some((candidate) => candidate.chapter > lastBoundaryTest && candidate.chapter < event.chapter && candidate.role !== "boundary-test");
				const hasRecognitionBetween = recognitionChapters.some((chapter) => chapter > lastBoundaryTest && chapter < event.chapter);
				if (!hasRespectBetween && !hasRecognitionBetween) findings.push(finding("REPEATED_BOUNDARY_DISCOVERY", "warning", `女主在 ch${lastBoundaryTest} 已提出边界，ch${event.chapter} 又当作第一次认识（中间无 boundary-respect / recognition）`));
			}
			lastBoundaryTest = event.chapter;
		}
	}
	// REPAIR_FORGOT_PREVIOUS_FAILURE：repair 之前有失败 repair 且中间无 recognition
	let lastFailedRepair = -1;
	for (const event of repairEvents) {
		if (event.role === "repair-attempt") {
			if (lastFailedRepair >= 0 && !recognitionChapters.some((chapter) => chapter > lastFailedRepair && chapter < event.chapter)) findings.push(finding("REPAIR_FORGOT_PREVIOUS_FAILURE", "warning", `ch${lastFailedRepair} 的 repair-attempt 失败后，ch${event.chapter} 再次 repair 且中间无 recognition；重复同样策略`));
			lastFailedRepair = event.chapter;
		}
	}
	// RELATIONSHIP_STATE_REGRESSION_UNEXPLAINED：physicalDistance separated → living-together 无修复/边界事件
	for (const relationship of ledgers.relationships) {
		if (relationship.physicalDistance !== "separated") continue;
		const hasRepairAfter = repairEvents.some((event) => event.chapter >= relationship.lastChapter);
		const hasBoundaryAfter = boundaryEvents.some((event) => event.chapter >= relationship.lastChapter);
		if (!hasRepairAfter && !hasBoundaryAfter && relationship.lastChapter < context.currentChapter) findings.push(finding("RELATIONSHIP_STATE_REGRESSION_UNEXPLAINED", "warning", `${relationship.relationshipId} 已分居（ch${relationship.lastChapter}）但后续无 repair/boundary 事件；关系状态回归需解释`, [relationship.relationshipId]));
	}
	return findings;
}

// ==== Objects ====
export function checkObjectLedger(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const objectRefsByChapter = new Map<number, Array<{ objectId: string; change: string }>>();
	for (const chapterInput of context.chapters) {
		for (const event of chapterInput.events) {
			for (const resource of event.resourceDeltas) {
				const list = objectRefsByChapter.get(chapterInput.chapter) ?? [];
				list.push({ objectId: resource.itemRef, change: resource.change });
				objectRefsByChapter.set(chapterInput.chapter, list);
			}
			if (event.professionalDelta !== undefined) {
				for (const evidenceSourceId of event.professionalDelta.evidenceSourceIds) {
					const list = objectRefsByChapter.get(chapterInput.chapter) ?? [];
					list.push({ objectId: evidenceSourceId, change: "accessed" });
					objectRefsByChapter.set(chapterInput.chapter, list);
				}
			}
		}
	}
	for (const object of ledgers.objects) {
		if (object.state === "destroyed") {
			const destroyedAt = object.destroyedChapter ?? object.lastSeenChapter;
			const usedAfter = [...objectRefsByChapter.entries()].some(([chapter, refs]) => chapter > destroyedAt && refs.some((ref) => ref.objectId === object.objectId));
			if (usedAfter) findings.push(finding("OBJECT_REAPPEARS_AFTER_DESTRUCTION", "error", `${object.objectId} 已被销毁（ch${destroyedAt}）却在之后章节再次被使用`, [object.objectId]));
		}
		const usedBefore = [...objectRefsByChapter.entries()].some(([chapter, refs]) => chapter < object.introducedChapter && refs.some((ref) => ref.objectId === object.objectId));
		if (usedBefore) findings.push(finding("OBJECT_USED_BEFORE_INTRODUCTION", "error", `${object.objectId} 在引入章（ch${object.introducedChapter}）之前就被使用`, [object.objectId]));
		// OBJECT_TELEPORTS：holder 连续变化而无 objectChanges 记录（近似：同一章内 multiple refs 不同 holder 文本）
		void object;
	}
	// OBJECT_HOLDER_CONTRADICTION：同一对象同章出现两个不同 holder（由 change 文本判定）
	for (const [chapter, refs] of objectRefsByChapter) {
		const byObject = new Map<string, Set<string>>();
		for (const ref of refs) {
			const holder = ref.change.match(/(?:交给|给了|给)s*([^，。；]+)/u)?.[1];
			if (holder !== undefined) {
				const holders = byObject.get(ref.objectId) ?? new Set<string>();
				holders.add(holder.trim());
				byObject.set(ref.objectId, holders);
			}
		}
		for (const [objectId, holders] of byObject) {
			if (holders.size > 1) findings.push(finding("OBJECT_HOLDER_CONTRADICTION", "warning", `${objectId} 在 ch${chapter} 同时被 ${[...holders].join("、")} 持有`, [objectId]));
		}
	}
	return findings;
}

// ==== Critical Facts ====
export function checkCriticalFacts(ledgers: MemoryLedgers, _context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const byLabel = new Map<string, CriticalFactEntry[]>();
	for (const fact of ledgers.criticalFacts) {
		const list = byLabel.get(fact.label) ?? [];
		list.push(fact);
		byLabel.set(fact.label, list);
	}
	for (const [label, entries] of byLabel) {
		if (entries.length < 2) continue;
		const normalized = new Set(entries.map((entry) => entry.normalizedValue));
		if (normalized.size > 1) findings.push(finding("FACT_VALUE_CONTRADICTION", "error", `关键事实 ${label} 前后不一致：${entries.map((entry) => `ch${entry.chapter} ${entry.value}`).join(" vs ")}（无中间修改事件）`, entries.map((entry) => entry.factId)));
	}
	return findings;
}

// ==== Timeline ====
export function checkTimeline(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const entries = ledgers.timeline;
	// TIME_ORDER_CONTRADICTION：storyDate 与 chapter 顺序矛盾
	let previousDate: string | undefined;
	let previousChapter = 0;
	for (const entry of entries) {
		if (entry.storyDate !== undefined) {
			if (previousDate !== undefined && previousChapter < entry.chapter && entry.storyDate < previousDate) findings.push(finding("TIME_ORDER_CONTRADICTION", "error", `event ${entry.eventId}（ch${entry.chapter}）的 storyDate ${entry.storyDate} 早于 ch${previousChapter} 的 ${previousDate}`, [String(entry.eventId)]));
			previousDate = entry.storyDate;
			previousChapter = entry.chapter;
		}
	}
	// CHARACTER_IN_TWO_PLACES：同章同时刻同人物出现在不同 location
	const byChapter = new Map<number, TimelineEntry[]>();
	for (const entry of entries) {
		const list = byChapter.get(entry.chapter) ?? [];
		list.push(entry);
		byChapter.set(entry.chapter, list);
	}
	for (const [chapter, list] of byChapter) {
		for (let index = 0; index < list.length; index += 1) {
			for (let other = index + 1; other < list.length; other += 1) {
				const left = list[index];
				const right = list[other];
				if (left.location === undefined || right.location === undefined || left.location === right.location) continue;
				if (left.storyTime === undefined || right.storyTime === undefined || left.storyTime !== right.storyTime) continue;
				const shared = left.participants.filter((participant) => right.participants.includes(participant));
				if (shared.length > 0) findings.push(finding("CHARACTER_IN_TWO_PLACES", "error", `ch${chapter} ${shared.join("、")} 同时出现在 ${left.location} 与 ${right.location}（${left.storyTime}）`));
			}
		}
	}
	void context;
	return findings;
}

// ==== Threads ====
export function checkThreadLedger(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const current = context.currentChapter;
	const openThreads = ledgers.threads.filter((thread) => thread.status !== "resolved" && thread.status !== "abandoned-intentionally");
	// THREAD_RESOLVED_WITHOUT_CAUSE
	for (const thread of ledgers.threads) {
		if (thread.status === "resolved" && thread.resolutionRefs.length === 0) findings.push(finding("THREAD_RESOLVED_WITHOUT_CAUSE", "warning", `thread ${thread.threadId} 被标记 resolved 但没有 resolution refs`, [thread.threadId]));
	}
	// THREAD_REOPENED_WITHOUT_REASON：resolved 后又被 opened（由 openedChapter 或 lastAdvanced 判定——简化：不重复判定）
	// THREAD_DROPPED / THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE
	for (const thread of openThreads) {
		const age = current - thread.lastAdvancedChapter;
		if (thread.importance === "major" && age >= 8) findings.push(finding("THREAD_DROPPED", "warning", `major thread ${thread.threadId}（${thread.kind}）已 ${age} 章未推进（最后 ch${thread.lastAdvancedChapter}）`, [thread.threadId]));
		if (thread.expectedHorizon !== undefined && age > thread.expectedHorizon) findings.push(finding("THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE", "warning", `thread ${thread.threadId} 超过预期窗口（${thread.expectedHorizon}）仍未兑现`, [thread.threadId]));
	}
	// TOO_MANY_DORMANT_THREADS
	const dormant = openThreads.filter((thread) => current - thread.lastAdvancedChapter >= 6);
	if (dormant.length > 5) findings.push(finding("TOO_MANY_DORMANT_THREADS", "warning", `${dormant.length} 条 thread 超过 6 章未推进：${dormant.map((thread) => thread.threadId).join("、")}`));
	// MAIN_THREAD_DISAPPEARS：主要 mystery thread 在超过一半章节长度内未推进
	const mainThreads = openThreads.filter((thread) => thread.kind === "mystery-question" && thread.importance === "major");
	for (const thread of mainThreads) {
		if (current - thread.lastAdvancedChapter >= Math.ceil(context.totalChapters / 2)) findings.push(finding("MAIN_THREAD_DISAPPEARS", "warning", `主案件 thread ${thread.threadId} 已 ${current - thread.lastAdvancedChapter} 章未推进（全书 ${context.totalChapters} 章的一半以上）`, [thread.threadId]));
	}
	return findings;
}

// ==== Setups / Payoffs ====
export function checkSetupPayoff(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const current = context.currentChapter;
	for (const setup of ledgers.setupsPayoffs) {
		if (setup.payoffStatus !== "pending") continue;
		const age = current - setup.setupChapter;
		if (setup.importance === "major" && age >= 12) findings.push(finding("SETUP_FORGOTTEN_TOO_LONG", "warning", `major setup ${setup.setupId}（ch${setup.setupChapter}）已 ${age} 章未 payoff`, [setup.setupId]));
		if (setup.expectedPayoffWindow !== undefined && age > setup.expectedPayoffWindow) findings.push(finding("SETUP_NEVER_USED", "warning", `setup ${setup.setupId} 超过预期窗口（${setup.expectedPayoffWindow} 章）未使用`, [setup.setupId]));
	}
	// PAYOFF_WITHOUT_SETUP：payoff 存在但无对应 setup（由 summary.payoffs 声明驱动，这里依赖 setups 派生；若 payoff 引用无 setup → 由 store 层检查 summary 声明）
	const setupRefs = new Set(ledgers.setupsPayoffs.map((setup) => setup.setupRef));
	void setupRefs;
	return findings;
}

// ==== Professional ====
export function checkProfessionalState(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const state = ledgers.professionalState;
	if (state === undefined) return findings;
	// ACTION_IGNORES_PREVIOUS_RECUSAL：recusal 在计划层已生效（conflict mitigation=recusal），任何后续专业动作都违反回避
	if (state.recusalState === "active") {
		let executedAfterRecusal = 0;
		for (const chapterInput of context.chapters) {
			for (const event of chapterInput.events) {
				if (event.professionalDelta !== undefined && event.professionalDelta.actionIds.length > 0) executedAfterRecusal += 1;
			}
		}
		if (executedAfterRecusal > 0) findings.push(finding("ACTION_IGNORES_PREVIOUS_RECUSAL", "error", `recusal 处于 active 状态，但全书仍有 ${executedAfterRecusal} 个事件执行专业动作`));
	}
	// PROFESSIONAL_CONSEQUENCE_DISAPPEARS：consequence 出现后再无引用
	const consequenceIds = state.professionalConsequenceIds;
	const referencedChapters = new Set<number>();
	for (const chapterInput of context.chapters) {
		for (const event of chapterInput.events) {
			if (event.professionalDelta !== undefined && event.professionalDelta.consequenceIds.some((id) => consequenceIds.includes(id))) referencedChapters.add(chapterInput.chapter);
		}
	}
	if (state.lastChapter > 0 && consequenceIds.length > 0 && Math.max(...referencedChapters, 0) <= state.lastChapter && context.currentChapter > state.lastChapter) {
		findings.push(finding("PROFESSIONAL_CONSEQUENCE_DISAPPEARS", "warning", `职业后果 ${consequenceIds.join("、")} 自 ch${state.lastChapter} 后未再被引用`, consequenceIds));
	}
	return findings;
}

// ==== Hypotheses ====
export function checkHypotheses(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	for (const hypothesis of ledgers.hypotheses) {
		if (hypothesis.discardedChapter !== undefined && hypothesis.lastReferencedChapter > hypothesis.discardedChapter) {
			findings.push(finding("DISCARDED_HYPOTHESIS_RESURRECTS_UNEXPLAINED", "warning", `假设 ${hypothesis.hypothesisId} 已于 ch${hypothesis.discardedChapter} 排除，却在 ch${hypothesis.lastReferencedChapter} 再次使用且无新证据`, [hypothesis.hypothesisId]));
		}
	}
	void context;
	return findings;
}

// ==== Character Arcs ====
export function checkCharacterArcs(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	for (const arc of ledgers.characterArcs) {
		// CHARACTER_RELEARNS_SAME_LESSON：同类 lesson 重复（近似：agency 大幅回落又回升的模式）
		const drops = arc.trajectory.filter((entry) => entry.agencyDelta < -10);
		if (drops.length >= 2 && arc.trajectory.some((entry) => entry.agencyDelta > 10)) findings.push(finding("CHARACTER_RELEARNS_SAME_LESSON", "warning", `${arc.characterId} 出现 ${drops.length} 次大幅 agency 回落又回升；可能重复学习同一课`, [arc.characterId]));
		// CHARACTER_GOAL_DISAPPEARS：角色在近 10 章无任何事件参与
		if (context.currentChapter - arc.lastChapter >= 10) findings.push(finding("CHARACTER_GOAL_DISAPPEARS", "warning", `${arc.characterId} 已 ${context.currentChapter - arc.lastChapter} 章未出现；角色目标消失`, [arc.characterId]));
	}
	void context;
	return findings;
}

// ==== 聚合入口 ====
export function checkLongFormContinuity(ledgers: MemoryLedgers, context: LongFormCheckContext): DesignCheckFinding[] {
	return [
		...checkKnowledgeLedger(ledgers, context),
		...checkRelationshipLedger(ledgers, context),
		...checkObjectLedger(ledgers, context),
		...checkCriticalFacts(ledgers, context),
		...checkTimeline(ledgers, context),
		...checkThreadLedger(ledgers, context),
		...checkSetupPayoff(ledgers, context),
		...checkProfessionalState(ledgers, context),
		...checkHypotheses(ledgers, context),
		...checkCharacterArcs(ledgers, context),
	];
}

export type { CharacterArcEntry, CharacterStateEntry, CriticalFactEntry, HypothesisEntry, MemoryLedgers, NarrativeObjectEntry, NarrativeThreadEntry, ProfessionalStateSnapshot, RelationshipStateSnapshot, SetupPayoffEntry, TimelineEntry };
