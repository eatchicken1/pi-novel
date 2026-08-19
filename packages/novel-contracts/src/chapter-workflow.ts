import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";
import { ChangeOperationSchema } from "./patch.ts";

export const ChapterWorkflowPhaseSchema = Type.Union([
	Type.Literal("draft"),
	Type.Literal("reconciling"),
	Type.Literal("diagnosing"),
	Type.Literal("revising"),
	Type.Literal("settling"),
	Type.Literal("ready-to-finalize"),
	Type.Literal("finalized"),
]);
export type ChapterWorkflowPhase = Static<typeof ChapterWorkflowPhaseSchema>;

export const ReconcileDivergenceKindSchema = Type.Union([
	Type.Literal("planned-event-missing"),
	Type.Literal("prose-discovery"),
	Type.Literal("fact-change"),
	Type.Literal("knowledge-change"),
	Type.Literal("relationship-change"),
]);
export type ReconcileDivergenceKind = Static<typeof ReconcileDivergenceKindSchema>;

export const ReconcileDivergenceSchema = Type.Object(
	{
		divergenceId: Type.String({ minLength: 1 }),
		kind: ReconcileDivergenceKindSchema,
		plannedRef: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		description: Type.String({ minLength: 1 }),
		evidence: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		severity: Type.Union([Type.Literal("info"), Type.Literal("warning"), Type.Literal("error")]),
	},
	{ additionalProperties: false },
);
export type ReconcileDivergence = Static<typeof ReconcileDivergenceSchema>;

export const ReconcileStatusSchema = Type.Union([
	Type.Literal("aligned"),
	Type.Literal("divergent"),
	Type.Literal("prose-correction-required"),
	Type.Literal("creative-discovery-accepted"),
]);
export type ReconcileStatus = Static<typeof ReconcileStatusSchema>;

export const ReconcileAuthorDecisionSchema = Type.Union([
	Type.Literal("prose-was-wrong"),
	Type.Literal("accept-creative-discovery"),
]);
export type ReconcileAuthorDecision = Static<typeof ReconcileAuthorDecisionSchema>;

export const ReconcileReportSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		chapter: Type.Integer({ minimum: 1 }),
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
		status: ReconcileStatusSchema,
		divergences: Type.Array(ReconcileDivergenceSchema),
		authorDecision: Type.Union([Type.Null(), ReconcileAuthorDecisionSchema]),
		changeSetId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ReconcileReport = Static<typeof ReconcileReportSchema>;

const SettlementSummarySchema = Type.Object(
	{
		chapter: Type.Integer({ minimum: 1 }),
		pov: Type.String(),
		time: Type.String(),
		locations: Type.Array(Type.String()),
		characters: Type.Array(Type.String()),
		events: Type.Array(Type.String()),
		newFacts: Type.Array(Type.String()),
		relationshipChanges: Type.Array(Type.String()),
		cluesIntroduced: Type.Array(Type.String()),
		cluesResolved: Type.Array(Type.String()),
		itemsChanged: Type.Array(Type.String()),
		openQuestions: Type.Array(Type.String()),
		whatChanged: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		whatReaderLearned: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		whatHeroineLearned: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		whatSpouseLearned: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		professionalChange: Type.Optional(Type.String({ minLength: 1 })),
		mysteryProgress: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		threadsOpened: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		threadsAdvanced: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		threadsClosed: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		setups: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		payoffs: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
		revision: Type.Optional(Type.Integer({ minimum: 1 })),
	},
	{ additionalProperties: false },
);
export type ChapterSettlementSummary = Static<typeof SettlementSummarySchema>;

const KnowledgeChangeSchema = Type.Object(
	{ characterId: Type.String({ minLength: 1 }), change: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
const RelationshipChangeSchema = Type.Object(
	{ relationship: Type.String({ minLength: 1 }), change: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);

export const ChapterSettlementSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		chapter: Type.Integer({ minimum: 1 }),
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
		summary: SettlementSummarySchema,
		knowledgeChanges: Type.Array(KnowledgeChangeSchema),
		relationshipChanges: Type.Array(RelationshipChangeSchema),
		objects: Type.Array(Type.String({ minLength: 1 })),
		threads: Type.Array(Type.String({ minLength: 1 })),
		promises: Type.Array(Type.String({ minLength: 1 })),
		clues: Type.Array(Type.String({ minLength: 1 })),
		professionalState: Type.Array(Type.String({ minLength: 1 })),
		timelineChanges: Type.Array(Type.String({ minLength: 1 })),
		confirmation: Type.Literal("USER_CONFIRMED"),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ChapterSettlement = Static<typeof ChapterSettlementSchema>;

export const ReconcileInputSchema = Type.Object(
	{
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export type ReconcileInput = Static<typeof ReconcileInputSchema>;

export const SaveDraftInputSchema = Type.Object(
	{
		content: Type.String(),
		baseContentHash: Type.Optional(Type.String({ minLength: 1 })),
		revision: Type.Optional(Type.Integer({ minimum: 1 })),
	},
	{ additionalProperties: false },
);
export type SaveDraftInput = Static<typeof SaveDraftInputSchema>;

export const CreateChapterInputSchema = Type.Object(
	{
		title: Type.String({ minLength: 1, maxLength: 200 }),
		content: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);
export type CreateChapterInput = Static<typeof CreateChapterInputSchema>;

export const CreativeDiscoveryChangeSetSchema = Type.Object(
	{
		title: Type.String({ minLength: 1 }),
		kind: Type.Union([Type.Literal("content"), Type.Literal("structure"), Type.Literal("metadata")]),
		intent: Type.String({ minLength: 1 }),
		baseRevision: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		operations: Type.Array(ChangeOperationSchema, { minItems: 1 }),
	},
	{ additionalProperties: false },
);
export type CreativeDiscoveryChangeSet = Static<typeof CreativeDiscoveryChangeSetSchema>;

export const ReconcileDecisionInputSchema = Type.Object(
	{
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
		decision: ReconcileAuthorDecisionSchema,
		changeSet: Type.Optional(CreativeDiscoveryChangeSetSchema),
	},
	{ additionalProperties: false },
);
export type ReconcileDecisionInput = Static<typeof ReconcileDecisionInputSchema>;

export const SettlementInputSchema = Type.Object(
	{
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
		summary: Type.Omit(SettlementSummarySchema, ["chapter"]),
		knowledgeChanges: Type.Array(KnowledgeChangeSchema),
		relationshipChanges: Type.Array(RelationshipChangeSchema),
		objects: Type.Array(Type.String({ minLength: 1 })),
		threads: Type.Array(Type.String({ minLength: 1 })),
		promises: Type.Array(Type.String({ minLength: 1 })),
		clues: Type.Array(Type.String({ minLength: 1 })),
		professionalState: Type.Array(Type.String({ minLength: 1 })),
		timelineChanges: Type.Array(Type.String({ minLength: 1 })),
		confirmation: Type.Literal("USER_CONFIRMED"),
	},
	{ additionalProperties: false },
);
export type SettlementInput = Static<typeof SettlementInputSchema>;

export const FinalizeChapterInputSchema = Type.Object(
	{
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
		title: Type.String({ minLength: 1, maxLength: 200 }),
		content: Type.String({ minLength: 1 }),
		overwrite: Type.Optional(Type.Boolean()),
		confirmation: Type.Literal("USER_CONFIRMED"),
	},
	{ additionalProperties: false },
);
export type FinalizeChapterInput = Static<typeof FinalizeChapterInputSchema>;

export const ChapterDraftSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		chapter: Type.Integer({ minimum: 1 }),
		draftRevision: Type.Integer({ minimum: 1 }),
		contentHash: Type.String({ minLength: 1 }),
		content: Type.String(),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ChapterDraft = Static<typeof ChapterDraftSchema>;

export const ChapterWorkflowSnapshotSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		chapter: Type.Integer({ minimum: 1 }),
		phase: ChapterWorkflowPhaseSchema,
		draft: Type.Union([Type.Null(), ChapterDraftSchema]),
		reconcile: Type.Union([Type.Null(), ReconcileReportSchema]),
		settlement: Type.Union([Type.Null(), ChapterSettlementSchema]),
		canSettle: Type.Boolean(),
		canFinalize: Type.Boolean(),
		settlementStale: Type.Boolean(),
		nextAction: Type.String({ minLength: 1 }),
		blockingReasons: Type.Array(
			Type.Object(
				{ code: Type.String({ minLength: 1 }), message: Type.String({ minLength: 1 }) },
				{ additionalProperties: false },
			),
		),
		recommendation: Type.Union([
			Type.Literal("draft"),
			Type.Literal("reconcile"),
			Type.Literal("diagnose"),
			Type.Literal("revise"),
			Type.Literal("settle"),
			Type.Literal("finalize"),
			Type.Literal("finished"),
		]),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ChapterWorkflowSnapshot = Static<typeof ChapterWorkflowSnapshotSchema>;
