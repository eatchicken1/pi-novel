import { Type } from "@earendil-works/pi-ai";
import type { Static } from "typebox";

const ProjectIdSchema = Type.String({
	minLength: 1,
	maxLength: 64,
	pattern: "^[a-z0-9][a-z0-9-]{0,63}$",
	description: "小说项目 ID，只允许小写字母、数字和连字符",
});

export const GenreSchema = Type.String({
	minLength: 1,
	maxLength: 80,
	examples: ["suspense", "urban-romance", "light-fantasy", "chase-wife", "追妻文"],
	description: "小说类型。内置类型包括 suspense/都市悬疑、urban-romance/都市情感、light-fantasy/轻幻想、chase-wife/追妻文，也允许项目保留自定义类型。",
});

const ChapterNumberSchema = Type.Integer({
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
	Type.Literal("scene-contract"),
	Type.Literal("summary"),
	Type.Literal("continuity"),
	Type.Literal("reference-note"),
	Type.Literal("research"),
	Type.Literal("brainstorm"),
	Type.Literal("author-note"),
	Type.Literal("analysis"),
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

const ContextTaskSchema = Type.Union([
	Type.Literal("planning"),
	Type.Literal("chapter-writing"),
	Type.Literal("continuity-review"),
	Type.Literal("prose-revision"),
	Type.Literal("reader-sim"),
]);

const ChapterSummarySchema = Type.Object({
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
});

export const SceneContractSchema = Type.Object({
	sceneId: Type.String({ minLength: 1 }),
	chapter: ChapterNumberSchema,
	order: Type.Integer({ minimum: 1 }),
	pov: Type.String({ minLength: 1 }),
	time: Type.String({ minLength: 1 }),
	location: Type.String({ minLength: 1 }),
	goal: Type.String({ minLength: 1 }),
	opposition: Type.String({ minLength: 1 }),
	stakes: Type.String({ minLength: 1 }),
	knowledgeBefore: Type.Array(Type.String()),
	informationReveal: Type.Array(Type.String()),
	emotionalStateBefore: Type.String(),
	emotionalTurn: Type.String({ minLength: 1 }),
	emotionalStateAfter: Type.String(),
	stateChanges: Type.Array(Type.String(), { minItems: 1 }),
	setups: Type.Array(Type.String()),
	payoffs: Type.Array(Type.String()),
	exitHook: Type.String({ minLength: 1 }),
});

export const ContinuityIssueSchema = Type.Object({
	id: Type.String({ minLength: 1 }),
	severity: Type.Union([Type.Literal("error"), Type.Literal("warning"), Type.Literal("suggestion")]),
	category: Type.String({ minLength: 1 }),
	evidence: Type.Array(Type.Object({ file: Type.String(), excerpt: Type.Optional(Type.String()) })),
	problem: Type.String(),
	impact: Type.String(),
	suggestedFixes: Type.Array(Type.String()),
	status: Type.Union([
		Type.Literal("open"),
		Type.Literal("accepted"),
		Type.Literal("fixed"),
		Type.Literal("ignored"),
	]),
});

export const InitializeNovelSchema = Type.Object({
	projectId: ProjectIdSchema,
	title: Type.String({ minLength: 1, maxLength: 200 }),
	genre: GenreSchema,
	targetWordCount: Type.Optional(Type.Integer({ minimum: 1000 })),
});

export const RepairNovelProjectSchema = Type.Object({ projectId: ProjectIdSchema });
export const GetNovelStatusSchema = Type.Object({ projectId: ProjectIdSchema });

export const ReadStoryContextSchema = Type.Object({
	projectId: ProjectIdSchema,
	task: Type.Optional(ContextTaskSchema),
	chapter: Type.Optional(ChapterNumberSchema),
	sceneIds: Type.Optional(Type.Array(Type.String())),
	characterIds: Type.Optional(Type.Array(Type.String())),
	worldIds: Type.Optional(Type.Array(Type.String())),
	clueIds: Type.Optional(Type.Array(Type.String())),
	recentSummaryCount: Type.Optional(Type.Integer({ minimum: 0, maximum: 20 })),
	includePreviousChapterEnding: Type.Optional(Type.Boolean()),
	includeCurrentDraft: Type.Optional(Type.Boolean()),
	maxChars: Type.Optional(Type.Integer({ minimum: 1000, maximum: 200000 })),
	sections: Type.Optional(Type.Array(ContextSectionSchema, { minItems: 1 })),
});

export const SaveStoryDocumentSchema = Type.Object({
	projectId: ProjectIdSchema,
	documentType: DocumentTypeSchema,
	name: Type.Optional(
		Type.String({ minLength: 1, maxLength: 80, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" }),
	),
	format: ContentFormatSchema,
	content: Type.String({ minLength: 1 }),
});

export const SaveChapterPlanSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	content: Type.String({ minLength: 1 }),
});

export const SaveSceneContractSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	contracts: Type.Array(SceneContractSchema, { minItems: 1 }),
});

export const SaveChapterDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	content: Type.String({ minLength: 1 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const CheckContinuitySchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
});

export const SaveContinuityReportSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Integer({ minimum: 1 }),
	status: Type.Union([Type.Literal("ok"), Type.Literal("warning"), Type.Literal("error")]),
	issues: Type.Array(ContinuityIssueSchema),
});

export const ExtractChapterFactsSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Integer({ minimum: 1 }),
	facts: Type.Object({
		newFacts: Type.Array(Type.String()),
		locations: Type.Array(Type.String()),
		characterStates: Type.Array(Type.String()),
		knowledgeChanges: Type.Array(Type.String()),
		relationshipChanges: Type.Array(Type.String()),
		foreshadowing: Type.Array(Type.String()),
		timelineEvents: Type.Array(Type.String()),
		itemsChanged: Type.Array(Type.String()),
		newTerms: Type.Array(Type.String()),
		openQuestions: Type.Array(Type.String()),
	}),
});

export const SaveWorkflowCheckpointSchema = Type.Object({
	projectId: ProjectIdSchema,
	phase: Type.String({ minLength: 1 }),
	chapter: Type.Optional(ChapterNumberSchema),
	currentTask: Type.String({ minLength: 1 }),
	completedSteps: Type.Array(Type.String()),
	pendingSteps: Type.Array(Type.String()),
	activeDraft: Type.Optional(Type.String()),
});

export const LoadWorkflowCheckpointSchema = Type.Object({ projectId: ProjectIdSchema });

const QualityEvidenceAnchorSchema = Type.Object({
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
	excerpt: Type.String({ minLength: 1 }),
});

const QualityEvidenceItemSchema = Type.Object({
	location: Type.String({ minLength: 1 }),
	evidence: Type.String({ minLength: 1 }),
	problem: Type.String({ minLength: 1 }),
	severity: Type.Optional(Type.Union([Type.Literal("error"), Type.Literal("warning"), Type.Literal("suggestion")])),
	anchor: Type.Optional(QualityEvidenceAnchorSchema),
});

const ReaderReportSchema = Type.Object({
	status: Type.Union([Type.Literal("ok"), Type.Literal("revision-required")]),
	engagementDrops: Type.Array(QualityEvidenceItemSchema),
	predictions: Type.Array(QualityEvidenceItemSchema),
	confusionPoints: Type.Array(QualityEvidenceItemSchema),
	credibilityBreaks: Type.Array(QualityEvidenceItemSchema),
	strongestMoments: Type.Array(QualityEvidenceItemSchema, { minItems: 1 }),
});

const ReviewReportSchema = Type.Object({
	status: Type.Union([Type.Literal("ok"), Type.Literal("revision-required")]),
	structuralIssues: Type.Array(QualityEvidenceItemSchema),
	sceneIssues: Type.Array(QualityEvidenceItemSchema),
	characterIssues: Type.Array(QualityEvidenceItemSchema),
	pacingIssues: Type.Array(QualityEvidenceItemSchema),
	priorities: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	verifiedStrengths: Type.Array(QualityEvidenceItemSchema, { minItems: 1 }),
	allowFinalize: Type.Boolean(),
});

export const SaveQualityReportSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
	draftRevision: Type.Optional(Type.Integer({ minimum: 1 })),
	content: Type.String({ minLength: 1 }),
	structuredReport: Type.Optional(Type.Union([ReaderReportSchema, ReviewReportSchema])),
});

export const RecordWritingIssueSchema = Type.Object({
	projectId: ProjectIdSchema,
	id: Type.String({ minLength: 1, maxLength: 80, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" }),
	category: Type.String({ minLength: 1 }),
	scope: Type.Array(Type.String(), { minItems: 1 }),
	description: Type.String({ minLength: 1 }),
	severity: Type.Union([Type.Literal("error"), Type.Literal("warning"), Type.Literal("suggestion")]),
	status: Type.Union([Type.Literal("open"), Type.Literal("accepted"), Type.Literal("fixed"), Type.Literal("ignored")]),
	occurrences: Type.Optional(Type.Integer({ minimum: 1 })),
});

const ConfirmationSchema = Type.Optional(Type.Literal("USER_CONFIRMED"));
const UpdateStatusSchema = Type.Union([Type.Literal("proposed"), Type.Literal("confirmed")]);

export const UpdateCharacterStateSchema = Type.Object({
	projectId: ProjectIdSchema,
	characterId: Type.String({ minLength: 1, maxLength: 80, pattern: "^[a-z0-9][a-z0-9-]{0,79}$" }),
	status: UpdateStatusSchema,
	content: Type.String({ minLength: 1 }),
	confirmation: ConfirmationSchema,
});

export const UpdateClueLedgerSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	entries: Type.Array(
		Type.Object({ id: Type.String({ minLength: 1 }), description: Type.String({ minLength: 1 }), introducedIn: Type.Optional(ChapterNumberSchema), resolvedIn: Type.Optional(ChapterNumberSchema) }),
		{ minItems: 1 },
	),
	confirmation: ConfirmationSchema,
});

export const UpdateTimelineSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	events: Type.Array(Type.Object({ id: Type.String({ minLength: 1 }), chapter: ChapterNumberSchema, description: Type.String({ minLength: 1 }) }), { minItems: 1 }),
	confirmation: ConfirmationSchema,
});

export const SaveCanonDocumentSchema = Type.Object({
	projectId: ProjectIdSchema,
	documentType: Type.Union([Type.Literal("story-bible"), Type.Literal("style-guide"), Type.Literal("world"), Type.Literal("outline")]),
	name: Type.Optional(Type.String({ minLength: 1, maxLength: 80, pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$" })),
	format: ContentFormatSchema,
	content: Type.String({ minLength: 1 }),
	status: UpdateStatusSchema,
	confirmation: ConfirmationSchema,
});

export const ScoreStoryFoundationSchema = Type.Object({
	projectId: ProjectIdSchema,
	scores: Type.Object({
		coreIdea: Type.Number({ minimum: 0, maximum: 10 }),
		readerPromise: Type.Number({ minimum: 0, maximum: 10 }),
		protagonistCost: Type.Number({ minimum: 0, maximum: 12 }),
		coreConflict: Type.Number({ minimum: 0, maximum: 12 }),
		causality: Type.Number({ minimum: 0, maximum: 14 }),
		characterArc: Type.Number({ minimum: 0, maximum: 10 }),
		climaxEnding: Type.Number({ minimum: 0, maximum: 12 }),
		setupPayoff: Type.Number({ minimum: 0, maximum: 10 }),
		genrePromise: Type.Number({ minimum: 0, maximum: 5 }),
		feasibility: Type.Number({ minimum: 0, maximum: 5 }),
	}),
	comment: Type.String({ minLength: 1 }),
});

export const ScoreChapterSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Integer({ minimum: 1 }),
	scores: Type.Object({
		sceneFunction: Type.Number({ minimum: 0, maximum: 10 }),
		causality: Type.Number({ minimum: 0, maximum: 10 }),
		characterConsistency: Type.Number({ minimum: 0, maximum: 10 }),
		povStability: Type.Number({ minimum: 0, maximum: 10 }),
		informationRelease: Type.Number({ minimum: 0, maximum: 10 }),
		pacing: Type.Number({ minimum: 0, maximum: 10 }),
		dialogueDifference: Type.Number({ minimum: 0, maximum: 10 }),
		emotionalTurn: Type.Number({ minimum: 0, maximum: 10 }),
		endingDrive: Type.Number({ minimum: 0, maximum: 10 }),
		aiArtifacts: Type.Number({ minimum: 0, maximum: 10 }),
		continuity: Type.Number({ minimum: 0, maximum: 10 }),
	}),
	comment: Type.String({ minLength: 1 }),
});

export const CreateVoiceFingerprintSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
	content: Type.String({ minLength: 1 }),
});

export const CompareDraftVersionsSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	leftRevision: Type.Integer({ minimum: 1 }),
	rightRevision: Type.Integer({ minimum: 1 }),
});

export const ExportManuscriptSchema = Type.Object({
	projectId: ProjectIdSchema,
	includeSummaries: Type.Optional(Type.Boolean()),
});

export const CheckAiArtifactsSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Optional(Type.Integer({ minimum: 1 })),
});

const ChaseWifePovModeSchema = Type.Union([Type.Literal("heroine-first-person"), Type.Literal("split-pov")]);

const ChaseWifeEventPovSchema = Type.Union([
	Type.Literal("heroine-first-person"),
	Type.Literal("male-limited-third-person"),
]);

const ChaseWifeHeroineArcPhaseSchema = Type.Union([
	Type.Literal("injury"),
	Type.Literal("recognition"),
	Type.Literal("micro-withdrawal"),
	Type.Literal("boundary-test"),
	Type.Literal("irreversible-exit"),
	Type.Literal("self-rebuild"),
	Type.Literal("final-boundary"),
]);

const ChaseWifeMaleArcPhaseSchema = Type.Union([
	Type.Literal("entitlement"),
	Type.Literal("loss-of-control"),
	Type.Literal("wrong-pursuit"),
	Type.Literal("real-consequence"),
	Type.Literal("recognition"),
	Type.Literal("respect-or-failure"),
]);

const ChaseWifeEventRoleSchema = Type.Union([
	Type.Literal("opening-injury"),
	Type.Literal("evidence"),
	Type.Literal("preference-exposure"),
	Type.Literal("gaslighting"),
	Type.Literal("micro-withdrawal"),
	Type.Literal("boundary-test"),
	Type.Literal("decision"),
	Type.Literal("irreversible-exit"),
	Type.Literal("pursuit-control"),
	Type.Literal("pursuit-failure"),
	Type.Literal("real-consequence"),
	Type.Literal("recognition"),
	Type.Literal("self-rebuild"),
	Type.Literal("final-boundary"),
	Type.Literal("closure"),
]);

const ChaseWifeTargetTrackSchema = Type.Union([
	Type.Literal("heroine"),
	Type.Literal("male"),
	Type.Literal("shared"),
]);

const ChaseWifeAgencyDimensionSchema = Type.Union([
	Type.Literal("epistemic"),
	Type.Literal("relational"),
	Type.Literal("material"),
	Type.Literal("social"),
	Type.Literal("future"),
]);

const ChaseWifeAgencyStateSchema = Type.Object({
	epistemic: Type.Integer({ minimum: 0, maximum: 4 }),
	relational: Type.Integer({ minimum: 0, maximum: 4 }),
	material: Type.Integer({ minimum: 0, maximum: 4 }),
	social: Type.Integer({ minimum: 0, maximum: 4 }),
	future: Type.Integer({ minimum: 0, maximum: 4 }),
});

const ChaseWifeAgencySetbackSchema = Type.Object({
	dimension: ChaseWifeAgencyDimensionSchema,
	reason: Type.String({ minLength: 1 }),
	recoveryBeatRef: Type.Integer({ minimum: 1, maximum: 24 }),
});

const ChaseWifeInjuryMechanismSchema = Type.Union([
	Type.Literal("neglect"),
	Type.Literal("substitution"),
	Type.Literal("coercion"),
	Type.Literal("gaslighting"),
	Type.Literal("resource-transfer"),
	Type.Literal("public-humiliation"),
	Type.Literal("betrayal-evidence"),
]);

const ChaseWifeLengthModeSchema = Type.Union([
	Type.Literal("flash"),
	Type.Literal("bridge"),
	Type.Literal("standard"),
	Type.Literal("anchor"),
]);

const ChaseWifePacingModeSchema = Type.Union([Type.Literal("fast-burn"), Type.Literal("standard")]);
const ChaseWifeStoryPacingScopeSchema = Type.Union([Type.Literal("working"), Type.Literal("finalized")]);
const ChaseWifeStoryPacingEvaluationModeSchema = Type.Union([Type.Literal("projection"), Type.Literal("gate")]);
const ChaseWifeOpeningModeSchema = Type.Union([
	Type.Literal("cold-conflict"),
	Type.Literal("result-first"),
	Type.Literal("exit-in-progress"),
	Type.Literal("quiet-dislocation"),
]);
const ChaseWifeChronologySchema = Type.Union([
	Type.Literal("present"),
	Type.Literal("flashback"),
	Type.Literal("flashforward-preview"),
]);

const ChaseWifeStayingLogicSchema = Type.Object({
	emotionalReason: Type.String({ minLength: 1 }),
	falseBelief: Type.String({ minLength: 1 }),
	sustainingEvidence: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	breakingThreshold: Type.String({ minLength: 1 }),
	materialReason: Type.Optional(Type.String({ minLength: 1 })),
	socialReason: Type.Optional(Type.String({ minLength: 1 })),
	familyReason: Type.Optional(Type.String({ minLength: 1 })),
	careerReason: Type.Optional(Type.String({ minLength: 1 })),
});

const ChaseWifeMemorySpanSchema = Type.Object({
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
});

export const ChaseWifeBeatSchema = Type.Object({
	beat: Type.Integer({ minimum: 1, maximum: 24 }),
	heroinePhase: Type.Optional(ChaseWifeHeroineArcPhaseSchema),
	malePhase: Type.Optional(ChaseWifeMaleArcPhaseSchema),
	targetTrack: ChaseWifeTargetTrackSchema,
	paywallHook: Type.Boolean(),
	sceneCount: Type.Integer({ minimum: 1, maximum: 5 }),
	goal: Type.String({ minLength: 1 }),
	conflict: Type.String({ minLength: 1 }),
	actionOrConsequence: Type.String({ minLength: 1 }),
	emotionBefore: Type.String({ minLength: 1 }),
	emotionAfter: Type.String({ minLength: 1 }),
	emotionStack: Type.Array(Type.String(), { minItems: 1 }),
	painPoint: Type.String({ minLength: 1 }),
	rewardPoint: Type.String({ minLength: 1 }),
	hook: Type.String({ minLength: 1 }),
});

export const SaveChaseWifeBeatSheetSchema = Type.Object({
	projectId: ProjectIdSchema,
	povMode: ChaseWifePovModeSchema,
	pacingMode: Type.Optional(ChaseWifePacingModeSchema),
	openingMode: Type.Optional(ChaseWifeOpeningModeSchema),
	heroineArc: Type.Array(ChaseWifeHeroineArcPhaseSchema, { minItems: 4, maxItems: 7 }),
	maleArc: Type.Array(ChaseWifeMaleArcPhaseSchema, { minItems: 3, maxItems: 6 }),
	openingIntro: Type.Optional(Type.String({ minLength: 1, maxLength: 180 })),
	openingConflict: Type.String({ minLength: 1 }),
	stayingLogic: ChaseWifeStayingLogicSchema,
	beats: Type.Array(ChaseWifeBeatSchema, { minItems: 12, maxItems: 24 }),
});

export const CheckChaseWifeArcSchema = Type.Object({ projectId: ProjectIdSchema });

export const ChaseWifeEventSchema = Type.Object({
	eventId: Type.Integer({ minimum: 1, maximum: 8 }),
	role: ChaseWifeEventRoleSchema,
	beatRefs: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 24 }))),
	harmRefs: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
	repairRefs: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
	chronology: Type.Optional(ChaseWifeChronologySchema),
	heroinePhase: Type.Optional(ChaseWifeHeroineArcPhaseSchema),
	malePhase: Type.Optional(ChaseWifeMaleArcPhaseSchema),
	scene: Type.Integer({ minimum: 1, maximum: 8 }),
	pov: ChaseWifeEventPovSchema,
	targetTrack: ChaseWifeTargetTrackSchema,
	paywallHook: Type.Boolean(),
	causes: Type.Array(Type.Integer({ minimum: 1, maximum: 8 })),
	injuryMechanism: Type.Optional(ChaseWifeInjuryMechanismSchema),
	informationDelta: Type.Array(Type.String()),
	relationshipDelta: Type.Array(Type.String()),
	resourceDelta: Type.Array(Type.String()),
	riskDelta: Type.Array(Type.String()),
	heroineAgencyBefore: Type.Integer({ minimum: 0, maximum: 100 }),
	heroineAgencyAfter: Type.Integer({ minimum: 0, maximum: 100 }),
	heroineAgencyStateBefore: ChaseWifeAgencyStateSchema,
	heroineAgencyStateAfter: ChaseWifeAgencyStateSchema,
	setback: Type.Optional(ChaseWifeAgencySetbackSchema),
	irreversible: Type.Boolean(),
	cannotRemoveBecause: Type.String({ minLength: 1 }),
	lengthMode: ChaseWifeLengthModeSchema,
	minChars: Type.Integer({ minimum: 60, maximum: 850 }),
	maxChars: Type.Integer({ minimum: 60, maximum: 850 }),
	eventDescription: Type.String({ minLength: 1 }),
	function: Type.String({ minLength: 1 }),
	goal: Type.String({ minLength: 1 }),
	conflict: Type.String({ minLength: 1 }),
	actionOrConsequence: Type.String({ minLength: 1 }),
	protagonistReaction: Type.String({ minLength: 1 }),
	oppositionReaction: Type.String({ minLength: 1 }),
	informationChange: Type.String({ minLength: 1 }),
	emotionBefore: Type.String({ minLength: 1 }),
	emotionAfter: Type.String({ minLength: 1 }),
	physicalReaction: Type.String({ minLength: 1 }),
	setupOrPayoff: Type.String({ minLength: 1 }),
	readerRelease: Type.String({ minLength: 1 }),
	entryHook: Type.String({ minLength: 1 }),
	exitHook: Type.String({ minLength: 1 }),
});

export const SaveChaseWifeEventMapSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	povMode: ChaseWifePovModeSchema,
	openingMode: Type.Optional(ChaseWifeOpeningModeSchema),
	openingIntro: Type.Optional(Type.String({ minLength: 1, maxLength: 180 })),
	openingConflict: Type.String({ minLength: 1 }),
	openingConflictMarker: Type.Optional(Type.String({ minLength: 2, maxLength: 80 })),
	events: Type.Array(ChaseWifeEventSchema, { minItems: 3, maxItems: 6 }),
});

export const CheckChaseWifeEventMapSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
});

export const SaveChaseWifeEventDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 8 }),
	content: Type.String({ minLength: 1 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const CheckChaseWifeEventDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 8 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const AssembleChaseWifeChapterSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const CheckChaseWifePacingSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Optional(Type.Integer({ minimum: 1 })),
	mode: Type.Optional(ChaseWifePacingModeSchema),
	memorySpans: Type.Optional(Type.Array(ChaseWifeMemorySpanSchema)),
});

export const CheckChaseWifeChapterPacingSchema = CheckChaseWifePacingSchema;

export const CheckChaseWifeStoryPacingSchema = Type.Object({
	projectId: ProjectIdSchema,
	mode: Type.Optional(ChaseWifePacingModeSchema),
	scope: Type.Optional(ChaseWifeStoryPacingScopeSchema),
	evaluationMode: Type.Optional(ChaseWifeStoryPacingEvaluationModeSchema),
});

export const CheckChaseWifeEventSemanticsSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 8 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

const SemanticEvidenceAnchorSchema = Type.Object({
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
	excerpt: Type.String({ minLength: 1 }),
});

const ChaseWifeLedgerEvidenceSchema = Type.Object({
	chapter: ChapterNumberSchema,
	eventId: Type.Optional(Type.Integer({ minimum: 1, maximum: 8 })),
	draftRevision: Type.Optional(Type.Integer({ minimum: 1 })),
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
	excerpt: Type.String({ minLength: 1 }),
	contentHash: Type.String({ minLength: 1 }),
});

export const SaveChaseWifeEventSemanticReportSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 8 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
	roleSatisfied: Type.Boolean(),
	conflictShown: Type.Boolean(),
	roleEvidence: SemanticEvidenceAnchorSchema,
	conflictEvidence: SemanticEvidenceAnchorSchema,
	stateDeltasShown: Type.Array(
		Type.Object({
			dimension: Type.Union([
				Type.Literal("information"),
				Type.Literal("relationship"),
				Type.Literal("resource"),
				Type.Literal("risk"),
				Type.Literal("agency"),
			]),
			delta: Type.String({ minLength: 1 }),
			evidence: SemanticEvidenceAnchorSchema,
		}),
		{ minItems: 2 },
	),
	agencyActionEvidence: Type.Optional(SemanticEvidenceAnchorSchema),
	entryHookEvidence: SemanticEvidenceAnchorSchema,
	exitHookEvidence: SemanticEvidenceAnchorSchema,
	injuryMechanismEvidence: Type.Optional(SemanticEvidenceAnchorSchema),
});

const ChaseWifeHarmCategorySchema = Type.Union([
	Type.Literal("deprioritization"),
	Type.Literal("deception"),
	Type.Literal("gaslighting"),
	Type.Literal("public-humiliation"),
	Type.Literal("resource-exploitation"),
	Type.Literal("care-labor-exploitation"),
	Type.Literal("boundary-violation"),
	Type.Literal("future-betrayal"),
	Type.Literal("social-isolation"),
]);

const ChaseWifeHarmSeveritySchema = Type.Union([
	Type.Literal("minor"),
	Type.Literal("major"),
	Type.Literal("relationship-breaking"),
]);

const RelationshipHarmSchema = Type.Object({
	id: Type.String({ minLength: 1 }),
	category: ChaseWifeHarmCategorySchema,
	victimImpact: Type.Object({
		epistemic: Type.Optional(Type.String({ minLength: 1 })),
		emotional: Type.Optional(Type.String({ minLength: 1 })),
		material: Type.Optional(Type.String({ minLength: 1 })),
		social: Type.Optional(Type.String({ minLength: 1 })),
		bodily: Type.Optional(Type.String({ minLength: 1 })),
		future: Type.Optional(Type.String({ minLength: 1 })),
	}),
	maleBeliefAtTheTime: Type.String({ minLength: 1 }),
	heroineBeliefAtTheTime: Type.String({ minLength: 1 }),
	severity: ChaseWifeHarmSeveritySchema,
	recognizedByHeroine: Type.Boolean(),
	recognizedByMale: Type.Boolean(),
	repaired: Type.Boolean(),
	repairable: Type.Boolean(),
	evidence: Type.Optional(Type.Array(ChaseWifeLedgerEvidenceSchema, { minItems: 1 })),
	recognitionEvidence: Type.Optional(Type.Array(ChaseWifeLedgerEvidenceSchema, { minItems: 1 })),
});

const ChaseWifeRepairTypeSchema = Type.Union([
	Type.Literal("specific-apology"),
	Type.Literal("resource-restitution"),
	Type.Literal("public-correction"),
	Type.Literal("boundary-respect"),
	Type.Literal("behavior-change"),
	Type.Literal("costly-accountability"),
]);

const ChaseWifeRepairEffectivenessSchema = Type.Union([
	Type.Literal("coercive"),
	Type.Literal("self-serving"),
	Type.Literal("partial"),
	Type.Literal("credible"),
]);
const ChaseWifeHeroineResponseSchema = Type.Union([
	Type.Literal("accepted"),
	Type.Literal("acknowledged"),
	Type.Literal("rejected"),
	Type.Literal("unresolved"),
]);

const RepairAttemptSchema = Type.Object({
	id: Type.String({ minLength: 1 }),
	addressesHarmIds: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	type: ChaseWifeRepairTypeSchema,
	action: Type.String({ minLength: 1 }),
	costToMale: Type.String({ minLength: 1 }),
	benefitToHeroine: Type.String({ minLength: 1 }),
	requestedReward: Type.Union([Type.Boolean(), Type.String({ minLength: 1 })]),
	requestedRewardDescription: Type.Optional(Type.String({ minLength: 1 })),
	violatesBoundary: Type.Boolean(),
	acceptedByHeroine: Type.Boolean(),
	heroineResponse: Type.Optional(ChaseWifeHeroineResponseSchema),
	effectiveness: ChaseWifeRepairEffectivenessSchema,
	evidence: Type.Optional(Type.Array(ChaseWifeLedgerEvidenceSchema, { minItems: 1 })),
});

const ChaseWifeEndingModeSchema = Type.Union([
	Type.Literal("no-reunion"),
	Type.Literal("earned-reunion"),
	Type.Literal("open-ending"),
]);

const ChaseWifeEligibilityRuleSchema = Type.Union([
	Type.Object({
		id: Type.String({ minLength: 1 }),
		type: Type.Literal("repair-type-required"),
		repairType: ChaseWifeRepairTypeSchema,
		harmId: Type.Optional(Type.String({ minLength: 1 })),
	}),
	Type.Object({
		id: Type.String({ minLength: 1 }),
		type: Type.Literal("harm-recognized"),
		harmId: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		id: Type.String({ minLength: 1 }),
		type: Type.Literal("independent-future-required"),
	}),
	Type.Object({
		id: Type.String({ minLength: 1 }),
		type: Type.Literal("boundary-respected"),
		harmId: Type.Optional(Type.String({ minLength: 1 })),
	}),
]);

const ChaseWifeEndingContractSchema = Type.Object({
	mode: ChaseWifeEndingModeSchema,
	heroineIndependentFutureRequired: Type.Boolean(),
	maleRecognitionRequired: Type.Boolean(),
	restitutionRequired: Type.Boolean(),
	boundaryRespectRequired: Type.Boolean(),
	reunionEligibilityRules: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	eligibilityRules: Type.Optional(Type.Array(ChaseWifeEligibilityRuleSchema, { minItems: 1 })),
	openChoice: Type.Optional(Type.String({ minLength: 1 })),
	heroineIndependentFutureEvidence: Type.Optional(Type.Array(ChaseWifeLedgerEvidenceSchema, { minItems: 1 })),
});

export const SaveChaseWifeHarmLedgerSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	harms: Type.Array(RelationshipHarmSchema, { minItems: 1 }),
	confirmation: ConfirmationSchema,
});

export const SaveChaseWifeRepairLedgerSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	repairs: Type.Array(RepairAttemptSchema, { minItems: 1 }),
	confirmation: ConfirmationSchema,
});

export const SaveChaseWifeEndingContractSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	contract: ChaseWifeEndingContractSchema,
	confirmation: ConfirmationSchema,
});

export const CheckChaseWifeEndingEligibilitySchema = Type.Object({ projectId: ProjectIdSchema });
export const CheckChaseWifeHarmRepairProgressSchema = Type.Object({ projectId: ProjectIdSchema, chapter: Type.Optional(ChapterNumberSchema) });

export const ScoreChaseWifeChapterSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Optional(Type.Integer({ minimum: 1 })),
	mode: Type.Optional(ChaseWifePacingModeSchema),
});

export const FinalizeChapterSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	title: Type.String({ minLength: 1, maxLength: 200 }),
	content: Type.String({ minLength: 1 }),
	summary: ChapterSummarySchema,
	draftRevision: Type.Integer({ minimum: 1 }),
	confirmation: Type.Literal("USER_CONFIRMED"),
	overwrite: Type.Optional(Type.Boolean()),
});

export const FinalizeManuscriptSchema = Type.Object({
	projectId: ProjectIdSchema,
	confirmation: Type.Literal("USER_CONFIRMED"),
});

export type InitializeNovelParams = Static<typeof InitializeNovelSchema>;
export type RepairNovelProjectParams = Static<typeof RepairNovelProjectSchema>;
export type GetNovelStatusParams = Static<typeof GetNovelStatusSchema>;
export type ReadStoryContextParams = Static<typeof ReadStoryContextSchema>;
export type SaveStoryDocumentParams = Static<typeof SaveStoryDocumentSchema>;
export type SaveChapterPlanParams = Static<typeof SaveChapterPlanSchema>;
export type SaveSceneContractParams = Static<typeof SaveSceneContractSchema>;
export type SaveChapterDraftParams = Static<typeof SaveChapterDraftSchema>;
export type CheckContinuityParams = Static<typeof CheckContinuitySchema>;
export type SaveContinuityReportParams = Static<typeof SaveContinuityReportSchema>;
export type ExtractChapterFactsParams = Static<typeof ExtractChapterFactsSchema>;
export type SaveWorkflowCheckpointParams = Static<typeof SaveWorkflowCheckpointSchema>;
export type LoadWorkflowCheckpointParams = Static<typeof LoadWorkflowCheckpointSchema>;
export type SaveQualityReportParams = Static<typeof SaveQualityReportSchema>;
export type ReaderReport = Static<typeof ReaderReportSchema>;
export type ReviewReport = Static<typeof ReviewReportSchema>;
export type RecordWritingIssueParams = Static<typeof RecordWritingIssueSchema>;
export type Genre = Static<typeof GenreSchema>;
export type UpdateCharacterStateParams = Static<typeof UpdateCharacterStateSchema>;
export type UpdateClueLedgerParams = Static<typeof UpdateClueLedgerSchema>;
export type UpdateTimelineParams = Static<typeof UpdateTimelineSchema>;
export type SaveCanonDocumentParams = Static<typeof SaveCanonDocumentSchema>;
export type ScoreStoryFoundationParams = Static<typeof ScoreStoryFoundationSchema>;
export type ScoreChapterParams = Static<typeof ScoreChapterSchema>;
export type CreateVoiceFingerprintParams = Static<typeof CreateVoiceFingerprintSchema>;
export type CompareDraftVersionsParams = Static<typeof CompareDraftVersionsSchema>;
export type ExportManuscriptParams = Static<typeof ExportManuscriptSchema>;
export type CheckAiArtifactsParams = Static<typeof CheckAiArtifactsSchema>;
export type ChaseWifeBeat = Static<typeof ChaseWifeBeatSchema>;
export type SaveChaseWifeBeatSheetParams = Static<typeof SaveChaseWifeBeatSheetSchema>;
export type CheckChaseWifeArcParams = Static<typeof CheckChaseWifeArcSchema>;
export type ChaseWifeEvent = Static<typeof ChaseWifeEventSchema>;
export type ChaseWifeAgencyState = Static<typeof ChaseWifeAgencyStateSchema>;
export type SaveChaseWifeEventMapParams = Static<typeof SaveChaseWifeEventMapSchema>;
export type CheckChaseWifeEventMapParams = Static<typeof CheckChaseWifeEventMapSchema>;
export type ChaseWifePovMode = Static<typeof ChaseWifePovModeSchema>;
export type ChaseWifeEventPov = Static<typeof ChaseWifeEventPovSchema>;
export type SaveChaseWifeEventDraftParams = Static<typeof SaveChaseWifeEventDraftSchema>;
export type CheckChaseWifeEventDraftParams = Static<typeof CheckChaseWifeEventDraftSchema>;
export type AssembleChaseWifeChapterParams = Static<typeof AssembleChaseWifeChapterSchema>;
export type CheckChaseWifePacingParams = Static<typeof CheckChaseWifePacingSchema>;
export type CheckChaseWifeChapterPacingParams = Static<typeof CheckChaseWifeChapterPacingSchema>;
export type CheckChaseWifeStoryPacingParams = Static<typeof CheckChaseWifeStoryPacingSchema>;
export type CheckChaseWifeEventSemanticsParams = Static<typeof CheckChaseWifeEventSemanticsSchema>;
export type SaveChaseWifeEventSemanticReportParams = Static<typeof SaveChaseWifeEventSemanticReportSchema>;
export type SemanticEvidenceAnchor = Static<typeof SemanticEvidenceAnchorSchema>;
export type SaveChaseWifeHarmLedgerParams = Static<typeof SaveChaseWifeHarmLedgerSchema>;
export type SaveChaseWifeRepairLedgerParams = Static<typeof SaveChaseWifeRepairLedgerSchema>;
export type SaveChaseWifeEndingContractParams = Static<typeof SaveChaseWifeEndingContractSchema>;
export type CheckChaseWifeEndingEligibilityParams = Static<typeof CheckChaseWifeEndingEligibilitySchema>;
export type CheckChaseWifeHarmRepairProgressParams = Static<typeof CheckChaseWifeHarmRepairProgressSchema>;
export type ChaseWifeLedgerEvidence = Static<typeof ChaseWifeLedgerEvidenceSchema>;
export type ScoreChaseWifeChapterParams = Static<typeof ScoreChaseWifeChapterSchema>;
export type FinalizeChapterParams = Static<typeof FinalizeChapterSchema>;
export type FinalizeManuscriptParams = Static<typeof FinalizeManuscriptSchema>;
export type ContextSection = Static<typeof ContextSectionSchema>;
export type DocumentType = Static<typeof DocumentTypeSchema>;
export type ContentFormat = Static<typeof ContentFormatSchema>;
export type ChapterSummary = Static<typeof ChapterSummarySchema>;
export type SceneContract = Static<typeof SceneContractSchema>;
export type ContinuityIssueRecord = Static<typeof ContinuityIssueSchema>;
