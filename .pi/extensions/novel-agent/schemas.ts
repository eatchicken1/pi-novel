import { Type } from "@earendil-works/pi-ai";
import type { Static } from "typebox";

const ProjectIdSchema = Type.String({
	minLength: 1,
	maxLength: 64,
	pattern: "^[a-z0-9][a-z0-9-]*$",
	description: "小说项目 ID，只允许小写字母、数字和连字符",
});

const ChapterNumberSchema = Type.Number({
	minimum: 1,
	description: "从 1 开始的章节编号",
});

const DocumentTypeSchema = Type.Union([
	Type.Literal("story-bible"),
	Type.Literal("style-guide"),
	Type.Literal("world"),
	Type.Literal("character"),
	Type.Literal("outline"),
	Type.Literal("timeline"),
	Type.Literal("chapter-plan"),
	Type.Literal("chapter-draft"),
	Type.Literal("summary"),
	Type.Literal("continuity"),
]);

const ContentFormatSchema = Type.Union([Type.Literal("markdown"), Type.Literal("json")]);

const ContextSectionSchema = Type.Union([
	Type.Literal("project"),
	Type.Literal("story-bible"),
	Type.Literal("style-guide"),
	Type.Literal("world"),
	Type.Literal("characters"),
	Type.Literal("outline"),
	Type.Literal("timeline"),
	Type.Literal("summaries"),
	Type.Literal("continuity"),
]);

const ChapterSummarySchema = Type.Object({
	pov: Type.String({ description: "本章主要视角人物" }),
	time: Type.String({ description: "本章故事时间" }),
	locations: Type.Array(Type.String()),
	characters: Type.Array(Type.String()),
	events: Type.Array(Type.String()),
	newFacts: Type.Array(Type.String()),
	relationshipChanges: Type.Array(Type.String()),
	cluesIntroduced: Type.Array(Type.String()),
	cluesResolved: Type.Array(Type.String()),
	itemsChanged: Type.Array(Type.String()),
	openQuestions: Type.Array(Type.String()),
});

export const InitializeNovelSchema = Type.Object({
	projectId: ProjectIdSchema,
	title: Type.String({ minLength: 1, maxLength: 200 }),
	genre: Type.String({ minLength: 1, maxLength: 80 }),
	targetWordCount: Type.Optional(Type.Number({ minimum: 1000 })),
	force: Type.Optional(Type.Boolean({ description: "明确允许覆盖初始化模板文件" })),
});

export const ReadStoryContextSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
	sections: Type.Optional(Type.Array(ContextSectionSchema, { minItems: 1 })),
});

export const SaveStoryDocumentSchema = Type.Object({
	projectId: ProjectIdSchema,
	documentType: DocumentTypeSchema,
	name: Type.Optional(
		Type.String({
			minLength: 1,
			maxLength: 80,
			pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$",
			description: "文件名，不含路径分隔符",
		}),
	),
	format: ContentFormatSchema,
	content: Type.String({ minLength: 1 }),
});

export const CheckContinuitySchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
});

export const FinalizeChapterSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	title: Type.String({ minLength: 1, maxLength: 200 }),
	content: Type.String({ minLength: 1 }),
	summary: ChapterSummarySchema,
	overwrite: Type.Optional(Type.Boolean({ description: "明确允许覆盖已有章节定稿" })),
});

export type InitializeNovelParams = Static<typeof InitializeNovelSchema>;
export type ReadStoryContextParams = Static<typeof ReadStoryContextSchema>;
export type SaveStoryDocumentParams = Static<typeof SaveStoryDocumentSchema>;
export type CheckContinuityParams = Static<typeof CheckContinuitySchema>;
export type FinalizeChapterParams = Static<typeof FinalizeChapterSchema>;
export type ContextSection = Static<typeof ContextSectionSchema>;
export type DocumentType = Static<typeof DocumentTypeSchema>;
export type ContentFormat = Static<typeof ContentFormatSchema>;
export type ChapterSummary = Static<typeof ChapterSummarySchema>;
