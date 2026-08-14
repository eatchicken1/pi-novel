// Causal Planner：先设计 Anchor/Causal Spine，再扩展 Full Event Graph。
// 本模块只做确定性诊断（引用 / 因果 / 覆盖 / 一致性），不构成第二事件图 authority。
import type {
	BridgeEventFunction,
	NarrativeAnchor,
	NarrativeQuestion,
	PressureChange,
	PromiseTrace,
	StoryArchitecture,
	StoryCausalLink,
	StoryPromiseLedger,
	UnifiedEvent,
} from "../schemas.ts";
import type { DesignCheckFinding } from "./story-design.ts";

const DECISION_CHASE_ROLES = new Set(["decision", "irreversible-exit", "recognition", "credible-repair", "boundary-respect", "closure", "real-consequence"]);

function eventIsDecision(event: UnifiedEvent): boolean {
	if (event.irreversible === true) return true;
	if (event.chaseWifeDelta !== undefined) {
		if (event.chaseWifeDelta.role !== undefined && DECISION_CHASE_ROLES.has(event.chaseWifeDelta.role)) return true;
		if (event.chaseWifeDelta.heroineAgencyAfter > event.chaseWifeDelta.heroineAgencyBefore) return true;
	}
	return false;
}

function eventEngineKinds(event: UnifiedEvent): string[] {
	const kinds: string[] = [];
	if (event.mysteryDelta !== undefined) kinds.push("mystery");
	if (event.marriageDelta !== undefined) kinds.push("marriage");
	if (event.chaseWifeDelta !== undefined) kinds.push("chase-wife");
	if (event.professionalDelta !== undefined) kinds.push("professional");
	return kinds;
}

// ==== Anchor Spine ====
export function checkAnchorSpine(params: {
	anchors: NarrativeAnchor[];
	events: UnifiedEvent[];
	causalLinks: StoryCausalLink[];
	movementIds: string[];
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { anchors, events, causalLinks } = params;
	const eventIds = new Set(events.map((event) => event.eventId));
	const linksByTarget = new Map<number, StoryCausalLink[]>();
	const linksBySource = new Map<number, StoryCausalLink[]>();
	for (const link of causalLinks) {
		(linksByTarget.get(link.toEventId) ?? linksByTarget.set(link.toEventId, []).get(link.toEventId)!).push(link);
		(linksBySource.get(link.fromEventId) ?? linksBySource.set(link.fromEventId, []).get(link.fromEventId)!).push(link);
	}
	const anchorsById = new Map(anchors.map((anchor) => [anchor.id, anchor]));
	void anchorsById;
	for (const anchor of anchors) {
		const incoming = anchor.eventId === undefined ? [] : linksByTarget.get(anchor.eventId) ?? [];
		const outgoing = anchor.eventId === undefined ? [] : linksBySource.get(anchor.eventId) ?? [];
		const hasSetup = anchor.requiredSetup.length > 0;
		if (anchor.eventId !== undefined && !eventIds.has(anchor.eventId)) findings.push({ code: "ANCHOR_EVENT_UNKNOWN", severity: "error", message: `anchor ${anchor.id} 引用的事件 ${anchor.eventId} 不在事件图中`, targetRefs: [anchor.id] });
		if (incoming.length === 0 && !hasSetup && !["opening-disturbance", "first-investigation-commitment", "aftermath-settlement"].includes(anchor.anchorKind)) {
			findings.push({ code: "ANCHOR_WITHOUT_CAUSE", severity: "error", message: `anchor ${anchor.id}（${anchor.anchorKind}）没有 incoming causal link 也没有 requiredSetup；关键事件凭空发生`, targetRefs: [anchor.id] });
		}
		if (anchor.downstreamConsequences.length === 0 && outgoing.length === 0) {
			findings.push({ code: "ANCHOR_WITHOUT_DOWNSTREAM_EFFECT", severity: "warning", message: `anchor ${anchor.id} 没有 downstreamConsequences 也没有 outgoing link；不可替代事件必须改变后续`, targetRefs: [anchor.id] });
		}
		if (anchor.collisionType === "information" && !anchor.irreversible && anchor.downstreamConsequences.length === 0) {
			findings.push({ code: "ANCHOR_ONLY_INFORMATIONAL", severity: "warning", message: `anchor ${anchor.id} 只是信息锚点；核心事件不能只增加信息`, targetRefs: [anchor.id] });
		}
		if (anchor.anchorKind === "midpoint-reframe" && !anchor.irreversible) {
			findings.push({ code: "MIDPOINT_NOT_IRREVERSIBLE", severity: "warning", message: `midpoint reframe ${anchor.id} 不是 irreversible；中段转折必须改变目标/约束/关系状态`, targetRefs: [anchor.id] });
		}
		if (anchor.anchorKind === "climax-choice" && !hasSetup && incoming.length === 0) {
			findings.push({ code: "CLIMAX_NOT_PREPARED", severity: "error", message: `climax anchor ${anchor.id} 没有 requiredSetup；高潮证据必须在前文铺垫`, targetRefs: [anchor.id] });
		}
		if (anchor.anchorKind === "aftermath-settlement" && incoming.length === 0 && !hasSetup) {
			findings.push({ code: "ENDING_NOT_CAUSED_BY_STORY", severity: "warning", message: `ending aftermath ${anchor.id} 没有由任何事件因果导致；结局不能靠解释`, targetRefs: [anchor.id] });
		}
		// ANCHOR_SETUP_MISSING：requiredSetup 中的数字事件 id 必须在事件图中。
		for (const setup of anchor.requiredSetup) {
			const numeric = Number(setup);
			if (Number.isInteger(numeric) && !eventIds.has(numeric)) findings.push({ code: "ANCHOR_SETUP_MISSING", severity: "error", message: `anchor ${anchor.id} 的 requiredSetup 引用不存在的事件 ${setup}`, targetRefs: [anchor.id] });
		}
	}
	return findings;
}

// ==== Causal Links / Filler / Coincidence ====
export function checkCausalLinks(params: {
	events: UnifiedEvent[];
	causalLinks: StoryCausalLink[];
	anchors: NarrativeAnchor[];
	bridgeEvents: BridgeEventFunction[];
	promiseTrace: PromiseTrace[];
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { events, causalLinks, anchors, bridgeEvents, promiseTrace } = params;
	const eventIds = new Set(events.map((event) => event.eventId));
	const anchorEventIds = new Set(anchors.filter((anchor) => anchor.eventId !== undefined).map((anchor) => anchor.eventId));
	const bridgeEventIds = new Set(bridgeEvents.map((bridge) => bridge.eventId));
	const tracedEventIds = new Set<number>();
	for (const trace of promiseTrace) {
		for (const stage of [trace.setup, trace.escalation, trace.collision, trace.payoff]) {
			if (stage?.eventId !== undefined) tracedEventIds.add(stage.eventId);
		}
	}
	const linksIn = new Map<number, StoryCausalLink[]>();
	const linksOut = new Map<number, StoryCausalLink[]>();
	for (const link of causalLinks) {
		if (!eventIds.has(link.fromEventId)) findings.push({ code: "CAUSAL_LINK_FROM_UNKNOWN", severity: "error", message: `causal link ${link.fromEventId}→${link.toEventId} 的起点不存在` });
		if (!eventIds.has(link.toEventId)) findings.push({ code: "CAUSAL_LINK_TO_UNKNOWN", severity: "error", message: `causal link ${link.fromEventId}→${link.toEventId} 的终点不存在` });
		if (link.relation === "coincidence") findings.push({ code: "EVENT_DEPENDS_ON_COINCIDENCE", severity: "warning", message: `事件 ${link.toEventId} 由巧合触发（link ${link.fromEventId}→${link.toEventId}）；巧合不能承担因果`, targetRefs: [String(link.toEventId)] });
		(linksIn.get(link.toEventId) ?? linksIn.set(link.toEventId, []).get(link.toEventId)!).push(link);
		(linksOut.get(link.fromEventId) ?? linksOut.set(link.fromEventId, []).get(link.fromEventId)!).push(link);
	}
	for (const bridge of bridgeEvents) {
		if (!eventIds.has(bridge.eventId)) findings.push({ code: "BRIDGE_REFERENCE_INVALID", severity: "error", message: `bridge event ${bridge.eventId} 不存在`, targetRefs: [String(bridge.eventId)] });
	}
	const sorted = [...events].sort((left, right) => left.chapter - right.chapter || left.eventId - right.eventId);
	for (const [index, event] of sorted.entries()) {
		const isFirst = index === 0;
		const incoming = linksIn.get(event.eventId) ?? [];
		const outgoing = linksOut.get(event.eventId) ?? [];
		const isAnchor = anchorEventIds.has(event.eventId);
		const isBridge = bridgeEventIds.has(event.eventId);
		const isTraced = tracedEventIds.has(event.eventId);
		const noParticipation = incoming.length === 0 && outgoing.length === 0;
		if (noParticipation && !isAnchor && !isBridge && !isTraced) {
			findings.push({ code: "EVENT_FILLER_RISK", severity: "warning", message: `事件 ${event.eventId} 不在任何 causal link / anchor / bridge / promise trace 中；移除它因果图、信息、决策、成本都不变（凑章节）`, targetRefs: [String(event.eventId)] });
			continue;
		}
		if (incoming.length === 0 && !isFirst && !isAnchor && !isBridge && !isTraced) {
			findings.push({ code: "EVENT_CAUSALLY_WEAK", severity: event.irreversible === true ? "error" : "warning", message: `事件 ${event.eventId} 没有 incoming causal link；为什么它会发生没有被解释`, targetRefs: [String(event.eventId)] });
		}
		if (outgoing.length === 0 && !isAnchor && !isBridge && !isTraced && event.mysteryDelta !== undefined && event.mysteryDelta.discoveredClueIds.length > 0) {
			findings.push({ code: "CLUE_WITHOUT_STRATEGIC_EFFECT", severity: "warning", message: `事件 ${event.eventId} 发现线索但没有 outgoing link；发现没有改变假设/策略/风险判断`, targetRefs: [String(event.eventId)] });
		}
		if (outgoing.length === 0 && !isAnchor && !isBridge && !isTraced) {
			findings.push({ code: "EVENT_ONLY_EXISTS_FOR_INFORMATION", severity: "warning", message: `事件 ${event.eventId} 只增加信息；信息事件必须改变假设/策略/关系解读/资源分配之一`, targetRefs: [String(event.eventId)] });
		}
	}
	return findings;
}

// ==== Promise Trace ====
export function checkPromiseTrace(params: {
	ledger: StoryPromiseLedger;
	promiseTrace: PromiseTrace[];
	events: UnifiedEvent[];
	causalLinks: StoryCausalLink[];
	anchors: NarrativeAnchor[];
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { ledger, promiseTrace, events, causalLinks, anchors } = params;
	const eventIds = new Set(events.map((event) => event.eventId));
	const traceByPromise = new Map(promiseTrace.map((trace) => [trace.promiseId, trace]));
	const anchorEventIds = new Set(anchors.filter((anchor) => anchor.eventId !== undefined).map((anchor) => anchor.eventId));
	const incomingTargets = new Set(causalLinks.map((link) => link.toEventId));
	for (const trace of promiseTrace) {
		if (!ledger.promises.some((promise) => promise.id === trace.promiseId)) {
			findings.push({ code: "PROMISE_TRACE_UNKNOWN", severity: "error", message: `promise trace 引用了未知 promise ${trace.promiseId}`, targetRefs: [trace.promiseId] });
			continue;
		}
		if (trace.setup?.eventId === undefined) findings.push({ code: "PROMISE_SETUP_MISSING", severity: "warning", message: `promise ${trace.promiseId} 没有 setup 事件；承诺从第一句开始却无人铺垫`, targetRefs: [trace.promiseId] });
		if (trace.escalation?.eventId === undefined) findings.push({ code: "PROMISE_ESCALATION_MISSING", severity: "warning", message: `promise ${trace.promiseId} 没有 escalation 事件；承诺没有升级`, targetRefs: [trace.promiseId] });
		if (trace.payoff.eventId === undefined) findings.push({ code: "PROMISE_PAYOFF_MISSING", severity: "warning", message: `promise ${trace.promiseId} 没有 payoff 事件；读者承诺无法兑现`, targetRefs: [trace.promiseId] });
		for (const stage of [trace.setup, trace.escalation, trace.collision, trace.payoff]) {
			if (stage?.eventId !== undefined && !eventIds.has(stage.eventId)) findings.push({ code: "PROMISE_TRACE_EVENT_UNKNOWN", severity: "error", message: `promise ${trace.promiseId} 引用了不存在的事件 ${stage.eventId}`, targetRefs: [trace.promiseId] });
		}
		if (trace.payoff.eventId !== undefined && !incomingTargets.has(trace.payoff.eventId) && !anchorEventIds.has(trace.payoff.eventId)) {
			findings.push({ code: "PROMISE_PAYOFF_NOT_CAUSED", severity: "warning", message: `promise ${trace.promiseId} 的 payoff 事件 ${trace.payoff.eventId} 没有 incoming causal link 也不是 anchor；兑现不是被前文导致的`, targetRefs: [trace.promiseId] });
		}
	}
	for (const promise of ledger.promises) {
		if (!traceByPromise.has(promise.id) && promise.expectedPayoffMovementId !== undefined) {
			findings.push({ code: "PROMISE_WITHOUT_TRACE", severity: "warning", message: `promise ${promise.id} 没有 promise trace；承诺在事件图中没有落点`, targetRefs: [promise.id] });
		}
	}
	return findings;
}

// ==== Narrative Questions ====
export function checkNarrativeQuestions(params: {
	questions: NarrativeQuestion[];
	movementIds: string[];
	climaxMovementId?: string;
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { questions, movementIds, climaxMovementId } = params;
	const indexOf = (movementId: string | undefined): number => movementId === undefined ? -1 : movementIds.indexOf(movementId);
	if (questions.length === 0) return findings;
	const climaxIndex = climaxMovementId === undefined ? movementIds.length - 1 : indexOf(climaxMovementId);
	for (const question of questions) {
		if (indexOf(question.openedAtMovementId) < 0) findings.push({ code: "QUESTION_MOVEMENT_UNKNOWN", severity: "error", message: `question ${question.id} 的 opening movement ${question.openedAtMovementId} 不存在`, targetRefs: [question.id] });
		const closedIndex = question.closedAtMovementId === undefined ? movementIds.length : indexOf(question.closedAtMovementId);
		if (question.closedAtMovementId !== undefined && indexOf(question.closedAtMovementId) < 0) findings.push({ code: "QUESTION_MOVEMENT_UNKNOWN", severity: "error", message: `question ${question.id} 的 closing movement ${question.closedAtMovementId} 不存在`, targetRefs: [question.id] });
		if (question.closedAtMovementId !== undefined && (question.finalAnswerRef === undefined || question.finalAnswerRef.length === 0)) {
			findings.push({ code: "QUESTION_CLOSED_WITHOUT_PAYOFF", severity: "warning", message: `question ${question.id} 关闭但没有 finalAnswerRef；问题被遗忘而不是被回答`, targetRefs: [question.id] });
		}
		const openSpan = closedIndex - indexOf(question.openedAtMovementId);
		if (openSpan >= 3 && question.deepenedAtMovementIds.length === 0) {
			findings.push({ code: "QUESTION_OPEN_TOO_LONG_WITHOUT_DEEPENING", severity: "warning", message: `question ${question.id} 跨 ${openSpan} 个 movement 未深化；开放问题必须不断加深`, targetRefs: [question.id] });
		}
	}
	// 同时开放的 major question 数
	for (const [index, movementId] of movementIds.entries()) {
		const open = questions.filter((question) => {
			const opened = indexOf(question.openedAtMovementId);
			const closed = question.closedAtMovementId === undefined ? movementIds.length : indexOf(question.closedAtMovementId);
			return opened <= index && closed > index;
		});
		if (open.length > 5) findings.push({ code: "TOO_MANY_SIMULTANEOUS_MAJOR_QUESTIONS", severity: "warning", message: `movement ${movementId} 同时开放 ${open.length} 个 major question；读者负担过重`, targetRefs: [movementId] });
	}
	// 全部问题在 climax 前关闭 → 结尾没有读者问题
	const closingBeforeClimax = questions.every((question) => question.closedAtMovementId !== undefined && indexOf(question.closedAtMovementId) < climaxIndex);
	if (questions.length > 0 && closingBeforeClimax) findings.push({ code: "ALL_MAJOR_QUESTIONS_CLOSE_BEFORE_CLIMAX", severity: "warning", message: "所有 major question 都在高潮前关闭；最后一段没有任何读者问题在支撑" });
	return findings;
}

// ==== Pressure Architecture ====
export function checkPressureShape(params: {
	pressureChanges: PressureChange[];
	movementIds: string[];
	midpointMovementId?: string;
	climaxMovementId?: string;
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { pressureChanges, movementIds, midpointMovementId, climaxMovementId } = params;
	const byMovement = new Map<string, PressureChange[]>();
	for (const change of pressureChanges) {
		const list = byMovement.get(change.movementId) ?? [];
		list.push(change);
		byMovement.set(change.movementId, list);
	}
	if (pressureChanges.length === 0) return findings;
	const orderedMovements = movementIds.filter((movementId) => byMovement.has(movementId));
	// PRESSURE_PLATEAU：连续 >=3 个 movement 全部 stable。
	let plateau = 0;
	for (const movementId of orderedMovements) {
		const changes = byMovement.get(movementId) ?? [];
		const allStable = changes.length > 0 && changes.every((change) => change.change === "stable");
		plateau = allStable ? plateau + 1 : 0;
		if (plateau >= 3) {
			findings.push({ code: "PRESSURE_PLATEAU", severity: "warning", message: `连续 ${plateau} 个 movement 压力全部 stable（第二幕平线）`, targetRefs: [movementId] });
			plateau = 0;
		}
	}
	// ALL_PRESSURES_MOVE_TOGETHER：每个 movement 内所有压力同向变化。
	for (const movementId of orderedMovements) {
		const changes = byMovement.get(movementId) ?? [];
		if (changes.length >= 3 && new Set(changes.map((change) => change.change)).size === 1) {
			findings.push({ code: "ALL_PRESSURES_MOVE_TOGETHER", severity: "warning", message: `movement ${movementId} 的 ${changes.length} 条压力全部 ${changes[0].change}；压力应此消彼长`, targetRefs: [movementId] });
		}
	}
	// NO_RECOVERY_BEAT
	if (!pressureChanges.some((change) => change.change === "released" || change.change === "falling")) {
		findings.push({ code: "NO_RECOVERY_BEAT", severity: "warning", message: "全书没有任何 released/falling 压力节拍；故事不是压力必须一直涨" });
	}
	// MIDPOINT_PRESSURE_UNCHANGED
	if (midpointMovementId !== undefined) {
		const midpointChanges = byMovement.get(midpointMovementId) ?? [];
		if (midpointChanges.length > 0 && midpointChanges.every((change) => change.change === "stable")) {
			findings.push({ code: "MIDPOINT_PRESSURE_UNCHANGED", severity: "warning", message: `midpoint movement ${midpointMovementId} 压力未变化；中段转折没有压力重构`, targetRefs: [midpointMovementId] });
		}
	}
	// CLIMAX_PRESSURE_NOT_CONVERGED
	if (climaxMovementId !== undefined) {
		const climaxChanges = byMovement.get(climaxMovementId) ?? [];
		if (climaxChanges.length > 0 && !climaxChanges.some((change) => change.change === "released" || change.change === "transformed")) {
			findings.push({ code: "CLIMAX_PRESSURE_NOT_CONVERGED", severity: "warning", message: `climax movement ${climaxMovementId} 没有 released/transformed；高潮压力没有汇合结算`, targetRefs: [climaxMovementId] });
		}
	}
	return findings;
}

// ==== Information vs Decision Balance ====
export function checkInformationDecisionBalance(events: UnifiedEvent[]): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const sorted = [...events].sort((left, right) => left.chapter - right.chapter || left.eventId - right.eventId);
	let run = 0;
	for (const event of sorted) {
		run = eventIsDecision(event) ? 0 : run + 1;
		if (run >= 5) {
			findings.push({ code: "INFORMATION_WITHOUT_DECISION_RUN", severity: "warning", message: `连续 ${run} 个事件只有 discover/inspect/learn 没有 choose/refuse/expose/conceal/leave/sacrifice；调查流于流水账`, targetRefs: sorted.slice(-run).map((item) => String(item.eventId)) });
			run = 0;
		}
	}
	return findings;
}

// ==== Arc Synchronization ====
export function checkArcSync(params: {
	events: UnifiedEvent[];
	architecture: StoryArchitecture;
}): DesignCheckFinding[] {
	const findings: DesignCheckFinding[] = [];
	const { events, architecture } = params;
	const sorted = [...events].sort((left, right) => left.chapter - right.chapter || left.eventId - right.eventId);
	const maxChapter = sorted.reduce((max, event) => Math.max(max, event.chapter), 1);
	const halfChapter = Math.ceil(maxChapter / 2);
	const firstHalf = sorted.filter((event) => event.chapter <= halfChapter);
	const knowledgeGained = firstHalf.some((event) => (event.mysteryDelta?.claimKnowledgeChanges.length ?? 0) > 0 || (event.mysteryDelta?.revealClaimIds.length ?? 0) > 0);
	const agencyIncreased = firstHalf.some((event) => event.chaseWifeDelta !== undefined && event.chaseWifeDelta.heroineAgencyAfter > event.chaseWifeDelta.heroineAgencyBefore);
	if (knowledgeGained && !agencyIncreased) findings.push({ code: "HEROINE_KNOWLEDGE_OUTRUNS_AGENCY", severity: "warning", message: "前半段女主知道越来越多但没有任何 agency 增长；知识必须转化为行动力" });
	const settlement = architecture.endingSettlement;
	if (settlement.caseResolution.trim().length > 0 && settlement.personalResolution.trim().length === 0) findings.push({ code: "CASE_TRUTH_WITHOUT_PERSONAL_TRUTH", severity: "warning", message: "ending settlement 只有案件真相没有女主个人真相；案件解决 ≠ 人物成长" });
	const engineKinds = new Set<string>();
	for (const event of sorted) for (const kind of eventEngineKinds(event)) engineKinds.add(kind);
	if (engineKinds.size >= 2 && architecture.climaxArchitecture.engines.length === 1) findings.push({ code: "CLIMAX_DECONVERGES", severity: "warning", message: `前面 ${engineKinds.size} 个引擎高度融合，高潮却只结算 ${architecture.climaxArchitecture.engines[0]}；高潮退回单一揭晓` });
	return findings;
}
