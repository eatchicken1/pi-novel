import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type {
	CheckContinuityParams,
	CheckAiArtifactsParams,
	CheckChaseWifeArcParams,
	CheckChaseWifeEventDraftParams,
	CheckChaseWifeEventSemanticsParams,
	CheckChaseWifeHarmRepairProgressParams,
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
} from "./schemas.ts";
import {
	CheckContinuitySchema,
	CheckAiArtifactsSchema,
	CheckChaseWifeArcSchema,
	CheckChaseWifeEventDraftSchema,
	CheckChaseWifeEventSemanticsSchema,
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
			description: "Save a chase-wife chapter event map with heroine-first-person or split-pov, state deltas, agency changes, causal links, and variable length budgets.",
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
			description: "Save one chase-wife event draft with deterministic event and revision paths; draft one event before moving to the next.",
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
			name: "save_harm_ledger",
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
			name: "save_repair_ledger",
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
			name: "save_ending_contract",
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
			description: "Check whether the confirmed harm, repair, and ending ledgers justify the configured chase-wife ending mode.",
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
			description: "Assemble checked event drafts in event order into a revisioned chapter draft.",
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
			description: "Save the chase-wife-specific dual-track heroine/male beat sheet; paywallHook is an event property, not a story phase.",
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
			description: "Run mechanical style-pattern checks and save findings as warnings, not literary verdicts.",
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
