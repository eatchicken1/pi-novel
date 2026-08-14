import type {
	MarriageDecisionRight,
	MarriageEconomicItem,
	MarriageExitConstraint,
	MarriageInertiaFactor,
	MarriageResponsibility,
	MarriageSocialTie,
	MatureMarriageRestructuringPlan,
	MatureMarriageStructure,
} from "../schemas.ts";

// Mature Marriage Crisis：structural relationship mechanism 的确定性检查。
// 只验证结构、引用、责任、约束与可执行性；不做道德判断（好丈夫/坏丈夫/受害者/控制狂），
// 不自动把 care work / economic dependence / shared housing 判定为 Chase Wife harm。

export type MarriageIssueSeverity = "error" | "warning";

export interface MarriageIssue {
	code: string;
	severity: MarriageIssueSeverity;
	message: string;
}

export interface MarriageStayingLogicView {
	materialReason?: string;
	socialReason?: string;
	familyReason?: string;
	careerReason?: string;
}

function issue(code: string, severity: MarriageIssueSeverity, message: string): MarriageIssue {
	return { code, severity, message };
}

// reader-sim 硬隔离：统一反斜杠后按 author-private roots 匹配（marriage 规划内容同属作者秘密）。
export function isMarriagePrivatePath(relativePath: string): boolean {
	const normalized = relativePath.replace(/\\/gu, "/");
	return normalized.startsWith("canon/marriage/") || normalized.startsWith("work/marriage/") || normalized.startsWith("outline/marriage/");
}

interface StructureIndex {
	economic: Map<string, MarriageEconomicItem>;
	responsibilities: Map<string, MarriageResponsibility>;
	decisionRights: Map<string, MarriageDecisionRight>;
	socialTies: Map<string, MarriageSocialTie>;
	inertiaFactors: Map<string, MarriageInertiaFactor>;
	exitConstraints: Map<string, MarriageExitConstraint>;
}

function indexStructure(structure: MatureMarriageStructure): StructureIndex {
	return {
		economic: new Map(structure.economicItems.map((item) => [item.id, item])),
		responsibilities: new Map(structure.responsibilities.map((item) => [item.id, item])),
		decisionRights: new Map(structure.decisionRights.map((item) => [item.id, item])),
		socialTies: new Map(structure.socialTies.map((item) => [item.id, item])),
		inertiaFactors: new Map(structure.inertiaFactors.map((item) => [item.id, item])),
		exitConstraints: new Map(structure.exitConstraints.map((item) => [item.id, item])),
	};
}

function allSourceIds(index: StructureIndex): Set<string> {
	return new Set([
		...index.economic.keys(),
		...index.responsibilities.keys(),
		...index.decisionRights.keys(),
		...index.socialTies.keys(),
		...index.inertiaFactors.keys(),
		...index.exitConstraints.keys(),
	]);
}

function checkUniqueIds(structure: MatureMarriageStructure): MarriageIssue[] {
	const issues: MarriageIssue[] = [];
	const seen = new Map<string, string>();
	const collections: Array<[string, Array<{ id: string }>]> = [
		["economic", structure.economicItems],
		["responsibility", structure.responsibilities],
		["decision right", structure.decisionRights],
		["social tie", structure.socialTies],
		["inertia factor", structure.inertiaFactors],
		["exit constraint", structure.exitConstraints],
	];
	for (const [kind, items] of collections) {
		for (const item of items) {
			const previous = seen.get(item.id);
			if (previous !== undefined) issues.push(issue("DUPLICATE_MARRIAGE_ID", "error", `duplicate ${kind} id "${item.id}" (also used by ${previous})`));
			else seen.set(item.id, kind);
		}
	}
	return issues;
}

function checkReferences(structure: MatureMarriageStructure, index: StructureIndex): MarriageIssue[] {
	const issues: MarriageIssue[] = [];
	const responsibilityIds = new Set(index.responsibilities.keys());
	const economicIds = new Set(index.economic.keys());
	const decisionIds = new Set(index.decisionRights.keys());
	const socialIds = new Set(index.socialTies.keys());
	const allIds = allSourceIds(index);
	for (const item of structure.economicItems) {
		for (const responsibilityId of item.relatedResponsibilityIds) {
			if (!responsibilityIds.has(responsibilityId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `economic item "${item.id}" references missing responsibility "${responsibilityId}"`));
		}
	}
	for (const item of structure.responsibilities) {
		for (const economicId of item.relatedEconomicItemIds) {
			if (!economicIds.has(economicId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `responsibility "${item.id}" references missing economic item "${economicId}"`));
		}
	}
	for (const item of structure.decisionRights) {
		for (const responsibilityId of item.affectedResponsibilityIds) {
			if (!responsibilityIds.has(responsibilityId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `decision right "${item.id}" references missing responsibility "${responsibilityId}"`));
		}
		for (const economicId of item.affectedEconomicItemIds) {
			if (!economicIds.has(economicId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `decision right "${item.id}" references missing economic item "${economicId}"`));
		}
	}
	for (const item of [...structure.inertiaFactors, ...structure.exitConstraints]) {
		for (const sourceId of item.sourceRefIds) {
			if (!allIds.has(sourceId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `"${item.id}" references missing source "${sourceId}"`));
		}
	}
	return issues;
}

function checkCareLoad(structure: MatureMarriageStructure): MarriageIssue[] {
	const issues: MarriageIssue[] = [];
	const recurring = structure.responsibilities.filter((item) => item.frequency === "daily" || item.frequency === "weekly" || item.frequency === "recurring");
	const countByBearer = new Map<string, number>();
	for (const item of recurring) {
		const bearer = item.actualPrimaryBearer ?? "unknown";
		countByBearer.set(bearer, (countByBearer.get(bearer) ?? 0) + 1);
	}
	const protagonistCount = countByBearer.get("protagonist") ?? 0;
	const spouseCount = countByBearer.get("spouse") ?? 0;
	if (Math.max(protagonistCount, spouseCount) >= 3 && Math.min(protagonistCount, spouseCount) <= 1) {
		issues.push(issue("CARE_LOAD_ASYMMETRY", "warning", `structure shows care/domestic load concentrated on one side (protagonist ${protagonistCount}, spouse ${spouseCount} recurring duties); whether this constitutes exploitation is a relationship-semantic judgment, not a mechanical conclusion`));
	}
	return issues;
}

function checkStayingLogicAlignment(structure: MatureMarriageStructure, stayingLogic: MarriageStayingLogicView | undefined, index: StructureIndex): MarriageIssue[] {
	if (stayingLogic === undefined) return [];
	const issues: MarriageIssue[] = [];
	const hasEconomicBasis = structure.economicItems.length > 0 || [...index.exitConstraints.values()].some((constraint) => constraint.category === "economic" || constraint.category === "housing" || constraint.category === "debt");
	if (isNonEmpty(stayingLogic.materialReason) && !hasEconomicBasis) {
		issues.push(issue("STAYING_LOGIC_MATERIAL_UNSUPPORTED", "warning", "chase-wife stayingLogic.materialReason is set but the marriage structure has no economic/housing/debt basis"));
	}
	if (isNonEmpty(stayingLogic.socialReason) && structure.socialTies.length === 0) {
		issues.push(issue("STAYING_LOGIC_SOCIAL_UNSUPPORTED", "warning", "chase-wife stayingLogic.socialReason is set but the marriage structure has no social ties"));
	}
	if (isNonEmpty(stayingLogic.familyReason) && !structure.responsibilities.some((item) => item.domain === "childcare" || item.domain === "eldercare" || item.domain === "family-administration")) {
		issues.push(issue("STAYING_LOGIC_FAMILY_UNSUPPORTED", "warning", "chase-wife stayingLogic.familyReason is set but the marriage structure has no family/care responsibility"));
	}
	if (isNonEmpty(stayingLogic.careerReason) && !structure.decisionRights.some((item) => item.domain === "career" || item.domain === "business") && ![...index.exitConstraints.values()].some((constraint) => constraint.category === "career")) {
		issues.push(issue("STAYING_LOGIC_CAREER_UNSUPPORTED", "warning", "chase-wife stayingLogic.careerReason is set but the marriage structure has no career-related decision right or constraint"));
	}
	return issues;
}

function isNonEmpty(value: string | undefined): boolean {
	return value !== undefined && value.trim().length > 0;
}

export function checkMatureMarriageStructure(
	structure: MatureMarriageStructure | undefined,
	stayingLogic?: MarriageStayingLogicView,
): MarriageIssue[] {
	if (structure === undefined) return [issue("MISSING_MARRIAGE_STRUCTURE", "error", "a confirmed or proposed mature marriage structure is required")];
	const issues: MarriageIssue[] = [];
	if (structure.protagonistCharacterId === structure.spouseCharacterId) {
		issues.push(issue("MARRIAGE_SAME_CHARACTERS", "error", `protagonist and spouse must be different characters (both "${structure.protagonistCharacterId}")`));
	}
	issues.push(...checkUniqueIds(structure));
	const index = indexStructure(structure);
	issues.push(...checkReferences(structure, index));
	for (const constraint of structure.exitConstraints) {
		if (constraint.sourceRefIds.length === 0 && !isNonEmpty(constraint.externalSourceDescription)) {
			issues.push(issue("EXIT_CONSTRAINT_WITHOUT_SOURCE", "error", `exit constraint "${constraint.id}" has no sourceRefIds and no external source description`));
		}
	}
	if (structure.economicItems.length === 0 && structure.responsibilities.length === 0 && structure.decisionRights.length === 0 && structure.socialTies.length === 0 && structure.exitConstraints.length === 0) {
		issues.push(issue("MARRIAGE_STRUCTURE_TOO_THIN", "error", "marriage structure contains no economic, care, decision, social, or exit-constraint dimension; this is not a structural marriage model"));
	}
	issues.push(...checkCareLoad(structure));
	issues.push(...checkStayingLogicAlignment(structure, stayingLogic, index));
	return issues;
}

export function checkMatureMarriageRestructuring(
	structure: MatureMarriageStructure | undefined,
	plan: MatureMarriageRestructuringPlan | undefined,
): MarriageIssue[] {
	if (structure === undefined) return [issue("MISSING_MARRIAGE_STRUCTURE", "error", "restructuring checks require a confirmed or proposed mature marriage structure")];
	if (plan === undefined) return [issue("MISSING_MARRIAGE_RESTRUCTURING", "error", "a confirmed or proposed mature marriage restructuring plan is required")];
	const issues: MarriageIssue[] = [];
	const index = indexStructure(structure);
	const economicIds = new Set(index.economic.keys());
	const responsibilityIds = new Set(index.responsibilities.keys());
	const decisionIds = new Set(index.decisionRights.keys());
	const socialIds = new Set(index.socialTies.keys());
	const constraintIds = new Set(index.exitConstraints.keys());
	for (const change of plan.resourceChanges) {
		if (!economicIds.has(change.economicItemId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `resource change references missing economic item "${change.economicItemId}"`));
	}
	for (const change of plan.responsibilityChanges) {
		if (!responsibilityIds.has(change.responsibilityId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `responsibility change references missing responsibility "${change.responsibilityId}"`));
		if (change.afterBearer === undefined && (change.feasibility !== "unresolved" || change.remainingConsequence.trim().length === 0)) {
			issues.push(issue("RESPONSIBILITY_VANISHED", "error", `responsibility change "${change.responsibilityId}" leaves no new bearer without an explicit unresolved explanation`));
		}
	}
	for (const change of plan.decisionRightChanges) {
		if (!decisionIds.has(change.decisionRightId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `decision right change references missing decision right "${change.decisionRightId}"`));
	}
	for (const change of plan.socialTieChanges) {
		if (!socialIds.has(change.socialTieId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `social tie change references missing social tie "${change.socialTieId}"`));
	}
	for (const response of plan.constraintResponses) {
		if (!constraintIds.has(response.constraintId)) issues.push(issue("MARRIAGE_REFERENCE_MISSING", "error", `constraint response references missing exit constraint "${response.constraintId}"`));
	}
	for (const constraint of structure.exitConstraints) {
		if ((constraint.severity === "high" || constraint.severity === "critical") && !plan.constraintResponses.some((response) => response.constraintId === constraint.id)) {
			issues.push(issue("UNADDRESSED_HIGH_EXIT_CONSTRAINT", "error", `high/critical exit constraint "${constraint.id}" has no constraint response in the restructuring plan`));
		}
	}
	const separationModes = new Set(["trial-separation", "separate-households", "divorce-intent", "independent-exit"]);
	if (separationModes.has(plan.mode)) {
		for (const responsibility of structure.responsibilities) {
			if ((responsibility.domain === "childcare" || responsibility.domain === "eldercare" || responsibility.domain === "health-care") && !plan.responsibilityChanges.some((change) => change.responsibilityId === responsibility.id)) {
				issues.push(issue("DEPENDENT_CARE_UNRESOLVED", "error", `dependent-care responsibility "${responsibility.id}" has no change in a separation plan; care obligations do not disappear with separation`));
			}
		}
	}
	for (const dependency of plan.unresolvedDependencies) {
		if (dependency.trim().length === 0) issues.push(issue("UNRESOLVED_DEPENDENCY_EMPTY", "error", "unresolvedDependencies entries must carry an actual description"));
	}
	return issues;
}
