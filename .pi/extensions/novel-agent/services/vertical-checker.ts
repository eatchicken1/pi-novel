import type {
	FemaleSocialSuspenseDesign,
	HeroineContradictionProfile,
	ProfessionalCasePlan,
	UnifiedEventMap,
	VerticalQualityReview,
} from "../schemas.ts";

// Female Social Suspense Vertical Intelligence 确定性交叉验证：
// 模型撰写 Vertical Design（结构/机制/模式/对抗/主题/乐章），本 checker 只做两件事：
// 1. 把「社会问题、婚姻模式、职业依赖、悬疑升级」与 unified 事件地图的实际兑现对齐；
// 2. 输出 error/warning 诊断码，不输出任何评分。

export type VerticalIssueSeverity = "error" | "warning";

export interface VerticalIssue {
	code: string;
	severity: VerticalIssueSeverity;
	message: string;
}

function issue(code: string, severity: VerticalIssueSeverity, message: string): VerticalIssue {
	return { code, severity, message };
}

export interface VerticalDesignRefs {
	professionalActions?: Set<string>;
	marriageRefs?: Set<string>;
	clueIds?: Set<string>;
	harmIds?: Set<string>;
}

function hasExternalDelta(event: { mysteryDelta?: unknown; professionalDelta?: unknown; riskDeltas: unknown[]; resourceDeltas: unknown[]; marriageDelta?: unknown; chaseWifeDelta?: unknown }): "external" | "relationship-only" | "none" {
	if (event.mysteryDelta !== undefined || event.professionalDelta !== undefined || event.riskDeltas.length > 0 || event.resourceDeltas.length > 0) return "external";
	if (event.marriageDelta !== undefined || event.chaseWifeDelta !== undefined) return "relationship-only";
	return "none";
}

export function checkSocialSuspenseDesign(design: FemaleSocialSuspenseDesign, map: UnifiedEventMap | undefined): VerticalIssue[] {
	const issues: VerticalIssue[] = [];
	const events = map?.events ?? [];
	const byId = new Map(events.map((event) => [event.eventId, event]));
	const maxChapter = events.reduce((max, event) => Math.max(max, event.chapter), 0);

	// ==== Social Architecture ====
	const mechanisms = design.socialArchitecture.systemMechanisms;
	if (mechanisms.length === 0) issues.push(issue("SOCIAL_QUESTION_WITHOUT_MECHANISM", "error", "the social question is declared without any concrete system mechanism"));
	for (const mechanism of mechanisms) {
		if (mechanism.whoBenefits.trim().length === 0) issues.push(issue("POWER_STRUCTURE_WITHOUT_BENEFICIARY", "error", `mechanism ${mechanism.id} has no actual beneficiary`));
		if (mechanism.whoPays.trim().length === 0) issues.push(issue("POWER_STRUCTURE_WITHOUT_COST_BEARER", "error", `mechanism ${mechanism.id} has no cost bearer`));
		if (mechanism.eventIds.length === 0) {
			issues.push(issue("SOCIAL_MECHANISM_WITHOUT_EVENT_EFFECT", "warning", `mechanism ${mechanism.id} is never realized by any unified event`));
			continue;
		}
		const referenced = mechanism.eventIds.filter((eventId) => byId.has(eventId));
		if (referenced.length === 0) {
			issues.push(issue("SOCIAL_MECHANISM_WITHOUT_EVENT_EFFECT", "warning", `mechanism ${mechanism.id} references events that do not exist in the unified map`));
			continue;
		}
		const effects = referenced.map((eventId) => byId.get(eventId) as (typeof events)[number]);
		const anyExternal = effects.some((event) => hasExternalDelta(event) === "external");
		const anyRelationshipOnly = effects.some((event) => hasExternalDelta(event) === "relationship-only");
		if (!anyExternal) issues.push(issue("SOCIAL_PROBLEM_ONLY_BACKGROUND", "warning", `mechanism ${mechanism.id} changes no information, resource, risk, decision, or professional action in its events`));
		if (anyExternal === false && anyRelationshipOnly && design.socialArchitecture.vulnerableGroups.length === 0 && design.socialArchitecture.beneficiaries.length <= mechanisms.length) issues.push(issue("SOCIAL_STAKES_ONLY_RELATIONSHIP", "warning", `mechanism ${mechanism.id} only affects the couple; no broader affected parties are declared`));
	}

	// ==== Suspense Escalation ====
	let clueOnlyRun = 0;
	let stakesStagnantRun = 0;
	let maxClueOnlyRun = 0;
	let maxStakesStagnantRun = 0;
	for (const event of events) {
		const mystery = event.mysteryDelta;
		const addsClue = mystery !== undefined && (mystery.discoveredClueIds.length > 0 || mystery.readerRevealedClueIds.length > 0);
		const reinterprets = mystery !== undefined && (mystery.interpretationChanges.length > 0 || mystery.claimKnowledgeChanges.length > 0 || mystery.suspectChanges.length > 0 || mystery.proofProgressClaimIds.length > 0);
		clueOnlyRun = addsClue && !reinterprets ? clueOnlyRun + 1 : 0;
		maxClueOnlyRun = Math.max(maxClueOnlyRun, clueOnlyRun);
		const isCaseEvent = mystery !== undefined || event.professionalDelta !== undefined;
		const stakesMove = event.riskDeltas.length > 0 || event.irreversible || (mystery !== undefined && mystery.claimKnowledgeChanges.length > 0);
		stakesStagnantRun = isCaseEvent && !stakesMove ? stakesStagnantRun + 1 : 0;
		maxStakesStagnantRun = Math.max(maxStakesStagnantRun, stakesStagnantRun);
	}
	if (maxClueOnlyRun >= 3) issues.push(issue("SUSPENSE_INFORMATION_WITHOUT_REINTERPRETATION", "warning", `${maxClueOnlyRun} consecutive mystery events only add clues without changing interpretation, hypothesis, or knowledge`));
	if (maxStakesStagnantRun >= 4) issues.push(issue("SUSPENSE_STAKES_STAGNANT", "warning", `${maxStakesStagnantRun} consecutive case events change no risk, stakes, or knowledge state`));
	if (design.suspense.falseModel === undefined && events.length >= 10) issues.push(issue("FALSE_MODEL_MISSING", "warning", "a mid-length mystery with 10+ events declares no false model; the story may run on a single correct explanation"));

	// ==== Mature Marriage Narrative Patterns ====
	const marriageEvents = events.filter((event) => event.marriageDelta !== undefined);
	if (marriageEvents.length > 0 && design.marriagePatterns.length === 0) issues.push(issue("MARRIAGE_CRISIS_WITHOUT_HISTORY", "warning", "marriage changes occur in events but no long-term interaction pattern supports the crisis"));
	if (design.marriagePatterns.length > 0 && design.marriagePatterns.every((pattern) => pattern.structuralRefs.length === 0 && pattern.relationshipRefs.length === 0)) issues.push(issue("MARRIAGE_CONFLICT_TOO_EVENT_SPECIFIC", "warning", "every declared marriage pattern is disconnected from structural or relationship refs; the conflict only exists in the current case"));
	for (const pattern of design.marriagePatterns) {
		const fired = pattern.breakingEventIds.filter((eventId) => byId.has(eventId)).length;
		if (fired === 0) issues.push(issue("MARRIAGE_PATTERN_WITHOUT_PAYOFF", "warning", `marriage pattern ${pattern.id} is declared but never fires in any unified event`));
	}
	const irreversibleMarriage = events.some((event) => event.irreversible && event.marriageDelta !== undefined);
	const accumulation = design.marriagePatterns.reduce((sum, pattern) => sum + pattern.breakingEventIds.length, 0);
	if (irreversibleMarriage && accumulation < 2) issues.push(issue("MARRIAGE_EXIT_WITHOUT_ACCUMULATION", "warning", "an irreversible marriage exit occurs but fewer than two pattern-breaking events accumulated before it"));

	// ==== Chase Wife 去模板化（模型评审 + 一致性） ====
	const chaseEvents = events.filter((event) => event.chaseWifeDelta !== undefined);
	if (chaseEvents.length > 0) {
		if (!design.chaseArcReview.wrongPursuitRootedInFlaw) issues.push(issue("WRONG_PURSUIT_NOT_ROOTED_IN_FLAW", "warning", "early male pursuit is not rooted in his core false belief about the heroine"));
		if (!design.chaseArcReview.repairAddressesHarmMechanism) issues.push(issue("REPAIR_DOES_NOT_ADDRESS_HARM_MECHANISM", "warning", "repair does not reverse the original harm mechanism; it may only stack costs"));
		if (!design.chaseArcReview.regretWithBeliefChange) issues.push(issue("REGRET_WITHOUT_BELIEF_CHANGE", "warning", "male regret is declared without an old-belief → contradiction → recognition → behavior change chain"));
	}

	// ==== Professional Plot Dependency ====
	const professionalEvents = events.filter((event) => event.professionalDelta !== undefined);
	const professionalRatio = events.length === 0 ? 0 : professionalEvents.length / events.length;
	if (professionalRatio < 0.25) issues.push(issue("PROFESSION_REPLACEABLE", "warning", `the profession is replaceable: only ${Math.round(professionalRatio * 100)}% of events reference professional action, observation, authority, workflow, or consequence`));
	if (design.professionalPlotDependency.dependencyChannels.length === 0) issues.push(issue("PROFESSION_REPLACEABLE", "warning", "professional plot dependency declares no channel through which the profession generates plot"));

	// ==== Collision Quality ====
	const collisionEvents = events.filter((event) => [event.mysteryDelta, event.marriageDelta, event.chaseWifeDelta, event.professionalDelta].filter((delta) => delta !== undefined).length >= 2);
	if (collisionEvents.length >= 3) {
		let cooccurrenceCount = 0;
		let causalCount = 0;
		if (design.collisionAnalysis.length > 0) {
			const analyzed = new Set(design.collisionAnalysis.map((entry) => entry.eventId));
			cooccurrenceCount = design.collisionAnalysis.filter((entry) => entry.type === "co-occurrence").length;
			causalCount = design.collisionAnalysis.filter((entry) => entry.type === "causal" || entry.type === "dilemma" || entry.type === "identity").length;
			if (analyzed.size < collisionEvents.length) issues.push(issue("COLLISION_SHALLOW", "warning", `${collisionEvents.length} collision events exist but only ${analyzed.size} carry a collision analysis`));
		} else {
			// 确定性启发：职业观察桥接线索（observation mysteryClueId ↔ mystery refs）视为因果碰撞。
			for (const event of collisionEvents) {
				const mystery = event.mysteryDelta;
				const professional = event.professionalDelta;
				if (professional !== undefined && professional.observationIds.length > 0 && mystery !== undefined && mystery.discoveredClueIds.length > 0) causalCount += 1;
				else cooccurrenceCount += 1;
			}
		}
		if (cooccurrenceCount > 0 && causalCount / Math.max(1, cooccurrenceCount + causalCount) < 0.4) issues.push(issue("COLLISION_SHALLOW", "warning", "most collisions are co-occurrence: events carry two engines without causal, dilemma, or identity linkage"));
	}

	// ==== Story Movements / Long-form ====
	for (const movement of design.storyMovements) {
		if (movement.eventIds.length === 0) {
			issues.push(issue("MOVEMENT_WITHOUT_CHANGE", "warning", `movement ${movement.id} references no unified events`));
			continue;
		}
		const movementEvents = movement.eventIds.filter((eventId) => byId.has(eventId)).map((eventId) => byId.get(eventId) as (typeof events)[number]);
		if (movementEvents.length === 0) {
			issues.push(issue("MOVEMENT_WITHOUT_CHANGE", "warning", `movement ${movement.id} references events that do not exist in the unified map`));
			continue;
		}
		const changed = movementEvents.some((event) => event.irreversible || event.characterDeltas.some((delta) => delta.dimension === "agency" && delta.from !== delta.to) || event.riskDeltas.length > 0);
		if (!changed) issues.push(issue("MOVEMENT_WITHOUT_CHANGE", "warning", `movement ${movement.id} ends without any irreversible change, agency shift, or risk arrival`));
	}

	const byChapter = new Map<number, (typeof events)[number][]>();
	for (const event of events) {
		const list = byChapter.get(event.chapter) ?? [];
		list.push(event);
		byChapter.set(event.chapter, list);
	}
	const chapters = [...byChapter.keys()].sort((left, right) => left - right);
	const middleStart = chapters[Math.floor(chapters.length / 3)] ?? 1;
	const middleEnd = chapters[Math.floor((chapters.length * 2) / 3)] ?? 1;
	let flatRun = 0;
	let maxFlatRun = 0;
	let relationshipOnlyRun = 0;
	let maxRelationshipOnlyRun = 0;
	let mysteryOnlyRun = 0;
	let maxMysteryOnlyRun = 0;
	let professionalSeen = false;
	let professionalSeenAfterTwoThirds = false;
	for (const chapter of chapters) {
		const chapterEvents = byChapter.get(chapter) ?? [];
		const advanced = chapterEvents.some((event) => (event.mysteryDelta !== undefined && (event.mysteryDelta.proofProgressClaimIds.length > 0 || event.mysteryDelta.revealClaimIds.length > 0)) || event.riskDeltas.length > 0 || event.irreversible);
		flatRun = advanced ? 0 : flatRun + 1;
		maxFlatRun = Math.max(maxFlatRun, flatRun);
		const external = chapterEvents.some((event) => event.mysteryDelta !== undefined || event.professionalDelta !== undefined);
		const relationship = chapterEvents.some((event) => event.marriageDelta !== undefined || event.chaseWifeDelta !== undefined);
		relationshipOnlyRun = external ? 0 : relationshipOnlyRun + 1;
		maxRelationshipOnlyRun = Math.max(maxRelationshipOnlyRun, relationshipOnlyRun);
		mysteryOnlyRun = relationship ? 0 : mysteryOnlyRun + 1;
		maxMysteryOnlyRun = Math.max(maxMysteryOnlyRun, mysteryOnlyRun);
		const professionalThisChapter = chapterEvents.some((event) => event.professionalDelta !== undefined);
		if (professionalThisChapter) {
			professionalSeen = true;
			if (chapter > Math.ceil(maxChapter * 2 / 3)) professionalSeenAfterTwoThirds = true;
		}
	}
	if (maxFlatRun >= 2) issues.push(issue("SECOND_ACT_FLATLINE", "warning", `${maxFlatRun} consecutive chapters in the middle third advance no proof, stakes, or irreversible change`));
	if (maxRelationshipOnlyRun >= 2) issues.push(issue("EXTERNAL_PLOT_STALL", "warning", `${maxRelationshipOnlyRun} consecutive chapters move only the relationship while mystery and profession stand still`));
	if (maxMysteryOnlyRun >= 3) issues.push(issue("RELATIONSHIP_PLOT_DETACHED", "warning", `${maxMysteryOnlyRun} consecutive chapters move only the case while the marriage reads like another novel`));
	if (professionalSeen && !professionalSeenAfterTwoThirds) issues.push(issue("PROFESSIONAL_PLOT_DISAPPEARS", "warning", "the profession drives the opening but disappears from events after the first two thirds"));

	// ==== Climax engine coverage ====
	if (design.storyMovements.length > 0) {
		const lastMovement = design.storyMovements.reduce((latest, movement) => Math.max(...movement.chapters) > Math.max(...latest.chapters) ? movement : latest);
		const lastChapters = lastMovement.chapters;
		const earlierChapters = chapters.filter((chapter) => !lastChapters.includes(chapter));
		const engineKinds = (list: (typeof events)[number][]): Set<string> => {
			const kinds = new Set<string>();
			for (const event of list) {
				if (event.mysteryDelta !== undefined) kinds.add("mystery");
				if (event.marriageDelta !== undefined) kinds.add("marriage");
				if (event.chaseWifeDelta !== undefined) kinds.add("chase-wife");
				if (event.professionalDelta !== undefined) kinds.add("professional");
			}
			return kinds;
		};
		const lastEvents = lastChapters.flatMap((chapter) => byChapter.get(chapter) ?? []);
		const earlierEvents = earlierChapters.flatMap((chapter) => byChapter.get(chapter) ?? []);
		const earlierKinds = engineKinds(earlierEvents);
		const lastKinds = engineKinds(lastEvents);
		if (earlierKinds.size >= 2 && lastKinds.size === 1) issues.push(issue("CLIMAX_SINGLE_ENGINE", "warning", "the climax resolves only one engine although earlier chapters blend multiple engines"));
	}

	// ==== Mid-length Commercial Form ====
	const form = design.commercialForm;
	if (form.openingAnomalyChapter > 2) issues.push(issue("OPENING_DELAYED", "warning", `the opening anomaly enters in chapter ${form.openingAnomalyChapter}; mid-length openings need an early hook`));
	const earlyStakes = events.some((event) => event.chapter <= 2 && (event.irreversible || event.riskDeltas.length > 0));
	if (!earlyStakes) issues.push(issue("EARLY_STAKES_WEAK", "warning", "no irreversible action or risk arrival occurs in the first two chapters"));
	if (form.midpointReframeChapter === undefined) issues.push(issue("MIDPOINT_WITHOUT_REFRAME", "warning", "no midpoint reframe chapter is declared; the middle may only add facts"));
	if (form.lateExpositionChapters.length > 0) issues.push(issue("LATE_EXPOSITION_DUMP", "warning", `exposition is dumped late in chapters ${form.lateExpositionChapters.join(", ")}`));
	if (form.endingAftershock === undefined) issues.push(issue("ENDING_AFTERSHOCK_MISSING", "warning", "no ending aftershock is declared; the ending may close too neatly"));

	// ==== Chapter Exit Pressure ====
	let weakExitRun = 0;
	let maxWeakExitRun = 0;
	for (const chapter of chapters) {
		const exit = form.chapterExits.find((entry) => entry.chapter === chapter);
		weakExitRun = exit === undefined || exit.kind === "weak" ? weakExitRun + 1 : 0;
		maxWeakExitRun = Math.max(maxWeakExitRun, weakExitRun);
	}
	if (maxWeakExitRun >= 3) issues.push(issue("FORWARD_PRESSURE_WEAK", "warning", `${maxWeakExitRun} consecutive chapters end without forward pressure (question, decision, evidence, threat, or cost)`));

	// ==== Antagonism ====
	if (design.antagonisticForces.every((force) => force.type === "individual")) issues.push(issue("SYSTEMIC_PROBLEM_COLLAPSES_TO_SINGLE_VILLAIN", "warning", "every antagonistic force is an individual; the systemic social problem collapses into one bad man"));

	// ==== Social Resolution ====
	const resolution = design.socialResolution;
	if (resolution.institutionalChange !== undefined && resolution.institutionalResistance === undefined && resolution.unresolvedResidue.length === 0) issues.push(issue("SOCIAL_ENDING_TOO_CLEAN", "warning", "the ending resolves the institution with no resistance and no unresolved residue; social problems rarely close this cleanly"));

	// ==== Theme Through Action ====
	if (design.themeArchitecture.length === 0) issues.push(issue("THEME_WITHOUT_ACTIONAL_PROOF", "warning", "no theme architecture exists; themes cannot be proven through action"));
	for (const theme of design.themeArchitecture) {
		if (theme.actionProof.length === 0) issues.push(issue("THEME_ONLY_STATED", "warning", `theme "${theme.theme}" is only stated; no choices, consequences, contrasts, or institutional responses prove it`));
	}
	return issues;
}

export function checkCharacterComplexity(profile: HeroineContradictionProfile | undefined, design: FemaleSocialSuspenseDesign | undefined): VerticalIssue[] {
	const issues: VerticalIssue[] = [];
	if (profile === undefined) {
		issues.push(issue("HEROINE_COMPLEXITY_MISSING", "warning", "no heroine contradiction profile exists"));
		return issues;
	}
	if (profile.wrongOrIncompleteJudgments.length === 0 && profile.costlyChoices.length === 0) issues.push(issue("HEROINE_TOO_INFALLIBLE", "warning", "the heroine makes no wrong or incomplete judgments and pays no costly choice; she reads as infallible"));
	if (profile.emotionalNeeds.length === 0 || profile.contradictions.length === 0) issues.push(issue("HEROINE_EMOTIONALLY_FLAT", "warning", "the heroine has no declared emotional needs or internal contradictions"));
	if (profile.costlyChoices.length === 0) issues.push(issue("AGENCY_WITHOUT_COST", "warning", "heroine agency is never paid for; every choice is free"));
	if (profile.contradictions.length === 0 && profile.avoidedTruths.length === 0) issues.push(issue("SELF_GROWTH_ONLY_EXTERNAL_EXIT", "warning", "growth is only an external exit; no avoided truth or internal contradiction is confronted"));
	const supporting = design?.supportingCharacters ?? [];
	for (const character of supporting) {
		if ((character.ownGoal === undefined || character.ownGoal.trim().length === 0) && (character.independentCost === undefined || character.independentCost.trim().length === 0) && (character.conflictWithProtagonist === undefined || character.conflictWithProtagonist.trim().length === 0)) issues.push(issue("SUPPORTING_CHARACTER_AS_TOOL", "warning", `supporting character ${character.characterId} has no own goal, independent cost, or conflict; they only serve the protagonist`));
		if (character.functionKinds.length <= 1) issues.push(issue("SIDE_CHARACTER_SINGLE_FUNCTION", "warning", `supporting character ${character.characterId} has a single function; side characters need layered interests`));
	}
	if (supporting.length > 0 && supporting.every((character) => character.conflictWithProtagonist === undefined || character.conflictWithProtagonist.trim().length === 0)) issues.push(issue("ALLIES_TOO_CONVENIENT", "warning", "every ally agrees with the heroine; nobody has an interest that costs her"));
	return issues;
}

export function checkVerticalQualityReview(review: VerticalQualityReview, refs: { map?: UnifiedEventMap; design?: FemaleSocialSuspenseDesign; professionalActions?: Set<string>; marriageRefs?: Set<string>; clueIds?: Set<string>; harmIds?: Set<string> }): VerticalIssue[] {
	const issues: VerticalIssue[] = [];
	const mapEventIds = new Set(refs.map?.events.map((event) => event.eventId) ?? []);
	const designPatternIds = new Set(refs.design?.marriagePatterns.map((pattern) => pattern.id) ?? []);
	const designMechanismIds = new Set(refs.design?.socialArchitecture.systemMechanisms.map((mechanism) => mechanism.id) ?? []);
	const designDilemmaIds = new Set(refs.design?.professionalDilemmas.map((dilemma) => dilemma.id) ?? []);
	const findings = [...review.integrationFindings, ...review.characterFindings, ...review.pacingFindings, ...review.professionalFindings, ...review.socialRealityFindings];
	for (const finding of findings) {
		const evidence = finding.evidence;
		const missingEvents = evidence.eventIds.filter((eventId) => !mapEventIds.has(eventId));
		const missingActions = evidence.professionalActionIds.filter((id) => refs.professionalActions !== undefined && !refs.professionalActions.has(id));
		const missingMarriage = evidence.marriageRefs.filter((id) => refs.marriageRefs !== undefined && !refs.marriageRefs.has(id));
		const missingClues = evidence.clueIds.filter((id) => refs.clueIds !== undefined && !refs.clueIds.has(id));
		const missingHarms = evidence.harmIds.filter((id) => refs.harmIds !== undefined && !refs.harmIds.has(id));
		const missingPatterns = evidence.patternIds.filter((id) => !designPatternIds.has(id));
		const missingMechanisms = evidence.mechanismIds.filter((id) => !designMechanismIds.has(id));
		const missingDilemmas = evidence.dilemmaIds.filter((id) => !designDilemmaIds.has(id));
		if (missingEvents.length > 0 || missingActions.length > 0 || missingMarriage.length > 0 || missingClues.length > 0 || missingHarms.length > 0 || missingPatterns.length > 0 || missingMechanisms.length > 0 || missingDilemmas.length > 0) {
			issues.push(issue("VERTICAL_EVIDENCE_INVALID", "error", `finding "${finding.finding.slice(0, 60)}" references missing evidence: ${[...missingEvents.map((id) => `event ${id}`), ...missingActions.map((id) => `action ${id}`), ...missingMarriage.map((id) => `marriage ${id}`), ...missingClues.map((id) => `clue ${id}`), ...missingHarms.map((id) => `harm ${id}`), ...missingPatterns.map((id) => `pattern ${id}`), ...missingMechanisms.map((id) => `mechanism ${id}`), ...missingDilemmas.map((id) => `dilemma ${id}`)].join(", ")}`));
		}
	}
	return issues;
}
