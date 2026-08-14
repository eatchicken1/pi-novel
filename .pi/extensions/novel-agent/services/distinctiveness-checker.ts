import type {
	StoryDistinctivenessProfile,
	UnifiedEvent,
	UnifiedEventMap,
} from "../schemas.ts";

// Story Distinctiveness 确定性交叉验证：
// 评审是模型驱动的（premises/risks/strongestMoves 由模型撰写），本 checker 只做两件事：
// 1. 计算确定性统计（跨引擎碰撞、重复事件指纹、引擎覆盖），不输出任何评分；
// 2. 交叉验证模型声称与确定性事实是否一致（声称有引擎交织但零碰撞 = 证据缺失）。

export type DistinctivenessIssueSeverity = "error" | "warning";

export interface DistinctivenessIssue {
	code: string;
	severity: DistinctivenessIssueSeverity;
	message: string;
}

export interface DistinctivenessStats {
	totalEvents: number;
	collisionEvents: number;
	repeatEvents: number;
	engineCoverage: { mystery: number; marriage: number; chaseWife: number; professional: number };
	byChapter: Record<number, { mystery: number; marriage: number; chaseWife: number; professional: number; collision: number }>;
}

function issue(code: string, severity: DistinctivenessIssueSeverity, message: string): DistinctivenessIssue {
	return { code, severity, message };
}

// 事件指纹：action+consequence+引擎 delta 引用 + 角色维度，归一化后完全相同视为重复。
function eventFingerprint(event: UnifiedEvent): string {
	const mystery = event.mysteryDelta === undefined ? [] : [
		...event.mysteryDelta.discoveredClueIds,
		...event.mysteryDelta.readerRevealedClueIds,
		...event.mysteryDelta.interpretationChanges,
		...event.mysteryDelta.proofProgressClaimIds,
		...event.mysteryDelta.revealClaimIds,
	];
	const marriage = event.marriageDelta === undefined ? [] : [
		...event.marriageDelta.economicItemChanges,
		...event.marriageDelta.responsibilityChanges,
		...event.marriageDelta.decisionRightChanges,
		...event.marriageDelta.socialTieChanges,
		...event.marriageDelta.inertiaChanges,
		...event.marriageDelta.exitConstraintChanges,
	];
	const chase = event.chaseWifeDelta === undefined ? [] : [
		...event.chaseWifeDelta.informationDelta,
		...event.chaseWifeDelta.relationshipDelta,
		...event.chaseWifeDelta.resourceDelta,
		...event.chaseWifeDelta.riskDelta,
	];
	const professional = event.professionalDelta === undefined ? [] : [
		...event.professionalDelta.actionIds,
		...event.professionalDelta.observationIds,
	];
	const characterDimensions = event.characterDeltas.map((delta) => delta.dimension);
	return JSON.stringify({
		action: event.action,
		consequence: event.consequence,
		mystery: mystery.sort(),
		marriage: marriage.sort(),
		chase: chase.sort(),
		professional: professional.sort(),
		characterDimensions: characterDimensions.sort(),
	});
}

export function distinctivenessStats(map: UnifiedEventMap | undefined): DistinctivenessStats {
	if (map === undefined) {
		return { totalEvents: 0, collisionEvents: 0, repeatEvents: 0, engineCoverage: { mystery: 0, marriage: 0, chaseWife: 0, professional: 0 }, byChapter: {} };
	}
	const byChapter: DistinctivenessStats["byChapter"] = {};
	let collisionEvents = 0;
	const fingerprints = new Map<string, number>();
	let repeatEvents = 0;
	const coverage = { mystery: 0, marriage: 0, chaseWife: 0, professional: 0 };
	for (const event of map.events) {
		const entry = byChapter[event.chapter] ?? { mystery: 0, marriage: 0, chaseWife: 0, professional: 0, collision: 0 };
		let engineDeltas = 0;
		if (event.mysteryDelta !== undefined) { entry.mystery += 1; coverage.mystery += 1; engineDeltas += 1; }
		if (event.marriageDelta !== undefined) { entry.marriage += 1; coverage.marriage += 1; engineDeltas += 1; }
		if (event.chaseWifeDelta !== undefined) { entry.chaseWife += 1; coverage.chaseWife += 1; engineDeltas += 1; }
		if (event.professionalDelta !== undefined) { entry.professional += 1; coverage.professional += 1; engineDeltas += 1; }
		if (engineDeltas >= 2) { entry.collision += 1; collisionEvents += 1; }
		byChapter[event.chapter] = entry;
		const fingerprint = eventFingerprint(event);
		const count = fingerprints.get(fingerprint) ?? 0;
		fingerprints.set(fingerprint, count + 1);
		if (count > 0) repeatEvents += 1;
	}
	return { totalEvents: map.events.length, collisionEvents, repeatEvents, engineCoverage: coverage, byChapter };
}

export function checkStoryDistinctiveness(params: {
	profile: StoryDistinctivenessProfile;
	map: UnifiedEventMap | undefined;
	capabilities: { hasMystery: boolean; hasMarriage: boolean; hasChaseWife: boolean; hasProfessional: boolean };
}): DistinctivenessIssue[] {
	const issues: DistinctivenessIssue[] = [];
	const stats = distinctivenessStats(params.map);
	if (params.map === undefined) {
		issues.push(issue("DISTINCTIVENESS_MAP_MISSING", "warning", "no unified event map exists; deterministic statistics cannot substantiate the distinctiveness review"));
		return issues;
	}
	if (params.profile.engineBlendEvidence.length > 0 && stats.collisionEvents === 0) {
		issues.push(issue("DISTINCTIVENESS_BLEND_CLAIM_UNSUPPORTED", "warning", "the review claims engine blending but no event carries two or more engine deltas"));
	}
	if (stats.repeatEvents > 0) {
		issues.push(issue("DISTINCTIVE_EVENT_REPEAT", "warning", stats.repeatEvents + " event(s) repeat an identical action/consequence/delta fingerprint"));
	}
	if (params.profile.verdict === "distinctive" && stats.repeatEvents >= 2) {
		issues.push(issue("DISTINCTIVENESS_VERDICT_OVERSTATED", "warning", "verdict is distinctive but " + stats.repeatEvents + " events repeat identical fingerprints"));
	}
	if (params.capabilities.hasMystery && stats.engineCoverage.mystery === 0) issues.push(issue("DISTINCTIVENESS_ENGINE_UNUSED", "warning", "mystery capability is never exercised by any unified event delta"));
	if (params.capabilities.hasMarriage && stats.engineCoverage.marriage === 0) issues.push(issue("DISTINCTIVENESS_ENGINE_UNUSED", "warning", "mature-marriage-crisis capability is never exercised by any unified event delta"));
	if (params.capabilities.hasChaseWife && stats.engineCoverage.chaseWife === 0) issues.push(issue("DISTINCTIVENESS_ENGINE_UNUSED", "warning", "chase-wife capability is never exercised by any unified event delta"));
	if (params.capabilities.hasProfessional && stats.engineCoverage.professional === 0) issues.push(issue("DISTINCTIVENESS_ENGINE_UNUSED", "warning", "insurance-fraud-investigation capability is never exercised by any unified event delta"));
	return issues;
}
