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
	examples: ["suspense", "urban-romance", "light-fantasy", "chase-wife", "追妻文", "female-social-suspense", "女性社会派悬疑"],
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

export const RelationshipMechanismSchema = Type.Union([
	Type.Literal("chase-wife"),
	Type.Literal("mature-marriage-crisis"),
	Type.String({ minLength: 1, maxLength: 80 }),
]);

export const StoryProfileSchema = Type.Object({
	primaryGenre: Type.String({ minLength: 1, maxLength: 80 }),
	relationshipMechanisms: Type.Array(RelationshipMechanismSchema, { maxItems: 8 }),
	professionalDomain: Type.Optional(Type.String({ minLength: 1, maxLength: 120 })),
	themes: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 80 }), { maxItems: 12 })),
	storyForm: Type.Optional(Type.String({ minLength: 1, maxLength: 40 })),
	audience: Type.Optional(Type.String({ minLength: 1, maxLength: 40 })),
	setting: Type.Optional(Type.String({ minLength: 1, maxLength: 60 })),
});

const ConfirmationSchema = Type.Optional(Type.Literal("USER_CONFIRMED"));
const UpdateStatusSchema = Type.Union([Type.Literal("proposed"), Type.Literal("confirmed")]);

export const InitializeNovelSchema = Type.Object({
	projectId: ProjectIdSchema,
	title: Type.String({ minLength: 1, maxLength: 200 }),
	genre: GenreSchema,
	storyProfile: Type.Optional(StoryProfileSchema),
	targetWordCount: Type.Optional(Type.Integer({ minimum: 1000 })),
});

// ==== Mystery Engine（female-social-suspense）====

export const MysteryTruthCategorySchema = Type.Union([
	Type.Literal("identity"),
	Type.Literal("event"),
	Type.Literal("timeline"),
	Type.Literal("motive"),
	Type.Literal("method"),
	Type.Literal("access"),
	Type.Literal("concealment"),
	Type.Literal("institutional"),
	Type.Literal("relationship"),
	Type.Literal("other"),
]);

const MysteryClaimIdSchema = Type.String({ minLength: 1, maxLength: 80 });

export const TruthProofPathSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	clueIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	prerequisiteClaimIds: Type.Array(MysteryClaimIdSchema),
});

export const TruthClaimSchema = Type.Object({
	id: MysteryClaimIdSchema,
	statement: Type.String({ minLength: 1 }),
	category: MysteryTruthCategorySchema,
	dependsOnClaimIds: Type.Array(MysteryClaimIdSchema),
	proofRequirement: Type.String({ minLength: 1 }),
	// legacy 字段：证明的权威来源是 proofPaths；supportingClueIds 仅用于兼容 Round 2 旧 artifact，save/checker 归一化为单条 proof path。
	supportingClueIds: Type.Optional(Type.Array(Type.String({ minLength: 1, maxLength: 80 }))),
	// 权威证明路径：Claim 的证明 = 多条路径 OR；单条路径内 = clue AND 前置 claim。
	proofPaths: Type.Optional(Type.Array(TruthProofPathSchema, { maxItems: 8 })),
	plannedRevealChapter: Type.Optional(Type.Integer({ minimum: 1 })),
	importance: Type.Integer({ minimum: 1, maximum: 5 }),
});

export const MysterySocialCoreSchema = Type.Object({
	socialQuestion: Type.String({ minLength: 1 }),
	institutionalContext: Type.String({ minLength: 1 }),
	powerAsymmetry: Type.String({ minLength: 1 }),
	beneficiaries: Type.Array(Type.String({ minLength: 1 })),
	costBearers: Type.Array(Type.String({ minLength: 1 })),
	stakesBeyondRelationship: Type.Array(Type.String({ minLength: 1 })),
});

export const MysteryCaseSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	centralQuestion: Type.String({ minLength: 1 }),
	truthSummary: Type.String({ minLength: 1 }),
	truthClaims: Type.Array(TruthClaimSchema, { minItems: 1 }),
	finalAnswerClaimIds: Type.Array(MysteryClaimIdSchema, { minItems: 1 }),
	socialCore: MysterySocialCoreSchema,
});

export const MysteryClueSourceTypeSchema = Type.Union([
	Type.Literal("document"),
	Type.Literal("physical"),
	Type.Literal("digital"),
	Type.Literal("testimony"),
	Type.Literal("behavior"),
	Type.Literal("financial"),
	Type.Literal("medical"),
	Type.Literal("timeline"),
	Type.Literal("institutional-record"),
	Type.Literal("professional-observation"),
	Type.Literal("other"),
]);

export const MysteryClueRoleSchema = Type.Union([
	Type.Literal("fair"),
	Type.Literal("corroborating"),
	Type.Literal("ambiguous"),
	Type.Literal("red-herring"),
	Type.Literal("payoff"),
	Type.Literal("exculpatory"),
]);

export const MysteryReliabilitySchema = Type.Union([
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
]);

export const MysteryClueSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	observableFact: Type.String({ minLength: 1 }),
	sourceType: MysteryClueSourceTypeSchema,
	sourceDescription: Type.String({ minLength: 1 }),
	// world availability：证据在故事世界里最早可能被取得。
	firstAvailableChapter: Type.Integer({ minimum: 1 }),
	// legacy 字段：intendedDiscoveryChapter 保持可读；heroineDiscoveryChapter 是权威发现章。
	intendedDiscoveryChapter: Type.Optional(Type.Integer({ minimum: 1 })),
	heroineDiscoveryChapter: Type.Optional(Type.Integer({ minimum: 1 })),
	// reader exposure：读者第一次真正看到这条 observable fact 的章节；缺失时回退到 heroine 可见章（heroine-first-person 默认，文档化）。
	readerRevealChapter: Type.Optional(Type.Integer({ minimum: 1 })),
	truthClaimIds: Type.Array(MysteryClaimIdSchema),
	reliability: MysteryReliabilitySchema,
	// interpretationOptions 只对 red-herring 强制（checker 校验）；普通线索允许为空。
	interpretationOptions: Type.Array(Type.String({ minLength: 1 }), { maxItems: 8 }),
	// red-herring 指定的误导解释；不得与 actualImplication 相同（RED_HERRING_INTERPRETATION_EQUALS_ACTUAL）。
	misleadingInterpretation: Type.Optional(Type.String({ minLength: 1 })),
	actualImplication: Type.String({ minLength: 1 }),
	clueRole: MysteryClueRoleSchema,
	// plannedRealizationChapter：计划线索落地正文的章（计划语义，不代表正文已兑现）。
	// 真正的正文兑现必须使用 MysteryClueRealizationEvidence（Phase 5 Unified Narrative Event Integration），本轮不伪造。
	plannedRealizationChapter: Type.Optional(Type.Integer({ minimum: 1 })),
});

// Phase 5 契约：正文兑现证据（与 Chase Wife 正文锚点生命周期同思想）。本轮只定义类型，不实现 finalized fairness。
export const MysteryClueRealizationEvidenceSchema = Type.Object({
	chapter: Type.Integer({ minimum: 1 }),
	eventId: Type.Optional(Type.Integer({ minimum: 1 })),
	draftRevision: Type.Integer({ minimum: 1 }),
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
	excerpt: Type.String({ minLength: 1 }),
	contentHash: Type.String({ minLength: 1 }),
});

export const MysterySuspectActualRoleSchema = Type.Union([
	Type.Literal("culprit"),
	Type.Literal("accomplice"),
	Type.Literal("beneficiary"),
	Type.Literal("witness"),
	Type.Literal("concealer"),
	Type.Literal("red-herring"),
	Type.Literal("innocent"),
	Type.Literal("unknown"),
]);

export const MysterySuspectSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	characterId: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
	publicRole: Type.String({ minLength: 1 }),
	relationshipToCase: Type.String({ minLength: 1 }),
	motive: Type.Optional(Type.String({ minLength: 1 })),
	means: Type.Optional(Type.String({ minLength: 1 })),
	opportunity: Type.Optional(Type.String({ minLength: 1 })),
	access: Type.Optional(Type.String({ minLength: 1 })),
	publicStory: Type.String({ minLength: 1 }),
	privateSecret: Type.Optional(Type.String({ minLength: 1 })),
	actualRole: MysterySuspectActualRoleSchema,
	knowledgeClaimIds: Type.Array(MysteryClaimIdSchema),
	supportingClueIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	exculpatoryClueIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

export const MysteryKnowledgeStateSchema = Type.Object({
	knowsClaimIds: Type.Array(MysteryClaimIdSchema),
	suspectsClaimIds: Type.Array(MysteryClaimIdSchema),
	believesClaimIds: Type.Array(MysteryClaimIdSchema),
});

export const MysteryCharacterKnowledgeSchema = Type.Object({
	characterId: Type.String({ minLength: 1, maxLength: 80 }),
	knowsClaimIds: Type.Array(MysteryClaimIdSchema),
	suspectsClaimIds: Type.Array(MysteryClaimIdSchema),
	believesClaimIds: Type.Array(MysteryClaimIdSchema),
});

export const MysteryInformationCheckpointSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	afterChapter: Type.Integer({ minimum: 1 }),
	heroine: MysteryKnowledgeStateSchema,
	reader: MysteryKnowledgeStateSchema,
	characterKnowledge: Type.Array(MysteryCharacterKnowledgeSchema),
	newlyAvailableClueIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

export const SaveMysteryCaseSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	case: MysteryCaseSchema,
	confirmation: ConfirmationSchema,
});

export const SaveMysteryClueLedgerSchema = Type.Object({
	projectId: ProjectIdSchema,
	clues: Type.Array(MysteryClueSchema, { minItems: 1 }),
});

export const SaveMysterySuspectModelSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	suspects: Type.Array(MysterySuspectSchema, { minItems: 1 }),
	confirmation: ConfirmationSchema,
});

export const SaveMysteryInformationStateSchema = Type.Object({
	projectId: ProjectIdSchema,
	checkpoints: Type.Array(MysteryInformationCheckpointSchema, { minItems: 1 }),
});

export const CheckMysteryDesignSchema = Type.Object({ projectId: ProjectIdSchema });
export const CheckMysteryFairnessSchema = Type.Object({ projectId: ProjectIdSchema });
// ==== Mature Marriage Crisis（structural relationship mechanism）====

export const MarriageActorSchema = Type.Union([
	Type.Literal("protagonist"),
	Type.Literal("spouse"),
	Type.Literal("shared"),
	Type.Literal("third-party"),
	Type.Literal("external"),
	Type.Literal("unknown"),
]);

export const MarriageEconomicItemKindSchema = Type.Union([
	Type.Literal("housing"),
	Type.Literal("asset"),
	Type.Literal("debt"),
	Type.Literal("income-stream"),
	Type.Literal("recurring-expense"),
	Type.Literal("business-interest"),
	Type.Literal("family-transfer"),
	Type.Literal("benefit"),
	Type.Literal("other"),
]);

export const MarriageAccessSchema = Type.Union([
	Type.Literal("full"),
	Type.Literal("limited"),
	Type.Literal("none"),
	Type.Literal("unknown"),
]);

export const MarriageEconomicItemSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	kind: MarriageEconomicItemKindSchema,
	description: Type.String({ minLength: 1 }),
	control: MarriageActorSchema,
	protagonistAccess: MarriageAccessSchema,
	spouseAccess: MarriageAccessSchema,
	liquidity: Type.Optional(Type.Union([Type.Literal("liquid"), Type.Literal("illiquid"), Type.Literal("not-applicable"), Type.Literal("unknown")])),
	exitConsequence: Type.String({ minLength: 1 }),
	ongoingBurden: Type.Optional(Type.String({ minLength: 1 })),
	// legalOrOwnershipNarrative 只是作者提供的故事事实，不是系统法律推断。
	legalOrOwnershipNarrative: Type.Optional(Type.String({ minLength: 1 })),
	relatedResponsibilityIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

export const MarriageResponsibilityDomainSchema = Type.Union([
	Type.Literal("domestic"),
	Type.Literal("childcare"),
	Type.Literal("eldercare"),
	Type.Literal("financial"),
	Type.Literal("health-care"),
	Type.Literal("family-administration"),
	Type.Literal("career-support"),
	Type.Literal("social-maintenance"),
	Type.Literal("emotional-labor"),
	Type.Literal("other"),
]);

export const MarriageFrequencySchema = Type.Union([
	Type.Literal("daily"),
	Type.Literal("weekly"),
	Type.Literal("recurring"),
	Type.Literal("episodic"),
	Type.Literal("crisis-only"),
]);

export const MarriageSubstitutabilitySchema = Type.Union([
	Type.Literal("easy"),
	Type.Literal("difficult"),
	Type.Literal("none"),
	Type.Literal("unknown"),
]);

export const MarriageResponsibilitySchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	domain: MarriageResponsibilityDomainSchema,
	description: Type.String({ minLength: 1 }),
	beneficiaryDescription: Type.String({ minLength: 1 }),
	expectedAllocation: Type.Optional(MarriageActorSchema),
	actualPrimaryBearer: Type.Optional(MarriageActorSchema),
	backupBearer: Type.Optional(MarriageActorSchema),
	frequency: Type.Optional(MarriageFrequencySchema),
	substitutability: MarriageSubstitutabilitySchema,
	failureConsequence: Type.String({ minLength: 1 }),
	recognizedByBoth: Type.Union([Type.Boolean(), Type.Literal("unknown")]),
	relatedEconomicItemIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

export const MarriageDecisionRightDomainSchema = Type.Union([
	Type.Literal("housing"),
	Type.Literal("finance"),
	Type.Literal("career"),
	Type.Literal("childcare"),
	Type.Literal("eldercare"),
	Type.Literal("family-contact"),
	Type.Literal("health"),
	Type.Literal("relocation"),
	Type.Literal("social"),
	Type.Literal("business"),
	Type.Literal("other"),
]);

export const MarriageDecisionRightSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	domain: MarriageDecisionRightDomainSchema,
	decisionDescription: Type.String({ minLength: 1 }),
	formalExpectation: Type.String({ minLength: 1 }),
	practicalController: MarriageActorSchema,
	vetoHolder: Type.Optional(MarriageActorSchema),
	affectedResponsibilityIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	affectedEconomicItemIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	consequenceOfDisagreement: Type.String({ minLength: 1 }),
});

export const MarriageSocialTieKindSchema = Type.Union([
	Type.Literal("family"),
	Type.Literal("friend"),
	Type.Literal("colleague"),
	Type.Literal("business"),
	Type.Literal("client"),
	Type.Literal("community"),
	Type.Literal("school-parent-network"),
	Type.Literal("neighborhood"),
	Type.Literal("other"),
]);

export const MarriageSocialTieSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	kind: MarriageSocialTieKindSchema,
	description: Type.String({ minLength: 1 }),
	connection: MarriageActorSchema,
	dependenceOrLeverage: Type.String({ minLength: 1 }),
	informationExposure: Type.String({ minLength: 1 }),
	exitConsequence: Type.String({ minLength: 1 }),
});

export const MarriageInertiaCategorySchema = Type.Union([
	Type.Literal("shared-history"),
	Type.Literal("routine"),
	Type.Literal("identity"),
	Type.Literal("sunk-cost"),
	Type.Literal("family-expectation"),
	Type.Literal("economic-dependence"),
	Type.Literal("care-dependence"),
	Type.Literal("social-image"),
	Type.Literal("parenting-stability"),
	Type.Literal("career-entanglement"),
	Type.Literal("hope"),
	Type.Literal("other"),
]);

export const MarriageInertiaFactorSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	category: MarriageInertiaCategorySchema,
	description: Type.String({ minLength: 1 }),
	sourceRefIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	keepsRelationshipBecause: Type.String({ minLength: 1 }),
	breakingCondition: Type.Optional(Type.String({ minLength: 1 })),
});

export const MarriageExitConstraintCategorySchema = Type.Union([
	Type.Literal("economic"),
	Type.Literal("housing"),
	Type.Literal("debt"),
	Type.Literal("childcare"),
	Type.Literal("eldercare"),
	Type.Literal("care"),
	Type.Literal("family"),
	Type.Literal("career"),
	Type.Literal("social"),
	Type.Literal("reputation"),
	Type.Literal("health"),
	Type.Literal("safety"),
	Type.Literal("procedural"),
	Type.Literal("other"),
]);

export const MarriageSeveritySchema = Type.Union([
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
	Type.Literal("critical"),
]);

export const MarriageTimeHorizonSchema = Type.Union([
	Type.Literal("immediate"),
	Type.Literal("short-term"),
	Type.Literal("long-term"),
]);

export const MarriageReducibilitySchema = Type.Union([
	Type.Literal("removable"),
	Type.Literal("reducible"),
	Type.Literal("fixed"),
	Type.Literal("unknown"),
]);

export const MarriageExitConstraintSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	category: MarriageExitConstraintCategorySchema,
	description: Type.String({ minLength: 1 }),
	sourceRefIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	externalSourceDescription: Type.Optional(Type.String({ minLength: 1 })),
	affectedParties: Type.Array(Type.String({ minLength: 1 })),
	severity: MarriageSeveritySchema,
	timeHorizon: MarriageTimeHorizonSchema,
	reducibility: MarriageReducibilitySchema,
	mitigationOptions: Type.Array(Type.String({ minLength: 1 })),
	unresolvedConsequence: Type.String({ minLength: 1 }),
});

export const MatureMarriageStructureSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	protagonistCharacterId: Type.String({ minLength: 1, maxLength: 80 }),
	spouseCharacterId: Type.String({ minLength: 1, maxLength: 80 }),
	relationshipContext: Type.Optional(Type.String({ minLength: 1 })),
	economicItems: Type.Array(MarriageEconomicItemSchema),
	responsibilities: Type.Array(MarriageResponsibilitySchema),
	decisionRights: Type.Array(MarriageDecisionRightSchema),
	socialTies: Type.Array(MarriageSocialTieSchema),
	inertiaFactors: Type.Array(MarriageInertiaFactorSchema),
	exitConstraints: Type.Array(MarriageExitConstraintSchema),
});

export const MarriageRestructuringModeSchema = Type.Union([
	Type.Literal("remain-with-renegotiation"),
	Type.Literal("trial-separation"),
	Type.Literal("separate-households"),
	Type.Literal("divorce-intent"),
	Type.Literal("independent-exit"),
	Type.Literal("unresolved"),
]);

export const MarriageChangeFeasibilitySchema = Type.Union([
	Type.Literal("ready"),
	Type.Literal("difficult"),
	Type.Literal("blocked"),
	Type.Literal("unresolved"),
]);

export const MarriageResourceChangeSchema = Type.Object({
	economicItemId: Type.String({ minLength: 1, maxLength: 80 }),
	beforeAccess: Type.Optional(MarriageAccessSchema),
	afterAccess: Type.Optional(MarriageAccessSchema),
	action: Type.String({ minLength: 1 }),
	remainingRisk: Type.String({ minLength: 1 }),
});

export const MarriageResponsibilityChangeSchema = Type.Object({
	responsibilityId: Type.String({ minLength: 1, maxLength: 80 }),
	beforeBearer: Type.Optional(MarriageActorSchema),
	afterBearer: Type.Optional(MarriageActorSchema),
	transitionAction: Type.String({ minLength: 1 }),
	feasibility: MarriageChangeFeasibilitySchema,
	remainingConsequence: Type.String({ minLength: 1 }),
});

export const MarriageDecisionRightChangeSchema = Type.Object({
	decisionRightId: Type.String({ minLength: 1, maxLength: 80 }),
	beforeController: Type.Optional(MarriageActorSchema),
	afterController: Type.Optional(MarriageActorSchema),
	action: Type.String({ minLength: 1 }),
	remainingConflict: Type.String({ minLength: 1 }),
});

export const MarriageSocialTieChangeSchema = Type.Object({
	socialTieId: Type.String({ minLength: 1, maxLength: 80 }),
	plannedChange: Type.String({ minLength: 1 }),
	informationRisk: Type.String({ minLength: 1 }),
	relationshipCost: Type.String({ minLength: 1 }),
	remainingDependency: Type.String({ minLength: 1 }),
});

export const MarriageConstraintResponseSchema = Type.Object({
	constraintId: Type.String({ minLength: 1, maxLength: 80 }),
	strategy: Type.String({ minLength: 1 }),
	status: Type.Union([Type.Literal("addressed"), Type.Literal("mitigated"), Type.Literal("accepted"), Type.Literal("unresolved")]),
	remainingConsequence: Type.String({ minLength: 1 }),
});

export const MatureMarriageRestructuringPlanSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	mode: MarriageRestructuringModeSchema,
	protagonistGoal: Type.String({ minLength: 1 }),
	resourceChanges: Type.Array(MarriageResourceChangeSchema),
	responsibilityChanges: Type.Array(MarriageResponsibilityChangeSchema),
	decisionRightChanges: Type.Array(MarriageDecisionRightChangeSchema),
	socialTieChanges: Type.Array(MarriageSocialTieChangeSchema),
	constraintResponses: Type.Array(MarriageConstraintResponseSchema),
	nonNegotiableBoundaries: Type.Array(Type.String({ minLength: 1 })),
	unresolvedDependencies: Type.Array(Type.String({ minLength: 1 })),
});

export const SaveMatureMarriageStructureSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	structure: MatureMarriageStructureSchema,
	confirmation: ConfirmationSchema,
});

export const SaveMatureMarriageRestructuringSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	plan: MatureMarriageRestructuringPlanSchema,
	confirmation: ConfirmationSchema,
});

export const CheckMatureMarriageStructureSchema = Type.Object({ projectId: ProjectIdSchema });
export const CheckMatureMarriageRestructuringSchema = Type.Object({ projectId: ProjectIdSchema });

// ==== Professional Domain Engine（Story DNA 第三种正交能力）====

export const ProfessionalDomainSchema = Type.String({ minLength: 1, maxLength: 120, examples: ["insurance-fraud-investigation", "保险欺诈调查"] });

export const ProfessionalAuthorityCategorySchema = Type.Union([
	Type.Literal("inspect-internal-record"),
	Type.Literal("request-record"),
	Type.Literal("interview"),
	Type.Literal("site-visit"),
	Type.Literal("data-query"),
	Type.Literal("make-risk-assessment"),
	Type.Literal("recommend-decision"),
	Type.Literal("approve-decision"),
	Type.Literal("share-information"),
	Type.Literal("escalate"),
	Type.Literal("external-referral"),
	Type.Literal("other"),
]);

export const ProfessionalAuthorityLevelSchema = Type.Union([
	Type.Literal("direct"),
	Type.Literal("conditional"),
	Type.Literal("approval-required"),
	Type.Literal("not-authorized"),
]);

export const ProfessionalAuthorityBoundarySchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	category: ProfessionalAuthorityCategorySchema,
	scopeDescription: Type.String({ minLength: 1 }),
	authorityLevel: ProfessionalAuthorityLevelSchema,
	conditions: Type.Array(Type.String({ minLength: 1 })),
	approvalRole: Type.Optional(Type.String({ minLength: 1 })),
	escalationPathIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	violationConsequence: Type.String({ minLength: 1 }),
});

export const ProfessionalWorkflowStageSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	name: Type.String({ minLength: 1 }),
	objective: Type.String({ minLength: 1 }),
	isEntry: Type.Boolean(),
	entryConditions: Type.Array(Type.String({ minLength: 1 })),
	allowedAuthorityIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	requiredInputs: Type.Array(Type.String({ minLength: 1 })),
	possibleNextStageIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	terminal: Type.Boolean(),
	reviewOrApprovalRequired: Type.Optional(Type.Boolean()),
	notes: Type.Optional(Type.String({ minLength: 1 })),
});

export const ProfessionalEvidenceSourceCategorySchema = Type.Union([
	Type.Literal("internal-claim-file"),
	Type.Literal("underwriting-record"),
	Type.Literal("policy-record"),
	Type.Literal("internal-system-log"),
	Type.Literal("medical-record"),
	Type.Literal("financial-record"),
	Type.Literal("digital-record"),
	Type.Literal("physical-inspection"),
	Type.Literal("interview"),
	Type.Literal("public-record"),
	Type.Literal("industry-platform"),
	Type.Literal("third-party-service"),
	Type.Literal("regulator-or-law-enforcement-return"),
	Type.Literal("other"),
]);

export const ProfessionalEvidenceAccessModeSchema = Type.Union([
	Type.Literal("direct-role-access"),
	Type.Literal("internal-approval"),
	Type.Literal("consent-based"),
	Type.Literal("contractual-request"),
	Type.Literal("collaboration-request"),
	Type.Literal("public"),
	Type.Literal("regulator-or-law-enforcement-only"),
	Type.Literal("unavailable"),
]);

export const ProfessionalPrivacySensitivitySchema = Type.Union([
	Type.Literal("ordinary"),
	Type.Literal("sensitive"),
	Type.Literal("highly-sensitive"),
	Type.Literal("unknown"),
]);

export const ProfessionalEvidenceSourceSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	category: ProfessionalEvidenceSourceCategorySchema,
	description: Type.String({ minLength: 1 }),
	holder: Type.String({ minLength: 1 }),
	accessMode: ProfessionalEvidenceAccessModeSchema,
	requiredAuthorityIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	privacyOrSensitivity: ProfessionalPrivacySensitivitySchema,
	verificationLimitations: Type.Array(Type.String({ minLength: 1 })),
	chainOrProvenanceNote: Type.String({ minLength: 1 }),
});

export const ProfessionalGuardrailCategorySchema = Type.Union([
	Type.Literal("authority"),
	Type.Literal("privacy"),
	Type.Literal("data-security"),
	Type.Literal("evidence-integrity"),
	Type.Literal("consumer-protection"),
	Type.Literal("timeliness"),
	Type.Literal("conflict-of-interest"),
	Type.Literal("approval"),
	Type.Literal("collaboration"),
	Type.Literal("other"),
]);

export const ProfessionalGuardrailSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	category: ProfessionalGuardrailCategorySchema,
	description: Type.String({ minLength: 1 }),
	appliesToStageIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	requiredAuthorityIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	violationConsequence: Type.String({ minLength: 1 }),
	sourceBasis: Type.Optional(Type.String({ minLength: 1 })),
});

export const ProfessionalEscalationPathSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	trigger: Type.String({ minLength: 1 }),
	fromRoleOrFunction: Type.String({ minLength: 1 }),
	toRoleOrOrganization: Type.String({ minLength: 1 }),
	purpose: Type.String({ minLength: 1 }),
	requiredInformation: Type.Array(Type.String({ minLength: 1 })),
	possibleOutcomes: Type.Array(Type.String({ minLength: 1 })),
	limitations: Type.Array(Type.String({ minLength: 1 })),
});

export const ProfessionalRoleSchema = Type.Object({
	title: Type.String({ minLength: 1 }),
	departmentOrFunction: Type.String({ minLength: 1 }),
	organizationType: Type.String({ minLength: 1 }),
	coreResponsibilities: Type.Array(Type.String({ minLength: 1 })),
	reportsTo: Type.String({ minLength: 1 }),
	decisionScope: Type.String({ minLength: 1 }),
	cannotDecide: Type.Array(Type.String({ minLength: 1 })),
	collaboratesWith: Type.Array(Type.String({ minLength: 1 })),
	professionalRisk: Type.String({ minLength: 1 }),
});

export const ProfessionalDomainModelSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	domain: ProfessionalDomainSchema,
	protagonistRole: ProfessionalRoleSchema,
	organizationContext: Type.String({ minLength: 1 }),
	authorityBoundaries: Type.Array(ProfessionalAuthorityBoundarySchema),
	workflowStages: Type.Array(ProfessionalWorkflowStageSchema, { minItems: 1 }),
	evidenceSources: Type.Array(ProfessionalEvidenceSourceSchema),
	guardrails: Type.Array(ProfessionalGuardrailSchema),
	escalationPaths: Type.Array(ProfessionalEscalationPathSchema),
});

export const ProfessionalAuthoritySatisfactionSchema = Type.Object({
	authorityId: Type.String({ minLength: 1, maxLength: 80 }),
	status: Type.Union([Type.Literal("condition-satisfied"), Type.Literal("approval-obtained")]),
	basis: Type.String({ minLength: 1 }),
	approvedByRole: Type.Optional(Type.String({ minLength: 1 })),
});

export const ProfessionalActionSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	stageId: Type.String({ minLength: 1, maxLength: 80 }),
	description: Type.String({ minLength: 1 }),
	purpose: Type.String({ minLength: 1 }),
	authorityIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	// conditional 权限需要 condition-satisfied；approval-required 需要 approval-obtained（approvedByRole 与 approvalRole 一致）。
	authoritySatisfactions: Type.Array(ProfessionalAuthoritySatisfactionSchema),
	evidenceSourceIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	guardrailIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	expectedInformationGain: Type.String({ minLength: 1 }),
	decisionOrWorkflowEffect: Type.String({ minLength: 1 }),
	ifBlocked: Type.String({ minLength: 1 }),
	escalationPathId: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
	professionalRisk: Type.String({ minLength: 1 }),
});

export const ProfessionalConflictSourceSchema = Type.Union([
	Type.Literal("spouse"),
	Type.Literal("family"),
	Type.Literal("financial"),
	Type.Literal("organizational"),
	Type.Literal("prior-relationship"),
	Type.Literal("personal-interest"),
	Type.Literal("other"),
]);

export const ProfessionalConflictSeveritySchema = Type.Union([
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
	Type.Literal("critical"),
]);

export const ProfessionalConflictMitigationSchema = Type.Union([
	Type.Literal("disclose"),
	Type.Literal("second-review"),
	Type.Literal("recusal"),
	Type.Literal("reassignment"),
	Type.Literal("information-firewall"),
	Type.Literal("supervisor-approval"),
	Type.Literal("unresolved"),
]);

export const ProfessionalConflictOfInterestSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	description: Type.String({ minLength: 1 }),
	source: ProfessionalConflictSourceSchema,
	affectedActionIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	affectedStageIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	severity: ProfessionalConflictSeveritySchema,
	disclosureRequired: Type.Boolean(),
	mitigation: ProfessionalConflictMitigationSchema,
	mitigationDescription: Type.String({ minLength: 1 }),
	remainingRisk: Type.String({ minLength: 1 }),
});

export const ProfessionalConsequenceCategorySchema = Type.Union([
	Type.Literal("case-integrity"),
	Type.Literal("career"),
	Type.Literal("employment"),
	Type.Literal("compliance"),
	Type.Literal("consumer-impact"),
	Type.Literal("financial"),
	Type.Literal("organizational"),
	Type.Literal("relationship-pressure"),
	Type.Literal("other"),
]);

export const ProfessionalConsequenceSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	triggerRefIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	category: ProfessionalConsequenceCategorySchema,
	description: Type.String({ minLength: 1 }),
	reversibility: Type.Union([Type.Literal("reversible"), Type.Literal("difficult"), Type.Literal("irreversible"), Type.Literal("unknown")]),
	affectedParties: Type.Array(Type.String({ minLength: 1 })),
});

export const ProfessionalCaseEscalationSchema = Type.Object({
	escalationPathId: Type.String({ minLength: 1, maxLength: 80 }),
	purpose: Type.String({ minLength: 1 }),
});

// 中间层：EvidenceSource（可取得信息的渠道）→ Action（职业动作）→ Observation（实际发现的事实）→ 可选 MysteryClue（经 realizesClueId 显式关联，不自动复制）。
export const ProfessionalObservationSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	actionId: Type.String({ minLength: 1, maxLength: 80 }),
	evidenceSourceId: Type.String({ minLength: 1, maxLength: 80 }),
	observableFact: Type.String({ minLength: 1 }),
	limitations: Type.Array(Type.String({ minLength: 1 })),
	discoveredByCharacterId: Type.String({ minLength: 1, maxLength: 80 }),
	reliability: MysteryReliabilitySchema,
	intendedChapter: Type.Integer({ minimum: 1 }),
	mysteryClueId: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
});

export const ProfessionalCasePlanSchema = Type.Object({
	id: Type.String({ minLength: 1, maxLength: 80 }),
	domain: ProfessionalDomainSchema,
	mandate: Type.String({ minLength: 1 }),
	startingStageId: Type.String({ minLength: 1, maxLength: 80 }),
	actions: Type.Array(ProfessionalActionSchema, { minItems: 1 }),
	conflictsOfInterest: Type.Array(ProfessionalConflictOfInterestSchema),
	escalations: Type.Array(ProfessionalCaseEscalationSchema),
	professionalConsequences: Type.Array(ProfessionalConsequenceSchema),
	observations: Type.Array(ProfessionalObservationSchema),
	unresolvedQuestions: Type.Array(Type.String({ minLength: 1 })),
});

export const SaveProfessionalDomainModelSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	model: ProfessionalDomainModelSchema,
	confirmation: ConfirmationSchema,
});

export const SaveProfessionalCasePlanSchema = Type.Object({
	projectId: ProjectIdSchema,
	status: UpdateStatusSchema,
	plan: ProfessionalCasePlanSchema,
	confirmation: ConfirmationSchema,
});

export const CheckProfessionalDomainSchema = Type.Object({ projectId: ProjectIdSchema });
export const CheckProfessionalCaseSchema = Type.Object({ projectId: ProjectIdSchema });

// ==== Unified Narrative Event Layer ====

export const UnifiedEventPovSchema = Type.Union([
	Type.Literal("heroine-first-person"),
	Type.Literal("male-limited-third-person"),
	Type.Literal("third-person"),
]);

export const UnifiedEventChronologySchema = Type.Union([
	Type.Literal("present"),
	Type.Literal("flashback"),
	Type.Literal("flashforward-preview"),
]);

export const UnifiedMysteryDeltaSchema = Type.Object({
	discoveredClueIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	readerRevealedClueIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	claimKnowledgeChanges: Type.Array(Type.Object({
		claimId: Type.String({ minLength: 1, maxLength: 80 }),
		audience: Type.Union([Type.Literal("reader"), Type.Literal("heroine")]),
		knowledge: Type.Union([Type.Literal("knows"), Type.Literal("suspects"), Type.Literal("believes")]),
	})),
	suspectChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	interpretationChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	proofProgressClaimIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	revealClaimIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

export const UnifiedMarriageDeltaSchema = Type.Object({
	economicItemChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	responsibilityChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	decisionRightChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	socialTieChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	inertiaChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	exitConstraintChanges: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	restructuringProgress: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

const UnifiedAgencyStateSchema = Type.Object({
	epistemic: Type.Integer({ minimum: 0, maximum: 4 }),
	relational: Type.Integer({ minimum: 0, maximum: 4 }),
	material: Type.Integer({ minimum: 0, maximum: 4 }),
	social: Type.Integer({ minimum: 0, maximum: 4 }),
	future: Type.Integer({ minimum: 0, maximum: 4 }),
});

const UnifiedHeroinePhaseSchema = Type.Union([
	Type.Literal("injury"), Type.Literal("recognition"), Type.Literal("micro-withdrawal"), Type.Literal("boundary-test"),
	Type.Literal("irreversible-exit"), Type.Literal("self-rebuild"), Type.Literal("final-boundary"),
]);

const UnifiedMalePhaseSchema = Type.Union([
	Type.Literal("entitlement"), Type.Literal("loss-of-control"), Type.Literal("wrong-pursuit"),
	Type.Literal("real-consequence"), Type.Literal("recognition"), Type.Literal("respect-or-failure"),
]);

export const UnifiedChaseWifeDeltaSchema = Type.Object({
	informationDelta: Type.Array(Type.String({ minLength: 1 })),
	relationshipDelta: Type.Array(Type.String({ minLength: 1 })),
	resourceDelta: Type.Array(Type.String({ minLength: 1 })),
	riskDelta: Type.Array(Type.String({ minLength: 1 })),
	heroineAgencyBefore: Type.Integer({ minimum: 0, maximum: 100 }),
	heroineAgencyAfter: Type.Integer({ minimum: 0, maximum: 100 }),
	heroineAgencyStateBefore: Type.Optional(UnifiedAgencyStateSchema),
	heroineAgencyStateAfter: Type.Optional(UnifiedAgencyStateSchema),
	harmRefs: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	repairRefs: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	heroinePhase: Type.Optional(UnifiedHeroinePhaseSchema),
	malePhase: Type.Optional(UnifiedMalePhaseSchema),
	paywallHook: Type.Boolean(),
	// Chase Wife 收敛：Chase Wife 事件语义直接声明在统一事件 delta 内，
	// 投影适配器据此生成 ChaseWifeEvent 供既有 validators 使用（chase-wife 不再维护第二份事件事实）。
	role: Type.Optional(Type.Union([
		Type.Literal("opening-injury"), Type.Literal("evidence"), Type.Literal("preference-exposure"), Type.Literal("gaslighting"),
		Type.Literal("micro-withdrawal"), Type.Literal("boundary-test"), Type.Literal("decision"), Type.Literal("irreversible-exit"),
		Type.Literal("pursuit-control"), Type.Literal("pursuit-failure"), Type.Literal("real-consequence"), Type.Literal("recognition"),
		Type.Literal("repair-attempt"), Type.Literal("credible-repair"), Type.Literal("boundary-respect"), Type.Literal("self-rebuild"),
		Type.Literal("final-boundary"), Type.Literal("closure"),
	])),
	beatRefs: Type.Optional(Type.Array(Type.Integer({ minimum: 1, maximum: 24 }))),
	targetTrack: Type.Optional(Type.Union([Type.Literal("heroine"), Type.Literal("male"), Type.Literal("shared")])),
	lengthMode: Type.Optional(Type.Union([Type.Literal("flash"), Type.Literal("bridge"), Type.Literal("standard"), Type.Literal("anchor")])),
	minChars: Type.Optional(Type.Integer({ minimum: 1 })),
	maxChars: Type.Optional(Type.Integer({ minimum: 1 })),
	injuryMechanism: Type.Optional(Type.Union([Type.Literal("neglect"), Type.Literal("substitution"), Type.Literal("coercion"), Type.Literal("gaslighting"), Type.Literal("resource-transfer"), Type.Literal("public-humiliation"), Type.Literal("betrayal-evidence")])),
	scene: Type.Optional(Type.Integer({ minimum: 1, maximum: 8 })),
	setback: Type.Optional(Type.Object({ dimension: Type.Union([Type.Literal("epistemic"), Type.Literal("relational"), Type.Literal("material"), Type.Literal("social"), Type.Literal("future")]), reason: Type.String({ minLength: 1 }), recoveryBeatRef: Type.Integer({ minimum: 1, maximum: 24 }) })),
});


export const UnifiedProfessionalDeltaSchema = Type.Object({
	actionIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	evidenceSourceIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	workflowFromStageId: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
	workflowToStageId: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
	conflictIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	escalationPathIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	consequenceIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
	observationIds: Type.Array(Type.String({ minLength: 1, maxLength: 80 })),
});

export const UnifiedCharacterDeltaSchema = Type.Object({
	characterId: Type.String({ minLength: 1, maxLength: 80 }),
	dimension: Type.Union([
		Type.Literal("agency"),
		Type.Literal("knowledge"),
		Type.Literal("relationship"),
		Type.Literal("resource"),
		Type.Literal("risk"),
		Type.Literal("health"),
		Type.Literal("reputation"),
	]),
	from: Type.String({ minLength: 1 }),
	to: Type.String({ minLength: 1 }),
});

export const UnifiedEventSchema = Type.Object({
	eventId: Type.Integer({ minimum: 1, maximum: 64 }),
	chapter: ChapterNumberSchema,
	scene: Type.Optional(Type.String({ minLength: 1, maxLength: 80 })),
	chronology: UnifiedEventChronologySchema,
	pov: UnifiedEventPovSchema,
	storyGoal: Type.String({ minLength: 1 }),
	conflict: Type.String({ minLength: 1 }),
	action: Type.String({ minLength: 1 }),
	consequence: Type.String({ minLength: 1 }),
	mysteryDelta: Type.Optional(UnifiedMysteryDeltaSchema),
	marriageDelta: Type.Optional(UnifiedMarriageDeltaSchema),
	chaseWifeDelta: Type.Optional(UnifiedChaseWifeDeltaSchema),
	professionalDelta: Type.Optional(UnifiedProfessionalDeltaSchema),
	characterDeltas: Type.Array(UnifiedCharacterDeltaSchema),
	resourceDeltas: Type.Array(Type.Object({ itemRef: Type.String({ minLength: 1 }), change: Type.String({ minLength: 1 }) })),
	riskDeltas: Type.Array(Type.Object({ label: Type.String({ minLength: 1 }), change: Type.String({ minLength: 1 }) })),
	causes: Type.Array(Type.Integer({ minimum: 1, maximum: 64 })),
	irreversible: Type.Boolean(),
	cannotRemoveBecause: Type.String({ minLength: 1 }),
});

export const UnifiedEventMapSchema = Type.Object({
	projectId: ProjectIdSchema,
	events: Type.Array(UnifiedEventSchema, { minItems: 1 }),
});

export const SaveUnifiedEventMapSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	events: Type.Array(UnifiedEventSchema, { minItems: 1 }),
});

export const CheckUnifiedEventMapSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
});

export const SaveUnifiedEventDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 64 }),
	content: Type.String({ minLength: 1 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const CheckUnifiedEventDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 64 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const SaveUnifiedEventSemanticReportSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 64 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
	actionShown: Type.Boolean(),
	consequenceShown: Type.Boolean(),
	deltaEvidence: Type.Array(Type.Object({
		dimension: Type.String({ minLength: 1, maxLength: 40 }),
		evidence: Type.Object({
			startChar: Type.Integer({ minimum: 0 }),
			endChar: Type.Integer({ minimum: 1 }),
			excerpt: Type.String({ minLength: 1 }),
		}),
	}), { minItems: 1 }),
	notes: Type.Optional(Type.String({ minLength: 1 })),
});

export const AssembleUnifiedChapterSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});




// ==== Narrative Realization（planned ≠ realized：计划项必须在最终正文中有散文锚点证据）====

export const NarrativeRealizationContentTypeSchema = Type.Union([
	Type.Literal("unified-event"),
	Type.Literal("mystery-clue"),
	Type.Literal("mystery-reveal"),
	Type.Literal("marriage-transition"),
	Type.Literal("professional-observation"),
]);

export const NarrativeRealizationRecordSchema = Type.Object({
	recordId: Type.String({ minLength: 1, maxLength: 80 }),
	contentType: NarrativeRealizationContentTypeSchema,
	engineRef: Type.String({ minLength: 1, maxLength: 80 }),
	// SemanticEvidenceAnchorSchema 声明在文件后部；此处内联以避免使用前声明错误。
	anchor: Type.Object({
		startChar: Type.Integer({ minimum: 0 }),
		endChar: Type.Integer({ minimum: 1 }),
		excerpt: Type.String({ minLength: 1 }),
	}),
});

export const SaveNarrativeRealizationSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	draftRevision: Type.Integer({ minimum: 1 }),
	records: Type.Array(NarrativeRealizationRecordSchema, { minItems: 1 }),
});

export const CheckNarrativeRealizationSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
});


// ==== Story Distinctiveness（模型评审 + 确定性碰撞统计交叉验证；不伪造分数）====

export const StoryDistinctivenessVerdictSchema = Type.Union([
	Type.Literal("distinctive"),
	Type.Literal("needs-work"),
	Type.Literal("generic-risk"),
]);

export const StoryDistinctivenessProfileSchema = Type.Object({
	verdict: StoryDistinctivenessVerdictSchema,
	premises: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
	engineBlendEvidence: Type.Array(Type.String({ minLength: 1 })),
	risks: Type.Array(Type.Object({
		risk: Type.String({ minLength: 1 }),
		evidence: Type.String({ minLength: 1 }),
	})),
	strongestMoves: Type.Array(Type.Object({
		move: Type.String({ minLength: 1 }),
		evidence: Type.String({ minLength: 1 }),
	}), { minItems: 1 }),
	notes: Type.Optional(Type.String({ minLength: 1 })),
});

export const SaveStoryDistinctivenessSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
	profile: StoryDistinctivenessProfileSchema,
});

export const CheckStoryDistinctivenessSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: Type.Optional(ChapterNumberSchema),
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
	Type.Literal("repair-attempt"),
	Type.Literal("credible-repair"),
	Type.Literal("boundary-respect"),
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
	Type.Literal("deception"),
	Type.Literal("boundary-violation"),
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
const ChaseWifeArtifactScopeSchema = Type.Union([Type.Literal("planned"), Type.Literal("assembled"), Type.Literal("finalized")]);
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
	heroineArc: Type.Array(ChaseWifeHeroineArcPhaseSchema, { minItems: 5, maxItems: 7 }),
	maleArc: Type.Array(ChaseWifeMaleArcPhaseSchema, { minItems: 5, maxItems: 6 }),
	openingIntro: Type.String({ minLength: 1 }),
	openingConflict: Type.String({ minLength: 1 }),
	stayingLogic: ChaseWifeStayingLogicSchema,
	beats: Type.Array(ChaseWifeBeatSchema, { minItems: 12, maxItems: 24 }),
});

export const CheckChaseWifeArcSchema = Type.Object({ projectId: ProjectIdSchema, scope: Type.Optional(ChaseWifeArtifactScopeSchema) });

export const ChaseWifeEventSchema = Type.Object({
	eventId: Type.Integer({ minimum: 1, maximum: 6 }),
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
	openingIntro: Type.Optional(Type.String({ minLength: 1 })),
	openingConflict: Type.String({ minLength: 1 }),
	openingConflictMarker: Type.Optional(Type.String({ minLength: 2, maxLength: 80 })),
	causalExitMarker: Type.Optional(Type.String({ minLength: 2, maxLength: 100 })),
	events: Type.Array(ChaseWifeEventSchema, { minItems: 3, maxItems: 6 }),
});

export const CheckChaseWifeEventMapSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
});

export const SaveChaseWifeEventDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 6 }),
	content: Type.String({ minLength: 1 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

export const CheckChaseWifeEventDraftSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 6 }),
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
	eventId: Type.Integer({ minimum: 1, maximum: 6 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
});

const SemanticEvidenceAnchorSchema = Type.Object({
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
	excerpt: Type.String({ minLength: 1 }),
});

const ChaseWifeLedgerEvidenceSchema = Type.Object({
	chapter: ChapterNumberSchema,
	eventId: Type.Optional(Type.Integer({ minimum: 1, maximum: 6 })),
	draftRevision: Type.Optional(Type.Integer({ minimum: 1 })),
	startChar: Type.Integer({ minimum: 0 }),
	endChar: Type.Integer({ minimum: 1 }),
	excerpt: Type.String({ minLength: 1 }),
	contentHash: Type.String({ minLength: 1 }),
});

export const SaveChaseWifeEventSemanticReportSchema = Type.Object({
	projectId: ProjectIdSchema,
	chapter: ChapterNumberSchema,
	eventId: Type.Integer({ minimum: 1, maximum: 6 }),
	revision: Type.Optional(Type.Integer({ minimum: 1 })),
	roleSatisfied: Type.Boolean(),
	conflictShown: Type.Boolean(),
	roleEvidence: SemanticEvidenceAnchorSchema,
	conflictEvidence: SemanticEvidenceAnchorSchema,
	stateDeltasShown: Type.Array(
		Type.Object({
			deltaId: Type.String({ minLength: 1 }),
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
	requestedReward: Type.Boolean(),
	requestedRewardDescription: Type.Optional(Type.String({ minLength: 1 })),
	violatesBoundary: Type.Boolean(),
	heroineResponse: ChaseWifeHeroineResponseSchema,
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
export type StoryProfileParams = Static<typeof StoryProfileSchema>;
export type TruthClaim = Static<typeof TruthClaimSchema>;
export type TruthProofPath = Static<typeof TruthProofPathSchema>;
export type MysteryClueRealizationEvidence = Static<typeof MysteryClueRealizationEvidenceSchema>;
export type MysteryCase = Static<typeof MysteryCaseSchema>;
export type MysterySocialCore = Static<typeof MysterySocialCoreSchema>;
export type MysteryClue = Static<typeof MysteryClueSchema>;
export type MysterySuspect = Static<typeof MysterySuspectSchema>;
export type MysteryKnowledgeState = Static<typeof MysteryKnowledgeStateSchema>;
export type MysteryInformationCheckpoint = Static<typeof MysteryInformationCheckpointSchema>;
export type SaveMysteryCaseParams = Static<typeof SaveMysteryCaseSchema>;
export type SaveMysteryClueLedgerParams = Static<typeof SaveMysteryClueLedgerSchema>;
export type SaveMysterySuspectModelParams = Static<typeof SaveMysterySuspectModelSchema>;
export type SaveMysteryInformationStateParams = Static<typeof SaveMysteryInformationStateSchema>;
export type CheckMysteryDesignParams = Static<typeof CheckMysteryDesignSchema>;
export type CheckMysteryFairnessParams = Static<typeof CheckMysteryFairnessSchema>;
export type MarriageEconomicItem = Static<typeof MarriageEconomicItemSchema>;
export type MarriageResponsibility = Static<typeof MarriageResponsibilitySchema>;
export type MarriageDecisionRight = Static<typeof MarriageDecisionRightSchema>;
export type MarriageSocialTie = Static<typeof MarriageSocialTieSchema>;
export type MarriageInertiaFactor = Static<typeof MarriageInertiaFactorSchema>;
export type MarriageExitConstraint = Static<typeof MarriageExitConstraintSchema>;
export type MatureMarriageStructure = Static<typeof MatureMarriageStructureSchema>;
export type MatureMarriageRestructuringPlan = Static<typeof MatureMarriageRestructuringPlanSchema>;
export type MarriageConstraintResponse = Static<typeof MarriageConstraintResponseSchema>;
export type SaveMatureMarriageStructureParams = Static<typeof SaveMatureMarriageStructureSchema>;
export type SaveMatureMarriageRestructuringParams = Static<typeof SaveMatureMarriageRestructuringSchema>;
export type CheckMatureMarriageStructureParams = Static<typeof CheckMatureMarriageStructureSchema>;
export type CheckMatureMarriageRestructuringParams = Static<typeof CheckMatureMarriageRestructuringSchema>;
export type ProfessionalDomainModel = Static<typeof ProfessionalDomainModelSchema>;
export type ProfessionalRole = Static<typeof ProfessionalRoleSchema>;
export type ProfessionalAuthorityBoundary = Static<typeof ProfessionalAuthorityBoundarySchema>;
export type ProfessionalWorkflowStage = Static<typeof ProfessionalWorkflowStageSchema>;
export type ProfessionalEvidenceSource = Static<typeof ProfessionalEvidenceSourceSchema>;
export type ProfessionalGuardrail = Static<typeof ProfessionalGuardrailSchema>;
export type ProfessionalEscalationPath = Static<typeof ProfessionalEscalationPathSchema>;
export type ProfessionalCasePlan = Static<typeof ProfessionalCasePlanSchema>;
export type ProfessionalAction = Static<typeof ProfessionalActionSchema>;
export type ProfessionalConflictOfInterest = Static<typeof ProfessionalConflictOfInterestSchema>;
export type ProfessionalConsequence = Static<typeof ProfessionalConsequenceSchema>;
export type SaveProfessionalDomainModelParams = Static<typeof SaveProfessionalDomainModelSchema>;
export type SaveProfessionalCasePlanParams = Static<typeof SaveProfessionalCasePlanSchema>;
export type CheckProfessionalDomainParams = Static<typeof CheckProfessionalDomainSchema>;
export type CheckProfessionalCaseParams = Static<typeof CheckProfessionalCaseSchema>;
export type ProfessionalObservation = Static<typeof ProfessionalObservationSchema>;
export type UnifiedEvent = Static<typeof UnifiedEventSchema>;
export type UnifiedEventMap = Static<typeof UnifiedEventMapSchema>;
export type UnifiedMysteryDelta = Static<typeof UnifiedMysteryDeltaSchema>;
export type UnifiedMarriageDelta = Static<typeof UnifiedMarriageDeltaSchema>;
export type UnifiedChaseWifeDelta = Static<typeof UnifiedChaseWifeDeltaSchema>;
export type UnifiedProfessionalDelta = Static<typeof UnifiedProfessionalDeltaSchema>;
export type SaveUnifiedEventMapParams = Static<typeof SaveUnifiedEventMapSchema>;
export type CheckUnifiedEventMapParams = Static<typeof CheckUnifiedEventMapSchema>;
export type SaveUnifiedEventDraftParams = Static<typeof SaveUnifiedEventDraftSchema>;
export type CheckUnifiedEventDraftParams = Static<typeof CheckUnifiedEventDraftSchema>;
export type SaveUnifiedEventSemanticReportParams = Static<typeof SaveUnifiedEventSemanticReportSchema>;
export type AssembleUnifiedChapterParams = Static<typeof AssembleUnifiedChapterSchema>;
export type NarrativeRealizationRecord = Static<typeof NarrativeRealizationRecordSchema>;
export type SaveNarrativeRealizationParams = Static<typeof SaveNarrativeRealizationSchema>;
export type CheckNarrativeRealizationParams = Static<typeof CheckNarrativeRealizationSchema>;
export type StoryDistinctivenessProfile = Static<typeof StoryDistinctivenessProfileSchema>;
export type SaveStoryDistinctivenessParams = Static<typeof SaveStoryDistinctivenessSchema>;
export type CheckStoryDistinctivenessParams = Static<typeof CheckStoryDistinctivenessSchema>;
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
export type ChaseWifeArtifactScope = Static<typeof ChaseWifeArtifactScopeSchema>;
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
