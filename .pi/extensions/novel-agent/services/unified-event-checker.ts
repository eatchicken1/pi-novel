import type {
	ProfessionalObservation,
	UnifiedEvent,
	UnifiedEventMap,
} from "../schemas.ts";

// Unified Narrative Event Layer 确定性检查：
// 一个故事事件 = Story Action + 多个引擎 delta + Character/Resource/Risk delta。
// - 事件是后续正文生成的唯一事件整合层；
// - Unified layer 只引用 + 验证，不修改各引擎 authority；
// - 事件不能只是标签集合：必须有 action + consequence + 至少一个真实状态变化。

export type UnifiedIssueSeverity = "error" | "warning";

export interface UnifiedIssue {
	code: string;
	severity: UnifiedIssueSeverity;
	message: string;
}

export interface UnifiedCapabilities {
	hasMystery: boolean;
	hasMarriage: boolean;
	hasChaseWife: boolean;
	hasProfessional: boolean;
}

// 各引擎 artifact 的可用 ID 集合；对应 artifact 不存在时传 undefined（跳过该引擎的引用校验）。
export interface UnifiedReferenceSets {
	clueIds?: Set<string>;
	claimIds?: Set<string>;
	claimRevealChapters?: Map<string, number>;
	suspectIds?: Set<string>;
	economicItemIds?: Set<string>;
	responsibilityIds?: Set<string>;
	decisionRightIds?: Set<string>;
	socialTieIds?: Set<string>;
	inertiaIds?: Set<string>;
	exitConstraintIds?: Set<string>;
	harmIds?: Set<string>;
	repairIds?: Set<string>;
	professionalActionIds?: Set<string>;
	evidenceSourceIds?: Set<string>;
	conflictIds?: Set<string>;
	escalationPathIds?: Set<string>;
	consequenceIds?: Set<string>;
	observationClueRefs?: Map<string, string | undefined>;
}

function issue(code: string, severity: UnifiedIssueSeverity, message: string): UnifiedIssue {
	return { code, severity, message };
}

// reader-sim 硬隔离：统一反斜杠后按 author-private roots 匹配（unified 未来规划同属作者秘密）。
export function isUnifiedPrivatePath(relativePath: string): boolean {
	const normalized = relativePath.replace(/\\/gu, "/");
	return normalized.startsWith("canon/unified/") || normalized.startsWith("work/unified/") || normalized.startsWith("outline/unified/");
}

function hasAnyDelta(event: UnifiedEvent): boolean {
	return event.mysteryDelta !== undefined || event.marriageDelta !== undefined || event.chaseWifeDelta !== undefined || event.professionalDelta !== undefined || event.characterDeltas.length > 0 || event.resourceDeltas.length > 0 || event.riskDeltas.length > 0;
}

export function checkUnifiedEventMap(
	map: UnifiedEventMap | undefined,
	capabilities: UnifiedCapabilities,
	refs: UnifiedReferenceSets,
): UnifiedIssue[] {
	if (map === undefined) return [issue("MISSING_UNIFIED_EVENT_MAP", "error", "a unified event map is required")];
	const issues: UnifiedIssue[] = [];
	const byId = new Map<number, UnifiedEvent>();
	for (const event of map.events) {
		if (byId.has(event.eventId)) issues.push(issue("DUPLICATE_UNIFIED_EVENT_ID", "error", `duplicate unified event id ${event.eventId}`));
		byId.set(event.eventId, event);
	}
	// 因果 DAG：cause 必须指向存在的更早事件；检测环（保守）
	for (const event of map.events) {
		for (const cause of event.causes) {
			if (!byId.has(cause)) {
				issues.push(issue("UNIFIED_CAUSE_INVALID", "error", `event ${event.eventId} references missing cause event ${cause}`));
			} else if (cause >= event.eventId) {
				issues.push(issue("UNIFIED_CAUSE_INVALID", "error", `event ${event.eventId} has a forward or self cause ${cause}; the event graph must be a DAG`));
			}
		}
		if (event.action.trim().length === 0 || event.consequence.trim().length === 0 || !hasAnyDelta(event)) {
			const message = event.irreversible ? "irreversible" : "empty";
			issues.push(issue("EVENT_WITHOUT_STATE_CHANGE", "error", `event ${event.eventId} is ${message}: it must carry an action, a consequence, and at least one real state delta`));
		} else if (event.irreversible && !hasAnyDelta(event)) {
			issues.push(issue("IRREVERSIBLE_WITHOUT_CONSEQUENCE", "error", `irreversible event ${event.eventId} has no state delta`));
		}
	}
	// capability 非法 delta
	for (const event of map.events) {
		if (event.mysteryDelta !== undefined && !capabilities.hasMystery) issues.push(issue("CAPABILITY_DELTA_NOT_ALLOWED", "error", `event ${event.eventId} declares mysteryDelta but the project has no female-social-suspense primary genre`));
		if (event.marriageDelta !== undefined && !capabilities.hasMarriage) issues.push(issue("CAPABILITY_DELTA_NOT_ALLOWED", "error", `event ${event.eventId} declares marriageDelta but the project has no mature-marriage-crisis mechanism`));
		if (event.chaseWifeDelta !== undefined && !capabilities.hasChaseWife) issues.push(issue("CAPABILITY_DELTA_NOT_ALLOWED", "error", `event ${event.eventId} declares chaseWifeDelta but the project has no chase-wife mechanism`));
		if (event.professionalDelta !== undefined && !capabilities.hasProfessional) issues.push(issue("CAPABILITY_DELTA_NOT_ALLOWED", "error", `event ${event.eventId} declares professionalDelta but the project has no insurance-fraud-investigation professional domain`));
	}
	// 引擎引用校验（artifact 存在时）
	const refErrors = (label: string, candidateIds: string[], allowed?: Set<string>): void => {
		if (allowed === undefined) return;
		for (const candidateId of candidateIds) {
			if (!allowed.has(candidateId)) issues.push(issue("UNIFIED_REFERENCE_MISSING", "error", `${label} references missing id "${candidateId}"`));
		}
	};
	for (const event of map.events) {
		const mystery = event.mysteryDelta;
		if (mystery !== undefined) {
			refErrors(`event ${event.eventId} mysteryDelta.discoveredClueIds`, mystery.discoveredClueIds, refs.clueIds);
			refErrors(`event ${event.eventId} mysteryDelta.readerRevealedClueIds`, mystery.readerRevealedClueIds, refs.clueIds);
			refErrors(`event ${event.eventId} mysteryDelta.suspectChanges`, mystery.suspectChanges, refs.suspectIds);
			refErrors(`event ${event.eventId} mysteryDelta.interpretationChanges`, mystery.interpretationChanges, refs.clueIds);
			refErrors(`event ${event.eventId} mysteryDelta.proofProgressClaimIds`, mystery.proofProgressClaimIds, refs.claimIds);
			refErrors(`event ${event.eventId} mysteryDelta.revealClaimIds`, mystery.revealClaimIds, refs.claimIds);
			for (const change of mystery.claimKnowledgeChanges) {
				if (refs.claimIds !== undefined && !refs.claimIds.has(change.claimId)) issues.push(issue("UNIFIED_REFERENCE_MISSING", "error", `event ${event.eventId} claimKnowledgeChanges references missing claim "${change.claimId}"`));
			}
			for (const claimId of mystery.revealClaimIds) {
				const planned = refs.claimRevealChapters?.get(claimId);
				if (planned !== undefined && event.chapter > planned) issues.push(issue("MYSTERY_REVEAL_LATE", "warning", `event ${event.eventId} reveals claim "${claimId}" in chapter ${event.chapter} after its planned reveal chapter ${planned}`));
			}
		}
		const marriage = event.marriageDelta;
		if (marriage !== undefined) {
			refErrors(`event ${event.eventId} marriageDelta.economicItemChanges`, marriage.economicItemChanges, refs.economicItemIds);
			refErrors(`event ${event.eventId} marriageDelta.responsibilityChanges`, marriage.responsibilityChanges, refs.responsibilityIds);
			refErrors(`event ${event.eventId} marriageDelta.decisionRightChanges`, marriage.decisionRightChanges, refs.decisionRightIds);
			refErrors(`event ${event.eventId} marriageDelta.socialTieChanges`, marriage.socialTieChanges, refs.socialTieIds);
			refErrors(`event ${event.eventId} marriageDelta.inertiaChanges`, marriage.inertiaChanges, refs.inertiaIds);
			refErrors(`event ${event.eventId} marriageDelta.exitConstraintChanges`, marriage.exitConstraintChanges, refs.exitConstraintIds);
		}
		const chase = event.chaseWifeDelta;
		if (chase !== undefined) {
			refErrors(`event ${event.eventId} chaseWifeDelta.harmRefs`, chase.harmRefs, refs.harmIds);
			refErrors(`event ${event.eventId} chaseWifeDelta.repairRefs`, chase.repairRefs, refs.repairIds);
		}
		const professional = event.professionalDelta;
		if (professional !== undefined) {
			refErrors(`event ${event.eventId} professionalDelta.actionIds`, professional.actionIds, refs.professionalActionIds);
			refErrors(`event ${event.eventId} professionalDelta.evidenceSourceIds`, professional.evidenceSourceIds, refs.evidenceSourceIds);
			refErrors(`event ${event.eventId} professionalDelta.conflictIds`, professional.conflictIds, refs.conflictIds);
			refErrors(`event ${event.eventId} professionalDelta.escalationPathIds`, professional.escalationPathIds, refs.escalationPathIds);
			refErrors(`event ${event.eventId} professionalDelta.consequenceIds`, professional.consequenceIds, refs.consequenceIds);
			refErrors(`event ${event.eventId} professionalDelta.observationIds`, professional.observationIds, refs.observationClueRefs === undefined ? undefined : new Set(refs.observationClueRefs.keys()));
			if (professional.workflowFromStageId !== undefined || professional.workflowToStageId !== undefined) {
				// workflow 阶段引用由 professional 引擎校验；这里仅确认 delta 至少引用一个已声明的 action 或 observation
				if (professional.actionIds.length === 0 && professional.observationIds.length === 0) {
					issues.push(issue("EVENT_WITHOUT_STATE_CHANGE", "error", `event ${event.eventId} professionalDelta changes workflow but references no action or observation`));
				}
			}
		}
	}
	// Observation 桥接：mysteryClueId 必须引用已有 clue（显式 realizesClueId，不自动复制）
	if (refs.observationClueRefs !== undefined && refs.clueIds !== undefined) {
		for (const [observationId, clueId] of refs.observationClueRefs) {
			if (clueId !== undefined && !refs.clueIds.has(clueId)) issues.push(issue("UNIFIED_REFERENCE_MISSING", "error", `observation "${observationId}" references missing mystery clue "${clueId}"`));
		}
	}
	return issues;
}

export function collisionStats(map: UnifiedEventMap | undefined): { total: number; collision: number; byChapter: Record<number, { mystery: number; marriage: number; chaseWife: number; professional: number; collision: number }> } {
	if (map === undefined) return { total: 0, collision: 0, byChapter: {} };
	const byChapter: Record<number, { mystery: number; marriage: number; chaseWife: number; professional: number; collision: number }> = {};
	let collision = 0;
	for (const event of map.events) {
		const entry = byChapter[event.chapter] ?? { mystery: 0, marriage: 0, chaseWife: 0, professional: 0, collision: 0 };
		let engineDeltas = 0;
		if (event.mysteryDelta !== undefined) { entry.mystery += 1; engineDeltas += 1; }
		if (event.marriageDelta !== undefined) { entry.marriage += 1; engineDeltas += 1; }
		if (event.chaseWifeDelta !== undefined) { entry.chaseWife += 1; engineDeltas += 1; }
		if (event.professionalDelta !== undefined) { entry.professional += 1; engineDeltas += 1; }
		if (engineDeltas >= 2) { entry.collision += 1; collision += 1; }
		byChapter[event.chapter] = entry;
	}
	return { total: map.events.length, collision, byChapter };
}
