import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const ReviewIssueSeveritySchema = Type.Union([
	Type.Literal("error"),
	Type.Literal("warning"),
	Type.Literal("info"),
]);
export type ReviewIssueSeverity = Static<typeof ReviewIssueSeveritySchema>;

export const ReviewIssueScopeSchema = Type.Union([
	Type.Literal("scene"),
	Type.Literal("chapter"),
	Type.Literal("future-chapter"),
	Type.Literal("movement"),
	Type.Literal("story-design"),
	Type.Literal("manuscript"),
]);
export type ReviewIssueScope = Static<typeof ReviewIssueScopeSchema>;

export const ReviewRepairScopeSchema = Type.Union([
	Type.Literal("prose"),
	Type.Literal("scene-plan"),
	Type.Literal("chapter-plan"),
	Type.Literal("event-graph"),
	Type.Literal("architecture"),
	Type.Literal("foundation"),
	Type.Literal("manuscript"),
]);
export type ReviewRepairScope = Static<typeof ReviewRepairScopeSchema>;

export const ReviewIssueStatusSchema = Type.Union([
	Type.Literal("open"),
	Type.Literal("acknowledged"),
	Type.Literal("resolved"),
	Type.Literal("dismissed"),
]);
export type ReviewIssueStatus = Static<typeof ReviewIssueStatusSchema>;

// issueSeverity 与 blockingForCurrentAction 分离建模（未来章 P0 不阻塞当前章）。
export const ReviewIssueSchema = Type.Object(
	{
		issueId: Type.String({ minLength: 1 }),
		projectId: Type.String({ minLength: 1 }),
		sourceCode: Type.String({ minLength: 1 }),
		severity: ReviewIssueSeveritySchema,
		priority: Type.Union([
			Type.Null(),
			Type.Literal("P0"),
			Type.Literal("P1"),
			Type.Literal("P2"),
			Type.Literal("P3"),
			Type.Literal("P4"),
		]),
		scope: ReviewIssueScopeSchema,
		repairScope: ReviewRepairScopeSchema,
		blockingForCurrentAction: Type.Boolean(),
		chapter: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
		scene: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		landingChapter: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
		message: Type.String({ minLength: 1 }),
		evidence: Type.Union([Type.Null(), Type.String()]),
		status: ReviewIssueStatusSchema,
		firstSeenAt: ISODateStringSchema,
		lastSeenAt: ISODateStringSchema,
		resolvedAt: Type.Union([Type.Null(), ISODateStringSchema]),
	},
	{ additionalProperties: false },
);
export type ReviewIssue = Static<typeof ReviewIssueSchema>;

export const ReviewSummarySchema = Type.Object(
	{
		openCount: Type.Integer({ minimum: 0 }),
		blockingCount: Type.Integer({ minimum: 0 }),
		errorCount: Type.Integer({ minimum: 0 }),
		warningCount: Type.Integer({ minimum: 0 }),
		latestRunAt: Type.Union([Type.Null(), ISODateStringSchema]),
		currentCount: Type.Optional(Type.Integer({ minimum: 0 })),
		futureCount: Type.Optional(Type.Integer({ minimum: 0 })),
		structuralCount: Type.Optional(Type.Integer({ minimum: 0 })),
		suggestionCount: Type.Optional(Type.Integer({ minimum: 0 })),
		majorLocalCount: Type.Optional(Type.Integer({ minimum: 0 })),
		canFinalize: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
export type ReviewSummary = Static<typeof ReviewSummarySchema>;

export const ReviewListResponseSchema = Type.Object(
	{
		issues: Type.Array(ReviewIssueSchema),
		summary: ReviewSummarySchema,
		current: Type.Optional(Type.Array(ReviewIssueSchema)),
		future: Type.Optional(Type.Array(ReviewIssueSchema)),
		structural: Type.Optional(Type.Array(ReviewIssueSchema)),
		suggestions: Type.Optional(Type.Array(ReviewIssueSchema)),
		canFinalize: Type.Optional(Type.Boolean()),
		recommendation: Type.Optional(
			Type.Union([
				Type.Literal("continue-revision"),
				Type.Literal("ready-to-settle"),
				Type.Literal("ready-to-finalize"),
			]),
		),
	},
	{ additionalProperties: false },
);

export type ReviewListResponse = Static<typeof ReviewListResponseSchema>;
