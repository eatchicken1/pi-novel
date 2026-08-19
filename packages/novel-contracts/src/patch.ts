import { type Static, Type } from "typebox";

export const ImpactCertaintySchema = Type.Union([
	Type.Literal("KNOWN"),
	Type.Literal("POSSIBLE"),
	Type.Literal("UNKNOWN"),
]);
export type ImpactCertainty = Static<typeof ImpactCertaintySchema>;

export const RevisionImpactCategorySchema = Type.Union([
	Type.Literal("STORY_FACT"),
	Type.Literal("CHARACTER_KNOWLEDGE"),
	Type.Literal("RELATIONSHIP"),
	Type.Literal("PROMISE"),
	Type.Literal("CLUE"),
	Type.Literal("THREAD"),
	Type.Literal("TIMELINE"),
	Type.Literal("CURRENT_CHAPTER"),
	Type.Literal("FUTURE_CHAPTER"),
]);
export type RevisionImpactCategory = Static<typeof RevisionImpactCategorySchema>;

export const RevisionImpactEvidenceSchema = Type.Object(
	{
		sourceType: Type.String({ minLength: 1 }),
		sourceId: Type.String({ minLength: 1 }),
		chapterId: Type.Optional(Type.String({ minLength: 1 })),
		description: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export type RevisionImpactEvidence = Static<typeof RevisionImpactEvidenceSchema>;

export const RevisionImpactItemSchema = Type.Object(
	{
		category: RevisionImpactCategorySchema,
		certainty: ImpactCertaintySchema,
		description: Type.String({ minLength: 1 }),
		evidence: Type.Optional(RevisionImpactEvidenceSchema),
	},
	{ additionalProperties: false },
);
export type RevisionImpactItem = Static<typeof RevisionImpactItemSchema>;

export const RevisionImpactSchema = Type.Object(
	{
		severity: Type.Union([
			Type.Literal("safe-local"),
			Type.Literal("downstream-review"),
			Type.Literal("structural-revision"),
			Type.Literal("authority-change"),
		]),
		causalCoverage: Type.Literal("partial"),
		items: Type.Array(RevisionImpactItemSchema),
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
export type RevisionImpact = Static<typeof RevisionImpactSchema>;

export const TextAnchorSchema = Type.Object(
	{
		chapterId: Type.String({ minLength: 1 }),
		baseContentHash: Type.String({ minLength: 1 }),
		startOffset: Type.Integer({ minimum: 0 }),
		endOffset: Type.Integer({ minimum: 0 }),
		selectedTextHash: Type.String({ minLength: 1 }),
		prefixContext: Type.String(),
		suffixContext: Type.String(),
	},
	{ additionalProperties: false },
);
export type TextAnchor = Static<typeof TextAnchorSchema>;

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
		anchor: Type.Optional(TextAnchorSchema),
	},
	{ additionalProperties: false },
);
export type ChangeOperation = Static<typeof ChangeOperationSchema>;

export const ManuscriptPatchCandidateSchema = Type.Object(
	{
		candidateId: Type.String({ minLength: 1 }),
		original: Type.String(),
		replacement: Type.String(),
		explanation: Type.String({ minLength: 1 }),
		impact: Type.Optional(RevisionImpactSchema),
	},
	{ additionalProperties: false },
);
export type ManuscriptPatchCandidate = Static<typeof ManuscriptPatchCandidateSchema>;

export const ManuscriptPatchSchema = Type.Object(
	{
		goal: Type.String({ minLength: 1 }),
		target: Type.String({ minLength: 1 }),
		constraints: Type.Array(Type.String({ minLength: 1 })),
		operations: Type.Array(ChangeOperationSchema, { minItems: 1 }),
		impact: RevisionImpactSchema,
		provenance: Type.Object(
			{
				agentId: Type.String({ minLength: 1 }),
				runtimeModelId: Type.String({ minLength: 1 }),
				thinkingLevel: Type.String({ minLength: 1 }),
			},
			{ additionalProperties: false },
		),
		baseRevision: Type.Integer({ minimum: 1 }),
		baseContentHash: Type.String({ minLength: 1 }),
		anchor: TextAnchorSchema,
		candidates: Type.Array(ManuscriptPatchCandidateSchema, { minItems: 1, maxItems: 3 }),
	},
	{ additionalProperties: false },
);
export type ManuscriptPatch = Static<typeof ManuscriptPatchSchema>;

export const PatchGenerationInputSchema = Type.Object(
	{
		goal: Type.String({ minLength: 1, maxLength: 1000 }),
		anchor: TextAnchorSchema,
		constraints: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { maxItems: 20 })),
		outputCount: Type.Optional(Type.Union([Type.Literal(1), Type.Literal(3)])),
		reopenConfirmed: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
export type PatchGenerationInput = Static<typeof PatchGenerationInputSchema>;

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
		causalCoverage: Type.Optional(Type.Literal("partial")),
		items: Type.Optional(Type.Array(RevisionImpactItemSchema)),
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
