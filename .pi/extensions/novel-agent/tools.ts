import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type {
	CheckContinuityParams,
	CheckAiArtifactsParams,
	CompareDraftVersionsParams,
	CreateVoiceFingerprintParams,
	ExtractChapterFactsParams,
	ExportManuscriptParams,
	FinalizeChapterParams,
	GetNovelStatusParams,
	InitializeNovelParams,
	LoadWorkflowCheckpointParams,
	ReadStoryContextParams,
	RecordWritingIssueParams,
	RepairNovelProjectParams,
	SaveChapterDraftParams,
	SaveChapterPlanParams,
	SaveContinuityReportParams,
	SaveSceneContractParams,
	SaveQualityReportParams,
	SaveStoryDocumentParams,
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
	CompareDraftVersionsSchema,
	CreateVoiceFingerprintSchema,
	ExtractChapterFactsSchema,
	ExportManuscriptSchema,
	FinalizeChapterSchema,
	GetNovelStatusSchema,
	InitializeNovelSchema,
	LoadWorkflowCheckpointSchema,
	ReadStoryContextSchema,
	RecordWritingIssueSchema,
	RepairNovelProjectSchema,
	SaveChapterDraftSchema,
	SaveChapterPlanSchema,
	SaveContinuityReportSchema,
	SaveSceneContractSchema,
	SaveQualityReportSchema,
	SaveStoryDocumentSchema,
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
			description: "Export finalized chapters in deterministic chapter order.",
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
			name: "save_story_document",
			label: "Save Story Document",
			description: "Persist a general story document under the deterministic novel project directory.",
			parameters: SaveStoryDocumentSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveStoryDocumentParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveStoryDocument(params, signal);
				return { content: [{ type: "text", text: `Saved ${result.documentType}: ${result.path}` }], details: result };
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
