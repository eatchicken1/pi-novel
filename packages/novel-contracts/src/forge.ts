import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const ForgeSessionStatusSchema = Type.Union([
	Type.Literal("draft"),
	Type.Literal("ready"),
	Type.Literal("generating"),
	Type.Literal("awaiting_selection"),
	Type.Literal("committed"),
	Type.Literal("materializing"),
	Type.Literal("materialized"),
	Type.Literal("failed"),
	Type.Literal("abandoned"),
]);
export type ForgeSessionStatus = Static<typeof ForgeSessionStatusSchema>;

export const NarrativeDnaSchema = Type.Object(
	{
		genre: Type.String({ minLength: 1 }),
		narrativeScale: Type.String({ minLength: 1 }),
		coreExperience: Type.String({ minLength: 1 }),
		pacing: Type.String({ minLength: 1 }),
		pov: Type.String({ minLength: 1 }),
		endingTone: Type.String({ minLength: 1 }),
		readerPromise: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export type NarrativeDna = Static<typeof NarrativeDnaSchema>;

export const StoryConstraintSchema = Type.Object(
	{
		id: Type.String({ minLength: 1 }),
		kind: Type.Union([Type.Literal("hard"), Type.Literal("preference")]),
		text: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export type StoryConstraint = Static<typeof StoryConstraintSchema>;

export const DirectionCandidateStatusSchema = Type.Union([
	Type.Literal("proposed"),
	Type.Literal("selected"),
	Type.Literal("committed"),
	Type.Literal("invalid"),
]);
export type DirectionCandidateStatus = Static<typeof DirectionCandidateStatusSchema>;

export const ConstraintValidationStatusSchema = Type.Union([
	Type.Literal("PASS"),
	Type.Literal("FAIL"),
	Type.Literal("UNCERTAIN"),
]);
export type ConstraintValidationStatus = Static<typeof ConstraintValidationStatusSchema>;

export const ConstraintValidationSchema = Type.Object(
	{
		status: ConstraintValidationStatusSchema,
		reasons: Type.Array(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type ConstraintValidation = Static<typeof ConstraintValidationSchema>;

export const DirectionCandidateSchema = Type.Object(
	{
		candidateId: Type.String({ minLength: 1 }),
		artifactId: Type.String({ minLength: 1 }),
		generation: Type.Integer({ minimum: 1 }),
		status: DirectionCandidateStatusSchema,
		title: Type.String({ minLength: 1 }),
		logline: Type.String({ minLength: 1 }),
		corePremise: Type.String({ minLength: 1 }),
		centralMystery: Type.String({ minLength: 1 }),
		socialMechanism: Type.String({ minLength: 1 }),
		characterEngine: Type.String({ minLength: 1 }),
		relationshipFaultLine: Type.String({ minLength: 1 }),
		centralDilemma: Type.String({ minLength: 1 }),
		readerPromise: Type.String({ minLength: 1 }),
		endingShape: Type.String({ minLength: 1 }),
		climaxIdea: Type.String({ minLength: 1 }),
		majorRisks: Type.Array(Type.String({ minLength: 1 })),
		distinctiveFeatures: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
		// Hard-constraint gate result recorded at generation time. FAIL
		// candidates never reach the user as ordinary proposals.
		constraintValidation: ConstraintValidationSchema,
		createdAt: ISODateStringSchema,
		selectedAt: Type.Optional(ISODateStringSchema),
	},
	{ additionalProperties: false },
);
export type DirectionCandidate = Static<typeof DirectionCandidateSchema>;

export const ForgeGenerationSummarySchema = Type.Object(
	{
		generation: Type.Integer({ minimum: 1 }),
		artifactId: Type.String({ minLength: 1 }),
		createdAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ForgeGenerationSummary = Static<typeof ForgeGenerationSummarySchema>;

export const ComparisonAssessmentSchema = Type.Union([
	Type.Literal("stronger"),
	Type.Literal("comparable"),
	Type.Literal("weaker"),
	Type.Literal("risk"),
]);
export const StoryDirectionComparisonDimensionSchema = Type.Object(
	{
		dimension: Type.String({ minLength: 1 }),
		assessment: ComparisonAssessmentSchema,
		candidateIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
		reason: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export const StoryDirectionComparisonSchema = Type.Object(
	{
		dimensions: Type.Array(StoryDirectionComparisonDimensionSchema),
		recommendedCandidateIds: Type.Array(Type.String({ minLength: 1 })),
		notes: Type.Array(Type.String({ minLength: 1 })),
		createdAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type StoryDirectionComparison = Static<typeof StoryDirectionComparisonSchema>;

export const ForgeArtifactKindSchema = Type.Union([
	Type.Literal("directions"),
	Type.Literal("comparison"),
	Type.Literal("critique"),
	Type.Literal("selection"),
	Type.Literal("commitment"),
	Type.Literal("materialization"),
]);
export type ForgeArtifactKind = Static<typeof ForgeArtifactKindSchema>;

export const ForgeArtifactSchema = Type.Object(
	{
		artifactId: Type.String({ minLength: 1 }),
		forgeSessionId: Type.String({ minLength: 1 }),
		kind: ForgeArtifactKindSchema,
		relativePath: Type.String({ minLength: 1 }),
		createdAt: ISODateStringSchema,
		candidateId: Type.Optional(Type.String({ minLength: 1 })),
		summary: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);
export type ForgeArtifact = Static<typeof ForgeArtifactSchema>;

export const ForgeSessionSchema = Type.Object(
	{
		forgeSessionId: Type.String({ minLength: 1 }),
		workspaceId: Type.String({ minLength: 1 }),
		status: ForgeSessionStatusSchema,
		seed: Type.String(),
		genreHint: Type.Optional(Type.String({ minLength: 1 })),
		titleCandidate: Type.Union([Type.Null(), Type.String()]),
		narrativeDNA: Type.Union([Type.Null(), NarrativeDnaSchema]),
		hardConstraints: Type.Array(StoryConstraintSchema),
		preferences: Type.Array(StoryConstraintSchema),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
		selectedCandidateId: Type.Union([Type.Null(), Type.String()]),
		committedAt: Type.Union([Type.Null(), ISODateStringSchema]),
		materializedProjectId: Type.Union([Type.Null(), Type.String()]),
		currentTaskId: Type.Union([Type.Null(), Type.String()]),
		runtimeRelativePath: Type.String({ minLength: 1 }),
		failureCode: Type.Union([Type.Null(), Type.String()]),
		failureMessage: Type.Union([Type.Null(), Type.String()]),
	},
	{ additionalProperties: false },
);
export type ForgeSession = Static<typeof ForgeSessionSchema>;

export const CreateForgeSessionInputSchema = Type.Object(
	{
		seed: Type.String({ minLength: 1 }),
		genreHint: Type.Optional(Type.String({ minLength: 1 })),
		titleCandidate: Type.Optional(Type.String({ minLength: 1 })),
		narrativeDNA: Type.Optional(NarrativeDnaSchema),
		hardConstraints: Type.Optional(Type.Array(StoryConstraintSchema)),
		preferences: Type.Optional(Type.Array(StoryConstraintSchema)),
	},
	{ additionalProperties: false },
);
export type CreateForgeSessionInput = Static<typeof CreateForgeSessionInputSchema>;

export const UpdateForgeSessionInputSchema = Type.Object(
	{
		seed: Type.Optional(Type.String({ minLength: 1 })),
		genreHint: Type.Optional(Type.String({ minLength: 1 })),
		titleCandidate: Type.Optional(Type.String({ minLength: 1 })),
		narrativeDNA: Type.Optional(NarrativeDnaSchema),
		hardConstraints: Type.Optional(Type.Array(StoryConstraintSchema)),
		preferences: Type.Optional(Type.Array(StoryConstraintSchema)),
	},
	{ additionalProperties: false },
);
export type UpdateForgeSessionInput = Static<typeof UpdateForgeSessionInputSchema>;

export const GenerateDirectionsInputSchema = Type.Object(
	{
		count: Type.Optional(Type.Integer({ minimum: 3, maximum: 6 })),
	},
	{ additionalProperties: false },
);
export type GenerateDirectionsInput = Static<typeof GenerateDirectionsInputSchema>;

export const SelectDirectionInputSchema = Type.Object(
	{ candidateId: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
export type SelectDirectionInput = Static<typeof SelectDirectionInputSchema>;

export const CritiqueDirectionInputSchema = Type.Object(
	{
		candidateId: Type.String({ minLength: 1 }),
		instruction: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export type CritiqueDirectionInput = Static<typeof CritiqueDirectionInputSchema>;

export const RegenerateDirectionsInputSchema = Type.Object(
	{ count: Type.Optional(Type.Integer({ minimum: 3, maximum: 6 })) },
	{ additionalProperties: false },
);
export type RegenerateDirectionsInput = Static<typeof RegenerateDirectionsInputSchema>;

export const CommitForgeInputSchema = Type.Object(
	{ authorNote: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
export type CommitForgeInput = Static<typeof CommitForgeInputSchema>;

export const MaterializeForgeInputSchema = Type.Object(
	{
		title: Type.String({ minLength: 1 }),
		folderName: Type.String({ minLength: 1 }),
		language: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type MaterializeForgeInput = Static<typeof MaterializeForgeInputSchema>;

export const ForgeTaskSchema = Type.Object(
	{
		taskId: Type.String({ minLength: 1 }),
		forgeSessionId: Type.String({ minLength: 1 }),
		type: Type.String({ minLength: 1 }),
		status: Type.Union([
			Type.Literal("queued"),
			Type.Literal("running"),
			Type.Literal("succeeded"),
			Type.Literal("failed"),
			Type.Literal("cancelled"),
		]),
		progressPhase: Type.String({ minLength: 1 }),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
		errorMessage: Type.Union([Type.Null(), Type.String()]),
	},
	{ additionalProperties: false },
);
export type ForgeTask = Static<typeof ForgeTaskSchema>;

export const ForgeSessionResponseSchema = Type.Object({ session: ForgeSessionSchema }, { additionalProperties: false });
export const ForgeArtifactsResponseSchema = Type.Object(
	{
		artifacts: Type.Array(ForgeArtifactSchema),
		candidates: Type.Array(DirectionCandidateSchema),
		generations: Type.Array(ForgeGenerationSummarySchema),
		comparison: Type.Union([Type.Null(), StoryDirectionComparisonSchema]),
		task: Type.Union([Type.Null(), ForgeTaskSchema]),
	},
	{ additionalProperties: false },
);
export const ForgeTaskResponseSchema = Type.Object({ task: ForgeTaskSchema }, { additionalProperties: false });
export type ForgeArtifactsResponse = Static<typeof ForgeArtifactsResponseSchema>;
export type ForgeTaskResponse = Static<typeof ForgeTaskResponseSchema>;
