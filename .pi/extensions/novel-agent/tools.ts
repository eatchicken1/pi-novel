import { defineTool, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type {
	CheckContinuityParams,
	FinalizeChapterParams,
	InitializeNovelParams,
	ReadStoryContextParams,
	SaveStoryDocumentParams,
} from "./schemas.ts";
import {
	CheckContinuitySchema,
	FinalizeChapterSchema,
	InitializeNovelSchema,
	ReadStoryContextSchema,
	SaveStoryDocumentSchema,
} from "./schemas.ts";
import { NovelProjectStore } from "./services/project-store.ts";

export type NovelStoreProvider = (cwd: string) => NovelProjectStore;

export function registerNovelTools(pi: ExtensionAPI, getStore: NovelStoreProvider): void {
	pi.registerTool(
		defineTool({
			name: "initialize_novel",
			label: "Initialize Novel",
			description: "Create a safe, structured novels/<project-id> directory for a new novel.",
			promptSnippet: "initialize_novel: create the structured project directory",
			parameters: InitializeNovelSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: InitializeNovelParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).initializeNovel(params, signal);
				return {
					content: [{ type: "text", text: `Novel project initialized: ${result.projectId}\n${result.path}` }],
					details: result,
				};
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "read_story_context",
			label: "Read Story Context",
			description: "Read only the selected structured story context and recent summaries; never loads all chapter prose.",
			promptGuidelines: ["Use read_story_context before drafting or revising a chapter."],
			parameters: ReadStoryContextSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: ReadStoryContextParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).readStoryContext(params, signal);
				return {
					content: [{ type: "text", text: result.text || "No story context found." }],
					details: {
						projectId: result.projectId,
						chapter: result.chapter,
						files: result.files,
						truncated: result.truncated,
					},
				};
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "save_story_document",
			label: "Save Story Document",
			description: "Persist a story bible, character, outline, chapter plan, draft, summary, or continuity document under novels/.",
			parameters: SaveStoryDocumentSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: SaveStoryDocumentParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).saveStoryDocument(params, signal);
				return {
					content: [{ type: "text", text: `Saved ${result.documentType}: ${result.path}` }],
					details: result,
				};
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "check_continuity",
			label: "Check Continuity",
			description: "Run deterministic structural checks over project metadata, summaries, drafts, and unresolved clues.",
			promptGuidelines: ["Call check_continuity before finalizing a chapter and report every error or warning."],
			parameters: CheckContinuitySchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: CheckContinuityParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).checkContinuity(params, signal);
				return {
					content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
					details: result,
				};
			},
		}),
	);

	pi.registerTool(
		defineTool({
			name: "finalize_chapter",
			label: "Finalize Chapter",
			description: "Atomically write a finalized chapter, structured summary, timeline events, and project progress.",
			promptGuidelines: ["Use only after the user has reviewed the draft and continuity check."],
			parameters: FinalizeChapterSchema,
			executionMode: "sequential",
			async execute(_toolCallId, params: FinalizeChapterParams, signal, _onUpdate, ctx) {
				const result = await getStore(ctx.cwd).finalizeChapter(params, signal);
				return {
					content: [{ type: "text", text: `Finalized chapter ${result.chapter}: ${result.chapterPath}` }],
					details: result,
				};
			},
		}),
	);
}
