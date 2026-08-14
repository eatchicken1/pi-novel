import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type {
	CheckContinuityParams,
	CheckAiArtifactsParams,
	CheckChaseWifeArcParams,
	CheckChaseWifeEventDraftParams,
	CheckChaseWifeEventSemanticsParams,
	CheckChaseWifeHarmRepairProgressParams,
	CheckMatureMarriageRestructuringParams,
	CheckMatureMarriageStructureParams,
	AssembleUnifiedChapterParams,
	CheckProfessionalCaseParams,
	CheckProfessionalDomainParams,
	CheckMysteryDesignParams,
	CheckUnifiedEventDraftParams,
	CheckUnifiedEventMapParams,
	CheckNarrativeRealizationParams,
	SaveNarrativeRealizationParams,
	CheckStoryDistinctivenessParams,
	SaveStoryDistinctivenessParams,
	CheckSocialSuspenseDesignParams,
	SaveSocialSuspenseDesignParams,
	CheckCharacterComplexityParams,
	SaveCharacterContradictionProfileParams,
	CheckVerticalStoryQualityParams,
	SaveStoryConceptParams,
	DevelopStoryBibleParams,
	DesignStoryArchitectureParams,
	BuildNarrativeEventGraphParams,
	PlanChapterParams,
	DraftChapterParams,
	DiagnoseChapterParams,
	ReviseChapterParams,
	ReviewManuscriptParams,
	FinalizeManuscriptUnifiedParams,
	SaveUnifiedEventDraftParams,
	SaveUnifiedEventMapParams,
	SaveUnifiedEventSemanticReportParams,
	CheckMysteryFairnessParams,
	SaveMatureMarriageRestructuringParams,
	SaveMatureMarriageStructureParams,
	SaveProfessionalCasePlanParams,
	SaveProfessionalDomainModelParams,
	SaveMysteryCaseParams,
	SaveMysteryClueLedgerParams,
	SaveMysteryInformationStateParams,
	SaveMysterySuspectModelParams,
	SaveChaseWifeEventSemanticReportParams,
	SaveChaseWifeHarmLedgerParams,
	SaveChaseWifeRepairLedgerParams,
	SaveChaseWifeEndingContractParams,
	CheckChaseWifeEndingEligibilityParams,
	CheckChaseWifeEventMapParams,
	CheckChaseWifeStoryPacingParams,
	CheckChaseWifePacingParams,
	ScoreChaseWifeChapterParams,
	AssembleChaseWifeChapterParams,
	CompareDraftVersionsParams,
	CreateVoiceFingerprintParams,
	ExtractChapterFactsParams,
	ExportManuscriptParams,
	FinalizeChapterParams,
	FinalizeManuscriptParams,
	GetNovelStatusParams,
	InitializeNovelParams,
	LoadWorkflowCheckpointParams,
	ReadStoryContextParams,
	RecordWritingIssueParams,
	RepairNovelProjectParams,
	SaveChapterDraftParams,
	SaveChapterPlanParams,
	SaveCanonDocumentParams,
	SaveContinuityReportParams,
	SaveChaseWifeBeatSheetParams,
	SaveChaseWifeEventDraftParams,
	SaveChaseWifeEventMapParams,
	SaveSceneContractParams,
	SaveQualityReportParams,
	SaveWorkflowCheckpointParams,
	ScoreChapterParams,
	ScoreStoryFoundationParams,
	UpdateCharacterStateParams,
	UpdateClueLedgerParams,
	UpdateTimelineParams,
	RepairNarrativeMemoryParams,
	AnalyzeRevisionImpactParams,
	ContinueNovelParams,
	ExploreStoryDirectionsParams,
	ReviewStoryDesignParams,
	ReviseStoryArchitectureParams,
} from "./schemas.ts";
import {
	CheckContinuitySchema,
	CheckAiArtifactsSchema,
	CheckChaseWifeArcSchema,
	CheckChaseWifeEventDraftSchema,
	CheckChaseWifeEventSemanticsSchema,
	CheckMatureMarriageRestructuringSchema,
	CheckMatureMarriageStructureSchema,
	AssembleUnifiedChapterSchema,
	CheckNarrativeRealizationSchema,
	SaveNarrativeRealizationSchema,
	CheckStoryDistinctivenessSchema,
	SaveStoryDistinctivenessSchema,
	CheckSocialSuspenseDesignSchema,
	SaveSocialSuspenseDesignSchema,
	CheckCharacterComplexitySchema,
	SaveCharacterContradictionProfileSchema,
	CheckVerticalStoryQualitySchema,
	SaveStoryConceptSchema,
	DevelopStoryBibleSchema,
	DesignStoryArchitectureSchema,
	BuildNarrativeEventGraphSchema,
	PlanChapterSchema,
	DraftChapterSchema,
	DiagnoseChapterSchema,
	ReviseChapterSchema,
	ReviewManuscriptSchema,
	ExploreStoryDirectionsSchema,
	RepairNarrativeMemorySchema,
	AnalyzeRevisionImpactSchema,
	ContinueNovelSchema,
	ReviewStoryDesignSchema,
	ReviseStoryArchitectureSchema,
	FinalizeManuscriptUnifiedSchema,
	CheckProfessionalCaseSchema,
	CheckProfessionalDomainSchema,
	CheckMysteryDesignSchema,
	CheckUnifiedEventDraftSchema,
	CheckUnifiedEventMapSchema,
	SaveUnifiedEventDraftSchema,
	SaveUnifiedEventMapSchema,
	SaveUnifiedEventSemanticReportSchema,
	CheckMysteryFairnessSchema,
	SaveMatureMarriageRestructuringSchema,
	SaveMatureMarriageStructureSchema,
	SaveProfessionalCasePlanSchema,
	SaveProfessionalDomainModelSchema,
	SaveMysteryCaseSchema,
	SaveMysteryClueLedgerSchema,
	SaveMysteryInformationStateSchema,
	SaveMysterySuspectModelSchema,
	SaveChaseWifeEventSemanticReportSchema,
	SaveChaseWifeHarmLedgerSchema,
	SaveChaseWifeRepairLedgerSchema,
	SaveChaseWifeEndingContractSchema,
	CheckChaseWifeEndingEligibilitySchema,
	CheckChaseWifeHarmRepairProgressSchema,
	CheckChaseWifeEventMapSchema,
	CheckChaseWifeStoryPacingSchema,
	CheckChaseWifePacingSchema,
	ScoreChaseWifeChapterSchema,
	AssembleChaseWifeChapterSchema,
	CompareDraftVersionsSchema,
	CreateVoiceFingerprintSchema,
	ExtractChapterFactsSchema,
	ExportManuscriptSchema,
	FinalizeChapterSchema,
	FinalizeManuscriptSchema,
	GetNovelStatusSchema,
	InitializeNovelSchema,
	LoadWorkflowCheckpointSchema,
	ReadStoryContextSchema,
	RecordWritingIssueSchema,
	RepairNovelProjectSchema,
	SaveChapterDraftSchema,
	SaveChapterPlanSchema,
	SaveCanonDocumentSchema,
	SaveContinuityReportSchema,
	SaveChaseWifeBeatSheetSchema,
	SaveChaseWifeEventDraftSchema,
	SaveChaseWifeEventMapSchema,
	SaveSceneContractSchema,
	SaveQualityReportSchema,
	SaveWorkflowCheckpointSchema,
	ScoreChapterSchema,
	ScoreStoryFoundationSchema,
	UpdateCharacterStateSchema,
	UpdateClueLedgerSchema,
	UpdateTimelineSchema,
} from "./schemas.ts";
import { NovelProjectStore } from "./services/project-store.ts";

export type NovelStoreProvider = (cwd: string) => NovelProjectStore;

export function registerNovelTools(pi: ExtensionAPI, getStore: NovelStoreProvider): void {
	pi.registerTool(
		defineTool({
			name: "initialize_novel",
			label: "Initialize Novel",
			description: "Create a safe, structured novels/<project-id> directory for a new novel. Never overwrites an existing project.",
			parameters: InitializeNovelSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: InitializeNovelParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).initializeNovel(params, signal);
				return { content: [{ type: "text", text: `Novel project initialized: ${result.projectId}\n${result.path}` }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_event_map",
			label: "Save Chase-wife Event Map",
			description: "[COMPATIBILITY MODE] Legacy chase-wife event map writer for old projects. The current event authority is the unified narrative event map (save_unified_event_map); this tool rejects chapters covered by the unified map with LEGACY_EVENT_AUTHORITY_CONFLICT.",
			parameters: SaveChaseWifeEventMapSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeEventMapParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeEventMap(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_event_map",
			label: "Check Chase-wife Event Map",
			description: "Check chase-wife event structure, POV permissions, agency ladder, repeated injury mechanisms, causal links, and interchangeable events.",
			parameters: CheckChaseWifeEventMapSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeEventMapParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeEventMap(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_event_draft",
			label: "Save Chase-wife Event Draft",
			description: "[COMPATIBILITY MODE] Legacy chase-wife event draft writer for old projects. Use save_unified_event_draft for new projects; chapters covered by the unified map are rejected with LEGACY_EVENT_AUTHORITY_CONFLICT.",
			parameters: SaveChaseWifeEventDraftSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeEventDraftParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeEventDraft(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_event_draft",
			label: "Check Chase-wife Event Draft",
			description: "Check one chase-wife event against its variable length budget and save a deterministic report.",
			parameters: CheckChaseWifeEventDraftSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeEventDraftParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeEventDraft(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_event_semantic_report",
			label: "Save Chase-wife Semantic Report",
			description: "Save model-submitted semantic evidence for one event. The report must prove the role, conflict, two independent state deltas, required agency action, exit hook, and declared injury mechanism.",
			parameters: SaveChaseWifeEventSemanticReportSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeEventSemanticReportParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeEventSemanticReport(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_event_prose",
			label: "Check Chase-wife Event Prose",
			description: "Run the mechanical prose check for one chase-wife event. This does not replace the model-submitted semantic report.",
			parameters: CheckChaseWifeEventSemanticsSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeEventSemanticsParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeEventProse(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_harm_ledger",
			label: "Save Chase-wife Harm Ledger",
			description: "Save proposed or user-confirmed relationship harms. Each harm must describe the concrete impact and whether it was recognized or repaired.",
			parameters: SaveChaseWifeHarmLedgerSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeHarmLedgerParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeHarmLedger(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_repair_ledger",
			label: "Save Chase-wife Repair Ledger",
			description: "Save proposed or user-confirmed repair attempts tied to specific relationship harms, including cost, boundary behavior, and heroine acceptance.",
			parameters: SaveChaseWifeRepairLedgerSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeRepairLedgerParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeRepairLedger(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_ending_contract",
			label: "Save Chase-wife Ending Contract",
			description: "Save a proposed or user-confirmed ending contract that defines reunion eligibility and the heroine's independent future.",
			parameters: SaveChaseWifeEndingContractSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeEndingContractParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeEndingContract(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_ending_eligibility",
			label: "Check Chase-wife Ending Eligibility",
			description: "Check whether the confirmed harm, repair, and ending ledgers justify the configured chase-wife ending mode. Free-text reunionEligibilityRules are planning notes; final validation requires executable structured eligibilityRules.",
			parameters: CheckChaseWifeEndingEligibilitySchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeEndingEligibilityParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeEndingEligibility(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_harm_repair_progress",
			label: "Check Chase-wife Harm Repair Progress",
			description: "Report chapter-scoped harm recognition, pursuit errors, real consequences, unresolved relationship debt, and repair progress. Returns on-track, warning, or stalled; this is not the final ending eligibility gate.",
			parameters: CheckChaseWifeHarmRepairProgressSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeHarmRepairProgressParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeHarmRepairProgress(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "assemble_chase_wife_chapter",
			label: "Assemble Chase-wife Chapter",
			description: "[COMPATIBILITY MODE] Legacy chase-wife chapter assembler for old projects. Use assemble_unified_chapter for new projects; chapters covered by the unified map are rejected with LEGACY_EVENT_AUTHORITY_CONFLICT.",
			parameters: AssembleChaseWifeChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: AssembleChaseWifeChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).assembleChaseWifeChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_pacing",
			label: "Check Chase-wife Pacing",
			description: "Run the legacy alias for chapter-local chase-wife pacing checks; use check_chase_wife_story_pacing for full-story exit and pursuit timing.",
			parameters: CheckChaseWifePacingSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifePacingParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifePacing(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_chapter_pacing",
			label: "Check Chase-wife Chapter Pacing",
			description: "Check chapter-local chase-wife pacing without requiring the full-story exit or pursuit ratios.",
			parameters: CheckChaseWifePacingSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifePacingParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeChapterPacing(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_story_pacing",
			label: "Check Chase-wife Story Pacing",
			description: "Check full-story chase-wife timing: opening conflict, first agency, irreversible exit, pursuit start, and heroine new-life share.",
			parameters: CheckChaseWifeStoryPacingSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeStoryPacingParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeStoryPacing(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "score_chase_wife_chapter",
			label: "Score Chase-wife Chapter",
			description: "Calculate a deterministic chase-wife pacing score from the saved pacing report instead of accepting model-supplied chapter scores.",
			parameters: ScoreChaseWifeChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ScoreChaseWifeChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).scoreChaseWifeChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chase_wife_beat_sheet",
			label: "Save Chase-wife Beat Sheet",
			description: "Save the chase-wife-specific dual-track heroine/male beat sheet with a required 60-140 character first-person hook intro; paywallHook is an event property, not a story phase.",
			parameters: SaveChaseWifeBeatSheetSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChaseWifeBeatSheetParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChaseWifeBeatSheet(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_chase_wife_arc",
			label: "Check Chase-wife Arc",
			description: "Check chase-wife dual-track arcs, paywall hooks, exit ordering, male consequence before recognition, and reward release.",
			parameters: CheckChaseWifeArcSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckChaseWifeArcParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkChaseWifeArc(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_mystery_case",
			label: "Save Mystery Case",
			description: "Save the mystery truth model (truth claim DAG + social core) as a proposed candidate or user-confirmed canon artifact. Only available for female-social-suspense projects; reader-sim never reads it.",
			parameters: SaveMysteryCaseSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveMysteryCaseParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveMysteryCase(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_mystery_clue_ledger",
			label: "Save Mystery Clue Ledger",
			description: "Save the planned mystery clue ledger: observable facts in the story world with interpretations, reliability, and the truth claims they support. Planned artifacts live under outline/mystery; realized prose evidence binding is a later round.",
			parameters: SaveMysteryClueLedgerSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveMysteryClueLedgerParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveMysteryClueLedger(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_mystery_suspect_model",
			label: "Save Mystery Suspect Model",
			description: "Save suspect author models (motive/means/opportunity/access, public story vs private secret, actual role) as proposed or user-confirmed canon. Only available for female-social-suspense projects.",
			parameters: SaveMysterySuspectModelSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveMysterySuspectModelParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveMysterySuspectModel(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_mystery_information_state",
			label: "Save Mystery Information State",
			description: "Save information checkpoints: what the heroine, reader, and characters know/suspect/believe after each chapter, and which clues newly become available.",
			parameters: SaveMysteryInformationStateSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveMysteryInformationStateParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveMysteryInformationState(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_mystery_design",
			label: "Check Mystery Design",
			description: "Run the deterministic mystery design checker over the truth claim DAG, clue ledger, suspect model, and information checkpoints: references, cycles, reveal timing, red-herring factual basis, information chronology, and social core.",
			parameters: CheckMysteryDesignSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckMysteryDesignParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkMysteryDesign(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_mystery_fairness",
			label: "Check Mystery Fairness",
			description: "Check whether the reader could theoretically reach the core truth before the reveal: supported vs unsupported final claims, clue coverage, deus-ex-machina evidence, and reveal-before-proof problems.",
			parameters: CheckMysteryFairnessSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckMysteryFairnessParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkMysteryFairness(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "check_mystery_realized_fairness",
			label: "Check Realized Mystery Fairness",
			description: "Check fairness against actual prose realization: a claim is only fairly revealed when at least one proof path has every clue and prerequisite claim actually realized in prose (unified events or realization records) at or before the actual reveal chapter, per reader and heroine audience. Planned chapters are never used.",
			parameters: CheckMysteryFairnessSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckMysteryFairnessParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkMysteryRealizedFairness(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "save_mature_marriage_structure",
			label: "Save Mature Marriage Structure",
			description: "Save the structural entanglement model of a mature marriage (economic unit, care responsibilities, decision rights, social ties, inertia, exit constraints) as proposed or user-confirmed canon. Only available for projects with the mature-marriage-crisis relationship mechanism; reader-sim never reads it.",
			parameters: SaveMatureMarriageStructureSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveMatureMarriageStructureParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveMatureMarriageStructure(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_mature_marriage_restructuring",
			label: "Save Mature Marriage Restructuring",
			description: "Save the restructuring plan (resource, responsibility, decision-right and social-tie redistribution plus constraint responses) as proposed or user-confirmed canon. Only available for projects with the mature-marriage-crisis relationship mechanism; reader-sim never reads it.",
			parameters: SaveMatureMarriageRestructuringSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveMatureMarriageRestructuringParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveMatureMarriageRestructuring(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_mature_marriage_structure",
			label: "Check Mature Marriage Structure",
			description: "Run the deterministic structure checker: character identity, duplicate ids, references, exit-constraint sources, structural thickness, care-load asymmetry, and chase-wife stayingLogic alignment. Never creates harms or moral judgments.",
			parameters: CheckMatureMarriageStructureSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckMatureMarriageStructureParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkMatureMarriageStructure(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_mature_marriage_restructuring",
			label: "Check Mature Marriage Restructuring",
			description: "Run the deterministic restructuring checker: plan references, unaddressed high/critical constraints, responsibilities vanishing without a new bearer, dependent care surviving separation, and unresolved dependencies.",
			parameters: CheckMatureMarriageRestructuringSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckMatureMarriageRestructuringParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkMatureMarriageRestructuring(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "save_professional_domain_model",
			label: "Save Professional Domain Model",
			description: "Save the professional system model (role, authority boundaries, workflow graph, evidence sources, guardrails, escalation paths) for the insurance-fraud-investigation domain as proposed or user-confirmed canon. Only available for projects with that professional domain; reader-sim never reads it.",
			parameters: SaveProfessionalDomainModelSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveProfessionalDomainModelParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveProfessionalDomainModel(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_professional_case_plan",
			label: "Save Professional Case Plan",
			description: "Save the in-case professional plan (actions, conflicts of interest, escalations, professional consequences) as proposed or user-confirmed canon. The plan must respect the domain model authority boundaries and workflow; it never auto-creates mystery clues or relationship harms.",
			parameters: SaveProfessionalCasePlanSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveProfessionalCasePlanParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveProfessionalCasePlan(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_professional_domain",
			label: "Check Professional Domain",
			description: "Run the deterministic domain checker: duplicate ids, references, workflow entry/reachability/terminal, evidence access without authority, and escalation references. Workflow cycles/rework are allowed; no legal conclusions.",
			parameters: CheckProfessionalDomainSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckProfessionalDomainParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkProfessionalDomain(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_professional_case",
			label: "Check Professional Case",
			description: "Run the deterministic case checker: action stage/authority/evidence/guardrail validity, authority enforcement, evidence inaccessibility, unmitigated conflicts, recusal violations, and consequence triggers. Never creates harms or legal outcomes.",
			parameters: CheckProfessionalCaseSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckProfessionalCaseParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkProfessionalCase(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "save_unified_event_map",
			label: "Save Unified Event Map",
			description: "Save the unified narrative event map for a chapter: each event is one Story Action plus optional mystery/marriage/chase-wife/professional deltas and character/resource/risk deltas. The unified layer references engine artifacts and never rewrites engine authority. Author planning: reader-sim never reads it.",
			parameters: SaveUnifiedEventMapSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveUnifiedEventMapParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveUnifiedEventMap(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_unified_event_map",
			label: "Check Unified Event Map",
			description: "Run the deterministic unified event map checker: duplicate ids, cause DAG, capability-illegal deltas, engine reference validity, empty events, irreversible events, mystery reveal timing, collision statistics, and the professional authority gate.",
			parameters: CheckUnifiedEventMapSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckUnifiedEventMapParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkUnifiedEventMap(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_unified_event_draft",
			label: "Save Unified Event Draft",
			description: "Save one unified event draft with deterministic revision paths; draft one event before the next.",
			parameters: SaveUnifiedEventDraftSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveUnifiedEventDraftParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveUnifiedEventDraft(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_unified_event_draft",
			label: "Check Unified Event Draft",
			description: "Check one unified event draft for length budget and planning-label leakage and save a deterministic report.",
			parameters: CheckUnifiedEventDraftSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckUnifiedEventDraftParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkUnifiedEventDraft(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_unified_event_semantic_report",
			label: "Save Unified Event Semantic Report",
			description: "Save the model-submitted semantic report for one unified event: the action and consequence must be shown in prose with evidence anchors for every claimed delta.",
			parameters: SaveUnifiedEventSemanticReportSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveUnifiedEventSemanticReportParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveUnifiedEventSemanticReport(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "assemble_unified_chapter",
			label: "Assemble Unified Chapter",
			description: "Assemble validated unified event drafts in event order into a revisioned chapter draft with an event span map (eventId, startChar, endChar, sourceRevision, sourceHash). Only validated event drafts may be assembled.",
			parameters: AssembleUnifiedChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: AssembleUnifiedChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).assembleUnifiedChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "save_narrative_realization",
			label: "Save Narrative Realization",
			description: "Save prose realization records for one chapter: every planned item (unified event, mystery clue/reveal, marriage transition, professional observation) must be anchored in the finalized chapter prose. Records bind to the latest draft revision and its content hash; stale records must be saved again.",
			parameters: SaveNarrativeRealizationSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveNarrativeRealizationParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveNarrativeRealizations(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_narrative_realization",
			label: "Check Narrative Realization",
			description: "Run the deterministic realization gate for one chapter: stale content-hash bindings, invalid prose anchors, duplicate records, planned items missing from the finalized prose, and unplanned records.",
			parameters: CheckNarrativeRealizationSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckNarrativeRealizationParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkNarrativeRealizations(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "save_story_distinctiveness",
			label: "Save Story Distinctiveness Review",
			description: "Save a model-written distinctiveness review (verdict, premises, engine-blend evidence, risks, strongest moves). The review is model judgment; the deterministic cross-check runs separately and never fabricates scores.",
			parameters: SaveStoryDistinctivenessSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveStoryDistinctivenessParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveStoryDistinctiveness(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_story_distinctiveness",
			label: "Check Story Distinctiveness",
			description: "Cross-check the saved distinctiveness review against deterministic facts: cross-engine collision counts, repeated event fingerprints, engine coverage, and unsupported blend claims. No fake scores.",
			parameters: CheckStoryDistinctivenessSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckStoryDistinctivenessParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkStoryDistinctiveness(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "save_social_suspense_design",
			label: "Save Female Social Suspense Design",
			description: "Save the aggregated vertical design for female social suspense: social architecture with concrete system mechanisms, truth layers, false model, marriage interaction patterns, professional dilemmas, chase arc review, collision analysis, antagonistic forces, social resolution, theme architecture, story movements, commercial form, and supporting character functions.",
			parameters: SaveSocialSuspenseDesignSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveSocialSuspenseDesignParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveSocialSuspenseDesign(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_social_suspense_design",
			label: "Check Female Social Suspense Design",
			description: "Cross-check the vertical design against the unified event map: mechanisms without event effects, background-only social problems, relationship-only stakes, missing beneficiaries/cost bearers, suspense escalation runs, marriage patterns without payoff, replaceable professions, shallow collisions, movement stalls, and commercial-form diagnostics. No scores.",
			parameters: CheckSocialSuspenseDesignSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckSocialSuspenseDesignParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkSocialSuspenseDesign(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_character_contradiction_profile",
			label: "Save Character Contradiction Profile",
			description: "Save the heroine contradiction profile (values, strengths, blind spots, emotional needs, avoided truths, self-protective habits, costly choices, wrong or incomplete judgments, contradictions). Author planning; reader-sim never reads it.",
			parameters: SaveCharacterContradictionProfileSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveCharacterContradictionProfileParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveCharacterContradictionProfile(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_character_complexity",
			label: "Check Character Complexity",
			description: "Check heroine complexity (infallibility, emotional flatness, agency without cost, growth only as external exit) and supporting character functions (tool characters, single-function side characters, too-convenient allies).",
			parameters: CheckCharacterComplexitySchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckCharacterComplexityParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkCharacterComplexity(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_vertical_story_quality",
			label: "Check Vertical Story Quality",
			description: "Save a model-written vertical quality review (verdict strong|workable|weak, genre promise, findings with structural evidence). Every finding must cite real event ids, professional actions, marriage refs, clues, harms, patterns, mechanisms, or dilemmas; invalid evidence is rejected. No fake scores.",
			parameters: CheckVerticalStoryQualitySchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckVerticalStoryQualityParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkVerticalStoryQuality(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);
	pi.registerTool(
		defineTool({
			name: "develop_story_concept",
			label: "Develop Story Concept",
			description: "Develop a vague idea into a reviewable story concept: premise, protagonist hook and goal, external/relationship/social/professional conflicts, central dilemma and mystery, promises, stakes, contradictions, risks, potential, and self-assessed generic risks. Concept development only; it never writes chapters or engine cases.",
			parameters: SaveStoryConceptSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveStoryConceptParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).developStoryConcept(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "explore_story_directions",
			label: "Explore Story Directions",
			description: "From a premise or seed only, generate multiple truly different story directions (logline, central mystery, social mechanism, relationship fault line, spouse core belief, professional dependency, dilemma, cost, climax idea, ending shape). Candidates must differ on several core dimensions; rename-only pseudo-candidates are rejected. Saves the candidate set and optional dimension comparison; system recommendation is never author confirmation.",
			parameters: ExploreStoryDirectionsSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ExploreStoryDirectionsParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).exploreStoryDirections(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "review_story_design",
			label: "Review Story Design",
			description: "Pre-draft design review (P0-P4): merges model findings with deterministic checks over the foundation link map, promise ledger, ending prerequisites, character decision models, mystery proof-first design, architecture candidates, and (when present) anchor spine / causal links / promise traces / questions / pressure. Writes work/authoring/story-design-review.json. Never mixes prose style into the design review.",
			parameters: ReviewStoryDesignSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ReviewStoryDesignParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).reviewStoryDesign(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "revise_story_architecture",
			label: "Revise Story Architecture",
			description: "Apply a scoped ArchitectureRevisionPlan: modify target movements, anchors, reframes, ending prerequisites, or decision chains without regenerating the whole architecture. Versioned writes keep revision lineage. Any goal that changes Mystery Truth, Marriage Canon, the Professional Model, Chase Harm/Repair, or the Ending Contract is blocked with FOUNDATION_REVISION_REQUIRED: foundation authorities must go through develop_story_bible.",
			parameters: ReviseStoryArchitectureSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ReviseStoryArchitectureParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).reviseStoryArchitecture(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "develop_story_bible",
			label: "Develop Story Bible",
			description: "Develop the current story concept into a proposed story foundation, coordinating the active mystery, relationship, marriage, professional, social-suspense, and character capabilities. Saves every artifact as proposed and never auto-confirms canon; run applicable checks and returns confirmationRequired with the artifacts awaiting confirmation.",
			parameters: DevelopStoryBibleSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: DevelopStoryBibleParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).developStoryBible(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "design_story_architecture",
			label: "Design Story Architecture",
			description: "Design the macro narrative architecture from the story foundation: story movements, major questions, reframes, false model, pressure escalation, relationship turning points, professional dilemmas, irreversible decisions, climax, ending settlement, and character arcs. Movement definitions become the single source reused by the vertical design checker.",
			parameters: DesignStoryArchitectureSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: DesignStoryArchitectureParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).designStoryArchitecture(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "build_narrative_event_graph",
			label: "Build Narrative Event Graph",
			description: "Build the whole-story unified narrative event graph from the architecture: saves the proposed events into the unified event map per chapter, runs the unified event map checker and movement coverage, and blocks on missing engine references (never silently creates clues, harms, or other engine artifacts).",
			parameters: BuildNarrativeEventGraphSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: BuildNarrativeEventGraphParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).buildNarrativeEventGraph(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "plan_chapter",
			label: "Plan Chapter",
			description: "Plan one chapter against the unified event graph: validates the event ids, determines the current story movement, builds the relevant chapter context package (events, movement, previous ending, relevant engine refs, unresolved continuity, style constraints), and saves the chapter plan and scene contracts in one call.",
			parameters: PlanChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: PlanChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).planChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		)),
	);

	pi.registerTool(
		defineTool({
			name: "draft_chapter",
			label: "Draft Chapter",
			description: "Draft one chapter end to end from the plan: saves each unified event draft, runs the mechanical check, saves the model semantic report (with chase-wife evidence for chase events), assembles the unified chapter, and runs chapter-level integrity checks. Never auto-finalizes; returns diagnose_chapter as the next action.",
			parameters: DraftChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: DraftChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).draftChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "diagnose_chapter",
			label: "Diagnose Chapter",
			description: "Diagnose one chapter like an editor: merges and de-duplicates findings from the unified map, event drafts, semantics, continuity, realization, chase-wife gates, AI artifacts, vertical design, character complexity, and realized fairness into a P0-P4 priority model with affected events and recommended strategies.",
			parameters: DiagnoseChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: DiagnoseChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).diagnoseChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		)),
	);

	pi.registerTool(
		defineTool({
			name: "revise_chapter",
			label: "Revise Chapter",
			description: "Revise one chapter from a revision plan: saves the plan, applies scoped event-draft revisions only for affected events, re-runs the mechanical and semantic gates, reassembles, and re-runs chapter gates. Never regenerates realization records (stale by hash until prose is confirmed).",
			parameters: ReviseChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ReviseChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).reviseChapter(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		)),
	);

	pi.registerTool(
		defineTool({
			name: "review_manuscript",
			label: "Review Manuscript",
			description: "Review the whole manuscript at structure level (not the sum of chapter diagnoses): deterministic manuscript diagnostics (external plot stall, detached relationship, disappearing profession, weak exit pressure, single-engine climax) merged with the model review, and a story-level revision plan.",
			parameters: ReviewManuscriptSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ReviewManuscriptParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).reviewManuscript(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		)),
	);

	pi.registerTool(
		defineTool({
			name: "finalize_manuscript_unified",
			label: "Finalize Manuscript (Unified Seal)",
			description: "Finalize the whole manuscript under unified authority for converged projects: verifies all chapters finalized, current unified event bindings, current narrative realization, realized mystery fairness, chase-wife ending eligibility and harm/repair progress, movement integrity, vertical blocking checks, and a current manuscript review; then writes the unified manuscript seal. Requires USER_CONFIRMED.",
			parameters: FinalizeManuscriptUnifiedSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: FinalizeManuscriptUnifiedParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).finalizeManuscriptUnified(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		)),
	);
	const confirmedUpdateTool = (
		name: string,
		label: string,
		parameters: typeof UpdateCharacterStateSchema | typeof UpdateClueLedgerSchema | typeof UpdateTimelineSchema,
		executeUpdate: (store: NovelProjectStore, params: UpdateCharacterStateParams | UpdateClueLedgerParams | UpdateTimelineParams, signal: AbortSignal | undefined) => Promise<unknown>,
	) =>
		defineTool({
			name,
			label,
			description: "Save a proposed state update or a user-confirmed canon update.",
			parameters,
			executionMode: "sequential" as const,
			async execute(_toolCallId, params, signal, _onUpdate, ctx) {
				const result = await executeUpdate(getStore(ctx.cwd), params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		});
	pi.registerTool(confirmedUpdateTool("update_character_state", "Update Character State", UpdateCharacterStateSchema, (store, params, signal) => store.updateCharacterState(params as UpdateCharacterStateParams, signal)));
	pi.registerTool(confirmedUpdateTool("update_clue_ledger", "Update Clue Ledger", UpdateClueLedgerSchema, (store, params, signal) => store.updateClueLedger(params as UpdateClueLedgerParams, signal)));
	pi.registerTool(confirmedUpdateTool("update_timeline", "Update Timeline", UpdateTimelineSchema, (store, params, signal) => store.updateTimeline(params as UpdateTimelineParams, signal)));

	const scoreTool = (name: string, label: string, parameters: typeof ScoreStoryFoundationSchema | typeof ScoreChapterSchema, executeScore: (store: NovelProjectStore, params: ScoreStoryFoundationParams | ScoreChapterParams, signal: AbortSignal | undefined) => Promise<unknown>) =>
		defineTool({
			name,
			label,
			description: "Calculate a reproducible quality gate and save its evidence.",
			parameters,
			executionMode: "sequential" as const,
			async execute(_toolCallId, params, signal, _onUpdate, ctx) {
				const result = await executeScore(getStore(ctx.cwd), params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		});
	pi.registerTool(scoreTool("score_story_foundation", "Score Story Foundation", ScoreStoryFoundationSchema, (store, params, signal) => store.scoreStoryFoundation(params as ScoreStoryFoundationParams, signal)));
	pi.registerTool(scoreTool("score_chapter", "Score Chapter", ScoreChapterSchema, (store, params, signal) => store.scoreChapter(params as ScoreChapterParams, signal)));

	pi.registerTool(
		defineTool({
			name: "create_voice_fingerprint",
			label: "Create Voice Fingerprint",
			description: "Save a structured voice fingerprint for later comparison.",
			parameters: CreateVoiceFingerprintSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CreateVoiceFingerprintParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).createVoiceFingerprint(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "compare_draft_versions",
			label: "Compare Draft Versions",
			description: "Compare two saved draft revisions and persist objective diff metrics.",
			parameters: CompareDraftVersionsSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CompareDraftVersionsParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).compareDraftVersions(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "export_manuscript",
			label: "Export Manuscript",
			description: "Export finalized chapters in deterministic chapter order; chase-wife projects require a current finalized manuscript seal.",
			parameters: ExportManuscriptSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ExportManuscriptParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).exportManuscript(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "finalize_manuscript",
			label: "Finalize Manuscript",
			description: "Run the finalized-story quality gate and seal a chase-wife manuscript for export.",
			parameters: FinalizeManuscriptSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: FinalizeManuscriptParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).finalizeManuscript(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_ai_artifacts",
			label: "Check AI Artifacts",
			description: "Run mechanical style-pattern checks. The report includes per-finding counts, warning/error severity, hardFail, score, and a passed quality-gate flag; a failed gate blocks chapter finalization but is not a literary verdict.",
			parameters: CheckAiArtifactsSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckAiArtifactsParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkAiArtifacts(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	const qualityReportTool = (name: string, label: string, kind: "reader" | "review") =>
		defineTool({
			name,
			label,
			description: "Save a quality report without changing canon.",
			parameters: SaveQualityReportSchema,
			executionMode: "sequential" as const,
			async execute(_toolCallId, params: SaveQualityReportParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveQualityReport(params, kind, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		});
	pi.registerTool(qualityReportTool("save_reader_report", "Save Reader Report", "reader"));
	pi.registerTool(qualityReportTool("save_review_report", "Save Review Report", "review"));

	pi.registerTool(
		defineTool({
			name: "record_writing_issue",
			label: "Record Writing Issue",
			description: "Upsert a recurring writing issue in continuity/issues.json.",
			parameters: RecordWritingIssueSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: RecordWritingIssueParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).recordWritingIssue(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "extract_chapter_facts",
			label: "Extract Chapter Facts",
			description: "Persist model-extracted chapter facts as proposed candidates tied to a draft revision.",
			parameters: ExtractChapterFactsSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ExtractChapterFactsParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).extractChapterFacts(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_workflow_checkpoint",
			label: "Save Workflow Checkpoint",
			description: "Save a resumable workflow checkpoint without relying on chat history.",
			parameters: SaveWorkflowCheckpointSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveWorkflowCheckpointParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveWorkflowCheckpoint(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "load_workflow_checkpoint",
			label: "Load Workflow Checkpoint",
			description: "Load the latest resumable workflow checkpoint.",
			parameters: LoadWorkflowCheckpointSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: LoadWorkflowCheckpointParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).loadWorkflowCheckpoint(params, signal);
				return { content: [{ type: "text", text: result ? JSON.stringify(result, null, 2) : "No workflow checkpoint found." }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "repair_novel_project",
			label: "Repair Novel Project",
			description: "Create only missing standard project files. Existing files are never overwritten.",
			parameters: RepairNovelProjectSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: RepairNovelProjectParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).repairNovelProject(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "get_novel_status",
			label: "Get Novel Status",
			description: "Read project progress and detect missing required files.",
			parameters: GetNovelStatusSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: GetNovelStatusParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).getNovelStatus(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "continue_novel",
			label: "Continue Novel",
			description: "Compute the current workflow state and execute one reasonable next step: returns the recommended action and whether to stop (stops on confirmation, P0 blockers, major design decisions, or authority changes; never writes a whole book automatically).",
			parameters: ContinueNovelSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ContinueNovelParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).continueNovel(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "repair_narrative_memory",
			label: "Repair Narrative Memory",
			description: "[RECOVERY] Fully rebuild the derived long-form memory (chapter deltas, character/knowledge/relationship/object/fact/timeline/thread/setup/professional/hypothesis ledgers, current snapshot) from authoritative artifacts. Safe to repeat; never changes story facts.",
			parameters: RepairNarrativeMemorySchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: RepairNarrativeMemoryParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).repairNarrativeMemory(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "analyze_revision_impact",
			label: "Analyze Revision Impact",
			description: "[ADVANCED] Analyze what downstream chapters, threads, promises, clues, relationship states, professional actions, and payoffs are affected by changing a chapter, events, character knowledge, or truth claims. Severity: safe-local / downstream-review / structural-revision / authority-change. Never edits anything.",
			parameters: AnalyzeRevisionImpactSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: AnalyzeRevisionImpactParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).analyzeRevisionImpact(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "read_story_context",
			label: "Read Story Context",
			description: "Read task-scoped story context and return an inclusion manifest.",
			promptGuidelines: ["Use read_story_context before drafting, reviewing, or revising a chapter."],
			parameters: ReadStoryContextSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ReadStoryContextParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).readStoryContext(params, signal);
				return { content: [{ type: "text", text: result.text || "No story context found." }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_canon_document",
			label: "Save Canon Document",
			description: "Save a proposed canon document candidate or a user-confirmed story bible, style guide, world, or outline document.",
			parameters: SaveCanonDocumentSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveCanonDocumentParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveCanonDocument(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chapter_plan",
			label: "Save Chapter Plan",
			description: "Save the standard chapter plan path generated from the chapter number.",
			parameters: SaveChapterPlanSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChapterPlanParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChapterPlan(params, signal);
				return { content: [{ type: "text", text: `Saved chapter plan: ${result.path}` }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_scene_contract",
			label: "Save Scene Contract",
			description: "Save structured scene contracts at the standard chapter path.",
			parameters: SaveSceneContractSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveSceneContractParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveSceneContract(params, signal);
				return { content: [{ type: "text", text: `Saved scene contract: ${result.path}` }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_chapter_draft",
			label: "Save Chapter Draft",
			description: "Save a revisioned chapter draft with a deterministic filename.",
			parameters: SaveChapterDraftSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveChapterDraftParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveChapterDraft(params, signal);
				return { content: [{ type: "text", text: `Saved chapter draft R${result.revision}: ${result.path}` }], details: result };
			},
		}),
	);

	const continuityTool = (name: string, label: string) =>
		defineTool({
			name,
			label,
			description: "Run deterministic project integrity checks over metadata, summaries, drafts, and continuity files.",
			parameters: CheckContinuitySchema,
			executionMode: "sequential" as const,
			async execute(_toolCallId, params: CheckContinuityParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkContinuity(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		});
	pi.registerTool(continuityTool("check_project_integrity", "Check Project Integrity"));
	pi.registerTool(continuityTool("check_continuity", "Check Project Integrity"));

	pi.registerTool(
		defineTool({
			name: "save_continuity_report",
			label: "Save Continuity Report",
			description: "Persist a semantic continuity report tied to one exact draft revision.",
			parameters: SaveContinuityReportSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveContinuityReportParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveContinuityReport(params, signal);
				return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], details: result };
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "finalize_chapter",
			label: "Finalize Chapter",
			description: "Finalize only a confirmed, checked draft and update chapter, summary, timeline, and project state transactionally.",
			promptGuidelines: ["Require explicit USER_CONFIRMED and matching non-error integrity and semantic reports."],
			parameters: FinalizeChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: FinalizeChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).finalizeChapter(params, signal);
				return { content: [{ type: "text", text: `Finalized chapter ${result.chapter}: ${result.chapterPath}` }], details: result };
			},
		}),
	);
}
