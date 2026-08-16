import { type Static, Type } from "typebox";

export const ChangeOperationKindSchema = Type.Union([
	Type.Literal("replace-text"),
	Type.Literal("insert-text"),
	Type.Literal("delete-text"),
	Type.Literal("replace-document"),
	Type.Literal("structured-artifact-update"),
	Type.Literal("metadata-update"),
]);
export type ChangeOperationKind = Static<typeof ChangeOperationKindSchema>;

// 每个 operation 只作用于一个 target（相对路径或 artifact ref），
// 参数按 kind 解释；应用层校验 kind 特定必填字段。
export const ChangeOperationSchema = Type.Object(
	{
		operationId: Type.String({ minLength: 1 }),
		kind: ChangeOperationKindSchema,
		target: Type.String({ minLength: 1 }),
		baseHash: Type.Optional(Type.String({ minLength: 1 })),
		startChar: Type.Optional(Type.Integer({ minimum: 0 })),
		endChar: Type.Optional(Type.Integer({ minimum: 0 })),
		text: Type.Optional(Type.String()),
		jsonPointer: Type.Optional(Type.String({ minLength: 1 })),
		value: Type.Optional(Type.Unknown()),
		metadataKey: Type.Optional(Type.String({ minLength: 1 })),
		metadataValue: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);
export type ChangeOperation = Static<typeof ChangeOperationSchema>;

export const PatchSchema = Type.Object(
	{
		target: Type.String({ minLength: 1 }),
		baseHash: Type.String({ minLength: 1 }),
		operations: Type.Array(ChangeOperationSchema, { minItems: 1 }),
		context: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);
export type Patch = Static<typeof PatchSchema>;

export const ChangeSetImpactSchema = Type.Object(
	{
		severity: Type.Union([
			Type.Literal("safe-local"),
			Type.Literal("downstream-review"),
			Type.Literal("structural-revision"),
			Type.Literal("authority-change"),
		]),
		affectedChapters: Type.Array(Type.Integer({ minimum: 1 })),
		affectedCharacters: Type.Array(Type.String({ minLength: 1 })),
		affectedThreads: Type.Array(Type.String({ minLength: 1 })),
		affectedClues: Type.Array(Type.String({ minLength: 1 })),
		affectedPromises: Type.Array(Type.String({ minLength: 1 })),
		summary: Type.String({ minLength: 1 }),
		analyzedAt: Type.String({ format: "date-time" }),
	},
	{ additionalProperties: false },
);
export type ChangeSetImpact = Static<typeof ChangeSetImpactSchema>;

export const ChangeSetReviewStatusSchema = Type.Union([
	Type.Literal("passed"),
	Type.Literal("needs-work"),
	Type.Literal("blocked"),
]);
export type ChangeSetReviewStatus = Static<typeof ChangeSetReviewStatusSchema>;

export const ChangeSetReviewSchema = Type.Object(
	{
		reviewId: Type.String({ minLength: 1 }),
		status: ChangeSetReviewStatusSchema,
		issues: Type.Array(
			Type.Object(
				{
					code: Type.String({ minLength: 1 }),
					severity: Type.Union([Type.Literal("error"), Type.Literal("warning"), Type.Literal("info")]),
					message: Type.String({ minLength: 1 }),
					chapter: Type.Optional(Type.Integer({ minimum: 1 })),
				},
				{ additionalProperties: false },
			),
		),
		summary: Type.String({ minLength: 1 }),
		reviewedAt: Type.String({ format: "date-time" }),
	},
	{ additionalProperties: false },
);
export type ChangeSetReview = Static<typeof ChangeSetReviewSchema>;
