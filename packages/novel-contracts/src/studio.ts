import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";
import { ChangeSetSchema } from "./changeset.ts";
import { NovelTaskSchema } from "./task.ts";
import { ProjectRecordSchema } from "./project.ts";
import { ReviewSummarySchema } from "./review.ts";

// ==== Project read model / Studio ====

export const ProjectDetailSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		title: Type.String({ minLength: 1 }),
		path: Type.String({ minLength: 1 }),
		kind: Type.Union([Type.Literal("native"), Type.Literal("legacy")]),
		status: Type.String({ minLength: 1 }),
		primaryGenre: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		relationshipMechanisms: Type.Array(Type.String({ minLength: 1 })),
		wordCount: Type.Integer({ minimum: 0 }),
		chapterCount: Type.Integer({ minimum: 0 }),
		currentChapter: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
		memoryStatus: Type.Union([
			Type.Null(),
			Type.Literal("missing"),
			Type.Literal("current"),
			Type.Literal("stale"),
		]),
		currentMovement: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ProjectDetail = Static<typeof ProjectDetailSchema>;

export const ProjectStatusSnapshotSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		status: Type.String({ minLength: 1 }),
		nextChapter: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
		finalizedChapters: Type.Array(Type.Integer({ minimum: 1 })),
		memoryStatus: Type.Union([
			Type.Null(),
			Type.Literal("missing"),
			Type.Literal("current"),
			Type.Literal("stale"),
		]),
		continuityStatus: Type.Union([Type.Null(), Type.Literal("ok"), Type.Literal("warning"), Type.Literal("error")]),
		openThreads: Type.Union([Type.Null(), Type.Integer({ minimum: 0 })]),
		overdueThreads: Type.Union([Type.Null(), Type.Integer({ minimum: 0 })]),
		unresolvedSetups: Type.Union([Type.Null(), Type.Integer({ minimum: 0 })]),
		downstreamReviewRequired: Type.Union([Type.Null(), Type.Boolean()]),
		currentMovement: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ProjectStatusSnapshot = Static<typeof ProjectStatusSnapshotSchema>;

export const ChapterSummarySchema = Type.Object(
	{
		chapter: Type.Integer({ minimum: 1 }),
		title: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		wordCount: Type.Integer({ minimum: 0 }),
		contentHash: Type.String({ minLength: 1 }),
		revision: Type.Integer({ minimum: 1 }),
		finalized: Type.Boolean(),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ChapterSummary = Static<typeof ChapterSummarySchema>;

export const ChapterDocumentSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		chapter: Type.Integer({ minimum: 1 }),
		title: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		text: Type.String(),
		contentHash: Type.String({ minLength: 1 }),
		revision: Type.Integer({ minimum: 1 }),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ChapterDocument = Static<typeof ChapterDocumentSchema>;

export const StudioSnapshotSchema = Type.Object(
	{
		project: ProjectRecordSchema,
		detail: ProjectDetailSchema,
		chapters: Type.Array(ChapterSummarySchema),
		activeChapter: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
		manuscriptRevision: Type.Integer({ minimum: 0 }),
		pendingChangeSets: Type.Array(ChangeSetSchema),
		activeTasks: Type.Array(NovelTaskSchema),
		reviewSummary: ReviewSummarySchema,
		workflowStatus: Type.String({ minLength: 1 }),
		recommendedNextActions: Type.Array(
			Type.Object(
				{
					tool: Type.String({ minLength: 1 }),
					reason: Type.String({ minLength: 1 }),
					chapter: Type.Optional(Type.Integer({ minimum: 1 })),
				},
				{ additionalProperties: false },
			),
		),
	},
	{ additionalProperties: false },
);
export type StudioSnapshot = Static<typeof StudioSnapshotSchema>;
