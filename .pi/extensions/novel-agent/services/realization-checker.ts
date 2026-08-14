import type {
	MysteryCase,
	MysteryClue,
	NarrativeRealizationRecord,
	ProfessionalCasePlan,
	UnifiedEventMap,
} from "../schemas.ts";

// Narrative Realization 确定性检查：
// 计划（planned）≠ 正文兑现（realized）。计划项必须最终在章节正文中出现，并以散文锚点
// （startChar/endChar/excerpt，按去除空白后的归一化文本定位）+ 内容哈希绑定到具体草稿修订。
// - Unified layer 只引用 + 验证，不自动创建兑现证据（无静默同步）；
// - 锚点必须逐字符匹配正文，防止模型事后编造证据；
// - 兑现记录绑定 contentHash/draftRevision，草稿一改即失效（stale）。

export type RealizationIssueSeverity = "error" | "warning";

export interface RealizationIssue {
	code: string;
	severity: RealizationIssueSeverity;
	message: string;
}

export interface PlannedRealization {
	contentType: string;
	engineRef: string;
}

export function realizationKey(contentType: string, engineRef: string): string {
	return contentType + ":" + engineRef;
}

function issue(code: string, severity: RealizationIssueSeverity, message: string): RealizationIssue {
	return { code, severity, message };
}

// 计划集：本章应兑现的引擎计划项。unified map 是唯一的跨引擎计划载体；
// mystery clue/claim 与 professional observation 自带计划章，无需 unified map。
export function collectPlannedRealizations(
	chapter: number,
	refs: {
		unifiedMap?: UnifiedEventMap;
		mysteryCase?: MysteryCase;
		clues: MysteryClue[];
		professionalPlan?: ProfessionalCasePlan;
	},
): PlannedRealization[] {
	const planned: PlannedRealization[] = [];
	if (refs.unifiedMap !== undefined) {
		for (const event of refs.unifiedMap.events) {
			if (event.chapter !== chapter) continue;
			planned.push({ contentType: "unified-event", engineRef: String(event.eventId) });
			const marriage = event.marriageDelta;
			if (marriage !== undefined) {
				const marriageRefs = [
					...marriage.economicItemChanges,
					...marriage.responsibilityChanges,
					...marriage.decisionRightChanges,
					...marriage.socialTieChanges,
					...marriage.inertiaChanges,
					...marriage.exitConstraintChanges,
				];
				for (const engineRef of new Set(marriageRefs)) {
					planned.push({ contentType: "marriage-transition", engineRef });
				}
			}
		}
	}
	for (const clue of refs.clues) {
		if (clue.plannedRealizationChapter === chapter) planned.push({ contentType: "mystery-clue", engineRef: clue.id });
	}
	if (refs.mysteryCase !== undefined) {
		for (const claim of refs.mysteryCase.truthClaims) {
			if (claim.plannedRevealChapter === chapter) planned.push({ contentType: "mystery-reveal", engineRef: claim.id });
		}
	}
	if (refs.professionalPlan !== undefined) {
		for (const observation of refs.professionalPlan.observations) {
			if (observation.intendedChapter === chapter) planned.push({ contentType: "professional-observation", engineRef: observation.id });
		}
	}
	return planned;
}

// 锚点校验：去除全部空白后定位；excerpt 必须与正文切片逐字符一致。
export function validateRealizationAnchor(content: string, record: NarrativeRealizationRecord): string | undefined {
	const normalized = [...content.replace(/\s+/gu, "")].join("");
	const anchor = record.anchor;
	if (!Number.isInteger(anchor.startChar) || !Number.isInteger(anchor.endChar) || anchor.startChar < 0 || anchor.endChar <= anchor.startChar) {
		return "record " + record.recordId + " has an invalid anchor range";
	}
	if (anchor.endChar > normalized.length) {
		return "record " + record.recordId + " anchor is outside the chapter prose";
	}
	const normalizedExcerpt = [...anchor.excerpt.replace(/\s+/gu, "")].join("");
	if (normalized.slice(anchor.startChar, anchor.endChar) !== normalizedExcerpt) {
		return "record " + record.recordId + " excerpt does not match the chapter prose at its declared position";
	}
	return undefined;
}

// 确定性检查：stale 绑定、锚点有效性、重复、计划缺失/未计划兑现。
// contentHash/latestContentHash 由 store 按最终正文（normalizeText 后）计算。
export function checkNarrativeRealizations(params: {
	content: string;
	records: NarrativeRealizationRecord[];
	planned: PlannedRealization[];
	draftRevision: number | undefined;
	contentHash: string | undefined;
	latestDraftRevision: number;
	latestContentHash: string;
}): RealizationIssue[] {
	const issues: RealizationIssue[] = [];
	if (params.contentHash !== undefined && params.contentHash !== params.latestContentHash) {
		issues.push(issue("REALIZATION_CONTENT_HASH_STALE", "error", "realization records are bound to prose that no longer matches the latest chapter draft; save realization records again for the current revision"));
	} else if (params.draftRevision !== undefined && params.draftRevision !== params.latestDraftRevision) {
		issues.push(issue("REALIZATION_DRAFT_STALE", "error", "realization records were saved against draft revision " + params.draftRevision + ", expected " + params.latestDraftRevision));
	}
	const seen = new Set<string>();
	const realized = new Set<string>();
	for (const record of params.records) {
		const key = realizationKey(record.contentType, record.engineRef);
		if (seen.has(key)) issues.push(issue("REALIZATION_DUPLICATE", "error", "duplicate realization record for " + key));
		seen.add(key);
		realized.add(key);
		const anchorIssue = validateRealizationAnchor(params.content, record);
		if (anchorIssue !== undefined) issues.push(issue("REALIZATION_ANCHOR_INVALID", "error", anchorIssue));
	}
	const plannedKeys = new Set(params.planned.map((item) => realizationKey(item.contentType, item.engineRef)));
	for (const item of params.planned) {
		if (!realized.has(realizationKey(item.contentType, item.engineRef))) {
			issues.push(issue("REALIZATION_PLANNED_BUT_MISSING", "error", "planned " + item.contentType + " " + item.engineRef + " has no prose realization record for this chapter"));
		}
	}
	for (const key of realized) {
		if (!plannedKeys.has(key)) issues.push(issue("REALIZATION_UNPLANNED", "error", "realization record " + key + " does not correspond to any planned item for this chapter"));
	}
	return issues;
}
