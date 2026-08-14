import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
	CheckContinuityParams,
	CheckAiArtifactsParams,
	CheckChaseWifeArcParams,
	CheckChaseWifeEventDraftParams,
	CheckChaseWifeEventSemanticsParams,
	CheckChaseWifeHarmRepairProgressParams,
	CheckMatureMarriageRestructuringParams,
	CheckMatureMarriageStructureParams,
	CheckMysteryDesignParams,
	CheckMysteryFairnessParams,
	SaveMatureMarriageRestructuringParams,
	SaveMatureMarriageStructureParams,
	MatureMarriageStructure,
	MatureMarriageRestructuringPlan,
	AssembleUnifiedChapterParams,
	CheckProfessionalCaseParams,
	CheckProfessionalDomainParams,
	CheckUnifiedEventMapParams,
	CheckUnifiedEventDraftParams,
	UnifiedEventMap,
	SaveUnifiedEventDraftParams,
	SaveUnifiedEventMapParams,
	SaveUnifiedEventSemanticReportParams,
	ProfessionalCasePlan,
	ProfessionalDomainModel,
	SaveProfessionalCasePlanParams,
	SaveProfessionalDomainModelParams,
	SaveMysteryCaseParams,
	SaveMysteryClueLedgerParams,
	SaveMysteryInformationStateParams,
	SaveMysterySuspectModelParams,
	MysteryCase,
	MysteryClue,
	MysteryInformationCheckpoint,
	MysterySuspect,
	SaveChaseWifeEventSemanticReportParams,
	SaveChaseWifeHarmLedgerParams,
	SaveChaseWifeRepairLedgerParams,
	SaveChaseWifeEndingContractParams,
	CheckChaseWifeEndingEligibilityParams,
	CheckChaseWifeEventMapParams,
	CheckChaseWifeChapterPacingParams,
	CheckChaseWifePacingParams,
	CheckChaseWifeStoryPacingParams,
	ChaseWifeEventPov,
	ChaseWifeBeat,
	ChaseWifeEvent,
	ChaseWifeArtifactScope,
	ChaseWifeAgencyState,
	ChaseWifeLedgerEvidence,
	ChaseWifePovMode,
	AssembleChaseWifeChapterParams,
	CompareDraftVersionsParams,
	ContentFormat,
	CreateVoiceFingerprintParams,
	DocumentType,
	ExtractChapterFactsParams,
	FinalizeChapterParams,
	FinalizeManuscriptParams,
	GetNovelStatusParams,
	InitializeNovelParams,
	LoadWorkflowCheckpointParams,
	RepairNovelProjectParams,
	ReadStoryContextParams,
	RecordWritingIssueParams,
	ScoreChapterParams,
	ScoreStoryFoundationParams,
	SaveChapterDraftParams,
	SaveChapterPlanParams,
	SaveCanonDocumentParams,
	SaveContinuityReportParams,
	SaveChaseWifeBeatSheetParams,
	SaveChaseWifeEventDraftParams,
	SaveChaseWifeEventMapParams,
	SaveQualityReportParams,
	ReaderReport,
	ReviewReport,
	SaveSceneContractParams,
	SaveStoryDocumentParams,
	SaveWorkflowCheckpointParams,
	UpdateCharacterStateParams,
	UpdateClueLedgerParams,
	UpdateTimelineParams,
	ExportManuscriptParams,
	ScoreChaseWifeChapterParams,
	SemanticEvidenceAnchor,
	NarrativeRealizationRecord,
	SaveNarrativeRealizationParams,
	CheckNarrativeRealizationParams,
	StoryDistinctivenessProfile,
	SaveStoryDistinctivenessParams,
	CheckStoryDistinctivenessParams,
	UnifiedChaseWifeDelta,
	FemaleSocialSuspenseDesign,
	SaveSocialSuspenseDesignParams,
	CheckSocialSuspenseDesignParams,
	HeroineContradictionProfile,
	SaveCharacterContradictionProfileParams,
	CheckCharacterComplexityParams,
	CheckVerticalStoryQualityParams,
} from "../schemas.ts";
import { hasChaseWifeCapability, hasMatureMarriageCapability, hasPrimaryGenre, hasProfessionalDomain, normalizePrimaryGenre, normalizeProfessionalDomain, normalizeRelationshipMechanism } from "./story-profile.ts";
import { checkMysteryDesign, checkMysteryFairness, isMysteryPrivatePath, type MysteryIssue } from "./mystery-checker.ts";
import { checkMatureMarriageRestructuring, checkMatureMarriageStructure, isMarriagePrivatePath, type MarriageIssue } from "./marriage-checker.ts";
import { checkProfessionalCase, checkProfessionalDomain, isProfessionalPrivatePath, type ProfessionalIssue } from "./professional-checker.ts";
import { checkUnifiedEventMap, collisionStats, isUnifiedPrivatePath, type UnifiedCapabilities, type UnifiedIssue, type UnifiedReferenceSets } from "./unified-event-checker.ts";
import { checkNarrativeRealizations, collectPlannedRealizations, type PlannedRealization, type RealizationIssue } from "./realization-checker.ts";
import { checkStoryDistinctiveness, distinctivenessStats, type DistinctivenessIssue } from "./distinctiveness-checker.ts";
import { checkRealizedFairness, type RealizedFairnessIssue } from "./realized-fairness-checker.ts";
import { checkCharacterComplexity, checkSocialSuspenseDesign, checkVerticalQualityReview, type VerticalIssue } from "./vertical-checker.ts";

const PROJECT_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DOCUMENT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const DEFAULT_CONTEXT_CHARS = 50_000;
const MANAGED_DOCUMENT_TYPES = new Set<DocumentType>([
	"story-bible",
	"style-guide",
	"world",
	"character",
	"outline",
	"timeline",
	"chapter-plan",
	"scene-contract",
	"chapter-draft",
	"summary",
	"continuity",
]);
const CHASE_WIFE_HEROINE_ARC = [
	"injury",
	"recognition",
	"micro-withdrawal",
	"boundary-test",
	"irreversible-exit",
	"self-rebuild",
	"final-boundary",
] as const;
const CHASE_WIFE_MALE_ARC = [
	"entitlement",
	"loss-of-control",
	"wrong-pursuit",
	"real-consequence",
	"recognition",
	"respect-or-failure",
] as const;
const CHASE_WIFE_HEROINE_ARC_ORDER = new Map<string, number>(CHASE_WIFE_HEROINE_ARC.map((phase, index) => [phase, index]));
const CHASE_WIFE_MALE_ARC_ORDER = new Map<string, number>(CHASE_WIFE_MALE_ARC.map((phase, index) => [phase, index]));
const CHASE_WIFE_EVENT_ROLES = new Set([
	"opening-injury",
	"evidence",
	"preference-exposure",
	"gaslighting",
	"micro-withdrawal",
	"boundary-test",
	"decision",
	"irreversible-exit",
	"pursuit-control",
	"pursuit-failure",
	"real-consequence",
	"recognition",
	"repair-attempt",
	"credible-repair",
	"boundary-respect",
	"self-rebuild",
	"final-boundary",
	"closure",
]);
const CHASE_WIFE_INJURY_MECHANISMS = new Set([
	"neglect",
	"substitution",
	"coercion",
	"gaslighting",
	"resource-transfer",
	"public-humiliation",
	"betrayal-evidence",
]);
const CHASE_WIFE_LENGTH_LIMITS: Record<ChaseWifeEvent["lengthMode"], { min: number; max: number }> = {
	flash: { min: 60, max: 180 },
	bridge: { min: 100, max: 250 },
	standard: { min: 220, max: 450 },
	anchor: { min: 450, max: 850 },
};
const CHASE_WIFE_INTRO_MIN_CHARS = 60;
const CHASE_WIFE_INTRO_MAX_CHARS = 140;
const CHASE_WIFE_INTRO_HEADING = "# 引言";
const CHASE_WIFE_CHAPTER_ONE_HEADING = "# 第一章";

function isValidChaseWifeOpeningRole(openingMode: string, role: ChaseWifeEvent["role"]): boolean {
	if (openingMode === "result-first") return role === "decision" || role === "irreversible-exit";
	if (openingMode === "exit-in-progress") return role === "irreversible-exit";
	if (openingMode === "cold-conflict") return role === "opening-injury" || role === "preference-exposure";
	return role === "opening-injury";
}

function isFormalChaseWifeExit(event: ChaseWifeEvent): boolean {
	return event.role === "irreversible-exit" && event.chronology !== "flashforward-preview";
}

function validateChaseWifeOpeningIntro(value: unknown, conflictMarker?: string): string | undefined {
	if (!isNonEmptyString(value)) return "Chase-wife projects require a short opening intro before chapter 1.";
	const characterCount = countChineseCharacters(value);
	if (characterCount < CHASE_WIFE_INTRO_MIN_CHARS || characterCount > CHASE_WIFE_INTRO_MAX_CHARS) {
		return `The chase-wife opening intro must contain ${CHASE_WIFE_INTRO_MIN_CHARS}-${CHASE_WIFE_INTRO_MAX_CHARS} non-whitespace characters.`;
	}
	if (/\p{Script=Han}/u.test(value) && !/(?:我|我的|我把|我看见|我看見|I\b|I'm\b|me\b)/iu.test(value)) {
		return "The chase-wife opening intro must use the heroine's first-person voice.";
	}
	if (isNonEmptyString(conflictMarker) && /\p{Script=Han}/u.test(value) && !normalizedCharacterText(value).includes(normalizedCharacterText(conflictMarker))) {
		return "The opening conflict marker must appear inside the short hook intro.";
	}
	if (value.includes(CHASE_WIFE_INTRO_HEADING) || value.includes(CHASE_WIFE_CHAPTER_ONE_HEADING)) {
		return "The opening intro must contain hook prose only; the assembly tool adds the 引言 and 第一章 headings.";
	}
	return undefined;
}

function chaseWifeChapterOnePrefix(intro: string): string {
	return [CHASE_WIFE_INTRO_HEADING, intro.trim(), CHASE_WIFE_CHAPTER_ONE_HEADING].join("\n\n");
}

function chaseWifeArcReportPath(scope: ChaseWifeArtifactScope): string {
	return `continuity/reports/chase-wife-arc-${scope}.json`;
}

type JsonRecord = Record<string, unknown>;
type ChaseWifeEventReference = { chapter: number; eventId: number; startChar?: number; endChar?: number };
type AiArtifactFindingRecord = { code: string; count: number; severity: "warning" | "error"; hardFail: boolean };

export interface NovelProjectInfo {
	projectId: string;
	path: string;
	title: string;
	genre: string;
	createdAt: string;
	updatedAt: string;
	files: string[];
}

export interface NovelProjectStatus {
	projectId: string;
	status: string;
	nextChapter: number;
	lastFinalizedChapter?: number;
	finalizedChapters: number[];
	missingFiles: string[];
	updatedAt: string;
}

export interface StoryContextResult {
	projectId: string;
	chapter?: number;
	task?: string;
	files: string[];
	includedFiles: string[];
	excludedFiles: string[];
	reasoningSummary: { included: string[]; excluded: string[] };
	truncated: boolean;
	text: string;
}

export interface ContinuityIssue {
	severity: "error" | "warning";
	code: string;
	message: string;
	path?: string;
}

export interface ContinuityReport {
	projectId: string;
	chapter?: number;
	draftRevision?: number;
	generatedAt: string;
	status: "ok" | "warning" | "error";
	issues: ContinuityIssue[];
	checkedFiles: string[];
}

export interface SavedDocumentResult {
	projectId: string;
	documentType: DocumentType;
	path: string;
	bytes: number;
}

export interface SavedChapterDraftResult extends SavedDocumentResult {
	chapter: number;
	revision: number;
}

export interface FinalizedChapterResult {
	projectId: string;
	chapter: number;
	chapterPath: string;
	summaryPath: string;
	timelinePath: string;
	projectPath: string;
	transactionId: string;
}

export interface WorkflowCheckpoint {
	projectId: string;
	phase: string;
	chapter?: number;
	currentTask: string;
	completedSteps: string[];
	pendingSteps: string[];
	activeDraft?: string;
	lastUpdatedAt: string;
}

interface TransactionTarget {
	target: string;
	temporary: string;
}

interface TransactionLog {
	transactionId: string;
	operation: "finalize-chapter";
	projectId: string;
	chapter: number;
	status: "pending" | "ready" | "committed" | "failed";
	createdAt: string;
	targets: TransactionTarget[];
}

interface ChaseWifePacingIssueRecord {
	code: string;
	severity: "error" | "warning";
	deduction: number;
	message: string;
}

function sha256(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function hashJson(value: unknown): string {
	return sha256(JSON.stringify(value) ?? "undefined");
}

function hashStableReport(value: unknown): string {
	if (!isJsonRecord(value)) return hashJson(value);
	const { generatedAt: _generatedAt, reportRevision: _reportRevision, ...stableValue } = value;
	return hashJson(stableValue);
}

function defaultTargetWordCount(genre: string): number {
	return {
		"chase-wife": 10_000,
		"female-social-suspense": 12_000,
		"suspense": 12_000,
		"urban-romance": 10_000,
		"light-fantasy": 15_000,
	}[genre] ?? 10_000;
}

function containsActionEvidence(content: string): boolean {
	return /(?:我|他|她)?(?:转身|走|离开|拿|删|签|拒绝|推开|关上|拉黑|搬|取消|取出|拨|回|问|看|听|放下|收起|冲出|答应|拒绝)/u.test(content) || /\b(?:I|he|she|delete|leave|sign|turn|close)\b/iu.test(content);
}

function containsChineseActionEvidence(content: string): boolean {
	return /(?:我|他|她)[^。！？!?]{0,80}(?:转身|走开|离开|删除|签下|关闭|拉黑|取消|取出|放下|拒绝|收回|冲出|答应)/u.test(content);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted) throw new Error("Novel operation aborted");
}

function isFileNotFound(error: unknown): boolean {
	return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isJsonRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function padChapter(chapter: number): string {
	return String(chapter).padStart(3, "0");
}

function chapterName(chapter: number): string {
	return `chapter-${padChapter(chapter)}`;
}

function normalizeText(content: string): string {
	return content.endsWith("\n") ? content : `${content}\n`;
}

function normalizeJson(content: string, path: string): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		throw new Error(`Invalid JSON for ${path}: ${error instanceof Error ? error.message : String(error)}`);
	}
	return `${JSON.stringify(parsed, null, 2)}\n`;
}

function getDocumentExtension(format: ContentFormat): string {
	return format === "json" ? ".json" : ".md";
}

function getDocumentDirectory(documentType: DocumentType): string | undefined {
	switch (documentType) {
		case "world":
			return "world";
		case "character":
			return "characters";
		case "outline":
			return "outline";
		case "timeline":
			return "timeline";
		case "chapter-plan":
			return "work/chapter-plans";
		case "chapter-draft":
			return "work/drafts";
		case "scene-contract":
			return "work/scene-contracts";
		case "summary":
			return "summaries";
		case "continuity":
			return "continuity";
		case "reference-note":
			return "work/references";
		case "research":
			return "work/research";
		case "brainstorm":
			return "work/brainstorm";
		case "author-note":
			return "work/author-notes";
		case "analysis":
			return "work/analysis";
		case "story-bible":
		case "style-guide":
			return undefined;
	}
}

function assertProjectId(projectId: string): void {
	if (!PROJECT_ID_RE.test(projectId)) {
		throw new Error(`Invalid projectId "${projectId}". Use lowercase letters, numbers, and hyphens.`);
	}
}

function assertDocumentName(name: string): void {
	if (!DOCUMENT_NAME_RE.test(name) || name === "." || name === "..") {
		throw new Error(`Invalid document name "${name}".`);
	}
}

function isPositiveInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function requireConfirmation(status: "proposed" | "confirmed", confirmation: "USER_CONFIRMED" | undefined): void {
	if (status === "confirmed" && confirmation !== "USER_CONFIRMED") throw new Error("Confirmed canon updates require confirmation=USER_CONFIRMED.");
}

function countChineseCharacters(content: string): number {
	return [...content.replace(/\s+/gu, "")].length;
}

function countTextUnits(content: string): number {
	const chineseCharacters = content.match(/[\p{Script=Han}]/gu)?.length ?? 0;
	const latinWords = content.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/gu)?.length ?? 0;
	return chineseCharacters + latinWords;
}

function countWords(content: string): number {
	return countTextUnits(content);
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function normalizedCharacterText(content: string): string {
	return [...content.replace(/\s+/gu, "")].join("");
}

function isSemanticEvidenceAnchor(value: unknown): value is SemanticEvidenceAnchor {
	return isJsonRecord(value)
		&& typeof value.startChar === "number"
		&& Number.isInteger(value.startChar)
		&& value.startChar >= 0
		&& typeof value.endChar === "number"
		&& Number.isInteger(value.endChar)
		&& value.endChar > value.startChar
		&& isNonEmptyString(value.excerpt);
}

function isChaseWifeLedgerEvidence(value: unknown): value is ChaseWifeLedgerEvidence {
	return isJsonRecord(value)
		&& isPositiveInteger(value.chapter)
		&& (value.eventId === undefined || (isPositiveInteger(value.eventId) && value.eventId <= 6))
		&& (value.draftRevision === undefined || isPositiveInteger(value.draftRevision))
		&& typeof value.startChar === "number"
		&& Number.isInteger(value.startChar)
		&& value.startChar >= 0
		&& typeof value.endChar === "number"
		&& Number.isInteger(value.endChar)
		&& value.endChar > value.startChar
		&& isNonEmptyString(value.excerpt)
		&& isNonEmptyString(value.contentHash);
}

function isChaseWifeStayingLogic(value: unknown): boolean {
	return isJsonRecord(value)
		&& isNonEmptyString(value.emotionalReason)
		&& isNonEmptyString(value.falseBelief)
		&& Array.isArray(value.sustainingEvidence)
		&& value.sustainingEvidence.length > 0
		&& value.sustainingEvidence.every((item) => isNonEmptyString(item))
		&& isNonEmptyString(value.breakingThreshold)
		&& ["materialReason", "socialReason", "familyReason", "careerReason"].every((field) => value[field] === undefined || isNonEmptyString(value[field]));
}

function repairHasNoRequestedReward(repair: JsonRecord): boolean {
	return repair.requestedReward === false;
}

function heroineAcceptedRepair(repair: JsonRecord): boolean {
	return repair.heroineResponse === "accepted";
}

function normalizeChaseWifeRepair(repair: JsonRecord): JsonRecord {
	const requestedReward = typeof repair.requestedReward === "boolean"
		? repair.requestedReward
		: typeof repair.requestedReward === "string" && repair.requestedReward !== "none";
	const heroineResponse = repair.heroineResponse === "accepted" || repair.heroineResponse === "acknowledged" || repair.heroineResponse === "rejected" || repair.heroineResponse === "unresolved"
		? repair.heroineResponse
		: repair.acceptedByHeroine === true ? "accepted" : "unresolved";
	const { acceptedByHeroine: _legacyAcceptedByHeroine, ...withoutLegacyAcceptance } = repair;
	return { ...withoutLegacyAcceptance, requestedReward, heroineResponse };
}

function validateSemanticEvidenceAnchor(content: string, anchor: SemanticEvidenceAnchor, label: string): string | undefined {
	const normalized = normalizedCharacterText(content);
	const excerpt = normalizedCharacterText(anchor.excerpt);
	if (anchor.startChar >= anchor.endChar || anchor.endChar > normalized.length) return `${label} is outside the current event prose.`;
	if (normalized.slice(anchor.startChar, anchor.endChar) !== excerpt) return `${label} does not match the current event prose at its declared position.`;
	return undefined;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim().length > 0);
}

function isChaseWifeAgencyState(value: unknown): value is ChaseWifeAgencyState {
	if (!isJsonRecord(value)) return false;
	return ["epistemic", "relational", "material", "social", "future"].every((dimension) => {
		const score = value[dimension];
		return typeof score === "number" && Number.isInteger(score) && score >= 0 && score <= 4;
	});
}

function isQualityEvidenceArray(value: unknown): boolean {
	return Array.isArray(value) && value.every((item) => {
		if (!isJsonRecord(item)) return false;
		return isNonEmptyString(item.location) && isNonEmptyString(item.evidence) && isNonEmptyString(item.problem);
	});
}

function isReaderReport(value: unknown): value is ReaderReport {
	if (!isJsonRecord(value) || !isQualityEvidenceArray(value.engagementDrops) || !isQualityEvidenceArray(value.predictions) || !isQualityEvidenceArray(value.confusionPoints) || !isQualityEvidenceArray(value.credibilityBreaks) || !isQualityEvidenceArray(value.strongestMoments)) return false;
	return (value.status === "ok" || value.status === "revision-required") && Array.isArray(value.strongestMoments) && value.strongestMoments.length > 0;
}

function isReviewReport(value: unknown): value is ReviewReport {
	if (!isJsonRecord(value) || !isQualityEvidenceArray(value.structuralIssues) || !isQualityEvidenceArray(value.sceneIssues) || !isQualityEvidenceArray(value.characterIssues) || !isQualityEvidenceArray(value.pacingIssues) || !isQualityEvidenceArray(value.verifiedStrengths) || !Array.isArray(value.verifiedStrengths) || value.verifiedStrengths.length === 0 || !isStringArray(value.priorities)) return false;
	return (value.status === "ok" || value.status === "revision-required") && typeof value.allowFinalize === "boolean";
}

function parseStructuredQualityReport(content: string): unknown | undefined {
	const line = content.split(/\r?\n/gu).find((candidate) => candidate.startsWith("structuredReport: "));
	if (line === undefined) return undefined;
	try {
		return JSON.parse(line.slice("structuredReport: ".length)) as unknown;
	} catch {
		return undefined;
	}
}

function validateQualityReportAnchors(content: string, structured: ReaderReport | ReviewReport): string[] {
	const issues: string[] = [];
	if (!isJsonRecord(structured)) return ["structured quality report is not an object"];
	const items = Object.values(structured).flatMap((value) => Array.isArray(value) ? value.filter(isJsonRecord) : []);
	for (const [index, item] of items.entries()) {
		if (!isSemanticEvidenceAnchor(item.anchor)) {
			issues.push(`quality evidence ${index + 1} must include a prose anchor`);
			continue;
		}
		const issue = validateSemanticEvidenceAnchor(content, item.anchor, `quality evidence ${index + 1}`);
		if (issue !== undefined) issues.push(issue);
	}
	return issues;
}

function isChaseWifeBeat(value: unknown): value is ChaseWifeBeat {
	if (!isJsonRecord(value)) return false;
	const beatNumber = value.beat;
	if (typeof beatNumber !== "number" || !Number.isInteger(beatNumber) || beatNumber < 1 || beatNumber > 24) return false;
	if (value.heroinePhase !== undefined && (typeof value.heroinePhase !== "string" || !CHASE_WIFE_HEROINE_ARC_ORDER.has(value.heroinePhase))) return false;
	if (value.malePhase !== undefined && (typeof value.malePhase !== "string" || !CHASE_WIFE_MALE_ARC_ORDER.has(value.malePhase))) return false;
	if (value.targetTrack !== "heroine" && value.targetTrack !== "male" && value.targetTrack !== "shared") return false;
	if (value.targetTrack !== "male" && (typeof value.heroinePhase !== "string" || !CHASE_WIFE_HEROINE_ARC_ORDER.has(value.heroinePhase))) return false;
	if (value.targetTrack !== "heroine" && (typeof value.malePhase !== "string" || !CHASE_WIFE_MALE_ARC_ORDER.has(value.malePhase))) return false;
	if (typeof value.paywallHook !== "boolean") return false;
	const sceneCount = value.sceneCount;
	if (typeof sceneCount !== "number" || !Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > 5) return false;
	if (!isNonEmptyString(value.goal) || !isNonEmptyString(value.conflict) || !isNonEmptyString(value.actionOrConsequence)) return false;
	if (!isNonEmptyString(value.emotionBefore) || !isNonEmptyString(value.emotionAfter) || !isNonEmptyString(value.painPoint)) return false;
	if (!isNonEmptyString(value.rewardPoint) || !isNonEmptyString(value.hook)) return false;
	return Array.isArray(value.emotionStack) && value.emotionStack.length > 0 && value.emotionStack.every(isNonEmptyString);
}

function isChaseWifeEvent(value: unknown): value is ChaseWifeEvent {
	if (!isJsonRecord(value)) return false;
	if (!isPositiveInteger(value.eventId) || value.eventId > 8) return false;
	if (typeof value.role !== "string" || !CHASE_WIFE_EVENT_ROLES.has(value.role)) return false;
	if (value.beatRefs !== undefined && (!Array.isArray(value.beatRefs) || !value.beatRefs.every((beat) => isPositiveInteger(beat) && beat <= 24))) return false;
	if ((value.harmRefs !== undefined && !isStringArray(value.harmRefs)) || (value.repairRefs !== undefined && !isStringArray(value.repairRefs))) return false;
	if (value.chronology !== undefined && value.chronology !== "present" && value.chronology !== "flashback" && value.chronology !== "flashforward-preview") return false;
	if (value.heroinePhase !== undefined && (typeof value.heroinePhase !== "string" || !CHASE_WIFE_HEROINE_ARC_ORDER.has(value.heroinePhase))) return false;
	if (value.malePhase !== undefined && (typeof value.malePhase !== "string" || !CHASE_WIFE_MALE_ARC_ORDER.has(value.malePhase))) return false;
	if (!isPositiveInteger(value.scene) || value.scene > 8) return false;
	if (value.pov !== "heroine-first-person" && value.pov !== "male-limited-third-person") return false;
	if (value.targetTrack !== "heroine" && value.targetTrack !== "male" && value.targetTrack !== "shared") return false;
	if (typeof value.paywallHook !== "boolean") return false;
	if (!Array.isArray(value.causes) || !value.causes.every((cause) => isPositiveInteger(cause) && cause <= 8)) return false;
	if (value.injuryMechanism !== undefined && (typeof value.injuryMechanism !== "string" || !CHASE_WIFE_INJURY_MECHANISMS.has(value.injuryMechanism))) return false;
	if (!isStringArray(value.informationDelta) || !isStringArray(value.relationshipDelta) || !isStringArray(value.resourceDelta) || !isStringArray(value.riskDelta)) return false;
	if (typeof value.heroineAgencyBefore !== "number" || !Number.isInteger(value.heroineAgencyBefore) || value.heroineAgencyBefore < 0 || value.heroineAgencyBefore > 100) return false;
	if (typeof value.heroineAgencyAfter !== "number" || !Number.isInteger(value.heroineAgencyAfter) || value.heroineAgencyAfter < 0 || value.heroineAgencyAfter > 100) return false;
	if (!isChaseWifeAgencyState(value.heroineAgencyStateBefore) || !isChaseWifeAgencyState(value.heroineAgencyStateAfter)) return false;
	if (value.setback !== undefined && (!isJsonRecord(value.setback) || !["epistemic", "relational", "material", "social", "future"].includes(String(value.setback.dimension)) || !isNonEmptyString(value.setback.reason) || !isPositiveInteger(value.setback.recoveryBeatRef) || value.setback.recoveryBeatRef > 24)) return false;
	if (typeof value.irreversible !== "boolean" || !isNonEmptyString(value.cannotRemoveBecause)) return false;
	if (typeof value.lengthMode !== "string" || !Object.hasOwn(CHASE_WIFE_LENGTH_LIMITS, value.lengthMode)) return false;
	if (typeof value.minChars !== "number" || !Number.isInteger(value.minChars) || typeof value.maxChars !== "number" || !Number.isInteger(value.maxChars)) return false;
	const limits = CHASE_WIFE_LENGTH_LIMITS[value.lengthMode as ChaseWifeEvent["lengthMode"]];
	if (value.minChars < limits.min || value.maxChars > limits.max || value.minChars > value.maxChars) return false;
	return [
		"eventDescription",
		"function",
		"goal",
		"conflict",
		"actionOrConsequence",
		"protagonistReaction",
		"oppositionReaction",
		"informationChange",
		"emotionBefore",
		"emotionAfter",
		"physicalReaction",
		"setupOrPayoff",
		"readerRelease",
		"entryHook",
		"exitHook",
	].every((field) => isNonEmptyString(value[field]));
}

function eventStateDeltaCount(event: ChaseWifeEvent): number {
	return [event.informationDelta, event.relationshipDelta, event.resourceDelta, event.riskDelta].filter((delta) => delta.length > 0).length;
}

function eventDeltaEntries(event: ChaseWifeEvent): Array<{ deltaId: string; dimension: "information" | "relationship" | "resource" | "risk" | "agency"; delta: string }> {
	const entries: Array<{ deltaId: string; dimension: "information" | "relationship" | "resource" | "risk" | "agency"; delta: string }> = [];
	for (const [dimension, values] of [["information", event.informationDelta], ["relationship", event.relationshipDelta], ["resource", event.resourceDelta], ["risk", event.riskDelta]] as const) {
		values.forEach((delta, index) => entries.push({ deltaId: `${dimension}-${index + 1}`, dimension, delta }));
	}
	if (event.heroineAgencyAfter > event.heroineAgencyBefore) entries.push({ deltaId: "agency-1", dimension: "agency", delta: `${event.heroineAgencyBefore}->${event.heroineAgencyAfter}` });
	return entries;
}

function normalizedEventSignature(event: ChaseWifeEvent): string {
	return [event.role, event.targetTrack, event.injuryMechanism ?? "none", event.informationDelta.join("|"), event.relationshipDelta.join("|"), event.resourceDelta.join("|"), event.riskDelta.join("|"), event.actionOrConsequence].join("\u0001").toLocaleLowerCase();
}

function characterTrigrams(content: string): Set<string> {
	const normalized = content.replace(/\s+/gu, "").toLocaleLowerCase();
	const trigrams = new Set<string>();
	for (let index = 0; index + 2 < normalized.length; index += 1) trigrams.add(normalized.slice(index, index + 3));
	return trigrams;
}

function textSimilarity(left: string, right: string): number {
	const leftTrigrams = characterTrigrams(left);
	const rightTrigrams = characterTrigrams(right);
	if (leftTrigrams.size === 0 && rightTrigrams.size === 0) return 1;
	const intersection = [...leftTrigrams].filter((trigram) => rightTrigrams.has(trigram)).length;
	const union = new Set([...leftTrigrams, ...rightTrigrams]).size;
	return union === 0 ? 0 : intersection / union;
}

function isHeroinePov(value: ChaseWifeEventPov): boolean {
	return value === "heroine-first-person";
}

function isValidPovMode(value: unknown): value is ChaseWifePovMode {
	return value === "heroine-first-person" || value === "split-pov";
}

function isOrderedUniqueArc(value: unknown, order: Map<string, number>): value is string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !order.has(item))) return false;
	if (new Set(value).size !== value.length) return false;
	return value.every((phase, index) => index === 0 || (order.get(phase) ?? -1) > (order.get(value[index - 1]) ?? -1));
}



export class NovelProjectStore {
	private readonly novelsRoot: string;
	private readonly fileQueues = new Map<string, Promise<void>>();

	constructor(cwd: string) {
		this.novelsRoot = resolve(cwd, "novels");
	}

	private assertWithinNovels(targetPath: string): string {
		const target = resolve(targetPath);
		const root = resolve(this.novelsRoot);
		const relativePath = relative(root, target);
		if (
			relativePath === "" ||
			(relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath))
		) {
			return target;
		}
		throw new Error(`Path escapes the novels directory: ${target}`);
	}

	private projectDirectory(projectId: string): string {
		assertProjectId(projectId);
		return this.assertWithinNovels(join(this.novelsRoot, projectId));
	}

	private projectFile(projectId: string, relativePath: string): string {
		return this.assertWithinNovels(join(this.projectDirectory(projectId), relativePath));
	}

	private async ensureProject(projectId: string, signal?: AbortSignal): Promise<string> {
		const projectDir = this.projectDirectory(projectId);
		try {
			await access(this.projectFile(projectId, "project.json"), constants.R_OK);
		} catch (error) {
			if (isFileNotFound(error)) throw new Error(`Novel project "${projectId}" is not initialized.`);
			throw error;
		}
		await this.recoverPendingTransactions(projectId, signal);
		return projectDir;
	}

	private async readDirectoryEntries(directory: string, signal?: AbortSignal): Promise<string[]> {
		throwIfAborted(signal);
		try {
			const entries = await readdir(directory, { withFileTypes: true });
			return entries.map((entry) => entry.name);
		} catch (error) {
			if (isFileNotFound(error)) return [];
			throw error;
		}
	}

	private async readTextIfExists(path: string, signal?: AbortSignal): Promise<string | undefined> {
		throwIfAborted(signal);
		try {
			const content = await readFile(path, { encoding: "utf8", signal });
			throwIfAborted(signal);
			return content;
		} catch (error) {
			if (isFileNotFound(error)) return undefined;
			throw error;
		}
	}

	private async readJsonIfExists(path: string, signal?: AbortSignal): Promise<unknown | undefined> {
		const content = await this.readTextIfExists(path, signal);
		if (content === undefined) return undefined;
		try {
			return JSON.parse(content);
		} catch (error) {
			throw new Error(`Invalid JSON in ${path}: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private withFileQueue<T>(path: string, operation: () => Promise<T>): Promise<T> {
		const previous = this.fileQueues.get(path) ?? Promise.resolve();
		const current = previous.then(operation, operation);
		this.fileQueues.set(path, current.then(() => undefined, () => undefined));
		return current;
	}

	private async writeAtomically(path: string, content: string, signal?: AbortSignal): Promise<void> {
		const target = this.assertWithinNovels(path);
		await this.withFileQueue(target, async () => {
			throwIfAborted(signal);
			await mkdir(dirname(target), { recursive: true });
			const temporaryPath = join(dirname(target), `.${target.split(/[\\/]/).at(-1) ?? "file"}.${randomUUID()}.tmp`);
			try {
				await writeFile(temporaryPath, content, { encoding: "utf8", signal });
				throwIfAborted(signal);
				await rename(temporaryPath, target);
			} finally {
				try {
					await unlink(temporaryPath);
				} catch (error) {
					if (!isFileNotFound(error)) throw error;
				}
			}
		});
	}

	private async writeVersionedJsonReport(projectId: string, relativePath: string, report: JsonRecord, signal?: AbortSignal): Promise<{ reportRevision: number; versionedPath: string; latestPath: string }> {
		const basePath = relativePath.endsWith(".json") ? relativePath.slice(0, -5) : relativePath;
		const directory = this.projectFile(projectId, dirname(relativePath));
		const entries = await this.listFiles(directory, signal);
		const revisions = entries.map((path) => path.match(new RegExp(`${basePath.split(/[\\/]/u).at(-1)}-r(\\d+)\\.json$`))?.[1]).filter((value): value is string => value !== undefined).map(Number);
		const reportRevision = (revisions.length > 0 ? Math.max(...revisions) : 0) + 1;
		const versionedPath = `${basePath}-r${String(reportRevision).padStart(2, "0")}.json`;
		const payload = `${JSON.stringify({ ...report, reportRevision }, null, 2)}\n`;
		await this.writeAtomically(this.projectFile(projectId, versionedPath), payload, signal);
		await this.writeAtomically(this.projectFile(projectId, relativePath), payload, signal);
		return { reportRevision, versionedPath, latestPath: relativePath };
	}

	private async listFiles(directory: string, signal?: AbortSignal): Promise<string[]> {
		const entries = await this.readDirectoryEntries(directory, signal);
		return entries
			.filter((entry) => entry.endsWith(".md") || entry.endsWith(".json"))
			.map((entry) => join(directory, entry))
			.sort();
	}

	private documentPath(projectId: string, documentType: DocumentType, name: string | undefined, format: ContentFormat): string {
		const extension = getDocumentExtension(format);
		if (documentType === "story-bible") return this.projectFile(projectId, `story-bible${extension}`);
		if (documentType === "style-guide") return this.projectFile(projectId, `style-guide${extension}`);
		if (!name) throw new Error(`documentType "${documentType}" requires a name.`);
		assertDocumentName(name);
		const directory = getDocumentDirectory(documentType);
		if (!directory) throw new Error(`Unsupported documentType "${documentType}".`);
		return this.projectFile(projectId, join(directory, `${name}${extension}`));
	}

	private relativeProjectPath(projectId: string, path: string): string {
		return path.slice(this.projectDirectory(projectId).length + 1);
	}

	private async templateFiles(): Promise<Record<string, string>> {
		return {
			"style-guide.md": "# 风格指南\n\n## 已确认\n- 待用户确认\n",
			"story-bible.md": "# Story Bible\n\n## 故事提案\n- 待用户确认\n\n## 完整结局\n- 待用户确认\n",
			"outline/overview.md": "# 总纲\n\n- 待规划\n",
			"timeline/events.json": "[]\n",
			"continuity/unresolved-clues.json": "[]\n",
			"canon/decisions.json": "[]\n",
			"canon/canon-facts.json": "[]\n",
			"canon/vocabulary.json": "[]\n",
			"outline/foreshadowing-ledger.json": "[]\n",
			"characters/relationships.json": "[]\n",
			"world/locations.json": "[]\n",
			"world/rules.json": "[]\n",
		};
	}

	async initializeNovel(params: InitializeNovelParams, signal?: AbortSignal): Promise<NovelProjectInfo> {
		const projectDir = this.projectDirectory(params.projectId);
		const existingEntries = await this.readDirectoryEntries(projectDir, signal);
		if (existingEntries.length > 0) {
			throw new Error(`Novel project "${params.projectId}" already exists. Initialization never overwrites an existing project.`);
		}
		const now = new Date().toISOString();
		const genre = normalizePrimaryGenre(params.genre);
		// 新项目不允许 genre 与 storyProfile.primaryGenre 制造两个冲突真相；历史磁盘项目仍由 resolveStoryProfile 宽容读取。
		if (params.storyProfile !== undefined && normalizePrimaryGenre(params.storyProfile.primaryGenre) !== genre) {
			throw new Error(`initialize_novel requires genre and storyProfile.primaryGenre to agree after normalization: "${params.genre}" resolves to "${genre}" but storyProfile.primaryGenre "${params.storyProfile.primaryGenre}" resolves to "${normalizePrimaryGenre(params.storyProfile.primaryGenre)}".`);
		}
		const resolvedPrimaryGenre = params.storyProfile === undefined ? genre : normalizePrimaryGenre(params.storyProfile.primaryGenre);
		const storyProfile = params.storyProfile === undefined ? undefined : {
			primaryGenre: resolvedPrimaryGenre,
			relationshipMechanisms: params.storyProfile.relationshipMechanisms.map(normalizeRelationshipMechanism),
			...(params.storyProfile.professionalDomain !== undefined ? { professionalDomain: normalizeProfessionalDomain(params.storyProfile.professionalDomain) } : {}),
			...(params.storyProfile.themes !== undefined && params.storyProfile.themes.length > 0 ? { themes: params.storyProfile.themes } : {}),
			...(params.storyProfile.storyForm !== undefined ? { storyForm: params.storyProfile.storyForm } : {}),
			...(params.storyProfile.audience !== undefined ? { audience: params.storyProfile.audience } : {}),
			...(params.storyProfile.setting !== undefined ? { setting: params.storyProfile.setting } : {}),
		};
		const project = {
			version: 1,
			projectId: params.projectId,
			title: params.title,
			genre,
			...(storyProfile === undefined ? {} : { storyProfile }),
			targetWordCount: params.targetWordCount ?? defaultTargetWordCount(resolvedPrimaryGenre),
			status: "planning",
			nextChapter: 1,
			finalizedChapters: [],
			createdAt: now,
			updatedAt: now,
		};
		const files = await this.templateFiles();
		files["project.json"] = `${JSON.stringify(project, null, 2)}\n`;
		files["status.json"] = `${JSON.stringify({ projectId: params.projectId, status: project.status, nextChapter: project.nextChapter, finalizedChapters: project.finalizedChapters, updatedAt: now }, null, 2)}\n`;
		await mkdir(projectDir, { recursive: true });
		for (const [relativePath, content] of Object.entries(files)) {
			await this.writeAtomically(this.projectFile(params.projectId, relativePath), content, signal);
		}
		return { projectId: params.projectId, path: projectDir, title: params.title, genre, createdAt: now, updatedAt: now, files: Object.keys(files) };
	}

	async repairNovelProject(params: RepairNovelProjectParams, signal?: AbortSignal): Promise<{ projectId: string; createdFiles: string[]; existingFiles: string[] }> {
		await this.ensureProject(params.projectId, signal);
		const templates = await this.templateFiles();
		delete templates["project.json"];
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		if (isJsonRecord(project)) templates["status.json"] = `${JSON.stringify({ projectId: params.projectId, status: project.status, nextChapter: project.nextChapter, finalizedChapters: project.finalizedChapters, updatedAt: project.updatedAt }, null, 2)}\n`;
		const createdFiles: string[] = [];
		const existingFiles: string[] = [];
		for (const [relativePath, content] of Object.entries(templates)) {
			const path = this.projectFile(params.projectId, relativePath);
			if ((await this.readTextIfExists(path, signal)) !== undefined) existingFiles.push(relativePath);
			else {
				await this.writeAtomically(path, content, signal);
				createdFiles.push(relativePath);
			}
		}
		return { projectId: params.projectId, createdFiles, existingFiles };
	}

	async getNovelStatus(params: GetNovelStatusParams, signal?: AbortSignal): Promise<NovelProjectStatus> {
		await this.ensureProject(params.projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		if (!isJsonRecord(project) || typeof project.status !== "string" || !isPositiveInteger(project.nextChapter)) {
			throw new Error("project.json has invalid status fields.");
		}
		const chapterPaths = await this.listFiles(this.projectFile(params.projectId, "chapters"), signal);
		const finalizedChapters = chapterPaths.map((path) => path.match(/chapter-(\d+)\.md$/)?.[1]).filter((value): value is string => value !== undefined).map(Number).sort((left, right) => left - right);
		const requiredFiles = ["project.json", "status.json", "story-bible.md", "style-guide.md", "timeline/events.json"];
		const missingFiles: string[] = [];
		for (const relativePath of requiredFiles) {
			if ((await this.readTextIfExists(this.projectFile(params.projectId, relativePath), signal)) === undefined) missingFiles.push(relativePath);
		}
		return {
			projectId: params.projectId,
			status: project.status,
			nextChapter: project.nextChapter,
			lastFinalizedChapter: typeof project.lastFinalizedChapter === "number" ? project.lastFinalizedChapter : undefined,
			finalizedChapters,
			missingFiles,
			updatedAt: typeof project.updatedAt === "string" ? project.updatedAt : "",
		};
	}

	async readStoryContext(params: ReadStoryContextParams, signal?: AbortSignal): Promise<StoryContextResult> {
		await this.ensureProject(params.projectId, signal);
		const includedFiles: string[] = [];
		const excludedFiles: string[] = [];
		const parts: string[] = [];
		const added = new Set<string>();
		const addFile = async (relativePath: string, label: string): Promise<void> => {
			if (added.has(relativePath)) return;
			// reader-sim 硬隔离（defense-in-depth）：canon/work/outline 下的 mystery 作者规划路径都不得进入 reader 上下文，
			// 统一  → / 后按 author-private roots 判定（Windows 路径同样生效），即使未来修改 sections 也不能泄漏作者秘密。
			if ((params.task ?? "chapter-writing") === "reader-sim" && (isMysteryPrivatePath(relativePath) || isMarriagePrivatePath(relativePath) || isProfessionalPrivatePath(relativePath) || isUnifiedPrivatePath(relativePath) || relativePath.includes("female-social-suspense-design.json") || relativePath.includes("contradiction-profiles.json"))) {
				excludedFiles.push(relativePath);
				return;
			}
			const content = await this.readTextIfExists(this.projectFile(params.projectId, relativePath), signal);
			if (content === undefined) {
				excludedFiles.push(relativePath);
				return;
			}
			added.add(relativePath);
			includedFiles.push(relativePath);
			parts.push(`${label} / ${relativePath}\n${content}`);
		};
		const addSceneContract = async (relativePath: string): Promise<void> => {
			if (params.sceneIds === undefined || params.sceneIds.length === 0) {
				await addFile(relativePath, "scene-contract");
				return;
			}
			const content = await this.readTextIfExists(this.projectFile(params.projectId, relativePath), signal);
			if (content === undefined) {
				excludedFiles.push(relativePath);
				return;
			}
			try {
				const parsed = JSON.parse(content) as { contracts?: Array<{ sceneId?: string }> };
				const contracts = parsed.contracts?.filter((contract) => contract.sceneId !== undefined && params.sceneIds?.includes(contract.sceneId)) ?? [];
				if (contracts.length === 0) {
					excludedFiles.push(relativePath);
					return;
				}
				includedFiles.push(relativePath);
				parts.push(`scene-contract / ${relativePath}\n${JSON.stringify({ ...parsed, contracts }, null, 2)}`);
			} catch {
				await addFile(relativePath, "scene-contract");
			}
		};
		const addClueLedger = async (): Promise<void> => {
			const relativePath = "continuity/unresolved-clues.json";
			if (params.clueIds === undefined || params.clueIds.length === 0) {
				await addFile(relativePath, "clues");
				return;
			}
			const content = await this.readTextIfExists(this.projectFile(params.projectId, relativePath), signal);
			if (content === undefined) {
				excludedFiles.push(relativePath);
				return;
			}
			try {
				const parsed = JSON.parse(content) as Array<{ id?: string }>;
				const clues = parsed.filter((clue) => clue.id !== undefined && params.clueIds?.includes(clue.id));
				if (clues.length === 0) {
					excludedFiles.push(relativePath);
					return;
				}
				includedFiles.push(relativePath);
				parts.push(`clues / ${relativePath}\n${JSON.stringify(clues, null, 2)}`);
			} catch {
				await addFile(relativePath, "clues");
			}
		};
		const task = params.task ?? "chapter-writing";
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		const sections = params.sections ?? (task === "reader-sim" ? ["project", "summaries"] : ["project", "story-bible", "style-guide", "characters", "outline", "timeline", "summaries", "continuity"]);
		for (const section of sections) {
			if (section === "project" || section === "story-bible" || section === "style-guide") await addFile(section === "project" ? "project.json" : `${section}.md`, section);
			else if (section === "summaries") {
				const summaryPaths = (await this.listFiles(this.projectFile(params.projectId, "summaries"), signal)).filter((path) => path.endsWith(".json"));
				const count = params.recentSummaryCount ?? 2;
				for (const path of summaryPaths.slice(-count)) await addFile(this.relativeProjectPath(params.projectId, path), "summary");
			} else if (section === "continuity" && params.clueIds !== undefined && params.clueIds.length > 0) {
				await addClueLedger();
			} else {
				const directory = section === "characters" ? "characters" : section;
				const directoryFiles = await this.listFiles(this.projectFile(params.projectId, directory), signal);
				for (const path of directoryFiles.slice(0, 20)) {
					const fileName = path.split(/[\\/]/).at(-1) ?? "";
					const selectedIds = section === "characters" ? params.characterIds : section === "world" ? params.worldIds : undefined;
					if (selectedIds !== undefined && selectedIds.length > 0 && !selectedIds.some((id) => fileName === `${id}.json` || fileName === `${id}.md`)) {
						excludedFiles.push(this.relativeProjectPath(params.projectId, path));
						continue;
					}
					await addFile(this.relativeProjectPath(params.projectId, path), section);
				}
			}
		}
		if (params.chapter !== undefined) {
			const current = chapterName(params.chapter);
			await addFile(`outline/chapter-outline.json`, "chapter-outline");
			await addFile(`work/chapter-plans/${current}.md`, "chapter-plan");
			await addSceneContract(`work/scene-contracts/${current}.json`);
			if (isJsonRecord(project) && hasChaseWifeCapability(project)) {
				await addFile("outline/genre/chase-wife-beat-sheet.json", "chase-wife-beat-sheet");
				// Converged 模式：unified 事件地图/草稿已在 unified 上下文块读取，不再重复读取 legacy chase-wife 事件文件。
				const chaseProjection = await this.projectChaseWifeChapter(params.projectId, params.chapter, signal);
				if (chaseProjection !== undefined) {
					await addFile(`continuity/reports/${current}-chase-wife-pacing.json`, "chase-wife-pacing");
					await addFile(`continuity/reports/${current}-chase-wife-events.json`, "chase-wife-event-map-report");
				} else {
					await addFile(`work/chase-wife-events/${current}.json`, "chase-wife-event-map");
				}
				const eventMap = await this.readJsonIfExists(this.projectFile(params.projectId, `work/chase-wife-events/${current}.json`), signal);
				const eventMapHash = isJsonRecord(eventMap) ? hashJson(eventMap) : undefined;
				const eventSpecs = isJsonRecord(eventMap) && Array.isArray(eventMap.events) ? eventMap.events.filter(isChaseWifeEvent) : [];
				if (chaseProjection === undefined) {
					const eventDrafts = await this.listFiles(this.chaseWifeEventDirectory(params.projectId, params.chapter), signal);
					const latestByEvent = new Map<number, string>();
					for (const path of eventDrafts) {
						const match = path.match(/event-(\d+)-r(\d+)\.md$/);
						if (!match) continue;
						const eventId = Number(match[1]);
						const revision = Number(match[2]);
						const previous = latestByEvent.get(eventId);
						if (previous === undefined || revision > Number(previous.match(/-r(\d+)\.md$/)?.[1] ?? 0)) latestByEvent.set(eventId, path);
					}
					for (const path of latestByEvent.values()) {
						const match = path.match(/event-(\d+)-r(\d+)\.md$/);
						const eventId = Number(match?.[1]);
						const revision = Number(match?.[2]);
						const report = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${current}-event-${padChapter(eventId)}-chase-wife.json`), signal);
						const semantics = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${current}-event-${padChapter(eventId)}-semantics.json`), signal);
						const eventSpec = eventSpecs.find((event) => event.eventId === eventId);
						const content = await this.readTextIfExists(path, signal);
						const contentHash = content === undefined ? undefined : sha256(content);
						const hashesMatch = eventMapHash !== undefined && eventSpec !== undefined && contentHash !== undefined && isJsonRecord(report) && report.contentHash === contentHash && report.eventSpecHash === hashJson(eventSpec) && report.eventMapHash === eventMapHash && isJsonRecord(semantics) && semantics.contentHash === contentHash && semantics.eventSpecHash === hashJson(eventSpec) && semantics.eventMapHash === eventMapHash;
						if (isJsonRecord(report) && report.status === "ok" && report.revision === revision && isJsonRecord(semantics) && semantics.source === "model" && semantics.status === "ok" && semantics.revision === revision && hashesMatch) await addFile(this.relativeProjectPath(params.projectId, path), "chase-wife-event-draft");
						else excludedFiles.push(this.relativeProjectPath(params.projectId, path));
					}
					await addFile(`continuity/reports/${current}-chase-wife-pacing.json`, "chase-wife-pacing");
				}
			}
			if (params.includeCurrentDraft !== false) {
				const drafts = await this.listFiles(this.projectFile(params.projectId, "work/drafts"), signal);
				const currentDraft = drafts.filter((path) => new RegExp(`${current}-r\\d+\\.md$`).test(path)).at(-1);
				if (currentDraft) await addFile(this.relativeProjectPath(params.projectId, currentDraft), "chapter-draft");
			}
			if (params.includePreviousChapterEnding && params.chapter > 1) await addFile(`chapters/${chapterName(params.chapter - 1)}.md`, "previous-chapter");
		}
		// Marriage Engine 上下文：planning / chapter-writing / continuity-review 读取结构（confirmed 优先，否则 proposed）；
		// reader-sim 不读取（作者秘密隔离：restructuring 可能泄露未来分居/离婚安排）。
		if (isJsonRecord(project) && hasMatureMarriageCapability(project) && (task === "planning" || task === "chapter-writing" || task === "continuity-review")) {
			const structurePath = (await this.readTextIfExists(this.projectFile(params.projectId, "canon/marriage/structure.json"), signal)) !== undefined
				? "canon/marriage/structure.json"
				: "work/marriage/structure-proposed.json";
			await addFile(structurePath, "marriage-structure");
			const restructuringPath = (await this.readTextIfExists(this.projectFile(params.projectId, "canon/marriage/restructuring.json"), signal)) !== undefined
				? "canon/marriage/restructuring.json"
				: "work/marriage/restructuring-proposed.json";
			await addFile(restructuringPath, "marriage-restructuring");
		}
		// Unified 上下文：作者侧读取全篇统一事件地图与当前章事件草稿（reader-sim 不读取）。
		if (isJsonRecord(project) && (task === "planning" || task === "chapter-writing" || task === "continuity-review")) {
			await addFile("outline/unified/event-map.json", "unified-event-map");
			if (params.chapter !== undefined) {
				const draftPaths = await this.listFiles(this.projectFile(params.projectId, "work/unified-event-drafts/" + chapterName(params.chapter)), signal);
				const latestByEvent = new Map<number, { path: string; revision: number }>();
				for (const path of draftPaths) {
					const match = path.match(/event-(\d+)-r(\d+)\.md$/);
					if (!match) continue;
					const eventId = Number(match[1]);
					const revision = Number(match[2]);
					const previous = latestByEvent.get(eventId);
					if (previous === undefined || revision > previous.revision) latestByEvent.set(eventId, { path, revision });
				}
				for (const { path } of [...latestByEvent.values()].sort((left, right) => left.path.localeCompare(right.path))) {
					await addFile(this.relativeProjectPath(params.projectId, path), "unified-event-draft");
				}
			}
		}
		// Vertical Design 上下文：作者侧读取垂直设计（社会机制/婚姻模式/职业困境/乐章/对抗/主题）与女主矛盾画像；
		// reader-sim 不读取（作者秘密隔离）。
		if (isJsonRecord(project) && (task === "planning" || task === "chapter-writing" || task === "continuity-review")) {
			await addFile("outline/genre/female-social-suspense-design.json", "vertical-design");
			await addFile("outline/characters/contradiction-profiles.json", "vertical-character-profiles");
		}
		// Professional 上下文：planning / chapter-writing / continuity-review 读取 domain model 与 case plan（confirmed 优先，否则 proposed）；
		// reader-sim 不读取（作者秘密隔离）。
		if (isJsonRecord(project) && hasProfessionalDomain(project, "insurance-fraud-investigation") && (task === "planning" || task === "chapter-writing" || task === "continuity-review")) {
			const domainModelPath = (await this.readTextIfExists(this.projectFile(params.projectId, "canon/professional/domain-model.json"), signal)) !== undefined
				? "canon/professional/domain-model.json"
				: "work/professional/domain-model-proposed.json";
			await addFile(domainModelPath, "professional-domain-model");
			const casePlanPath = (await this.readTextIfExists(this.projectFile(params.projectId, "canon/professional/case-plan.json"), signal)) !== undefined
				? "canon/professional/case-plan.json"
				: "work/professional/case-plan-proposed.json";
			await addFile(casePlanPath, "professional-case-plan");
		}
		// Mystery Engine 上下文：planning / chapter-writing / continuity-review 读取真相、线索、嫌疑与信息状态；
		// reader-sim 不读取（作者秘密隔离）；不含 female-social-suspense primaryGenre 的项目不读取。
		if (isJsonRecord(project) && hasPrimaryGenre(project, "female-social-suspense") && (task === "planning" || task === "chapter-writing" || task === "continuity-review")) {
			await addFile("outline/mystery/clue-ledger.json", "mystery-clues");
			await addFile("outline/mystery/information-state.json", "mystery-information-state");
			const truthModelPath = (await this.readTextIfExists(this.projectFile(params.projectId, "canon/mystery/truth-model.json"), signal)) !== undefined
				? "canon/mystery/truth-model.json"
				: "work/mystery/truth-model-proposed.json";
			await addFile(truthModelPath, "mystery-truth-model");
			const suspectModelPath = (await this.readTextIfExists(this.projectFile(params.projectId, "canon/mystery/suspect-model.json"), signal)) !== undefined
				? "canon/mystery/suspect-model.json"
				: "work/mystery/suspect-model-proposed.json";
			await addFile(suspectModelPath, "mystery-suspect-model");
		}
		const priority = (part: string): number => {
			if (part.startsWith("chase-wife-beat-sheet")) return 1;
			if (part.startsWith("unified-event-map")) return 2;
			if (part.startsWith("unified-event-draft")) return 3;
			if (part.startsWith("chase-wife-event-map")) return 4;
			if (part.startsWith("mystery-truth-model")) return 5;
			if (part.startsWith("mystery-clues") || part.startsWith("mystery-suspect-model") || part.startsWith("mystery-information-state")) return 6;
			if (part.startsWith("marriage-structure") || part.startsWith("marriage-restructuring")) return 7;
			if (part.startsWith("professional-domain-model") || part.startsWith("professional-case-plan")) return 8;
			if (part.startsWith("vertical-design") || part.startsWith("vertical-character-profiles")) return 9;
			if (part.startsWith("chapter-draft")) return 10;
			if (part.startsWith("chase-wife-event-draft")) return 11;
			if (part.startsWith("chapter-plan") || part.startsWith("scene-contract")) return 12;
			if (part.startsWith("previous-chapter")) return 13;
			return 14;
		};
		parts.sort((left, right) => priority(left) - priority(right));
		const fullText = parts.join("\n\n---\n\n");
		const maxChars = params.maxChars ?? DEFAULT_CONTEXT_CHARS;
		const truncated = fullText.length > maxChars;
		return {
			projectId: params.projectId,
			chapter: params.chapter,
			task,
			files: includedFiles,
			includedFiles,
			excludedFiles,
			reasoningSummary: { included: includedFiles.map((file) => `${file}: selected for ${task}`), excluded: excludedFiles },
			truncated,
			text: truncated ? `${fullText.slice(0, maxChars)}\n\n[context truncated]` : fullText,
		};
	}

	async saveStoryDocument(params: SaveStoryDocumentParams, signal?: AbortSignal): Promise<SavedDocumentResult> {
		await this.ensureProject(params.projectId, signal);
		if (MANAGED_DOCUMENT_TYPES.has(params.documentType)) {
			throw new Error(`documentType "${params.documentType}" is managed by a dedicated workflow tool.`);
		}
		const path = this.documentPath(params.projectId, params.documentType, params.name, params.format);
		const content = params.format === "json" ? normalizeJson(params.content, path) : normalizeText(params.content);
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, documentType: params.documentType, path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(content, "utf8") };
	}

	async saveCanonDocument(params: SaveCanonDocumentParams, signal?: AbortSignal): Promise<{ projectId: string; documentType: SaveCanonDocumentParams["documentType"]; status: "proposed" | "confirmed"; path: string; bytes: number }> {
		await this.ensureProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const normalized = params.format === "json" ? normalizeJson(params.content, `${params.documentType}:${params.name ?? "root"}`) : normalizeText(params.content);
		const path = params.status === "confirmed"
			? this.documentPath(params.projectId, params.documentType, params.name, params.format)
			: this.projectFile(params.projectId, `work/canon-candidates/${params.documentType}-${sha256(normalized).slice(0, 16)}${getDocumentExtension(params.format)}`);
		await this.writeAtomically(path, normalized, signal);
		return { projectId: params.projectId, documentType: params.documentType, status: params.status, path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(normalized, "utf8") };
	}

	async saveChapterPlan(params: SaveChapterPlanParams, signal?: AbortSignal): Promise<SavedDocumentResult> {
		await this.ensureProject(params.projectId, signal);
		const path = this.projectFile(params.projectId, `work/chapter-plans/${chapterName(params.chapter)}.md`);
		const content = normalizeText(params.content);
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, documentType: "chapter-plan", path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(content, "utf8") };
	}

	async saveSceneContract(params: SaveSceneContractParams, signal?: AbortSignal): Promise<SavedDocumentResult> {
		await this.ensureProject(params.projectId, signal);
		if (params.contracts.some((contract) => contract.chapter !== params.chapter || contract.stateChanges.length === 0)) throw new Error("Every scene contract must belong to the requested chapter and contain a state change.");
		const path = this.projectFile(params.projectId, `work/scene-contracts/${chapterName(params.chapter)}.json`);
		const content = `${JSON.stringify({ version: 1, chapter: params.chapter, contracts: params.contracts, updatedAt: new Date().toISOString() }, null, 2)}\n`;
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, documentType: "scene-contract", path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(content, "utf8") };
	}

	async saveChapterDraft(params: SaveChapterDraftParams, signal?: AbortSignal): Promise<SavedChapterDraftResult> {
		await this.ensureProject(params.projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		if (isJsonRecord(project) && hasChaseWifeCapability(project)) {
			throw new Error("Chase-wife chapter drafts must be created by assemble_chase_wife_chapter after event-level checks.");
		}
		return this.saveChapterDraftInternal(params, signal);
	}

	private async saveChapterDraftInternal(params: SaveChapterDraftParams, signal?: AbortSignal): Promise<SavedChapterDraftResult> {
		await this.ensureProject(params.projectId, signal);
		const directory = this.projectFile(params.projectId, "work/drafts");
		const prefix = `${chapterName(params.chapter)}-r`;
		const paths = await this.listFiles(directory, signal);
		const revisions = paths.map((path) => path.match(new RegExp(`${prefix}(\\d+)\\.md$`))?.[1]).filter((value): value is string => value !== undefined).map(Number);
		const revision = params.revision ?? ((revisions.length > 0 ? Math.max(...revisions) : 0) + 1);
		const path = this.projectFile(params.projectId, `work/drafts/${prefix}${String(revision).padStart(2, "0")}.md`);
		if (params.revision !== undefined && (await this.readTextIfExists(path, signal)) !== undefined) throw new Error(`Draft revision ${revision} already exists. Save a new revision instead.`);
		const content = normalizeText(params.content);
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, documentType: "chapter-draft", chapter: params.chapter, revision, path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(content, "utf8") };
	}

	private async latestDraft(projectId: string, chapter: number, signal?: AbortSignal): Promise<{ path: string; revision: number; content: string } | undefined> {
		const paths = await this.listFiles(this.projectFile(projectId, "work/drafts"), signal);
		const matches = paths.map((path) => {
			const match = path.match(new RegExp(`${chapterName(chapter)}-r(\\d+)\\.md$`));
			return match ? { path, revision: Number(match[1]) } : undefined;
		}).filter((value): value is { path: string; revision: number } => value !== undefined).sort((left, right) => left.revision - right.revision);
		const latest = matches.at(-1);
		if (!latest) return undefined;
		const content = await this.readTextIfExists(latest.path, signal);
		return content === undefined ? undefined : { ...latest, content };
	}

	async checkContinuity(params: CheckContinuityParams, signal?: AbortSignal): Promise<ContinuityReport> {
		const projectDir = await this.ensureProject(params.projectId, signal);
		const issues: ContinuityIssue[] = [];
		const checkedFiles = ["project.json"];
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		if (!isJsonRecord(project) || !isPositiveInteger(project.nextChapter)) issues.push({ severity: "error", code: "invalid-project", message: "project.json has invalid project state.", path: "project.json" });
		const statusFile = await this.readJsonIfExists(this.projectFile(params.projectId, "status.json"), signal);
		checkedFiles.push("status.json");
		if (!isJsonRecord(statusFile) || statusFile.nextChapter !== (isJsonRecord(project) ? project.nextChapter : undefined)) issues.push({ severity: "error", code: "status-mismatch", message: "status.json does not match project.json.", path: "status.json" });
		const summaryPaths = await this.listFiles(this.projectFile(params.projectId, "summaries"), signal);
		const chapters = new Map<number, string>();
		for (const path of summaryPaths.filter((candidate) => candidate.endsWith(".json"))) {
			const relativePath = path.slice(projectDir.length + 1);
			checkedFiles.push(relativePath);
			const summary = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(summary) || !isPositiveInteger(summary.chapter)) {
				issues.push({ severity: "error", code: "invalid-summary", message: "Summary must contain a positive integer chapter.", path: relativePath });
				continue;
			}
			const previous = chapters.get(summary.chapter);
			if (previous) issues.push({ severity: "error", code: "duplicate-chapter-summary", message: `Duplicate summary for chapter ${summary.chapter}: ${previous} and ${relativePath}.`, path: relativePath });
			else chapters.set(summary.chapter, relativePath);
		}
		const cluesPath = this.projectFile(params.projectId, "continuity/unresolved-clues.json");
		const clues = await this.readJsonIfExists(cluesPath, signal);
		checkedFiles.push("continuity/unresolved-clues.json");
		if (clues !== undefined && !Array.isArray(clues)) issues.push({ severity: "error", code: "invalid-unresolved-clues", message: "unresolved-clues.json must be an array.", path: "continuity/unresolved-clues.json" });
		let draftRevision: number | undefined;
		if (params.chapter !== undefined) {
			const planPath = `work/chapter-plans/${chapterName(params.chapter)}.md`;
			const contractPath = `work/scene-contracts/${chapterName(params.chapter)}.json`;
			if ((await this.readTextIfExists(this.projectFile(params.projectId, planPath), signal)) === undefined) issues.push({ severity: "error", code: "missing-chapter-plan", message: `Missing plan for chapter ${params.chapter}.`, path: planPath });
			else checkedFiles.push(planPath);
			if ((await this.readTextIfExists(this.projectFile(params.projectId, contractPath), signal)) === undefined) issues.push({ severity: "error", code: "missing-scene-contract", message: `Missing scene contract for chapter ${params.chapter}.`, path: contractPath });
			else checkedFiles.push(contractPath);
			const draft = await this.latestDraft(params.projectId, params.chapter, signal);
			if (!draft) issues.push({ severity: "error", code: "missing-chapter-draft", message: `Missing draft for chapter ${params.chapter}.` });
			else {
				draftRevision = draft.revision;
				checkedFiles.push(this.relativeProjectPath(params.projectId, draft.path));
			}
		}
		const status = (issues.some((issue) => issue.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report: ContinuityReport = { projectId: params.projectId, chapter: params.chapter, draftRevision, generatedAt: new Date().toISOString(), status, issues, checkedFiles };
		const reportName = params.chapter === undefined ? "project-integrity" : `${chapterName(params.chapter)}-integrity`;
		await this.writeAtomically(this.projectFile(params.projectId, `continuity/reports/${reportName}.json`), `${JSON.stringify(report, null, 2)}\n`, signal);
		return report;
	}

	async saveContinuityReport(params: SaveContinuityReportParams, signal?: AbortSignal): Promise<ContinuityReport> {
		await this.ensureProject(params.projectId, signal);
		const report: ContinuityReport = { projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, generatedAt: new Date().toISOString(), status: params.status, issues: params.issues.map((issue) => ({ severity: issue.severity === "suggestion" ? "warning" : issue.severity, code: issue.category, message: issue.problem, path: issue.evidence[0]?.file })), checkedFiles: [] };
		await this.writeAtomically(this.projectFile(params.projectId, `continuity/reports/${chapterName(params.chapter)}-semantic.json`), `${JSON.stringify({ ...report, source: "model", detailedIssues: params.issues }, null, 2)}\n`, signal);
		return report;
	}

	async extractChapterFacts(params: ExtractChapterFactsParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; status: "proposed"; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const relativePath = `work/facts/${chapterName(params.chapter)}-r${String(params.draftRevision).padStart(2, "0")}.json`;
		const path = this.projectFile(params.projectId, relativePath);
		const content = `${JSON.stringify({ version: 1, projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, status: "proposed", facts: params.facts, createdAt: new Date().toISOString() }, null, 2)}\n`;
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, status: "proposed", path: relativePath };
	}

	async saveWorkflowCheckpoint(params: SaveWorkflowCheckpointParams, signal?: AbortSignal): Promise<WorkflowCheckpoint> {
		await this.ensureProject(params.projectId, signal);
		const checkpoint: WorkflowCheckpoint = { ...params, lastUpdatedAt: new Date().toISOString() };
		const path = this.projectFile(params.projectId, "work/workflow-checkpoint.json");
		await this.writeAtomically(path, `${JSON.stringify(checkpoint, null, 2)}\n`, signal);
		return checkpoint;
	}

	async loadWorkflowCheckpoint(params: LoadWorkflowCheckpointParams, signal?: AbortSignal): Promise<WorkflowCheckpoint | undefined> {
		await this.ensureProject(params.projectId, signal);
		const value = await this.readJsonIfExists(this.projectFile(params.projectId, "work/workflow-checkpoint.json"), signal);
		if (value === undefined) return undefined;
		if (!isJsonRecord(value) || typeof value.phase !== "string" || typeof value.currentTask !== "string" || !Array.isArray(value.completedSteps) || !Array.isArray(value.pendingSteps)) throw new Error("Workflow checkpoint is invalid.");
		return value as unknown as WorkflowCheckpoint;
	}

	async saveQualityReport(params: SaveQualityReportParams, kind: "reader" | "review", signal?: AbortSignal): Promise<{ projectId: string; kind: "reader" | "review"; path: string; draftRevision?: number }> {
		await this.ensureProject(params.projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		const isChaseWifeChapterReport = isJsonRecord(project) && hasChaseWifeCapability(project) && params.chapter !== undefined;
		if (isChaseWifeChapterReport) {
			if (params.structuredReport === undefined) throw new Error(`Chase-wife ${kind} reports must include a structuredReport.`);
			if (kind === "reader" && !isReaderReport(params.structuredReport)) throw new Error("Reader reports must include structured evidence and at least one strongest moment.");
			if (kind === "review" && !isReviewReport(params.structuredReport)) throw new Error("Review reports must include structured issue arrays, priorities, and allowFinalize.");
		}
		const scope = params.chapter === undefined ? "manuscript" : chapterName(params.chapter);
		const relativePath = `evaluations/${kind}/${scope}.md`;
		const reportDirectory = this.projectFile(params.projectId, `evaluations/${kind}`);
		const entries = await this.listFiles(reportDirectory, signal);
		const revisions = entries.map((path) => path.match(new RegExp(`${scope}-r(\\d+)\\.md$`))?.[1]).filter((value): value is string => value !== undefined).map(Number);
		const reportRevision = (revisions.length > 0 ? Math.max(...revisions) : 0) + 1;
		const reportDraft = params.chapter === undefined ? undefined : params.draftRevision === undefined ? await this.latestDraft(params.projectId, params.chapter, signal) : { revision: params.draftRevision, content: await this.readTextIfExists(this.draftPath(params.projectId, params.chapter, params.draftRevision), signal) };
		const resolvedDraftRevision = reportDraft?.revision;
		if (isChaseWifeChapterReport && (reportDraft?.content === undefined || resolvedDraftRevision === undefined)) throw new Error(`Chase-wife ${kind} reports must bind to an existing current chapter draft.`);
		const structured = params.structuredReport;
		if (isChaseWifeChapterReport && reportDraft?.content !== undefined && (isReaderReport(structured) || isReviewReport(structured))) {
			const anchorIssues = validateQualityReportAnchors(reportDraft.content, structured);
			if (anchorIssues.length > 0) throw new Error(`Chase-wife ${kind} report evidence must bind to the current draft prose: ${anchorIssues.join("; ")}`);
		}
		const qualityStatus = isJsonRecord(structured) && (structured.status === "ok" || structured.status === "revision-required") ? structured.status : undefined;
		const qualityAllowFinalize = kind === "reader" ? qualityStatus === "ok" : isReviewReport(structured) && structured.status === "ok" && structured.allowFinalize;
		const header = [`# ${kind} report`, `projectId: ${params.projectId}`, params.chapter === undefined ? undefined : `chapter: ${params.chapter}`, resolvedDraftRevision === undefined ? undefined : `draftRevision: ${resolvedDraftRevision}`, reportDraft?.content === undefined ? undefined : `contentHash: ${sha256(reportDraft.content)}`, qualityStatus === undefined ? undefined : `qualityStatus: ${qualityStatus}`, qualityStatus === undefined ? undefined : `qualityAllowFinalize: ${qualityAllowFinalize}`, structured === undefined ? undefined : `structuredReportHash: ${hashJson(structured)}`, structured === undefined ? undefined : `structuredReport: ${JSON.stringify(structured)}`, `reportRevision: ${reportRevision}`, ""].filter((line): line is string => line !== undefined).join("\n");
		const content = normalizeText(`${header}\n${params.content}`);
		await this.writeAtomically(this.projectFile(params.projectId, `evaluations/${kind}/${scope}-r${String(reportRevision).padStart(2, "0")}.md`), content, signal);
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), content, signal);
		return { projectId: params.projectId, kind, path: relativePath, draftRevision: resolvedDraftRevision };
	}

	async recordWritingIssue(params: RecordWritingIssueParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; issue: Record<string, unknown> }> {
		await this.ensureProject(params.projectId, signal);
		const relativePath = "continuity/issues.json";
		const path = this.projectFile(params.projectId, relativePath);
		const existing = await this.readJsonIfExists(path, signal);
		const issues = Array.isArray(existing) ? existing.filter(isJsonRecord) : [];
		const previous = issues.find((issue) => issue.id === params.id);
		const issue: Record<string, unknown> = { ...params, occurrences: params.occurrences ?? (typeof previous?.occurrences === "number" ? previous.occurrences + 1 : 1), updatedAt: new Date().toISOString() };
		const nextIssues = previous === undefined ? [...issues, issue] : issues.map((item) => item.id === params.id ? issue : item);
		await this.writeAtomically(path, `${JSON.stringify(nextIssues, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath, issue };
	}

	async updateCharacterState(params: UpdateCharacterStateParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const normalized = normalizeJson(params.content, `character:${params.characterId}`);
		const relativePath = params.status === "confirmed" ? `characters/${params.characterId}.json` : `work/facts/${params.characterId}-character-state.json`;
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), normalized, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async updateClueLedger(params: UpdateClueLedgerParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string; count: number }> {
		await this.ensureProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const relativePath = params.status === "confirmed" ? "outline/foreshadowing-ledger.json" : "work/facts/clues-candidate.json";
		if (params.status === "confirmed") {
			const existing = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
			const prior = Array.isArray(existing) ? existing.filter(isJsonRecord) : [];
			const merged = [...prior.filter((item) => !params.entries.some((entry) => entry.id === item.id)), ...params.entries];
			await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(merged, null, 2)}\n`, signal);
		} else {
			await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(params.entries, null, 2)}\n`, signal);
		}
		return { projectId: params.projectId, status: params.status, path: relativePath, count: params.entries.length };
	}

	async updateTimeline(params: UpdateTimelineParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string; count: number }> {
		await this.ensureProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const relativePath = params.status === "confirmed" ? "timeline/events.json" : "work/facts/timeline-candidate.json";
		if (params.status === "confirmed") {
			const existing = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
			const prior = Array.isArray(existing) ? existing.filter(isJsonRecord) : [];
			const merged = [...prior.filter((item) => !params.events.some((event) => event.id === item.id)), ...params.events];
			await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(merged, null, 2)}\n`, signal);
		} else {
			await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(params.events, null, 2)}\n`, signal);
		}
		return { projectId: params.projectId, status: params.status, path: relativePath, count: params.events.length };
	}

	async scoreStoryFoundation(params: ScoreStoryFoundationParams, signal?: AbortSignal): Promise<{ projectId: string; total: number; passed: boolean; thresholds: { total: number; causality: number; climaxEnding: number }; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const total = Object.values(params.scores).reduce((sum, score) => sum + score, 0);
		const passed = total >= 70 && params.scores.causality >= 8 && params.scores.climaxEnding >= 7;
		const result = { projectId: params.projectId, version: 1, generatedAt: new Date().toISOString(), scores: params.scores, total, passed, thresholds: { total: 70, causality: 8, climaxEnding: 7 }, comment: params.comment };
		const relativePath = "evaluations/foundation.json";
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(result, null, 2)}\n`, signal);
		return { projectId: params.projectId, total, passed, thresholds: result.thresholds, path: relativePath };
	}

	async scoreChapter(params: ScoreChapterParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; total: number; passed: boolean; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const total = Object.values(params.scores).reduce((sum, score) => sum + score, 0);
		const passed = total >= 77 && params.scores.causality >= 7 && params.scores.continuity >= 7;
		const result = { projectId: params.projectId, version: 1, chapter: params.chapter, draftRevision: params.draftRevision, generatedAt: new Date().toISOString(), scores: params.scores, total, passed, thresholds: { total: 77, causality: 7, continuity: 7 }, comment: params.comment };
		const relativePath = `evaluations/chapter/${chapterName(params.chapter)}-r${String(params.draftRevision).padStart(2, "0")}.json`;
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(result, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, total, passed, path: relativePath };
	}

	async createVoiceFingerprint(params: CreateVoiceFingerprintParams, signal?: AbortSignal): Promise<{ projectId: string; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const normalized = normalizeJson(params.content, "voice-fingerprint");
		const relativePath = params.chapter === undefined ? "evaluations/voice-fingerprint.json" : `evaluations/chapter/${chapterName(params.chapter)}-voice-fingerprint.json`;
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), normalized, signal);
		return { projectId: params.projectId, path: relativePath };
	}

	private draftPath(projectId: string, chapter: number, revision: number): string {
		return this.projectFile(projectId, `work/drafts/${chapterName(chapter)}-r${String(revision).padStart(2, "0")}.md`);
	}

	async compareDraftVersions(params: CompareDraftVersionsParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; leftRevision: number; rightRevision: number; leftWords: number; rightWords: number; changedCharacters: number; similarity: number; path?: string }> {
		await this.ensureProject(params.projectId, signal);
		const left = await this.readTextIfExists(this.draftPath(params.projectId, params.chapter, params.leftRevision), signal);
		const right = await this.readTextIfExists(this.draftPath(params.projectId, params.chapter, params.rightRevision), signal);
		if (left === undefined || right === undefined) throw new Error("Both requested draft revisions must exist.");
		const leftWords = countWords(left);
		const rightWords = countWords(right);
		const relativePath = `evaluations/chapter/${chapterName(params.chapter)}-diff-r${params.leftRevision}-r${params.rightRevision}.json`;
		const result = { projectId: params.projectId, chapter: params.chapter, leftRevision: params.leftRevision, rightRevision: params.rightRevision, leftWords, rightWords, changedCharacters: [...left].filter((character, index) => character !== [...right][index]).length, similarity: textSimilarity(left, right), generatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(result, null, 2)}\n`, signal);
		return { ...result, path: relativePath };
	}

	async exportManuscript(params: ExportManuscriptParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; chapters: number; words: number }> {
		await this.ensureProject(params.projectId, signal);
		const paths = await this.listFiles(this.projectFile(params.projectId, "chapters"), signal);
		const chapterPaths = paths.filter((candidate) => candidate.endsWith(".md"));
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		if (isJsonRecord(project) && hasChaseWifeCapability(project)) {
			const seal = await this.readJsonIfExists(this.projectFile(params.projectId, "evaluations/manuscript/chase-wife-finalized.json"), signal);
			const pacing = await this.readJsonIfExists(this.projectFile(params.projectId, "continuity/reports/chase-wife-story-pacing.json"), signal);
			const beatSheet = await this.readJsonIfExists(this.projectFile(params.projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
			const arcReport = await this.readJsonIfExists(this.projectFile(params.projectId, chaseWifeArcReportPath("finalized")), signal);
			const endingEligibility = await this.checkChaseWifeEndingEligibility({ projectId: params.projectId }, signal);
			const pacingMode = isJsonRecord(pacing) && isJsonRecord(pacing.metrics) ? pacing.metrics.mode : undefined;
			if (!isJsonRecord(seal) || seal.status !== "finalized" || !isJsonRecord(pacing) || pacing.scope !== "finalized" || pacing.status === "error" || seal.storyPacingHash !== pacing.contentHash || seal.pacingMode !== pacingMode || !isJsonRecord(beatSheet) || seal.beatSheetHash !== hashJson(beatSheet) || !isJsonRecord(arcReport) || seal.arcReportHash !== hashStableReport(arcReport) || endingEligibility.status !== "ok" || seal.endingEligibilitySourceHash !== hashJson(endingEligibility.sourceHashes)) throw new Error("Chase-wife export requires a current finalized manuscript gate, pacing mode, beat sheet, arc report, event map, and ending eligibility report.");
			const sealedSources = Array.isArray(seal.sources) ? seal.sources.filter(isJsonRecord) : [];
			let staleSeal = sealedSources.length !== chapterPaths.length;
			for (const source of sealedSources) {
				if (typeof source.chapter !== "number" || typeof source.path !== "string" || typeof source.chapterHash !== "string" || typeof source.summaryPath !== "string" || typeof source.summaryHash !== "string" || typeof source.eventMapPath !== "string" || typeof source.eventMapHash !== "string" || typeof source.manifestPath !== "string" || typeof source.manifestHash !== "string") {
					staleSeal = true;
					continue;
				}
				const chapterContent = await this.readTextIfExists(this.projectFile(params.projectId, source.path), signal);
				const summary = await this.readJsonIfExists(this.projectFile(params.projectId, source.summaryPath), signal);
				const eventMap = await this.readJsonIfExists(this.projectFile(params.projectId, source.eventMapPath), signal);
				const manifest = await this.readJsonIfExists(this.projectFile(params.projectId, source.manifestPath), signal);
				if (chapterContent === undefined || sha256(chapterContent) !== source.chapterHash || !isJsonRecord(summary) || hashJson(summary) !== source.summaryHash || !isJsonRecord(eventMap) || hashJson(eventMap) !== source.eventMapHash || !isJsonRecord(manifest) || hashJson(manifest) !== source.manifestHash) staleSeal = true;
			}
			if (staleSeal) throw new Error("Chase-wife export is stale because a finalized chapter, summary, event map, or assembly manifest changed after the manuscript gate.");
		}
		const sections: string[] = [];
		let words = 0;
		for (const path of chapterPaths) {
			const content = await this.readTextIfExists(path, signal);
			if (content === undefined) continue;
			sections.push(content);
			words += countWords(content);
			if (params.includeSummaries) {
				const chapter = path.match(/chapter-(\d+)\.md$/)?.[1];
				if (chapter) {
					const summary = await this.readTextIfExists(this.projectFile(params.projectId, `summaries/chapter-${chapter}.json`), signal);
					if (summary) sections.push(`\n<!-- summary ${chapter} -->\n${summary}`);
				}
			}
		}
		const relativePath = "exports/manuscript.md";
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), normalizeText(sections.join("\n\n")), signal);
		return { projectId: params.projectId, path: relativePath, chapters: chapterPaths.length, words };
	}

	async finalizeManuscript(params: FinalizeManuscriptParams, signal?: AbortSignal): Promise<{ projectId: string; status: "finalized"; path: string; storyPacingHash: string; chapters: number }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		if (params.confirmation !== "USER_CONFIRMED") throw new Error("Manuscript finalization requires confirmation=USER_CONFIRMED.");
		const pacing = await this.checkChaseWifeStoryPacing({ projectId: params.projectId, scope: "finalized" }, signal);
		if (pacing.status === "error") throw new Error("The finalized story pacing report has errors; the manuscript cannot be sealed.");
		const endingEligibility = await this.checkChaseWifeEndingEligibility({ projectId: params.projectId }, signal);
		if (endingEligibility.status === "error") throw new Error("The confirmed harm, repair, and ending ledgers do not satisfy the ending contract.");
		const arc = await this.checkChaseWifeArc({ projectId: params.projectId, scope: "finalized" }, signal);
		if (arc.status === "error") throw new Error("The chase-wife beat sheet and arc report have errors; the manuscript cannot be sealed.");
		const beatSheet = await this.readJsonIfExists(this.projectFile(params.projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
		const arcReport = await this.readJsonIfExists(this.projectFile(params.projectId, chaseWifeArcReportPath("finalized")), signal);
		if (!isJsonRecord(beatSheet) || !isJsonRecord(arcReport)) throw new Error("The chase-wife manuscript requires a current beat sheet and arc report.");
		const paths = (await this.listFiles(this.projectFile(params.projectId, "chapters"), signal)).filter((path) => /chapter-\d+\.md$/u.test(path)).sort();
		if (paths.length === 0) throw new Error("A manuscript requires at least one finalized chapter.");
		const sources = [] as Array<{ chapter: number; path: string; chapterHash: string; chars: number; summaryPath: string; summaryHash: string; eventMapPath: string; eventMapHash: string; manifestPath: string; manifestHash: string }>;
		for (const path of paths) {
			const content = await this.readTextIfExists(path, signal);
			if (content === undefined) throw new Error(`Finalized chapter is missing: ${path}`);
			const chapterNumber = Number(path.match(/chapter-(\d+)\.md$/u)?.[1] ?? 0);
			if (!isPositiveInteger(chapterNumber)) throw new Error(`Finalized chapter path is invalid: ${path}`);
			const summaryPath = `summaries/${chapterName(chapterNumber)}.json`;
			const eventMapPath = `work/chase-wife-events/${chapterName(chapterNumber)}.json`;
			const summary = await this.readJsonIfExists(this.projectFile(params.projectId, summaryPath), signal);
			const eventMap = await this.readJsonIfExists(this.projectFile(params.projectId, eventMapPath), signal);
			if (!isJsonRecord(summary) || !isJsonRecord(eventMap) || typeof summary.draftRevision !== "number") throw new Error(`Finalized chapter ${chapterNumber} is missing its current summary or event map.`);
			const manifestPath = `work/chase-wife-assemblies/${chapterName(chapterNumber)}-r${String(summary.draftRevision).padStart(2, "0")}.json`;
			const manifest = await this.readJsonIfExists(this.projectFile(params.projectId, manifestPath), signal);
			if (!isJsonRecord(manifest)) throw new Error(`Finalized chapter ${chapterNumber} is missing its current assembly manifest.`);
			sources.push({ chapter: chapterNumber, path: this.relativeProjectPath(params.projectId, path), chapterHash: sha256(content), chars: countChineseCharacters(content), summaryPath, summaryHash: hashJson(summary), eventMapPath, eventMapHash: hashJson(eventMap), manifestPath, manifestHash: hashJson(manifest) });
		}
		const relativePath = "evaluations/manuscript/chase-wife-finalized.json";
		const seal = { version: 3, projectId: params.projectId, status: "finalized" as const, scope: "finalized" as const, storyPacingHash: pacing.contentHash, pacingMode: pacing.metrics.mode, beatSheetHash: hashJson(beatSheet), arcReportHash: hashStableReport(arcReport), endingEligibilitySourceHash: hashJson(endingEligibility.sourceHashes), sources, finalizedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(seal, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: "finalized", path: relativePath, storyPacingHash: pacing.contentHash, chapters: paths.length };
	}

	async checkAiArtifacts(params: CheckAiArtifactsParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; status: "ok" | "warning" | "error"; severity: "none" | "warning" | "error"; findingCount: number; score: number; passed: boolean; findings: string[]; findingRecords: AiArtifactFindingRecord[]; contentHash: string; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const draft = params.draftRevision === undefined ? await this.latestDraft(params.projectId, params.chapter, signal) : { revision: params.draftRevision, content: await this.readTextIfExists(this.draftPath(params.projectId, params.chapter, params.draftRevision), signal) };
		if (!draft || draft.content === undefined) throw new Error("The requested chapter draft does not exist.");
		const content = draft.content;
		const findings: string[] = [];
		const findingRecords: AiArtifactFindingRecord[] = [];
		const findingKeys = new Set<string>();
		const addFinding = (key: string, message: string, count = 1, hardFail = false): void => {
			if (findingKeys.has(key)) return;
			findingKeys.add(key);
			findings.push(message);
			findingRecords.push({ code: key, count, severity: hardFail ? "error" : "warning", hardFail });
		};
		const sentences = content.split(/[。！？；!?;]+/u).map((sentence) => sentence.trim()).filter(Boolean);
		const starts = new Map<string, number>();
		for (const sentence of sentences) {
			const start = [...sentence].slice(0, 4).join("");
			starts.set(start, (starts.get(start) ?? 0) + 1);
		}
		// 每个 pattern 的第二项是该词在 UTF-8 被误读为 GBK 后的乱码形态；计入同一模板表达可拦截编码损坏的正稿。
		const templatePatterns = [
			{ key: "仿佛", patterns: ["仿佛", "浠夸經"] },
			{ key: "似乎", patterns: ["似乎", "浼间箮"] },
			{ key: "不禁", patterns: ["不禁", "涓嶇"] },
			{ key: "总之", patterns: ["总之", "鎬讳箣"] },
			{ key: "这意味着", patterns: ["这意味着", "杩欐剰鍛崇潃"] },
			{ key: "as-if", patterns: ["as if", "as though"] },
		].map(({ key, patterns }) => ({ key, count: Math.max(...patterns.map((pattern) => (content.match(new RegExp(pattern, "giu")) ?? []).length)) })).filter((item) => item.count >= 3);
		const repeatedSentenceStartCount = Math.max(0, ...starts.values());
		if (repeatedSentenceStartCount >= 3 && templatePatterns.length === 0) addFinding("repeated-sentence-start", "重复句式开头", repeatedSentenceStartCount);
		const maxTemplateCount = Math.max(0, ...templatePatterns.map((item) => item.count));
		if (templatePatterns.length > 0) addFinding("template-expression", `高频模板表达：${templatePatterns.map(({ key, count }) => `${key}（${count}次）`).join("、")}`, maxTemplateCount, maxTemplateCount >= 4);
		// "鈥斺€" 是 "——" 的乱码形态（UTF-8 误读为 GBK）；文本要么含正常破折号要么含乱码形态，分别计数不会重复。
		const emDashCount = (content.match(/—/gu) ?? []).length + (content.split("鈥斺€").length - 1);
		if (emDashCount >= 4) addFinding("em-dash", "破折号使用频率较高", emDashCount, emDashCount >= 6);
		const repeatedPsychology = (content.match(/(?:我终于明白|我知道|我累了|他才意识到|我不想再|对不起|我错了|I finally understand|I know|I'm tired|I was wrong)/giu) ?? []).length;
		if (repeatedPsychology >= 3) addFinding("repeated-psychology-or-apology", "心理结论或道歉反复出现，缺少新的行动或后果", repeatedPsychology, repeatedPsychology >= 5);
		const paragraphs = content.split(/\r?\n\s*\r?\n/gu).map((paragraph) => paragraph.trim()).filter((paragraph) => paragraph.length > 0);
		const psychologyParagraphs = paragraphs.filter((paragraph) => /(?:明白|意识到|知道|累了|后悔|爱着|害怕|不想)/u.test(paragraph) && !containsActionEvidence(paragraph)).length;
		if (psychologyParagraphs >= 3) addFinding("psychology-without-action", "连续心理解释没有被动作、对话或选择打断", psychologyParagraphs, psychologyParagraphs >= 5);
		const actionExplanationMatches = content.match(/(?:走到|转身|抬手|握住|放下|打开|关上|离开|看着|拿出)[^。！？!?]{0,30}(?:这意味着|说明了|我终于明白|他才意识到)/gu) ?? [];
		if (actionExplanationMatches.length >= 2) addFinding("action-then-explanation", "动作后重复立即解释情绪或意义", actionExplanationMatches.length, actionExplanationMatches.length >= 4);
		if (paragraphs.length >= 5) {
			const lengths = paragraphs.map((paragraph) => [...paragraph].length);
			const averageLength = lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
			if (averageLength > 0 && Math.max(...lengths) - Math.min(...lengths) <= averageLength * 0.15) addFinding("uniform-paragraph-length", "段落长度过度均匀，可能形成机械节奏", paragraphs.length);
		}
		// 垂直类型机械检测（女性社会派悬疑常用 AI 痕迹；一律 warning，不 hard fail）
		const verticalPatterns = [
			{ key: "epiphany-cliche", patterns: ["她忽然明白", "她突然明白", "直到这一刻", "原来如此", "他第一次意识到", "她终于明白"], min: 2, label: "顿悟/后知后觉模板（她忽然明白、直到这一刻、原来如此）" },
			{ key: "calm-heroine", patterns: ["她很平静", "她平静地说", "她冷静地", "她没有哭"], min: 3, label: "女主持续平静模板（她很平静/冷静地说）" },
			{ key: "body-cliche", patterns: ["沉默", "攥紧手指", "眼眶发红", "红了眼眶", "握紧的拳"], min: 3, label: "身体反应套话反复（沉默/攥紧手指/眼眶发红）" },
			{ key: "phone-turn", patterns: ["电话响了", "手机震动", "收到一条短信", "来电显示"], min: 2, label: "转折依赖电话/短信推进" },
		].map(({ key, patterns, min, label }) => ({ key, label, min, count: Math.max(...patterns.map((pattern) => (content.match(new RegExp(pattern, "gu")) ?? []).length)) })).filter((item) => item.count >= item.min);
		for (const item of verticalPatterns) addFinding(item.key, `${item.label}（${item.count}次）`, item.count);
		const shortSentences = sentences.filter((sentence) => [...sentence].length <= 6).length;
		if (sentences.length >= 8 && shortSentences >= 8 && shortSentences / sentences.length >= 0.4) addFinding("short-sentence-parallelism", `短句排比过多：${shortSentences} 句短句占 ${Math.round((shortSentences / sentences.length) * 100)}%`, shortSentences);
		const findingCount = findings.length;
		const passed = findingCount <= 1 && !findingRecords.some((finding) => finding.hardFail);
		const severity = !passed || findingCount >= 2 ? "error" as const : findingCount > 0 ? "warning" as const : "none" as const;
		const result = { projectId: params.projectId, chapter: params.chapter, draftRevision: draft.revision, status: severity === "error" ? "error" as const : findingCount === 0 ? "ok" as const : "warning" as const, severity, findingCount, score: Math.max(0, 100 - findingCount * 20), passed, findings, findingRecords, contentHash: sha256(draft.content), generatedAt: new Date().toISOString() };
		const relativePath = `evaluations/chapter/${chapterName(params.chapter)}-ai-artifacts-r${String(draft.revision).padStart(2, "0")}.json`;
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(result, null, 2)}\n`, signal);
		return { ...result, path: relativePath };
	}

	private async ensureChaseWifeProject(projectId: string, signal?: AbortSignal): Promise<void> {
		await this.ensureProject(projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		if (!isJsonRecord(project) || !hasChaseWifeCapability(project)) throw new Error("This tool is only available for projects with the chase-wife relationship mechanism.");
	}

	private async validateChaseWifeLedgerEvidence(
		projectId: string,
		evidence: unknown,
		label: string,
		signal?: AbortSignal,
		scope: Exclude<ChaseWifeArtifactScope, "planned"> = "finalized",
	): Promise<string[]> {
		if (!Array.isArray(evidence) || evidence.length === 0) return [`${label} requires at least one current ${scope} prose evidence anchor`];
		const issues: string[] = [];
		for (const [index, item] of evidence.entries()) {
			const itemLabel = `${label} evidence ${index + 1}`;
			if (!isChaseWifeLedgerEvidence(item)) {
				issues.push(`${itemLabel} is invalid`);
				continue;
			}
			const content = await this.readChaseWifeEvidenceSource(projectId, item.chapter, scope, signal);
			if (content === undefined) {
				issues.push(`${itemLabel} must reference an ${scope} chapter`);
				continue;
			}
			if (sha256(content) !== item.contentHash) {
				issues.push(`${itemLabel} is stale because the referenced chapter changed`);
				continue;
			}
			const anchorIssue = validateSemanticEvidenceAnchor(content, item, itemLabel);
			if (anchorIssue !== undefined) issues.push(anchorIssue);
		}
		return issues;
	}

	private async readChaseWifeEvidenceSource(
		projectId: string,
		chapter: number,
		scope: Exclude<ChaseWifeArtifactScope, "planned">,
		signal?: AbortSignal,
	): Promise<string | undefined> {
		if (scope === "finalized") {
			if (!await this.isChaseWifeChapterFinalized(projectId, chapter, signal)) return undefined;
			return this.readTextIfExists(this.projectFile(projectId, `chapters/${chapterName(chapter)}.md`), signal);
		}
		const assembly = await this.latestChaseWifeAssembly(projectId, chapter, signal);
		if (assembly !== undefined) return assembly.content;
		// Converged 模式：证据正文来自 unified 装配草稿。
		const projection = await this.projectChaseWifeChapter(projectId, chapter, signal);
		if (projection === undefined) return undefined;
		const assemblyPaths = (await this.listFiles(this.projectFile(projectId, "work/unified-assemblies"), signal)).filter((path) => new RegExp(`${chapterName(chapter)}-r\\d+\\.json$`, "u").test(path)).sort();
		for (const path of assemblyPaths.reverse()) {
			const manifest = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(manifest) || !isPositiveInteger(manifest.draftRevision) || typeof manifest.assembledHash !== "string") continue;
			const content = await this.readTextIfExists(this.draftPath(projectId, chapter, manifest.draftRevision), signal);
			if (content !== undefined && sha256(normalizeText(content)) === manifest.assembledHash) return content;
		}
		return undefined;
	}

	private async validateChaseWifeConfirmedLedgerWrite(
		projectId: string,
		harms: unknown[],
		repairs: unknown[],
		signal?: AbortSignal,
	): Promise<string[]> {
		const harmRecords = harms.filter(isJsonRecord);
		const repairRecords = repairs.filter(isJsonRecord);
		const issues: string[] = [];
		for (const harm of harmRecords) {
			const harmId = typeof harm.id === "string" ? harm.id : "unknown";
			issues.push(...await this.validateChaseWifeLedgerEvidence(projectId, harm.evidence, `relationship harm ${harmId}`, signal, "assembled"));
			if (harm.recognizedByMale === true || harm.recognitionEvidence !== undefined) {
				issues.push(...await this.validateChaseWifeLedgerEvidence(projectId, harm.recognitionEvidence, `relationship harm ${harmId} male recognition`, signal, "assembled"));
			}
		}
		for (const repair of repairRecords) {
			const repairId = typeof repair.id === "string" ? repair.id : "unknown";
			issues.push(...await this.validateChaseWifeLedgerEvidence(projectId, repair.evidence, `repair ${repairId}`, signal, "assembled"));
		}
		issues.push(...await this.validateChaseWifeLedgerEventBindings(projectId, harmRecords, repairRecords, "assembled", signal, false));
		return issues;
	}

	private async chaseWifePacingMode(projectId: string, signal?: AbortSignal): Promise<"fast-burn" | "standard"> {
		const beatSheet = await this.readJsonIfExists(this.projectFile(projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
		return isJsonRecord(beatSheet) && (beatSheet.pacingMode === "fast-burn" || beatSheet.pacingMode === "standard") ? beatSheet.pacingMode : "standard";
	}

	async saveChaseWifeBeatSheet(params: SaveChaseWifeBeatSheetParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; beats: number }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		if (!isValidPovMode(params.povMode)) throw new Error("Chase-wife beat sheets must declare heroine-first-person or split-pov.");
		const openingMode = params.openingMode ?? "quiet-dislocation";
		const openingIntroIssue = validateChaseWifeOpeningIntro(params.openingIntro);
		if (openingIntroIssue !== undefined) throw new Error(openingIntroIssue);
		if (!isNonEmptyString(params.openingConflict)) throw new Error("The chase-wife opening must define a concrete conflict.");
		if (!isOrderedUniqueArc(params.heroineArc, CHASE_WIFE_HEROINE_ARC_ORDER)) throw new Error("The heroine arc must contain unique phases in order.");
		if (!isOrderedUniqueArc(params.maleArc, CHASE_WIFE_MALE_ARC_ORDER)) throw new Error("The male arc must contain unique phases in order.");
		const beats = [...params.beats].sort((left, right) => left.beat - right.beat);
		if (beats.length < 12 || beats.length > 24) throw new Error("Chase-wife beat sheets must contain 12-24 beats.");
		const beatNumbers = beats.map((beat) => beat.beat);
		if (new Set(beatNumbers).size !== beatNumbers.length) throw new Error("Chase-wife beat numbers must be unique.");
		if (beatNumbers.some((beatNumber, index) => beatNumber !== index + 1)) throw new Error("Chase-wife beat numbers must be contiguous starting at 1.");
		let heroinePhaseIndex = -1;
		let malePhaseIndex = -1;
		for (const beat of beats) {
			if (beat.heroinePhase !== undefined) {
				const current = CHASE_WIFE_HEROINE_ARC_ORDER.get(beat.heroinePhase) ?? -1;
				if (current < heroinePhaseIndex) throw new Error("Heroine beat phases must not move backward.");
				heroinePhaseIndex = current;
			}
			if (beat.malePhase !== undefined) {
				const current = CHASE_WIFE_MALE_ARC_ORDER.get(beat.malePhase) ?? -1;
				if (current < malePhaseIndex) throw new Error("Male beat phases must not move backward.");
				malePhaseIndex = current;
			}
		}
		if (beats.some((beat) => beat.paywallHook && beat.beat > Math.ceil(beats.length / 2))) throw new Error("The chase-wife paywall hook must appear in the opening half.");
		const relativePath = "outline/genre/chase-wife-beat-sheet.json";
		const document = { version: 2, genre: "chase-wife", projectId: params.projectId, povMode: params.povMode, ...(params.pacingMode ? { pacingMode: params.pacingMode } : {}), openingMode, heroineArc: params.heroineArc, maleArc: params.maleArc, ...(params.openingIntro ? { openingIntro: params.openingIntro } : {}), openingConflict: params.openingConflict, stayingLogic: params.stayingLogic, beats, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath, beats: beats.length };
	}

	async checkChaseWifeArc(params: CheckChaseWifeArcParams, signal?: AbortSignal): Promise<{ projectId: string; scope: ChaseWifeArtifactScope; status: "ok" | "warning" | "error"; issues: string[]; checkedBeats: number; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const scope = params.scope ?? "planned";
		const relativePath = "outline/genre/chase-wife-beat-sheet.json";
		const value = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
		const issues: string[] = [];
		let hasStructuralError = false;
		let checkedBeats = 0;
		if (!isJsonRecord(value) || !Array.isArray(value.beats)) {
			issues.push("missing or invalid chase-wife beat sheet");
			hasStructuralError = true;
		} else {
			if (!isValidPovMode(value.povMode)) {
				issues.push("chase-wife beat sheet must declare heroine-first-person or split-pov");
				hasStructuralError = true;
			}
			const openingIntroIssue = validateChaseWifeOpeningIntro(value.openingIntro);
			if (openingIntroIssue !== undefined) {
				issues.push(openingIntroIssue);
				hasStructuralError = true;
			}
			if (!isNonEmptyString(value.openingConflict)) {
				issues.push("opening must define a concrete conflict");
				hasStructuralError = true;
			}
			if (!isChaseWifeStayingLogic(value.stayingLogic)) {
				issues.push("staying logic must explain why the heroine remains before choosing to leave");
				hasStructuralError = true;
			}
			if (!isOrderedUniqueArc(value.heroineArc, CHASE_WIFE_HEROINE_ARC_ORDER)) {
				issues.push("heroine arc must contain unique phases in order");
				hasStructuralError = true;
			}
			if (!isOrderedUniqueArc(value.maleArc, CHASE_WIFE_MALE_ARC_ORDER)) {
				issues.push("male arc must contain unique phases in order");
				hasStructuralError = true;
			}
			for (const phase of ["injury", "recognition", "irreversible-exit", "self-rebuild", "final-boundary"]) {
				if (!Array.isArray(value.heroineArc) || !value.heroineArc.includes(phase)) {
					issues.push(`heroine arc is missing ${phase}`);
					hasStructuralError = true;
				}
			}
			for (const phase of ["entitlement", "loss-of-control", "wrong-pursuit", "real-consequence", "recognition"]) {
				if (!Array.isArray(value.maleArc) || !value.maleArc.includes(phase)) {
					issues.push(`male arc is missing ${phase}`);
					hasStructuralError = true;
				}
			}
			const beats = value.beats.filter(isChaseWifeBeat);
			checkedBeats = beats.length;
			if (beats.length !== value.beats.length) {
				issues.push("beat sheet contains invalid beat records");
				hasStructuralError = true;
			}
			if (beats.length < 12 || beats.length > 24) {
				issues.push("chase-wife beat sheet must contain 12-24 valid beats");
				hasStructuralError = true;
			}
			const beatNumbers = beats.map((beat) => beat.beat);
			if (new Set(beatNumbers).size !== beatNumbers.length || beatNumbers.some((beatNumber, index) => beatNumber !== index + 1)) {
				issues.push("beat numbers must be unique and contiguous starting at 1");
				hasStructuralError = true;
			}
			const orderedBeats = [...beats].sort((left, right) => left.beat - right.beat);
			let previousHeroinePhase = -1;
			let previousMalePhase = -1;
			for (const beat of orderedBeats) {
				if (beat.heroinePhase !== undefined) {
					const current = CHASE_WIFE_HEROINE_ARC_ORDER.get(beat.heroinePhase) ?? -1;
					if (current < previousHeroinePhase) {
						issues.push(`beat ${beat.beat} moves the heroine phase backward`);
						hasStructuralError = true;
					}
					previousHeroinePhase = Math.max(previousHeroinePhase, current);
				}
				if (beat.malePhase !== undefined) {
					const current = CHASE_WIFE_MALE_ARC_ORDER.get(beat.malePhase) ?? -1;
					if (current < previousMalePhase) {
						issues.push(`beat ${beat.beat} moves the male phase backward`);
						hasStructuralError = true;
					}
					previousMalePhase = Math.max(previousMalePhase, current);
				}
			}
			if (orderedBeats.some((beat) => beat.paywallHook && beat.beat > Math.ceil(orderedBeats.length / 2))) {
				issues.push("the paywall hook must appear in the opening half");
				hasStructuralError = true;
			}
			const eventMapPaths = (await this.listFiles(this.projectFile(params.projectId, "work/chase-wife-events"), signal)).filter((path) => /chapter-\d+\.json$/u.test(path));
			const scopedEventMapPaths: string[] = [];
			for (const eventMapPath of eventMapPaths) {
				const chapter = Number(eventMapPath.match(/chapter-(\d+)\.json$/u)?.[1] ?? 0);
				if (chapter > 0 && await this.isChaseWifeChapterInScope(params.projectId, chapter, scope, signal)) scopedEventMapPaths.push(eventMapPath);
			}
			if (scope !== "planned" && scopedEventMapPaths.length === 0 && eventMapPaths.length > 0) {
				issues.push(`no ${scope} chase-wife event maps are available for Beat coverage`);
				hasStructuralError = true;
			}
			if (eventMapPaths.length > 0) {
				const referencedBeatIds = new Set<number>();
				for (const eventMapPath of scopedEventMapPaths) {
					const eventMap = await this.readJsonIfExists(eventMapPath, signal);
					if (!isJsonRecord(eventMap) || !Array.isArray(eventMap.events)) continue;
					for (const event of eventMap.events) {
						if (!isJsonRecord(event) || !Array.isArray(event.beatRefs)) continue;
						for (const beatRef of event.beatRefs) if (isPositiveInteger(beatRef)) referencedBeatIds.add(beatRef);
					}
				}
				for (const beat of orderedBeats) {
					if (!referencedBeatIds.has(beat.beat)) {
						issues.push(`beat ${beat.beat} is not referenced by any chapter event`);
						hasStructuralError = true;
					}
				}
			}
			const heroineExitBeat = orderedBeats.findIndex((beat) => beat.heroinePhase === "irreversible-exit");
			const maleConsequenceBeat = orderedBeats.findIndex((beat) => beat.malePhase === "real-consequence");
			const maleRecognitionBeat = orderedBeats.findIndex((beat) => beat.malePhase === "recognition");
			if (heroineExitBeat < 0) {
				issues.push("heroine arc has no irreversible-exit beat");
				hasStructuralError = true;
			}
			if (maleRecognitionBeat >= 0 && (maleConsequenceBeat < 0 || maleRecognitionBeat < maleConsequenceBeat)) {
				issues.push("male recognition must follow a real-consequence beat");
				hasStructuralError = true;
			}
			if (isValidPovMode(value.povMode) && value.povMode === "split-pov" && !orderedBeats.some((beat) => beat.targetTrack === "male" || beat.targetTrack === "shared")) {
				issues.push("split-pov beat sheet must allocate at least one beat to the male or shared track");
				hasStructuralError = true;
			}
			const earlyPain = orderedBeats.filter((beat) => beat.beat <= Math.ceil(orderedBeats.length / 2) && beat.painPoint.trim().length > 0).length;
			const lateReward = orderedBeats.filter((beat) => beat.beat > Math.ceil(orderedBeats.length / 2) && beat.rewardPoint.trim().length > 0).length;
			if (earlyPain === 0) issues.push("opening half has no explicit pain-point accumulation");
			if (lateReward === 0) issues.push("ending half has no explicit reward or consequence release");
		}
		const status = (hasStructuralError ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = { projectId: params.projectId, genre: "chase-wife", scope, generatedAt: new Date().toISOString(), status, issues, checkedBeats };
		const reportPath = chaseWifeArcReportPath(scope);
		await this.writeVersionedJsonReport(params.projectId, reportPath, report, signal);
		return { ...report, path: reportPath };
	}

	async saveChaseWifeHarmLedger(params: SaveChaseWifeHarmLedgerParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; count: number; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		if (new Set(params.harms.map((harm) => harm.id)).size !== params.harms.length) throw new Error("Relationship harm IDs must be unique.");
		const relativePath = params.status === "confirmed" ? "continuity/chase-wife-harm-ledger.json" : "work/facts/chase-wife-harm-ledger-candidate.json";
		const path = this.projectFile(params.projectId, relativePath);
		const existing = params.status === "confirmed" ? await this.readJsonIfExists(path, signal) : undefined;
		const prior = isJsonRecord(existing) && Array.isArray(existing.harms) ? existing.harms.filter(isJsonRecord) : [];
		const merged = params.status === "confirmed"
			? [...prior.filter((item) => !params.harms.some((harm) => harm.id === item.id)), ...params.harms]
			: params.harms;
		if (params.status === "confirmed") {
			const repairLedger = await this.readJsonIfExists(this.projectFile(params.projectId, "continuity/chase-wife-repair-ledger.json"), signal);
			const existingRepairs = isJsonRecord(repairLedger) && Array.isArray(repairLedger.repairs) ? repairLedger.repairs.filter(isJsonRecord).map(normalizeChaseWifeRepair) : [];
			const issues = await this.validateChaseWifeConfirmedLedgerWrite(params.projectId, merged, existingRepairs, signal);
			if (issues.length > 0) throw new Error(`Confirmed relationship harm ledger cannot be saved: ${issues.join("; ")}`);
		}
		const document = { version: 1, projectId: params.projectId, genre: "chase-wife", status: params.status, harms: merged, updatedAt: new Date().toISOString() };
		await this.writeAtomically(path, `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, count: params.harms.length, path: relativePath };
	}

	async saveChaseWifeRepairLedger(params: SaveChaseWifeRepairLedgerParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; count: number; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		if (new Set(params.repairs.map((repair) => repair.id)).size !== params.repairs.length) throw new Error("Repair attempt IDs must be unique.");
		for (const repair of params.repairs) {
			if (repair.requestedReward === true && repair.requestedRewardDescription === undefined) throw new Error(`Repair ${repair.id} must describe the requested reward when requestedReward is true.`);
			if (repair.requestedReward === false && repair.requestedRewardDescription !== undefined) throw new Error(`Repair ${repair.id} cannot describe a requested reward when requestedReward is false.`);
		}
		const harmPath = this.projectFile(params.projectId, "continuity/chase-wife-harm-ledger.json");
		const harmLedger = await this.readJsonIfExists(harmPath, signal);
		const harmIds = new Set(isJsonRecord(harmLedger) && Array.isArray(harmLedger.harms) ? harmLedger.harms.filter(isJsonRecord).map((harm) => harm.id).filter((id): id is string => typeof id === "string") : []);
		if (params.status === "confirmed" && params.repairs.some((repair) => repair.addressesHarmIds.some((harmId) => !harmIds.has(harmId)))) throw new Error("Confirmed repair attempts must reference existing confirmed relationship harms.");
		const relativePath = params.status === "confirmed" ? "continuity/chase-wife-repair-ledger.json" : "work/facts/chase-wife-repair-ledger-candidate.json";
		const path = this.projectFile(params.projectId, relativePath);
		const existing = params.status === "confirmed" ? await this.readJsonIfExists(path, signal) : undefined;
		const prior = isJsonRecord(existing) && Array.isArray(existing.repairs) ? existing.repairs.filter(isJsonRecord) : [];
		const normalizedRepairs = params.repairs.map((repair) => normalizeChaseWifeRepair(repair as unknown as JsonRecord));
		const merged = params.status === "confirmed"
			? [...prior.filter((item) => !normalizedRepairs.some((repair) => repair.id === item.id)).map(normalizeChaseWifeRepair), ...normalizedRepairs]
			: normalizedRepairs;
		if (params.status === "confirmed") {
			const existingHarms = isJsonRecord(harmLedger) && Array.isArray(harmLedger.harms) ? harmLedger.harms.filter(isJsonRecord) : [];
			const issues = await this.validateChaseWifeConfirmedLedgerWrite(params.projectId, existingHarms, merged, signal);
			if (issues.length > 0) throw new Error(`Confirmed repair ledger cannot be saved: ${issues.join("; ")}`);
		}
		const document = { version: 1, projectId: params.projectId, genre: "chase-wife", status: params.status, repairs: merged, updatedAt: new Date().toISOString() };
		await this.writeAtomically(path, `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, count: params.repairs.length, path: relativePath };
	}

	async saveChaseWifeEndingContract(params: SaveChaseWifeEndingContractParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const relativePath = params.status === "confirmed" ? "outline/genre/chase-wife-ending-contract.json" : "work/facts/chase-wife-ending-contract-candidate.json";
		const document = { version: 1, projectId: params.projectId, genre: "chase-wife", status: params.status, contract: params.contract, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async checkChaseWifeHarmRepairProgress(params: CheckChaseWifeHarmRepairProgressParams, signal?: AbortSignal): Promise<{ projectId: string; chapter?: number; status: "on-track" | "warning" | "stalled"; issues: string[]; harms: Array<{ harmId: string; severity: string; recognizedByMale: boolean; repairCount: number; credibleRepairCount: number; evidenceBound: boolean; stage: "recognition-pending" | "repair-pending" | "repair-credible"; unresolvedDebt: string[] }>; wrongPursuitCount: number; realConsequenceCount: number; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const harmDocument = await this.readJsonIfExists(this.projectFile(params.projectId, "continuity/chase-wife-harm-ledger.json"), signal);
		const repairDocument = await this.readJsonIfExists(this.projectFile(params.projectId, "continuity/chase-wife-repair-ledger.json"), signal);
		const issues: string[] = [];
		let stalled = false;
		const harms = isJsonRecord(harmDocument) && Array.isArray(harmDocument.harms) ? harmDocument.harms.filter(isJsonRecord) : [];
		const repairs = isJsonRecord(repairDocument) && Array.isArray(repairDocument.repairs) ? repairDocument.repairs.filter(isJsonRecord).map(normalizeChaseWifeRepair) : [];
		if (!isJsonRecord(harmDocument) || harmDocument.status !== "confirmed" || harms.length === 0) {
			issues.push("a confirmed relationship harm ledger is required");
			stalled = true;
		}
		if (!isJsonRecord(repairDocument) || repairDocument.status !== "confirmed") {
			issues.push("a confirmed repair ledger is not available yet");
			stalled = true;
		}
		issues.push(...await this.validateChaseWifeLedgerEventBindings(params.projectId, harms, repairs, "assembled", signal));
		const maximumChapter = params.chapter ?? Number.POSITIVE_INFINITY;
		const scopedEvidence = (value: unknown): unknown[] => Array.isArray(value) ? value.filter((item) => isChaseWifeLedgerEvidence(item) && item.chapter <= maximumChapter) : [];
		const progress: Array<{ harmId: string; severity: string; recognizedByMale: boolean; repairCount: number; credibleRepairCount: number; evidenceBound: boolean; stage: "recognition-pending" | "repair-pending" | "repair-credible"; unresolvedDebt: string[] }> = [];
		for (const harm of harms) {
			const harmId = typeof harm.id === "string" ? harm.id : "unknown";
			const harmEvidence = scopedEvidence(harm.evidence);
			const harmEvidenceIssues = harmEvidence.length === 0 ? [`relationship harm ${harmId} has no current prose evidence`] : await this.validateChaseWifeLedgerEvidence(params.projectId, harmEvidence, `relationship harm ${harmId}`, signal, "assembled");
			issues.push(...harmEvidenceIssues);
			if (harmEvidenceIssues.length > 0) stalled = true;
			const recognitionEvidence = scopedEvidence(harm.recognitionEvidence);
			const recognitionIssues = harm.recognizedByMale === true && recognitionEvidence.length > 0 ? await this.validateChaseWifeLedgerEvidence(params.projectId, recognitionEvidence, `relationship harm ${harmId} male recognition`, signal, "assembled") : [];
			issues.push(...recognitionIssues);
			if (recognitionIssues.length > 0) stalled = true;
			const recognizedByMale = harm.recognizedByMale === true && recognitionEvidence.length > 0 && recognitionIssues.length === 0;
			const relatedRepairs = repairs.filter((repair) => Array.isArray(repair.addressesHarmIds) && repair.addressesHarmIds.includes(harmId));
			let credibleRepairCount = 0;
			for (const repair of relatedRepairs) {
				const repairEvidence = scopedEvidence(repair.evidence);
				if (repairEvidence.length === 0) continue;
				const repairId = typeof repair.id === "string" ? repair.id : "unknown";
				const repairEvidenceIssues = await this.validateChaseWifeLedgerEvidence(params.projectId, repairEvidence, `repair ${repairId}`, signal, "assembled");
				issues.push(...repairEvidenceIssues);
				if (repairEvidenceIssues.length > 0) stalled = true;
				if (repair.effectiveness === "credible" && repairHasNoRequestedReward(repair) && repair.violatesBoundary === false && repairEvidenceIssues.length === 0) credibleRepairCount += 1;
			}
			const unresolvedDebt: string[] = [];
			if (!recognizedByMale) unresolvedDebt.push("male recognition pending");
			if (credibleRepairCount === 0) unresolvedDebt.push("credible repair pending");
			const stage = !recognizedByMale ? "recognition-pending" as const : credibleRepairCount === 0 ? "repair-pending" as const : "repair-credible" as const;
			if (unresolvedDebt.length > 0 && (harm.severity === "major" || harm.severity === "relationship-breaking")) {
				issues.push(`relationship harm ${harmId} remains unresolved: ${unresolvedDebt.join(", ")}`);
				stalled = true;
			}
			progress.push({ harmId, severity: typeof harm.severity === "string" ? harm.severity : "unknown", recognizedByMale, repairCount: relatedRepairs.length, credibleRepairCount, evidenceBound: harmEvidenceIssues.length === 0, stage, unresolvedDebt });
		}
		let wrongPursuitCount = 0;
		let realConsequenceCount = 0;
		// Converged 模式：从 unified 事件统计 pursuit/real-consequence（unified 是唯一事件权威）。
		const unifiedMap = await this.readUnifiedEventMap(params.projectId, signal);
		if (unifiedMap !== undefined) {
			for (const event of unifiedMap.events) {
				if (event.chapter > maximumChapter) continue;
				const role = event.chaseWifeDelta?.role;
				if (role === "pursuit-control" || role === "pursuit-failure") wrongPursuitCount += 1;
				if (role === "real-consequence") realConsequenceCount += 1;
			}
		} else {
			const eventPaths = (await this.listFiles(this.projectFile(params.projectId, "work/chase-wife-events"), signal)).filter((path) => /chapter-(\d+)\.json$/u.test(path));
			for (const path of eventPaths) {
				const chapterMatch = path.match(/chapter-(\d+)\.json$/u);
				if (chapterMatch === null || Number(chapterMatch[1]) > maximumChapter) continue;
				if (!await this.isChaseWifeChapterAssembled(params.projectId, Number(chapterMatch[1]), signal)) continue;
				const value = await this.readJsonIfExists(path, signal);
				if (!isJsonRecord(value) || !Array.isArray(value.events)) continue;
				for (const event of value.events.filter(isChaseWifeEvent)) {
					if (event.role === "pursuit-control" || event.role === "pursuit-failure") wrongPursuitCount += 1;
					if (event.role === "real-consequence") realConsequenceCount += 1;
				}
			}
		}
		const status = stalled ? "stalled" as const : issues.length > 0 ? "warning" as const : "on-track" as const;
		const report = { version: 2, projectId: params.projectId, ...(params.chapter === undefined ? {} : { chapter: params.chapter }), status, issues, harms: progress, wrongPursuitCount, realConsequenceCount, sourceHashes: [harmDocument, repairDocument].map(hashJson), generatedAt: new Date().toISOString() };
		const relativePath = "continuity/reports/chase-wife-harm-repair-progress.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async checkChaseWifeEndingEligibility(params: CheckChaseWifeEndingEligibilityParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "error"; issues: string[]; mode?: string; sourceHashes: string[]; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const contractPath = "outline/genre/chase-wife-ending-contract.json";
		const harmPath = "continuity/chase-wife-harm-ledger.json";
		const repairPath = "continuity/chase-wife-repair-ledger.json";
		const contractDocument = await this.readJsonIfExists(this.projectFile(params.projectId, contractPath), signal);
		const harmDocument = await this.readJsonIfExists(this.projectFile(params.projectId, harmPath), signal);
		const repairDocument = await this.readJsonIfExists(this.projectFile(params.projectId, repairPath), signal);
		const issues: string[] = [];
		const contract = isJsonRecord(contractDocument) && isJsonRecord(contractDocument.contract) ? contractDocument.contract : undefined;
		const harms = isJsonRecord(harmDocument) && Array.isArray(harmDocument.harms) ? harmDocument.harms.filter(isJsonRecord) : [];
		const repairs = isJsonRecord(repairDocument) && Array.isArray(repairDocument.repairs) ? repairDocument.repairs.filter(isJsonRecord).map(normalizeChaseWifeRepair) : [];
		if (!isJsonRecord(contractDocument) || contractDocument.status !== "confirmed" || contract === undefined) issues.push("a confirmed chase-wife ending contract is required");
		if (!isJsonRecord(harmDocument) || harmDocument.status !== "confirmed" || harms.length === 0) issues.push("a confirmed relationship harm ledger is required");
		if (!isJsonRecord(repairDocument) || repairDocument.status !== "confirmed") issues.push("a confirmed repair ledger is required");
		const mode = typeof contract?.mode === "string" ? contract.mode : undefined;
		const validRecognizedHarms = new Set<string>();
		for (const harm of harms) {
			const harmId = String(harm.id);
			issues.push(...await this.validateChaseWifeLedgerEvidence(params.projectId, harm.evidence, `relationship harm ${harmId}`, signal, "finalized"));
			if (harm.recognizedByMale === true) {
				const recognitionIssues = await this.validateChaseWifeLedgerEvidence(params.projectId, harm.recognitionEvidence, `relationship harm ${harmId} male recognition`, signal, "finalized");
				issues.push(...recognitionIssues);
				if (recognitionIssues.length === 0) validRecognizedHarms.add(harmId);
			}
		}
		const validRepairEvidence = new Set<string>();
		for (const repair of repairs) {
			const repairId = String(repair.id);
			const repairIssues = await this.validateChaseWifeLedgerEvidence(params.projectId, repair.evidence, `repair ${repairId}`, signal, "finalized");
			issues.push(...repairIssues);
			if (repairIssues.length === 0) validRepairEvidence.add(repairId);
		}
		const credibleRepairs = repairs.filter((repair) => repair.effectiveness === "credible" && repairHasNoRequestedReward(repair) && repair.violatesBoundary === false && validRepairEvidence.has(String(repair.id)));
		const relationshipBreakingHarms = harms.filter((harm) => harm.severity === "major" || harm.severity === "relationship-breaking");
		issues.push(...await this.validateChaseWifeLedgerEventBindings(params.projectId, harms, repairs, "finalized", signal));
		const eligibilityRules = contract !== undefined && Array.isArray(contract.eligibilityRules) ? contract.eligibilityRules.filter(isJsonRecord) : [];
		const narrativeEligibilityRules = contract !== undefined && Array.isArray(contract.reunionEligibilityRules) ? contract.reunionEligibilityRules.filter(isNonEmptyString) : [];
		if (contract !== undefined && narrativeEligibilityRules.length > 0 && eligibilityRules.length === 0) {
			issues.push("reunionEligibilityRules are narrative notes only; at least one structured eligibilityRules entry is required for final validation");
		}
		for (const rule of eligibilityRules) {
			const ruleId = typeof rule.id === "string" ? rule.id : "unnamed-rule";
			const ruleType = typeof rule.type === "string" ? rule.type : undefined;
			const harmId = typeof rule.harmId === "string" ? rule.harmId : undefined;
			if (ruleType === "repair-type-required") {
				const repairType = typeof rule.repairType === "string" ? rule.repairType : undefined;
				const satisfied = repairType !== undefined && credibleRepairs.some((repair) => repair.type === repairType && (harmId === undefined || (Array.isArray(repair.addressesHarmIds) && repair.addressesHarmIds.includes(harmId))));
				if (!satisfied) issues.push(`eligibility rule ${ruleId} requires a credible ${repairType ?? "repair"}${harmId === undefined ? "" : ` for harm ${harmId}`}`);
			} else if (ruleType === "harm-recognized") {
				if (harmId === undefined || !validRecognizedHarms.has(harmId)) issues.push(`eligibility rule ${ruleId} requires male recognition of harm ${harmId ?? "unknown"}`);
			} else if (ruleType === "independent-future-required") {
				issues.push(...await this.validateChaseWifeLedgerEvidence(params.projectId, contract?.heroineIndependentFutureEvidence, `eligibility rule ${ruleId} independent future`, signal, "finalized"));
			} else if (ruleType === "boundary-respected") {
				const satisfied = credibleRepairs.some((repair) => ["boundary-respect", "behavior-change", "specific-apology"].includes(String(repair.type)) && (harmId === undefined || (Array.isArray(repair.addressesHarmIds) && repair.addressesHarmIds.includes(harmId))));
				if (!satisfied) issues.push(`eligibility rule ${ruleId} requires credible boundary-respecting repair${harmId === undefined ? "" : ` for harm ${harmId}`}`);
			}
		}
		if (contract !== undefined && mode === "no-reunion") {
			if (contract.heroineIndependentFutureRequired !== true) issues.push("no-reunion requires an independent future for the heroine");
			if (contract.heroineIndependentFutureRequired === true) issues.push(...await this.validateChaseWifeLedgerEvidence(params.projectId, contract.heroineIndependentFutureEvidence, "no-reunion independent future", signal, "finalized"));
			if (!await this.hasFinalizedChaseWifeEventRole(params.projectId, "final-boundary", signal)) issues.push("no-reunion requires a finalized final-boundary event");
			if (!relationshipBreakingHarms.some((harm) => validRecognizedHarms.has(String(harm.id)))) issues.push("no-reunion requires the core relationship harm to be recognized");
			if (contract.boundaryRespectRequired !== true) issues.push("no-reunion requires the male to stop crossing the heroine's boundary");
		}
		if (contract !== undefined && mode === "open-ending") {
			if (typeof contract.openChoice !== "string" || contract.openChoice.trim().length === 0) issues.push("open-ending requires an explicit open choice");
			if (contract.heroineIndependentFutureRequired !== true) issues.push("open-ending requires an independent future for the heroine");
			if (contract.heroineIndependentFutureRequired === true) issues.push(...await this.validateChaseWifeLedgerEvidence(params.projectId, contract.heroineIndependentFutureEvidence, "open-ending independent future", signal, "finalized"));
			if (!await this.hasFinalizedChaseWifeEventRole(params.projectId, "final-boundary", signal)) issues.push("open-ending requires a finalized final-boundary event");
			if (validRecognizedHarms.size === 0) issues.push("open-ending requires the main harm to be recognized before leaving the reunion question open");
		}
		if (contract !== undefined && mode === "earned-reunion") {
			if (contract.heroineIndependentFutureRequired !== true) issues.push("earned reunion requires an independent future for the heroine");
			if (contract.heroineIndependentFutureRequired === true) issues.push(...await this.validateChaseWifeLedgerEvidence(params.projectId, contract.heroineIndependentFutureEvidence, "heroine independent future", signal, "finalized"));
			if (contract.maleRecognitionRequired === true && validRecognizedHarms.size === 0) issues.push("earned reunion requires male recognition of a specific harm with current prose evidence");
			if (!credibleRepairs.some((repair) => heroineAcceptedRepair(repair))) issues.push("earned reunion requires the heroine to accept at least one credible repair; repair credibility itself does not imply reconciliation");
			if (contract.restitutionRequired === true && !credibleRepairs.some((repair) => ["resource-restitution", "public-correction", "costly-accountability"].includes(String(repair.type)))) issues.push("earned reunion requires credible restitution or costly accountability");
			if (contract.boundaryRespectRequired === true && !credibleRepairs.some((repair) => ["boundary-respect", "behavior-change", "specific-apology"].includes(String(repair.type)))) issues.push("earned reunion requires credible boundary-respecting behavior change");
			for (const harm of relationshipBreakingHarms) {
				if (!credibleRepairs.some((repair) => Array.isArray(repair.addressesHarmIds) && repair.addressesHarmIds.includes(harm.id))) issues.push(`relationship harm ${String(harm.id)} has not received a credible repair`);
			}
		}
		const status = issues.length === 0 ? "ok" as const : "error" as const;
		const sourceHashes = [contractDocument, harmDocument, repairDocument].map(hashJson);
		const relativePath = "continuity/reports/chase-wife-ending-eligibility.json";
		const report = { version: 1, projectId: params.projectId, status, mode, issues, sourceHashes, generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async saveChaseWifeEventMap(params: SaveChaseWifeEventMapParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; path: string; events: number }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		// Converged 模式拒绝双事件事实：unified 覆盖的章不再允许写入 legacy chase-wife event map。
		if ((await this.projectChaseWifeChapter(params.projectId, params.chapter, signal)) !== undefined) throw new Error(`LEGACY_EVENT_AUTHORITY_CONFLICT: chapter ${params.chapter} is covered by the unified narrative event map; use save_unified_event_map.`);
		if (!isValidPovMode(params.povMode)) throw new Error("Chase-wife event maps must declare heroine-first-person or split-pov.");
		const beatSheet = await this.readJsonIfExists(this.projectFile(params.projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
		if (isJsonRecord(beatSheet) && isValidPovMode(beatSheet.povMode) && beatSheet.povMode !== params.povMode) throw new Error("Chapter event map povMode must match the story beat sheet.");
		const beatSheetOpeningMode = isJsonRecord(beatSheet) && (beatSheet.openingMode === "cold-conflict" || beatSheet.openingMode === "result-first" || beatSheet.openingMode === "exit-in-progress" || beatSheet.openingMode === "quiet-dislocation") ? beatSheet.openingMode : undefined;
		if (params.openingMode !== undefined && beatSheetOpeningMode !== undefined && params.openingMode !== beatSheetOpeningMode) throw new Error("Chapter event map openingMode must match the story beat sheet.");
		const openingMode = params.openingMode ?? beatSheetOpeningMode ?? "quiet-dislocation";
		if (params.chapter === 1) {
			const openingIntroIssue = validateChaseWifeOpeningIntro(params.openingIntro, params.openingConflictMarker);
			if (openingIntroIssue !== undefined) throw new Error(openingIntroIssue);
		}
		if (params.chapter > 1 && params.openingIntro !== undefined) throw new Error("Only chapter 1 may contain an opening intro.");
		if (!isNonEmptyString(params.openingConflict)) throw new Error("The chase-wife opening must define a concrete conflict.");
		if (params.chapter === 1 && !isNonEmptyString(params.openingConflictMarker)) throw new Error("Chapter 1 requires a short opening conflict marker for pacing checks.");
		if (params.chapter === 1 && openingMode === "exit-in-progress" && !isNonEmptyString(params.causalExitMarker)) throw new Error("exit-in-progress mode requires a causalExitMarker for the later explanation of the opening exit.");
		if (params.chapter > 1 && params.causalExitMarker !== undefined) throw new Error("Only chapter 1 may declare a causalExitMarker.");
		const events = [...params.events].sort((left, right) => left.eventId - right.eventId);
		if (events.length < 3 || events.length > 6) throw new Error("Chase-wife chapters must contain 3-6 events.");
		if (events.some((event, index) => event.eventId !== index + 1)) throw new Error("Chase-wife event IDs must be contiguous starting at 1.");
		const beats = isJsonRecord(beatSheet) && Array.isArray(beatSheet.beats) ? beatSheet.beats.filter(isChaseWifeBeat) : [];
		for (const event of events) {
			if (beats.length > 0 && event.beatRefs === undefined) throw new Error(`Event ${event.eventId} must reference at least one beat from the chase-wife beat sheet.`);
			if (event.beatRefs === undefined) continue;
			if (new Set(event.beatRefs).size !== event.beatRefs.length) throw new Error(`Event ${event.eventId} contains duplicate beat references.`);
			if (beats.length === 0) throw new Error(`Event ${event.eventId} references beats but the chase-wife beat sheet is missing or invalid.`);
			const referencedBeats = beats.filter((beat) => event.beatRefs?.includes(beat.beat));
			if (referencedBeats.length !== new Set(event.beatRefs).size) throw new Error(`Event ${event.eventId} references a missing beat.`);
			if (event.heroinePhase !== undefined && !referencedBeats.some((beat) => beat.heroinePhase === event.heroinePhase)) throw new Error(`Event ${event.eventId} heroinePhase does not match its beatRefs.`);
			if (event.malePhase !== undefined && !referencedBeats.some((beat) => beat.malePhase === event.malePhase)) throw new Error(`Event ${event.eventId} malePhase does not match its beatRefs.`);
		}
		if (params.povMode === "heroine-first-person" && events.some((event) => !isHeroinePov(event.pov))) throw new Error("Heroine-first-person mode cannot contain male-limited-third-person events.");
		if (events.some((event) => event.pov === "male-limited-third-person" && event.targetTrack !== "male")) throw new Error("Male-limited-third-person events must target the male track.");
		if (params.chapter === 1 && !isValidChaseWifeOpeningRole(openingMode, events[0].role)) throw new Error(`The first chase-wife event role is incompatible with opening mode ${openingMode}.`);
		if (params.chapter === 1 && openingMode === "result-first" && events[0].role === "irreversible-exit" && events[0].chronology !== "flashforward-preview") throw new Error("result-first openings must mark an opening irreversible exit as flashforward-preview.");
		if (params.chapter === 1 && openingMode === "exit-in-progress" && events[0].chronology === "flashforward-preview") throw new Error("exit-in-progress openings must begin with a present-tense formal exit, not a preview.");
		if (params.chapter > 1 && events[0].role === "opening-injury") throw new Error("Only chapter 1 may use the opening-injury event role.");
		const exitIndex = events.findIndex((event) => isFormalChaseWifeExit(event));
		const earlierExit = params.chapter > 1 ? await this.hasEarlierChaseWifeExit(params.projectId, params.chapter, "assembled", signal) : false;
		for (const [index, event] of events.entries()) {
			const limits = CHASE_WIFE_LENGTH_LIMITS[event.lengthMode];
			if (event.minChars < limits.min || event.maxChars > limits.max || event.minChars > event.maxChars) throw new Error(`Event ${event.eventId} has an invalid ${event.lengthMode} length range.`);
			if (event.causes.some((cause) => cause >= event.eventId)) throw new Error(`Event ${event.eventId} can only cause from earlier events.`);
			if (eventStateDeltaCount(event) < 2 && !event.irreversible && event.heroineAgencyAfter <= event.heroineAgencyBefore && event.role !== "real-consequence") throw new Error(`Event ${event.eventId} must create at least two state changes, an irreversible action, a real consequence, or an agency increase.`);
			if (event.role === "irreversible-exit" && (!event.irreversible || event.heroineAgencyAfter <= event.heroineAgencyBefore)) throw new Error("An irreversible-exit event must be irreversible and increase heroine agency.");
			if (event.pov === "male-limited-third-person" && !earlierExit && (exitIndex < 0 || index < exitIndex)) throw new Error("Male-limited-third-person events can only appear after the irreversible exit.");
		}
		const relativePath = `work/chase-wife-events/${chapterName(params.chapter)}.json`;
		const document = { version: 2, genre: "chase-wife", projectId: params.projectId, chapter: params.chapter, povMode: params.povMode, ...(params.chapter === 1 ? { openingMode } : {}), ...(params.openingIntro ? { openingIntro: params.openingIntro } : {}), openingConflict: params.openingConflict, ...(params.openingConflictMarker ? { openingConflictMarker: params.openingConflictMarker } : {}), ...(params.causalExitMarker ? { causalExitMarker: params.causalExitMarker } : {}), events, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, path: relativePath, events: events.length };
	}

	async checkChaseWifeEventMap(params: CheckChaseWifeEventMapParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; status: "ok" | "warning" | "error"; issues: string[]; checkedEvents: number; eventMapHash?: string; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		// Converged 模式：以 unified 投影为检查对象；legacy 文件存在时做双事件事实分歧检测。
		const projection = await this.projectChaseWifeChapter(params.projectId, params.chapter, signal);
		const relativePath = `work/chase-wife-events/${chapterName(params.chapter)}.json`;
		const value = projection === undefined ? await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal) : projection.document;
		const source = projection === undefined ? "legacy" : "unified";
		const issues: string[] = [];
		let hasStructuralError = false;
		let checkedEvents = 0;
		if (!isJsonRecord(value) || !Array.isArray(value.events)) {
			issues.push("missing or invalid chase-wife event map");
			hasStructuralError = true;
		} else {
			if (source === "unified") {
				if (projection?.legacyDivergence === true) {
					issues.push("LEGACY_EVENT_AUTHORITY_CONFLICT: the legacy chase-wife event map diverges from the unified narrative event map; remove the legacy event map");
					hasStructuralError = true;
				} else if (projection?.legacyPresent === true) {
					issues.push("legacy chase-wife event map is redundant: unified narrative events are the authority");
				}
			}
			if (!isValidPovMode(value.povMode)) {
				issues.push("chase-wife event map must declare heroine-first-person or split-pov");
				hasStructuralError = true;
			}
			if (params.chapter === 1 && source === "legacy") {
				const openingMode = value.openingMode === "cold-conflict" || value.openingMode === "result-first" || value.openingMode === "exit-in-progress" || value.openingMode === "quiet-dislocation" ? value.openingMode : "quiet-dislocation";
				const openingConflictMarker = typeof value.openingConflictMarker === "string" ? value.openingConflictMarker : undefined;
				const openingIntroIssue = validateChaseWifeOpeningIntro(value.openingIntro, openingConflictMarker);
				if (openingIntroIssue !== undefined) {
					issues.push(openingIntroIssue);
					hasStructuralError = true;
				}
				if (!isNonEmptyString(value.openingConflictMarker)) {
					issues.push("chapter 1 opening conflict marker is required");
					hasStructuralError = true;
				}
				if (openingMode === "exit-in-progress" && !isNonEmptyString(value.causalExitMarker)) {
					issues.push("exit-in-progress mode requires a causal exit marker");
					hasStructuralError = true;
				}
			} else if (value.openingIntro !== undefined && source === "legacy") {
				issues.push("only chapter 1 may contain an opening intro");
				hasStructuralError = true;
			}
			if (params.chapter > 1 && value.causalExitMarker !== undefined && source === "legacy") {
				issues.push("only chapter 1 may contain a causal exit marker");
				hasStructuralError = true;
			}
			if (!isNonEmptyString(value.openingConflict)) {
				issues.push("opening must define a concrete conflict");
				hasStructuralError = true;
			}
			const events = value.events.filter(isChaseWifeEvent);
			checkedEvents = events.length;
			if (events.length !== value.events.length) {
				issues.push("event map contains invalid event records");
				hasStructuralError = true;
			}
			if ((events.length < 3 || events.length > 6) && source !== "unified") {
				issues.push("chase-wife event maps must contain 3-6 valid events");
				hasStructuralError = true;
			}
			if (events.some((event, index) => event.eventId !== index + 1)) {
				issues.push("event IDs must be unique and contiguous starting at 1");
				hasStructuralError = true;
			}
			const openingMode = value.openingMode === "cold-conflict" || value.openingMode === "result-first" || value.openingMode === "exit-in-progress" || value.openingMode === "quiet-dislocation" ? value.openingMode : "quiet-dislocation";
			if (params.chapter === 1 && events[0] !== undefined && !isValidChaseWifeOpeningRole(openingMode, events[0].role)) {
				issues.push(`the first event role is incompatible with opening mode ${openingMode}`);
				hasStructuralError = true;
			}
			if (params.chapter === 1 && openingMode === "result-first" && events[0]?.role === "irreversible-exit" && events[0].chronology !== "flashforward-preview") {
				issues.push("result-first openings must mark an opening irreversible exit as flashforward-preview");
				hasStructuralError = true;
			}
			if (params.chapter === 1 && openingMode === "exit-in-progress" && events[0]?.chronology === "flashforward-preview") {
				issues.push("exit-in-progress openings must begin with a present-tense formal exit");
				hasStructuralError = true;
			}
			if (params.chapter > 1 && events[0]?.role === "opening-injury") {
				issues.push("only chapter 1 may use the opening-injury event role");
				hasStructuralError = true;
			}
			if (isValidPovMode(value.povMode) && value.povMode === "heroine-first-person" && events.some((event) => !isHeroinePov(event.pov))) {
				issues.push("heroine-first-person mode contains a male-limited-third-person event");
				hasStructuralError = true;
			}
			if (events.some((event) => event.pov === "male-limited-third-person" && event.targetTrack !== "male")) {
				issues.push("male-limited-third-person events must target the male track");
				hasStructuralError = true;
			}
			const beatSheet = await this.readJsonIfExists(this.projectFile(params.projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
			const beats = isJsonRecord(beatSheet) && Array.isArray(beatSheet.beats) ? beatSheet.beats.filter(isChaseWifeBeat) : [];
			if (beats.length > 0 && events.some((event) => event.beatRefs === undefined)) {
				issues.push("every event must reference at least one beat from the chase-wife beat sheet");
				hasStructuralError = true;
			}
			const exitIndex = events.findIndex((event) => isFormalChaseWifeExit(event));
			const earlierExit = params.chapter > 1 ? await this.hasEarlierChaseWifeExit(params.projectId, params.chapter, "assembled", signal) : false;
			for (const [index, event] of events.entries()) {
				if (event.causes.some((cause) => cause >= event.eventId)) {
					issues.push(`event ${event.eventId} has a forward or self-cause`);
					hasStructuralError = true;
				}
				if (eventStateDeltaCount(event) < 2 && !event.irreversible && event.heroineAgencyAfter <= event.heroineAgencyBefore && event.role !== "real-consequence") {
					issues.push(`event ${event.eventId} has no meaningful state delta, irreversible action, or real consequence`);
					hasStructuralError = true;
				}
				if (event.role === "irreversible-exit" && (!event.irreversible || event.heroineAgencyAfter <= event.heroineAgencyBefore)) {
					issues.push("irreversible-exit must be irreversible and increase heroine agency");
					hasStructuralError = true;
				}
				if (event.heroineAgencyAfter < event.heroineAgencyBefore && event.setback === undefined) {
					issues.push(`event ${event.eventId} has an agency regression without a declared setback and recovery beat`);
					hasStructuralError = true;
				}
				if (event.paywallHook && event.eventId > Math.ceil(events.length / 2)) {
					issues.push("paywall hooks must appear in the opening half of the event map");
					hasStructuralError = true;
				}
				if (event.pov === "male-limited-third-person" && !earlierExit && (exitIndex < 0 || index < exitIndex)) {
					issues.push("male-limited-third-person events must follow the irreversible exit");
					hasStructuralError = true;
				}
			}
			let repeatedMechanism = 0;
			for (let index = 1; index < events.length; index += 1) {
				if (events[index].injuryMechanism !== undefined && events[index].injuryMechanism === events[index - 1].injuryMechanism) repeatedMechanism += 1;
				else repeatedMechanism = 0;
				if (repeatedMechanism >= 2) {
					issues.push(`repeated injury mechanism: ${events[index].injuryMechanism}`);
					hasStructuralError = true;
				}
				if (normalizedEventSignature(events[index]) === normalizedEventSignature(events[index - 1])) {
					issues.push(`adjacent events ${events[index - 1].eventId} and ${events[index].eventId} are interchangeable`);
					hasStructuralError = true;
				}
			}
		}
		const status = (hasStructuralError ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = { projectId: params.projectId, chapter: params.chapter, genre: "chase-wife", eventMapHash: isJsonRecord(value) ? hashJson(value) : undefined, generatedAt: new Date().toISOString(), status, issues, checkedEvents };
		const reportPath = `continuity/reports/${chapterName(params.chapter)}-chase-wife-events.json`;
		await this.writeVersionedJsonReport(params.projectId, reportPath, report, signal);
		return { ...report, path: reportPath };
	}

	private chaseWifeEventDirectory(projectId: string, chapter: number): string {
		return this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}`);
	}

	private async latestChaseWifeAssembly(projectId: string, chapter: number, signal?: AbortSignal): Promise<{ revision: number; content: string; manifest: JsonRecord } | undefined> {
		const map = await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}.json`), signal);
		if (!isJsonRecord(map) || !Array.isArray(map.events)) return undefined;
		const eventMapHash = hashJson(map);
		const assemblyPaths = (await this.listFiles(this.projectFile(projectId, "work/chase-wife-assemblies"), signal)).filter((path) => new RegExp(`${chapterName(chapter)}-r\\d+\\.json$`, "u").test(path));
		const events = map.events.filter(isChaseWifeEvent);
		if (events.length !== map.events.length) return undefined;
		const candidates: Array<{ revision: number; content: string; manifest: JsonRecord }> = [];
		for (const path of assemblyPaths) {
			const manifest = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(manifest) || manifest.eventMapHash !== eventMapHash || !isPositiveInteger(manifest.draftRevision) || typeof manifest.assembledHash !== "string" || !Array.isArray(manifest.eventDrafts)) continue;
			const content = await this.readTextIfExists(this.draftPath(projectId, chapter, manifest.draftRevision), signal);
			if (content === undefined || sha256(normalizeText(content)) !== manifest.assembledHash) continue;
			const manifestEvents = manifest.eventDrafts.filter(isJsonRecord);
			if (manifestEvents.length !== events.length || events.some((event) => {
				const manifestEvent = manifestEvents.find((candidate) => candidate.eventId === event.eventId);
				return manifestEvent === undefined || manifestEvent.eventSpecHash !== hashJson(event) || typeof manifestEvent.contentHash !== "string";
			})) continue;
			candidates.push({ revision: manifest.draftRevision, content, manifest });
		}
		return candidates.sort((left, right) => left.revision - right.revision).at(-1);
	}

	private async isChaseWifeChapterAssembled(projectId: string, chapter: number, signal?: AbortSignal): Promise<boolean> {
		if ((await this.latestChaseWifeAssembly(projectId, chapter, signal)) !== undefined) return true;
		// Converged 模式：统一装配清单存在即视为已装配。
		const projection = await this.projectChaseWifeChapter(projectId, chapter, signal);
		if (projection === undefined) return false;
		const assemblyPaths = await this.listFiles(this.projectFile(projectId, "work/unified-assemblies"), signal);
		return assemblyPaths.some((path) => new RegExp(`${chapterName(chapter)}-r\\d+\\.json$`, "u").test(path));
	}

	private async isChaseWifeChapterFinalized(projectId: string, chapter: number, signal?: AbortSignal): Promise<boolean> {
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		const finalizedChapters = isJsonRecord(project) && Array.isArray(project.finalizedChapters) ? new Set(project.finalizedChapters.filter(isPositiveInteger)) : new Set<number>();
		if (!finalizedChapters.has(chapter)) return false;
		const content = await this.readTextIfExists(this.projectFile(projectId, `chapters/${chapterName(chapter)}.md`), signal);
		const summary = await this.readJsonIfExists(this.projectFile(projectId, `summaries/${chapterName(chapter)}.json`), signal);
		const map = await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}.json`), signal);
		if (content === undefined || !isJsonRecord(summary) || !isPositiveInteger(summary.draftRevision) || !isJsonRecord(map)) return false;
		const manifest = await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-assemblies/${chapterName(chapter)}-r${String(summary.draftRevision).padStart(2, "0")}.json`), signal);
		return isJsonRecord(manifest) && manifest.eventMapHash === hashJson(map) && manifest.assembledHash === sha256(normalizeText(content)) && await this.isChaseWifeChapterAssembled(projectId, chapter, signal);
	}

	private async isChaseWifeChapterInScope(projectId: string, chapter: number, scope: ChaseWifeArtifactScope, signal?: AbortSignal): Promise<boolean> {
		if (scope === "planned") return true;
		if (scope === "assembled") return this.isChaseWifeChapterAssembled(projectId, chapter, signal);
		return this.isChaseWifeChapterFinalized(projectId, chapter, signal);
	}

	private async hasEarlierChaseWifeExit(projectId: string, chapter: number, scope: Exclude<ChaseWifeArtifactScope, "planned"> = "assembled", signal?: AbortSignal): Promise<boolean> {
		// Converged 模式：以 unified 事件为权威，检查更早章是否已出现正式退出（role=irreversible-exit 且非预览）。
		const unifiedMap = await this.readUnifiedEventMap(projectId, signal);
		if (unifiedMap !== undefined) {
			const earlier = unifiedMap.events.filter((event) => event.chapter < chapter && event.chaseWifeDelta?.role === "irreversible-exit" && event.chronology !== "flashforward-preview");
			if (earlier.length > 0) return true;
		}
		const paths = (await this.listFiles(this.projectFile(projectId, "work/chase-wife-events"), signal)).filter((path) => /chapter-\d+\.json$/u.test(path));
		for (const path of paths) {
			const match = path.match(/chapter-(\d+)\.json$/u);
			if (match === null) continue;
			const candidateChapter = Number(match[1]);
			if (candidateChapter >= chapter || !await this.isChaseWifeChapterInScope(projectId, candidateChapter, scope, signal)) continue;
			const value = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(value) || !Array.isArray(value.events)) continue;
			if (value.events.some((candidate) => isChaseWifeEvent(candidate) && isFormalChaseWifeExit(candidate))) return true;
		}
		return false;
	}

	private async hasChaseWifeEventRole(projectId: string, role: ChaseWifeEvent["role"], signal?: AbortSignal): Promise<boolean> {
		const paths = await this.listFiles(this.projectFile(projectId, "work/chase-wife-events"), signal);
		for (const path of paths) {
			const value = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(value) || !Array.isArray(value.events)) continue;
			if (value.events.some((candidate) => isJsonRecord(candidate) && candidate.role === role)) return true;
		}
		return false;
	}

	private async hasFinalizedChaseWifeEventRole(projectId: string, role: ChaseWifeEvent["role"], signal?: AbortSignal): Promise<boolean> {
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		const finalizedChapters = isJsonRecord(project) && Array.isArray(project.finalizedChapters) ? new Set(project.finalizedChapters.filter(isPositiveInteger)) : new Set<number>();
		const chapterPaths = (await this.listFiles(this.projectFile(projectId, "chapters"), signal)).filter((path) => /chapter-\d+\.md$/u.test(path));
		for (const chapterPath of chapterPaths) {
			const chapterMatch = chapterPath.match(/chapter-(\d+)\.md$/u);
			if (chapterMatch === null) continue;
			const chapter = Number(chapterMatch[1]);
			if (!finalizedChapters.has(chapter)) continue;
			const content = await this.readTextIfExists(chapterPath, signal);
			const summary = await this.readJsonIfExists(this.projectFile(projectId, `summaries/${chapterName(chapter)}.json`), signal);
			const draftRevision = isJsonRecord(summary) && isPositiveInteger(summary.draftRevision) ? summary.draftRevision : undefined;
			const map = await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}.json`), signal);
			const manifest = draftRevision === undefined ? undefined : await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-assemblies/${chapterName(chapter)}-r${String(draftRevision).padStart(2, "0")}.json`), signal);
			if (content === undefined || !isJsonRecord(map) || !Array.isArray(map.events) || !isJsonRecord(manifest) || manifest.eventMapHash !== hashJson(map) || manifest.assembledHash !== sha256(normalizeText(content))) continue;
			const events = map.events.filter(isChaseWifeEvent);
			const manifestEvents = Array.isArray(manifest.eventDrafts) ? manifest.eventDrafts.filter(isJsonRecord) : [];
			if (events.length !== map.events.length || manifestEvents.length !== events.length || events.some((event) => {
				const manifestEvent = manifestEvents.find((candidate) => candidate.eventId === event.eventId);
				return manifestEvent === undefined || manifestEvent.eventSpecHash !== hashJson(event) || typeof manifestEvent.contentHash !== "string";
			})) continue;
			if (events.some((event) => event.role === role)) return true;
		}
		return false;
	}

	private async readChaseWifeEventReferences(projectId: string, scope: ChaseWifeArtifactScope = "assembled", signal?: AbortSignal): Promise<{
		hasEventMaps: boolean;
		eventKeys: Set<string>;
		harmRefs: Map<string, ChaseWifeEventReference[]>;
		repairRefs: Map<string, ChaseWifeEventReference[]>;
		eventRanges: Map<string, { startChar: number; endChar: number }>;
	}> {
		const paths = (await this.listFiles(this.projectFile(projectId, "work/chase-wife-events"), signal)).filter((path) => /chapter-\d+\.json$/u.test(path));
		const eventKeys = new Set<string>();
		const harmRefs = new Map<string, ChaseWifeEventReference[]>();
		const repairRefs = new Map<string, ChaseWifeEventReference[]>();
		const eventRanges = new Map<string, { startChar: number; endChar: number }>();
		let scopedEventMapCount = 0;
		for (const path of paths) {
			const chapterMatch = path.match(/chapter-(\d+)\.json$/u);
			const value = await this.readJsonIfExists(path, signal);
			if (chapterMatch === null || !isJsonRecord(value) || !Array.isArray(value.events)) continue;
			const chapter = Number(chapterMatch[1]);
			if (!await this.isChaseWifeChapterInScope(projectId, chapter, scope, signal)) continue;
			scopedEventMapCount += 1;
			const summary = await this.readJsonIfExists(this.projectFile(projectId, `summaries/${chapterName(chapter)}.json`), signal);
			const draftRevision = isJsonRecord(summary) && isPositiveInteger(summary.draftRevision) ? summary.draftRevision : undefined;
			let manifest = draftRevision === undefined ? undefined : await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-assemblies/${chapterName(chapter)}-r${String(draftRevision).padStart(2, "0")}.json`), signal);
			if (scope === "assembled" && (!isJsonRecord(manifest) || manifest.eventMapHash !== hashJson(value))) {
				const assemblyPaths = (await this.listFiles(this.projectFile(projectId, "work/chase-wife-assemblies"), signal)).filter((candidate) => new RegExp(`${chapterName(chapter)}-r\\d+\\.json$`, "u").test(candidate));
				for (const candidate of assemblyPaths) {
					const candidateManifest = await this.readJsonIfExists(candidate, signal);
					if (isJsonRecord(candidateManifest) && candidateManifest.eventMapHash === hashJson(value)) {
						manifest = candidateManifest;
						break;
					}
				}
			}
			const manifestEvents = isJsonRecord(manifest) && manifest.eventMapHash === hashJson(value) && Array.isArray(manifest.eventDrafts) ? manifest.eventDrafts.filter(isJsonRecord) : [];
			for (const event of value.events.filter(isChaseWifeEvent)) {
				const manifestEvent = manifestEvents.find((candidate) => candidate.eventId === event.eventId);
				if (scope !== "planned" && manifestEvent === undefined) continue;
				const reference: ChaseWifeEventReference = { chapter, eventId: event.eventId };
				if (manifestEvent !== undefined && typeof manifestEvent.startChar === "number" && typeof manifestEvent.endChar === "number" && manifestEvent.endChar > manifestEvent.startChar) {
					reference.startChar = manifestEvent.startChar;
					reference.endChar = manifestEvent.endChar;
					eventRanges.set(`${chapter}:${event.eventId}`, { startChar: manifestEvent.startChar, endChar: manifestEvent.endChar });
				}
				eventKeys.add(`${chapter}:${event.eventId}`);
				for (const harmId of event.harmRefs ?? []) harmRefs.set(harmId, [...(harmRefs.get(harmId) ?? []), reference]);
				for (const repairId of event.repairRefs ?? []) repairRefs.set(repairId, [...(repairRefs.get(repairId) ?? []), reference]);
			}
		}
		// Converged 模式回退：legacy 事件文件不存在时，从 unified 投影 + unified 装配清单构建引用（eventId = unified 事件 id）。
		if (scopedEventMapCount === 0) {
			const unifiedMap = await this.readUnifiedEventMap(projectId, signal);
			if (unifiedMap !== undefined) {
				for (const chapter of new Set(unifiedMap.events.map((event) => event.chapter))) {
					const projection = await this.projectChaseWifeChapter(projectId, chapter, signal);
					if (projection === undefined) continue;
					if (scope !== "planned" && !await this.isChaseWifeChapterAssembled(projectId, chapter, signal)) continue;
					scopedEventMapCount += 1;
					const assemblyPaths = (await this.listFiles(this.projectFile(projectId, "work/unified-assemblies"), signal)).filter((candidate) => new RegExp(`${chapterName(chapter)}-r\d+\.json$`, "u").test(candidate)).sort();
					let manifestEvents: Array<JsonRecord> = [];
					for (const candidate of assemblyPaths.reverse()) {
						const candidateManifest = await this.readJsonIfExists(candidate, signal);
						if (isJsonRecord(candidateManifest) && Array.isArray(candidateManifest.eventDrafts)) {
							manifestEvents = candidateManifest.eventDrafts.filter(isJsonRecord);
							break;
						}
					}
					for (const event of projection.events) {
						const unifiedId = projection.unifiedEventIds[event.eventId - 1];
						if (unifiedId === undefined) continue;
						const manifestEvent = manifestEvents.find((candidate) => candidate.eventId === unifiedId);
						const reference: ChaseWifeEventReference = { chapter, eventId: unifiedId };
						if (manifestEvent !== undefined && typeof manifestEvent.startChar === "number" && typeof manifestEvent.endChar === "number" && manifestEvent.endChar > manifestEvent.startChar) {
							reference.startChar = manifestEvent.startChar;
							reference.endChar = manifestEvent.endChar;
							eventRanges.set(`${chapter}:${unifiedId}`, { startChar: manifestEvent.startChar, endChar: manifestEvent.endChar });
						}
						eventKeys.add(`${chapter}:${unifiedId}`);
						for (const harmId of event.harmRefs ?? []) harmRefs.set(harmId, [...(harmRefs.get(harmId) ?? []), reference]);
						for (const repairId of event.repairRefs ?? []) repairRefs.set(repairId, [...(repairRefs.get(repairId) ?? []), reference]);
					}
				}
			}
		}
		return { hasEventMaps: scopedEventMapCount > 0, eventKeys, harmRefs, repairRefs, eventRanges };
	}

	private async validateChaseWifeLedgerEventBindings(
		projectId: string,
		harms: JsonRecord[],
		repairs: JsonRecord[],
		scope: ChaseWifeArtifactScope = "assembled",
		signal?: AbortSignal,
		checkReferencedLedgerIds = true,
	): Promise<string[]> {
		const references = await this.readChaseWifeEventReferences(projectId, scope, signal);
		if (!references.hasEventMaps) {
			return checkReferencedLedgerIds || (harms.length === 0 && repairs.length === 0)
				? []
				: [`confirmed chase-wife ledgers require an ${scope} event map before evidence can be saved`];
		}
		const issues: string[] = [];
		const evidenceMatchesReference = (item: ChaseWifeLedgerEvidence, reference: ChaseWifeEventReference): boolean => {
			if (reference.chapter !== item.chapter || reference.eventId !== item.eventId) return false;
			if (reference.startChar === undefined || reference.endChar === undefined) return true;
			return item.startChar >= reference.startChar && item.endChar <= reference.endChar;
		};
		const evidenceMatchesAnyReference = (item: ChaseWifeLedgerEvidence, refs: ChaseWifeEventReference[]): boolean => refs.some((ref) => evidenceMatchesReference(item, ref));
		const evidenceMatchesCurrentEvent = (item: ChaseWifeLedgerEvidence): boolean => {
			if (item.eventId === undefined || !references.eventKeys.has(`${item.chapter}:${item.eventId}`)) return false;
			const range = references.eventRanges.get(`${item.chapter}:${item.eventId}`);
			return range === undefined || (item.startChar >= range.startChar && item.endChar <= range.endChar);
		};
		const harmIds = new Set(harms.map((harm) => typeof harm.id === "string" ? harm.id : undefined).filter((id): id is string => id !== undefined));
		const repairIds = new Set(repairs.map((repair) => typeof repair.id === "string" ? repair.id : undefined).filter((id): id is string => id !== undefined));
		if (checkReferencedLedgerIds) {
			for (const [harmId, refs] of references.harmRefs) {
				if (!harmIds.has(harmId)) issues.push(`event references unknown relationship harm ${harmId}`);
				if (refs.length === 0) continue;
			}
			for (const [repairId] of references.repairRefs) if (!repairIds.has(repairId)) issues.push(`event references unknown repair ${repairId}`);
		}
		for (const harm of harms) {
			const harmId = typeof harm.id === "string" ? harm.id : "unknown";
			const refs = references.harmRefs.get(harmId) ?? [];
			if (refs.length === 0) {
				issues.push(`relationship harm ${harmId} evidence must identify its referenced event in ${scope} scope`);
				continue;
			}
			const evidence = Array.isArray(harm.evidence) ? harm.evidence : [];
			if (!evidence.some((item) => isChaseWifeLedgerEvidence(item) && item.eventId !== undefined && evidenceMatchesAnyReference(item, refs))) {
				const hasMatchingEvent = evidence.some((item) => isChaseWifeLedgerEvidence(item) && item.eventId !== undefined && refs.some((ref) => ref.chapter === item.chapter && ref.eventId === item.eventId));
				issues.push(hasMatchingEvent && refs.some((ref) => ref.startChar !== undefined) ? `relationship harm ${harmId} evidence must stay inside its referenced event prose range` : `relationship harm ${harmId} evidence must identify its referenced event`);
			}
			if (harm.recognizedByMale === true) {
				const recognitionEvidence = Array.isArray(harm.recognitionEvidence) ? harm.recognitionEvidence : [];
				if (!recognitionEvidence.some((item) => isChaseWifeLedgerEvidence(item) && evidenceMatchesCurrentEvent(item))) issues.push(`relationship harm ${harmId} recognition evidence must identify a current event and stay inside its event prose range`);
			}
		}
		for (const repair of repairs) {
			const repairId = typeof repair.id === "string" ? repair.id : "unknown";
			const refs = references.repairRefs.get(repairId) ?? [];
			if (refs.length === 0) {
				issues.push(`repair ${repairId} evidence must identify its referenced event in ${scope} scope`);
				continue;
			}
			const evidence = Array.isArray(repair.evidence) ? repair.evidence : [];
			if (!evidence.some((item) => isChaseWifeLedgerEvidence(item) && item.eventId !== undefined && evidenceMatchesAnyReference(item, refs))) {
				const hasMatchingEvent = evidence.some((item) => isChaseWifeLedgerEvidence(item) && item.eventId !== undefined && refs.some((ref) => ref.chapter === item.chapter && ref.eventId === item.eventId));
				issues.push(hasMatchingEvent && refs.some((ref) => ref.startChar !== undefined) ? `repair ${repairId} evidence must stay inside its referenced event prose range` : `repair ${repairId} evidence must identify its referenced event`);
			}
		}
		return issues;
	}

	private chaseWifeEventDraftPath(projectId: string, chapter: number, eventId: number, revision: number): string {
		return this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}/event-${padChapter(eventId)}-r${String(revision).padStart(2, "0")}.md`);
	}

	private async latestChaseWifeEventDraft(projectId: string, chapter: number, eventId: number, signal?: AbortSignal): Promise<{ path: string; revision: number; content: string } | undefined> {
		// Converged 模式：chase 事件 id 通过投影映射回 unified 事件 id，草稿即 unified 事件草稿。
		const { source, unifiedEventIds } = await this.readChaseWifeEventMap(projectId, chapter, signal).catch(() => ({ source: "legacy" as const, unifiedEventIds: [] as number[] }));
		if (source === "unified") {
			const unifiedId = (unifiedEventIds ?? [])[eventId - 1];
			if (unifiedId === undefined) return undefined;
			return this.latestUnifiedEventDraft(projectId, chapter, unifiedId, signal);
		}
		const directory = this.chaseWifeEventDirectory(projectId, chapter);
		const paths = await this.listFiles(directory, signal);
		const matches = paths.map((path) => {
			const match = path.match(new RegExp(`event-${padChapter(eventId)}-r(\\d+)\\.md$`));
			return match ? { path, revision: Number(match[1]) } : undefined;
		}).filter((value): value is { path: string; revision: number } => value !== undefined).sort((left, right) => left.revision - right.revision);
		const latest = matches.at(-1);
		if (!latest) return undefined;
		const content = await this.readTextIfExists(latest.path, signal);
		return content === undefined ? undefined : { ...latest, content };
	}

	// Chase Wife → Unified 收敛：统一事件是唯一事件事实源；chase-wife 事件由投影适配器生成，
	// 供既有 chase-wife validators（event map / pacing / harm-repair / ending）消费。
	private async projectChaseWifeChapter(projectId: string, chapter: number, signal?: AbortSignal): Promise<{ document: JsonRecord; events: ChaseWifeEvent[]; unifiedEventIds: number[]; legacyDivergence: boolean; legacyPresent: boolean } | undefined> {
		const map = await this.readUnifiedEventMap(projectId, signal);
		const chapterEvents = map === undefined ? [] : map.events.filter((event) => event.chapter === chapter).sort((left, right) => left.eventId - right.eventId);
		const chaseEvents = chapterEvents.filter((event) => event.chaseWifeDelta !== undefined);
		if (chaseEvents.length === 0) return undefined;
		const beatSheet = await this.readJsonIfExists(this.projectFile(projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
		const beats = isJsonRecord(beatSheet) && Array.isArray(beatSheet.beats) ? beatSheet.beats.filter(isChaseWifeBeat) : [];
		// causes 只映射 chase 事件的投影序列（非 chase 事件的因果无法在 chase 序列中表示，直接丢弃）。
		const inChapterIds = new Map(chaseEvents.map((event, index) => [event.eventId, index + 1]));
		const projectedEvents: ChaseWifeEvent[] = [];
		const unifiedEventIds: number[] = [];
		for (const event of chaseEvents) {
			if (event.pov === "third-person") throw new Error(`Unified event ${event.eventId} declares chaseWifeDelta with pov third-person; chase-wife events require heroine-first-person or male-limited-third-person.`);
			const delta = event.chaseWifeDelta as UnifiedChaseWifeDelta;
			if (delta.role === undefined) throw new Error(`Unified event ${event.eventId} declares chaseWifeDelta without a chase-wife role; declare role to converge the chase-wife arc.`);
			if (beats.length > 0 && delta.beatRefs === undefined) throw new Error(`Unified event ${event.eventId} declares chaseWifeDelta but the beat sheet requires beatRefs.`);
			if (delta.beatRefs !== undefined && delta.beatRefs.some((beat) => !beats.some((candidate) => candidate.beat === beat))) throw new Error(`Unified event ${event.eventId} chaseWifeDelta references a missing beat.`);
			if (delta.heroinePhase !== undefined && delta.beatRefs !== undefined && !delta.beatRefs.some((beat) => beats.some((candidate) => candidate.beat === beat && candidate.heroinePhase === delta.heroinePhase))) throw new Error(`Unified event ${event.eventId} chaseWifeDelta heroinePhase does not match its beatRefs.`);
			if (delta.malePhase !== undefined && delta.beatRefs !== undefined && !delta.beatRefs.some((beat) => beats.some((candidate) => candidate.beat === beat && candidate.malePhase === delta.malePhase))) throw new Error(`Unified event ${event.eventId} chaseWifeDelta malePhase does not match its beatRefs.`);
			const lengthMode = delta.lengthMode ?? "standard";
			const limits = CHASE_WIFE_LENGTH_LIMITS[lengthMode];
			const minChars = delta.minChars ?? limits.min;
			const maxChars = delta.maxChars ?? limits.max;
			const projectedEventId = projectedEvents.length + 1;
			const causes = event.causes.filter((cause) => inChapterIds.has(cause)).map((cause) => inChapterIds.get(cause) as number);
			const projectedEvent: ChaseWifeEvent = {
				eventId: projectedEventId,
				role: delta.role,
				beatRefs: delta.beatRefs,
				harmRefs: delta.harmRefs,
				repairRefs: delta.repairRefs,
				chronology: event.chronology,
				heroinePhase: delta.heroinePhase,
				malePhase: delta.malePhase,
				scene: delta.scene ?? projectedEventId,
				pov: event.pov as "heroine-first-person" | "male-limited-third-person",
				targetTrack: delta.targetTrack ?? "heroine",
				paywallHook: delta.paywallHook,
				causes,
				injuryMechanism: delta.injuryMechanism,
				informationDelta: delta.informationDelta,
				relationshipDelta: delta.relationshipDelta,
				resourceDelta: delta.resourceDelta,
				riskDelta: delta.riskDelta,
				heroineAgencyBefore: delta.heroineAgencyBefore,
				heroineAgencyAfter: delta.heroineAgencyAfter,
				heroineAgencyStateBefore: delta.heroineAgencyStateBefore ?? { epistemic: 0, relational: 0, material: 0, social: 0, future: 0 },
				heroineAgencyStateAfter: delta.heroineAgencyStateAfter ?? { epistemic: 0, relational: 0, material: 0, social: 0, future: 0 },
				setback: delta.setback,
				irreversible: event.irreversible,
				cannotRemoveBecause: event.cannotRemoveBecause,
				lengthMode,
				minChars,
				maxChars,
				// 适配器文本字段：由统一事件推导；converged 模式的正文校验走 unified draft/semantic 报告，
				// 不再运行 chase-wife 专有的 prose 校验器（role/conflict/hook 检查由 unified 语义报告覆盖）。
				eventDescription: event.action,
				function: `推进 ${delta.role} 弧线`,
				goal: event.storyGoal,
				conflict: event.conflict,
				actionOrConsequence: `${event.action}；${event.consequence}`,
				protagonistReaction: event.consequence,
				oppositionReaction: event.conflict,
				informationChange: delta.informationDelta.join("；") || "信息状态推进",
				emotionBefore: "克制",
				emotionAfter: "变化",
				physicalReaction: "行动",
				setupOrPayoff: "推动下一步",
				readerRelease: "释放读者压力",
				entryHook: event.storyGoal,
				exitHook: event.consequence,
			};
			projectedEvents.push(projectedEvent);
			unifiedEventIds.push(event.eventId);
		}
		const legacyValue = await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}.json`), signal);
		const legacyPresent = isJsonRecord(legacyValue) && Array.isArray(legacyValue.events);
		let legacyDivergence = false;
		if (legacyPresent) {
			const legacyEvents = (legacyValue.events as unknown[]).filter(isChaseWifeEvent).sort((left, right) => left.eventId - right.eventId);
			const sameLength = legacyEvents.length === projectedEvents.length;
			const sameEvents = sameLength && projectedEvents.every((event, index) => normalizedEventSignature(event) === normalizedEventSignature(legacyEvents[index]));
			legacyDivergence = !sameEvents;
		}
		// povMode 由实际事件推导：出现 male-limited-third-person 事件即 split-pov；否则取 beat sheet 声明或默认。
		const hasMalePovEvent = projectedEvents.some((event) => event.pov === "male-limited-third-person");
		const povMode = hasMalePovEvent ? "split-pov" : isJsonRecord(beatSheet) && isValidPovMode(beatSheet.povMode) ? beatSheet.povMode : "heroine-first-person";
		const openingMode = isJsonRecord(beatSheet) && (beatSheet.openingMode === "cold-conflict" || beatSheet.openingMode === "result-first" || beatSheet.openingMode === "exit-in-progress" || beatSheet.openingMode === "quiet-dislocation") ? beatSheet.openingMode : "quiet-dislocation";
		const document: JsonRecord = {
			version: 2,
			genre: "chase-wife",
			projectId,
			chapter,
			source: "unified",
			povMode,
			openingMode,
			openingConflict: chaseEvents[0]!.conflict,
			events: projectedEvents,
			unifiedEventIds,
		};
		return { document, events: projectedEvents, unifiedEventIds, legacyDivergence, legacyPresent };
	}

	private async readChaseWifeEventMap(projectId: string, chapter: number, signal?: AbortSignal): Promise<{ map: JsonRecord; events: ChaseWifeEvent[]; eventMapHash: string; source: "legacy" | "unified"; unifiedEventIds?: number[] }> {
		const projection = await this.projectChaseWifeChapter(projectId, chapter, signal);
		if (projection !== undefined) return { map: projection.document, events: projection.events, eventMapHash: hashJson(projection.document), source: "unified", unifiedEventIds: projection.unifiedEventIds };
		const value = await this.readJsonIfExists(this.projectFile(projectId, `work/chase-wife-events/${chapterName(chapter)}.json`), signal);
		if (!isJsonRecord(value) || !Array.isArray(value.events)) throw new Error(`Chase-wife event map for chapter ${chapter} is missing or invalid.`);
		const events = value.events.filter(isChaseWifeEvent).sort((left, right) => left.eventId - right.eventId);
		if (events.length !== value.events.length) throw new Error(`Chase-wife event map for chapter ${chapter} contains invalid event records.`);
		return { map: value, events, eventMapHash: hashJson(value), source: "legacy" };
	}


	async saveChaseWifeEventDraft(params: SaveChaseWifeEventDraftParams, signal?: AbortSignal): Promise<SavedChapterDraftResult & { eventId: number }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		// Converged 模式拒绝双事件事实：草稿必须走 save_unified_event_draft。
		if ((await this.projectChaseWifeChapter(params.projectId, params.chapter, signal)) !== undefined) throw new Error(`LEGACY_EVENT_AUTHORITY_CONFLICT: chapter ${params.chapter} is covered by the unified narrative event map; use save_unified_event_draft.`);
		const { events } = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
		const event = events.find((candidate) => candidate.eventId === params.eventId);
		if (!event) throw new Error(`Event ${params.eventId} is not present in the chapter event map.`);
		const directory = this.chaseWifeEventDirectory(params.projectId, params.chapter);
		const paths = await this.listFiles(directory, signal);
		const prefix = `event-${padChapter(params.eventId)}-r`;
		const revisions = paths.map((path) => path.match(new RegExp(`${prefix}(\\d+)\\.md$`))?.[1]).filter((value): value is string => value !== undefined).map(Number);
		const revision = params.revision ?? ((revisions.length > 0 ? Math.max(...revisions) : 0) + 1);
		const path = this.chaseWifeEventDraftPath(params.projectId, params.chapter, params.eventId, revision);
		if (params.revision !== undefined && (await this.readTextIfExists(path, signal)) !== undefined) throw new Error(`Event draft revision ${revision} already exists. Save a new revision instead.`);
		const content = normalizeText(params.content);
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, documentType: "chapter-draft", chapter: params.chapter, eventId: params.eventId, revision, path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(content, "utf8") };
	}

	async checkChaseWifeEventDraft(params: CheckChaseWifeEventDraftParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; eventId: number; revision?: number; actualChars: number; status: "ok" | "warning" | "error"; issues: string[]; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const { events, eventMapHash } = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
		const event = events.find((candidate) => candidate.eventId === params.eventId);
		if (!event) throw new Error(`Event ${params.eventId} is not present in the chapter event map.`);
		const draft = params.revision === undefined ? await this.latestChaseWifeEventDraft(params.projectId, params.chapter, params.eventId, signal) : { revision: params.revision, content: await this.readTextIfExists(this.chaseWifeEventDraftPath(params.projectId, params.chapter, params.eventId, params.revision), signal) };
		const issues: string[] = [];
		if (!draft || draft.content === undefined) issues.push("event draft is missing");
		const actualChars = draft?.content === undefined ? 0 : countChineseCharacters(draft.content);
		if (draft && (actualChars < event.minChars || actualChars > event.maxChars)) issues.push(`event draft has ${actualChars} characters; expected ${event.minChars}-${event.maxChars}`);
		const status = (issues.some((issue) => issue === "event draft is missing") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const relativePath = `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(params.eventId)}-chase-wife.json`;
		const report = { projectId: params.projectId, chapter: params.chapter, eventId: params.eventId, revision: draft?.revision, actualChars, expectedChars: { min: event.minChars, max: event.maxChars }, status, issues, contentHash: draft?.content === undefined ? undefined : sha256(draft.content), eventSpecHash: hashJson(event), eventMapHash, generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		if (draft?.content !== undefined) await this.checkChaseWifeEventProse({ projectId: params.projectId, chapter: params.chapter, eventId: params.eventId, revision: draft.revision }, signal);
		return { ...report, path: relativePath };
	}

	async checkChaseWifeEventProse(params: CheckChaseWifeEventSemanticsParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; eventId: number; revision?: number; status: "ok" | "warning" | "error"; issues: Array<{ code: string; severity: "error" | "warning"; message: string }>; roleSatisfied: boolean; conflictShown: boolean; agencyActionEvidence?: string; stateDeltasShown: Array<{ deltaId: string; dimension: "information" | "relationship" | "resource" | "risk" | "agency"; delta: string; evidence?: string }>; entryHookEvidence?: string; exitHookEvidence?: string; injuryMechanismEvidence?: string; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const { events, eventMapHash } = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
		const event = events.find((candidate) => candidate.eventId === params.eventId);
		if (!event) throw new Error(`Event ${params.eventId} is not present in the chapter event map.`);
		const draft = params.revision === undefined ? await this.latestChaseWifeEventDraft(params.projectId, params.chapter, params.eventId, signal) : { revision: params.revision, content: await this.readTextIfExists(this.chaseWifeEventDraftPath(params.projectId, params.chapter, params.eventId, params.revision), signal) };
		const issues: Array<{ code: string; severity: "error" | "warning"; message: string }> = [];
		const addIssue = (code: string, severity: "error" | "warning", message: string): void => {
			issues.push({ code, severity, message });
		};
		if (!draft || draft.content === undefined) addIssue("missing-draft", "error", "event draft is missing");
		const content = draft?.content ?? "";
		const sentences = content.split(/[。！？!?；;]+/u).map((sentence) => sentence.trim()).filter((sentence) => sentence.length >= 8);
		const sentenceCounts = new Map<string, number>();
		for (const sentence of sentences) sentenceCounts.set(sentence, (sentenceCounts.get(sentence) ?? 0) + 1);
		if ([...sentenceCounts.values()].some((count) => count >= 2)) addIssue("repeated-sentence", "error", "the event repeats an identical sentence");
		if (/(?:^|\n)\s*(?:事件\s*\d+|情绪分析|读者释放点|状态变化|出口钩子)\s*[:：]/u.test(content)) addIssue("narrative-label", "error", "the event contains planning labels instead of narrative prose");
		const actionEvidence = containsActionEvidence(content) || containsChineseActionEvidence(content);
		const contentHasFirstPerson = /(?:我|I|me|my|鎴戝?)/iu.test(content);
		if (event.targetTrack !== "male" && event.heroineAgencyAfter > event.heroineAgencyBefore && !actionEvidence) addIssue("agency-without-action", "error", "the declared heroine agency increase has no visible action evidence");
		if (event.pov === "heroine-first-person" && !contentHasFirstPerson) addIssue("missing-first-person-evidence", "error", "heroine-first-person event has no visible first-person marker");
		let purePsychologyRun = 0;
		let maxPurePsychologyRun = 0;
		for (const paragraph of content.split(/\r?\n\s*\r?\n/gu)) {
			const purePsychology = /(?:想|觉得|以为|明白|知道|不敢|害怕|后悔|意识到|希望)/u.test(paragraph) && !containsActionEvidence(paragraph);
			purePsychologyRun = purePsychology ? purePsychologyRun + 1 : 0;
			maxPurePsychologyRun = Math.max(maxPurePsychologyRun, purePsychologyRun);
		}
		if (maxPurePsychologyRun > 2) addIssue("pure-psychology-run", "error", "more than two consecutive pure-psychology paragraphs");
		const agencyActionEvidence = actionEvidence ? content.split(/\r?\n\s*\r?\n/gu).find(containsActionEvidence)?.trim() : undefined;
		const conflictShown = content.length > 0 && (/["“”「」:：?!？！]/u.test(content) || actionEvidence || content.includes(event.conflict.slice(0, Math.min(event.conflict.length, 12))));
		const stateDeltasShown = eventDeltaEntries(event).map((entry) => ({ ...entry, evidence: content.includes(entry.delta) ? entry.delta : agencyActionEvidence }));
		const roleSatisfied = draft?.content !== undefined && conflictShown && (event.targetTrack === "male" || actionEvidence);
		if (!roleSatisfied) addIssue("role-unsatisfied", "error", "the event prose does not satisfy its declared role");
		if (!conflictShown) addIssue("conflict-missing", "error", "the event does not show its declared conflict");
		if (stateDeltasShown.length < 2) addIssue("state-delta-missing", "error", "the event must show at least two state changes");
		const status = (issues.some((issue) => issue.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const relativePath = `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(params.eventId)}-prose.json`;
		const report = { projectId: params.projectId, chapter: params.chapter, eventId: params.eventId, revision: draft?.revision, status, issues, roleSatisfied, conflictShown, agencyActionEvidence, stateDeltasShown, entryHookEvidence: content.includes(event.entryHook) ? event.entryHook : undefined, exitHookEvidence: content.includes(event.exitHook) ? event.exitHook : undefined, injuryMechanismEvidence: event.injuryMechanism === undefined ? undefined : agencyActionEvidence, contentHash: draft?.content === undefined ? undefined : sha256(draft.content), eventSpecHash: hashJson(event), eventMapHash, maxPurePsychologyRun, generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async saveChaseWifeEventSemanticReport(params: SaveChaseWifeEventSemanticReportParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; eventId: number; revision?: number; status: "ok" | "error"; issues: string[]; roleSatisfied: boolean; conflictShown: boolean; requiredStateDeltaCount: number; source: "model"; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const { events, eventMapHash } = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
		const event = events.find((candidate) => candidate.eventId === params.eventId);
		if (!event) throw new Error(`Event ${params.eventId} is not present in the chapter event map.`);
		const draft = params.revision === undefined ? await this.latestChaseWifeEventDraft(params.projectId, params.chapter, params.eventId, signal) : { revision: params.revision, content: await this.readTextIfExists(this.chaseWifeEventDraftPath(params.projectId, params.chapter, params.eventId, params.revision), signal) };
		if (!draft || draft.content === undefined) throw new Error("The semantic report requires an existing event draft.");
		const issues: string[] = [];
		if (!params.roleSatisfied) issues.push("roleSatisfied must be true");
		if (!params.conflictShown) issues.push("conflictShown must be true");
		const dimensions = new Set(params.stateDeltasShown.map((delta) => delta.dimension));
		if (dimensions.size < 2) issues.push("at least two independent state delta dimensions are required");
		const declaredDeltaEntries = eventDeltaEntries(event);
		const declaredDeltaIds = new Map(declaredDeltaEntries.map((entry) => [entry.deltaId, entry]));
		for (const delta of params.stateDeltasShown) {
			const declared = declaredDeltaIds.get(delta.deltaId);
			if (declared === undefined) issues.push(`semantic delta ${delta.deltaId} is not declared by the current event map`);
			else {
				if (declared.dimension !== delta.dimension) issues.push(`semantic delta ${delta.deltaId} has the wrong dimension`);
				if (declared.delta !== delta.delta) issues.push(`semantic delta ${delta.deltaId} does not match the declared event delta`);
			}
		}
		const anchors = [
			{ label: "role evidence", anchor: params.roleEvidence },
			{ label: "conflict evidence", anchor: params.conflictEvidence },
			...params.stateDeltasShown.map((delta) => ({ label: `state delta ${delta.dimension}`, anchor: delta.evidence })),
			...(params.agencyActionEvidence ? [{ label: "agency action evidence", anchor: params.agencyActionEvidence }] : []),
			...(params.entryHookEvidence ? [{ label: "entry hook evidence", anchor: params.entryHookEvidence }] : []),
			{ label: "exit hook evidence", anchor: params.exitHookEvidence },
			...(params.injuryMechanismEvidence ? [{ label: "injury mechanism evidence", anchor: params.injuryMechanismEvidence }] : []),
		];
		for (const item of anchors) {
			if (!isSemanticEvidenceAnchor(item.anchor)) issues.push(`${item.label} must be a prose anchor with startChar, endChar, and excerpt`);
			else {
				const anchorIssue = validateSemanticEvidenceAnchor(draft.content, item.anchor, item.label);
				if (anchorIssue !== undefined) issues.push(anchorIssue);
			}
		}
		const distinctStateAnchors = new Set(params.stateDeltasShown.map((delta) => `${delta.evidence.startChar}:${delta.evidence.endChar}`));
		if (distinctStateAnchors.size !== params.stateDeltasShown.length) issues.push("state delta evidence must use independent prose positions");
		const orderedStateAnchors = [...params.stateDeltasShown].map((delta) => delta.evidence).sort((left, right) => left.startChar - right.startChar);
		if (orderedStateAnchors.some((anchor, index) => index > 0 && anchor.startChar < orderedStateAnchors[index - 1].endChar)) issues.push("state delta evidence ranges must not overlap");
		if (event.targetTrack !== "male" && event.heroineAgencyAfter > event.heroineAgencyBefore && params.agencyActionEvidence === undefined) issues.push("agency increases require visible action evidence");
		if (params.entryHookEvidence === undefined) issues.push("entry hook evidence is required");
		if (params.exitHookEvidence === undefined) issues.push("exit hook evidence is required");
		if (event.injuryMechanism !== undefined && params.injuryMechanismEvidence === undefined) issues.push("declared injury mechanisms require evidence");
		const status = issues.length === 0 ? "ok" as const : "error" as const;
		const relativePath = `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(params.eventId)}-semantics.json`;
		const report = { projectId: params.projectId, chapter: params.chapter, eventId: params.eventId, revision: draft.revision, status, issues, source: "model" as const, roleSatisfied: params.roleSatisfied, roleEvidence: params.roleEvidence, conflictShown: params.conflictShown, conflictEvidence: params.conflictEvidence, requiredStateDeltaCount: dimensions.size, stateDeltasShown: params.stateDeltasShown, agencyActionEvidence: params.agencyActionEvidence, entryHookEvidence: params.entryHookEvidence, exitHookEvidence: params.exitHookEvidence, injuryMechanismEvidence: params.injuryMechanismEvidence, contentHash: sha256(draft.content), eventSpecHash: hashJson(event), eventMapHash, generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async assembleChaseWifeChapter(params: AssembleChaseWifeChapterParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; eventCount: number; path: string; manifestPath: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		// Converged 模式拒绝双事件事实：装配必须走 assemble_unified_chapter。
		if ((await this.projectChaseWifeChapter(params.projectId, params.chapter, signal)) !== undefined) throw new Error(`LEGACY_EVENT_AUTHORITY_CONFLICT: chapter ${params.chapter} is covered by the unified narrative event map; use assemble_unified_chapter.`);
		const { map, events, eventMapHash } = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
		const drafts: string[] = [];
		const manifestEvents: Array<{ eventId: number; revision: number; charCount: number; contentHash: string; eventSpecHash: string }> = [];
		for (const event of events) {
			const draft = await this.latestChaseWifeEventDraft(params.projectId, params.chapter, event.eventId, signal);
			if (!draft) throw new Error(`Event draft ${event.eventId} is missing; assemble only after every event is drafted.`);
			const report = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(event.eventId)}-chase-wife.json`), signal);
			const semantics = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(event.eventId)}-semantics.json`), signal);
			if (!isJsonRecord(report) || report.status !== "ok" || report.revision !== draft.revision || report.contentHash !== sha256(draft.content) || report.eventSpecHash !== hashJson(event) || report.eventMapHash !== eventMapHash) throw new Error(`Event draft ${event.eventId} must pass check_chase_wife_event_draft for the current event map before assembly.`);
			if (!isJsonRecord(semantics) || semantics.source !== "model" || semantics.status !== "ok" || semantics.revision !== draft.revision || semantics.contentHash !== sha256(draft.content) || semantics.eventSpecHash !== hashJson(event) || semantics.eventMapHash !== eventMapHash) throw new Error(`Event draft ${event.eventId} requires a current passing save_chase_wife_event_semantic_report before assembly.`);
			drafts.push(draft.content.trim());
			manifestEvents.push({ eventId: event.eventId, revision: draft.revision, charCount: countChineseCharacters(draft.content), contentHash: sha256(draft.content), eventSpecHash: hashJson(event) });
		}
		const intro = params.chapter === 1 && isNonEmptyString(map.openingIntro) ? map.openingIntro.trim() : "";
		if (params.chapter === 1 && intro.length === 0) throw new Error("Chapter 1 assembly requires the opening intro before the first chapter.");
		const introPrefix = params.chapter === 1 ? chaseWifeChapterOnePrefix(intro) : "";
		const assembledContent = [introPrefix, ...drafts].filter((part) => part.length > 0).join("\n\n");
		if (params.chapter === 1 && !assembledContent.startsWith(`${CHASE_WIFE_INTRO_HEADING}\n\n`)) throw new Error("Chapter 1 assembly must begin with the standalone opening intro as its first part.");
		const manifestEventRanges = manifestEvents.map((manifestEvent, index) => {
			const startChar = countChineseCharacters(introPrefix) + manifestEvents.slice(0, index).reduce((sum, item) => sum + item.charCount, 0);
			return { ...manifestEvent, startChar, endChar: startChar + manifestEvent.charCount };
		});
		const chapterDraft = await this.saveChapterDraftInternal({ projectId: params.projectId, chapter: params.chapter, revision: params.revision, content: assembledContent }, signal);
		const manifestPath = `work/chase-wife-assemblies/${chapterName(params.chapter)}-r${String(chapterDraft.revision).padStart(2, "0")}.json`;
		const manifest = { version: 4, projectId: params.projectId, chapter: params.chapter, draftRevision: chapterDraft.revision, openingIntroIncluded: intro.length > 0, openingIntroHeading: params.chapter === 1 ? CHASE_WIFE_INTRO_HEADING : undefined, chapterHeading: params.chapter === 1 ? CHASE_WIFE_CHAPTER_ONE_HEADING : undefined, eventMapHash, eventDrafts: manifestEventRanges, assembledCharCount: countChineseCharacters(assembledContent), assembledHash: sha256(normalizeText(assembledContent)), generatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, draftRevision: chapterDraft.revision, eventCount: events.length, path: chapterDraft.path, manifestPath };
	}

	async checkChaseWifeChapterPacing(params: CheckChaseWifeChapterPacingParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision?: number; status: "ok" | "warning" | "error"; issues: string[]; issueRecords: ChaseWifePacingIssueRecord[]; metrics: Record<string, number | string | boolean | undefined>; contentHash?: string; eventMapHash?: string; manifestHash?: string; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const { map, events, eventMapHash } = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
		const issues: string[] = [];
		const issueRecords: ChaseWifePacingIssueRecord[] = [];
		const addIssue = (code: string, severity: "error" | "warning", message: string, deduction: number): void => {
			issues.push(message);
			issueRecords.push({ code, severity, deduction, message });
		};
		const eventDrafts: Array<{ event: ChaseWifeEvent; content: string; chars: number }> = [];
		for (const event of events) {
			const draft = await this.latestChaseWifeEventDraft(params.projectId, params.chapter, event.eventId, signal);
			if (!draft) {
				addIssue("missing-event-draft", "error", `event draft ${event.eventId} is missing`, 15);
				continue;
			}
			const chars = countChineseCharacters(draft.content);
			eventDrafts.push({ event, content: draft.content, chars });
			if (chars < event.minChars || chars > event.maxChars) addIssue("event-budget", "error", `event ${event.eventId} is outside its ${event.lengthMode} budget`, 10);
		}
		if (params.chapter === 1 && typeof map.openingIntro === "string" && map.openingIntro.trim().length > 0) {
			const firstEventDraft = eventDrafts.find((item) => item.event.eventId === 1);
			const introText = normalizedCharacterText(map.openingIntro.trim());
			if (firstEventDraft !== undefined && introText.length > 0 && normalizedCharacterText(firstEventDraft.content).startsWith(introText)) {
				addIssue("intro-duplicated-in-first-event", "error", "the first event must not repeat the opening intro; the intro is a standalone short first part", 15);
			}
		}
		const chapterDraft = params.draftRevision === undefined ? await this.latestDraft(params.projectId, params.chapter, signal) : { revision: params.draftRevision, content: await this.readTextIfExists(this.draftPath(params.projectId, params.chapter, params.draftRevision), signal) };
		if (!chapterDraft || chapterDraft.content === undefined) addIssue("missing-assembled-draft", "error", "assembled chapter draft is missing", 15);
		// Converged 模式：装配清单来自 unified assembly（无 eventMapHash 字段，只绑定 assembledHash）。
		const manifestDirectory = map.source === "unified" ? "work/unified-assemblies" : "work/chase-wife-assemblies";
		const manifest = chapterDraft?.content === undefined ? undefined : await this.readJsonIfExists(this.projectFile(params.projectId, `${manifestDirectory}/${chapterName(params.chapter)}-r${String(chapterDraft.revision).padStart(2, "0")}.json`), signal);
		if (!isJsonRecord(manifest)) addIssue("missing-assembly-manifest", "error", "current assembly manifest is missing", 15);
		else if ((map.source !== "unified" && manifest.eventMapHash !== eventMapHash) || manifest.assembledHash !== sha256(normalizeText(chapterDraft?.content ?? ""))) addIssue("stale-assembly-manifest", "error", "current assembly manifest is stale", 15);
		const introChars = params.chapter === 1 && typeof map.openingIntro === "string" ? countChineseCharacters(chaseWifeChapterOnePrefix(map.openingIntro)) : 0;
		const openingMode = map.openingMode === "cold-conflict" || map.openingMode === "result-first" || map.openingMode === "exit-in-progress" || map.openingMode === "quiet-dislocation" ? map.openingMode : "quiet-dislocation";
		const assembledChars = chapterDraft?.content === undefined ? introChars + eventDrafts.reduce((sum, item) => sum + item.chars, 0) : countChineseCharacters(chapterDraft.content);
		const totalChars = assembledChars;
		// Converged 模式无 openingConflictMarker：以首个 chase 事件的冲突文本（前 12 字）为标记。
		const conflictMarker = typeof map.openingConflictMarker === "string" ? map.openingConflictMarker : events[0]?.conflict.slice(0, 12);
		const conflictPosition = chapterDraft?.content !== undefined && conflictMarker ? chapterDraft.content.indexOf(conflictMarker) : -1;
		if (params.chapter === 1 && (conflictMarker === undefined || conflictPosition < 0 || conflictPosition > 250)) addIssue("opening-conflict-late", "error", "first visible conflict is not verified within 250 characters", 15);
		const firstAgencyEvent = eventDrafts.find((item) => item.event.targetTrack !== "male" && (item.event.heroineAgencyAfter > item.event.heroineAgencyBefore || ["micro-withdrawal", "boundary-test", "decision", "irreversible-exit", "self-rebuild", "final-boundary"].includes(item.event.role)));
		const firstAgencyPosition = firstAgencyEvent ? introChars + eventDrafts.slice(0, eventDrafts.indexOf(firstAgencyEvent)).reduce((sum, item) => sum + item.chars, 0) : -1;
		if (firstAgencyPosition < 0 || (totalChars > 0 && firstAgencyPosition > totalChars * 0.12)) addIssue("agency-late", "error", "heroine first active choice is too late or missing", 15);
		const exitEvent = eventDrafts.find((item) => isFormalChaseWifeExit(item.event));
		const exitChars = exitEvent ? introChars + eventDrafts.slice(0, eventDrafts.indexOf(exitEvent) + (openingMode === "exit-in-progress" && exitEvent.event.eventId === 1 ? 0 : 1)).reduce((sum, item) => sum + item.chars, 0) : -1;
		const exitRatio = totalChars > 0 && exitChars >= 0 ? exitChars / totalChars : -1;
		const mode = params.mode ?? await this.chaseWifePacingMode(params.projectId, signal);
		const causalExitMarker = typeof map.causalExitMarker === "string" ? map.causalExitMarker : undefined;
		const causalExitPosition = chapterDraft?.content !== undefined && causalExitMarker ? chapterDraft.content.indexOf(causalExitMarker) : -1;
		const causalExitRatio = totalChars > 0 && causalExitPosition >= 0 ? causalExitPosition / totalChars : -1;
		const causalExitMax = mode === "fast-burn" ? 0.45 : 0.55;
		if (params.chapter === 1 && openingMode === "exit-in-progress" && (causalExitPosition < 0 || causalExitRatio > causalExitMax)) addIssue("causal-exit-late", "error", `exit-in-progress must reveal the cause of the opening exit by ${Math.round(causalExitMax * 100)}% of the chapter`, 15);
		const pursuitEvent = eventDrafts.find((item) => ["pursuit-control", "pursuit-failure", "real-consequence"].includes(item.event.role));
		const pursuitChars = pursuitEvent ? introChars + eventDrafts.slice(0, eventDrafts.indexOf(pursuitEvent) + 1).reduce((sum, item) => sum + item.chars, 0) : -1;
		const pursuitRatio = totalChars > 0 && pursuitChars >= 0 ? pursuitChars / totalChars : -1;
		let repeatedMechanism = 0;
		for (let index = 1; index < events.length; index += 1) {
			if (events[index].injuryMechanism !== undefined && events[index].injuryMechanism === events[index - 1].injuryMechanism) repeatedMechanism += 1;
			else repeatedMechanism = 0;
			if (repeatedMechanism >= 2) addIssue("repeated-injury-mechanism", "error", `same injury mechanism repeats more than twice: ${events[index].injuryMechanism}`, 10);
		}
		for (let index = 1; index < eventDrafts.length; index += 1) {
			if (textSimilarity(eventDrafts[index - 1].content, eventDrafts[index].content) >= 0.78) addIssue("interchangeable-event-prose", "error", `event drafts ${eventDrafts[index - 1].event.eventId} and ${eventDrafts[index].event.eventId} are too similar to remain separate`, 10);
		}
		const memorySpans = [...(params.memorySpans ?? [])].sort((left, right) => left.startChar - right.startChar);
		let memoryInvalid = false;
		for (let index = 0; index < memorySpans.length; index += 1) {
			const span = memorySpans[index];
			if (span.startChar >= span.endChar || span.endChar > assembledChars || (index > 0 && span.startChar < memorySpans[index - 1].endChar)) memoryInvalid = true;
		}
		if (memoryInvalid) addIssue("invalid-memory-spans", "error", "memory spans are invalid or overlap the chapter boundary", 10);
		const memoryChars = memorySpans.reduce((sum, span) => sum + Math.max(0, span.endChar - span.startChar), 0);
		const memoryRatio = assembledChars > 0 ? memoryChars / assembledChars : 0;
		if (memoryRatio > 0.15) addIssue("memory-overuse", "warning", "memory spans exceed 15% of the chapter event text", 5);
		let purePsychologyRun = 0;
		let maxPurePsychologyRun = 0;
		if (chapterDraft?.content !== undefined) {
			for (const paragraph of chapterDraft.content.split(/\r?\n\s*\r?\n/gu)) {
				const purePsychology = /(?:我|他|她)(?:想|觉得|以为|明白|知道|不敢|害怕|后悔|意识到|记得|希望)/u.test(paragraph) && !/[“”"：:]/u.test(paragraph) && !/[走站转身拿放删签推开关看听问说回离递打发拉黑搬收拾抓摔握松]/u.test(paragraph);
				purePsychologyRun = purePsychology ? purePsychologyRun + 1 : 0;
				maxPurePsychologyRun = Math.max(maxPurePsychologyRun, purePsychologyRun);
			}
		}
		if (maxPurePsychologyRun > 2) addIssue("pure-psychology-run", "error", "more than two consecutive pure-psychology paragraphs", 10);
		const status = (issueRecords.some((issue) => issue.severity === "error") ? "error" : issueRecords.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const metrics = { totalChars, firstConflictPosition: conflictPosition < 0 ? undefined : conflictPosition, firstAgencyRatio: firstAgencyPosition < 0 || totalChars === 0 ? undefined : firstAgencyPosition / totalChars, exitRatio: exitRatio < 0 ? undefined : exitRatio, causalExitRatio: causalExitRatio < 0 ? undefined : causalExitRatio, pursuitRatio: pursuitRatio < 0 ? undefined : pursuitRatio, memoryRatio, maxPurePsychologyRun, eventCount: events.length, assembledDraftFound: chapterDraft !== undefined && chapterDraft.content !== undefined, openingMode, mode };
		const relativePath = `continuity/reports/${chapterName(params.chapter)}-chase-wife-pacing.json`;
		const report = { projectId: params.projectId, chapter: params.chapter, draftRevision: chapterDraft?.revision, status, issues, issueRecords, metrics, contentHash: chapterDraft?.content === undefined ? undefined : sha256(chapterDraft.content), eventMapHash, manifestHash: isJsonRecord(manifest) ? hashJson(manifest) : undefined, generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async checkChaseWifePacing(params: CheckChaseWifePacingParams, signal?: AbortSignal): Promise<Awaited<ReturnType<NovelProjectStore["checkChaseWifeChapterPacing"]>>> {
		return this.checkChaseWifeChapterPacing(params, signal);
	}

	async checkChaseWifeStoryPacing(params: CheckChaseWifeStoryPacingParams, signal?: AbortSignal): Promise<{ projectId: string; scope: "working" | "finalized"; status: "ok" | "warning" | "error"; issues: string[]; issueRecords: ChaseWifePacingIssueRecord[]; metrics: Record<string, number | string | boolean | undefined>; sourceHashes: string[]; contentHash: string; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const scope = params.scope ?? "working";
		const evaluationMode = scope === "finalized" ? "gate" as const : params.evaluationMode ?? "projection" as const;
		const timingSeverity = evaluationMode === "gate" ? "error" as const : "warning" as const;
		const issues: string[] = [];
		const issueRecords: ChaseWifePacingIssueRecord[] = [];
		const sourceHashes: string[] = [];
		const addIssue = (code: string, severity: "error" | "warning", message: string, deduction: number): void => {
			issues.push(message);
			issueRecords.push({ code, severity, message, deduction });
		};
		const storyEvents: Array<{ chapter: number; event: ChaseWifeEvent; content?: string; chars: number }> = [];
		let introChars = 0;
		let firstConflictPosition = -1;
		let openingMode: "cold-conflict" | "result-first" | "exit-in-progress" | "quiet-dislocation" = "quiet-dislocation";
		let causalExitMarker: string | undefined;
		let chapterOneIntro: string | undefined;
		let causalExitPosition = -1;
		let totalChars = 0;
		let finalizedChapterCount = 0;

		if (scope === "working") {
			const mapPaths = (await this.listFiles(this.projectFile(params.projectId, "work/chase-wife-events"), signal)).filter((path) => /chapter-\d+\.json$/u.test(path)).sort();
			for (const mapPath of mapPaths) {
				const chapter = Number(mapPath.match(/chapter-(\d+)\.json$/u)?.[1] ?? 0);
				const mapValue = await this.readJsonIfExists(mapPath, signal);
				if (!isJsonRecord(mapValue) || !Array.isArray(mapValue.events)) {
					addIssue("invalid-event-map", "error", `chapter ${chapter} event map is missing or invalid`, 20);
					continue;
				}
				sourceHashes.push(hashJson(mapValue));
				if (chapter === 1 && typeof mapValue.openingIntro === "string") introChars = countChineseCharacters(chaseWifeChapterOnePrefix(mapValue.openingIntro));
				if (chapter === 1) {
					openingMode = mapValue.openingMode === "cold-conflict" || mapValue.openingMode === "result-first" || mapValue.openingMode === "exit-in-progress" || mapValue.openingMode === "quiet-dislocation" ? mapValue.openingMode : "quiet-dislocation";
					causalExitMarker = typeof mapValue.causalExitMarker === "string" ? mapValue.causalExitMarker : undefined;
					chapterOneIntro = typeof mapValue.openingIntro === "string" ? mapValue.openingIntro : undefined;
				}
				const events = mapValue.events.filter(isChaseWifeEvent).sort((left, right) => left.eventId - right.eventId);
				for (const event of events) {
					const draft = await this.latestChaseWifeEventDraft(params.projectId, chapter, event.eventId, signal);
					if (!draft) {
						addIssue("missing-event-draft", timingSeverity, `chapter ${chapter} event draft ${event.eventId} is missing`, 15);
						continue;
					}
					sourceHashes.push(sha256(draft.content));
					storyEvents.push({ chapter, event, content: draft.content, chars: countChineseCharacters(draft.content) });
				}
				if (chapter === 1 && typeof mapValue.openingConflictMarker === "string" && typeof mapValue.openingIntro === "string") {
					// 引言是全文的第一部分，冲突标记必须先能在引言（组装前缀）中找到；找不到再回退事件 1 草稿。
					const introMarkerPosition = chaseWifeChapterOnePrefix(mapValue.openingIntro).indexOf(mapValue.openingConflictMarker);
					if (introMarkerPosition >= 0) {
						firstConflictPosition = introMarkerPosition;
					} else {
						const first = storyEvents.find((item) => item.chapter === 1 && item.event.eventId === 1);
						const localPosition = first?.content?.indexOf(mapValue.openingConflictMarker) ?? -1;
						firstConflictPosition = localPosition < 0 ? -1 : introChars + localPosition;
					}
				}
			}
			totalChars = introChars + storyEvents.reduce((sum, item) => sum + item.chars, 0);
			if (causalExitMarker !== undefined && causalExitPosition < 0 && chapterOneIntro !== undefined) {
				const introMarkerPosition = chaseWifeChapterOnePrefix(chapterOneIntro).indexOf(causalExitMarker);
				if (introMarkerPosition >= 0) causalExitPosition = introMarkerPosition;
			}
			if (causalExitMarker !== undefined && causalExitPosition < 0) {
				let chapterCursor = introChars;
				for (const item of storyEvents.filter((candidate) => candidate.chapter === 1)) {
					const localPosition = item.content?.indexOf(causalExitMarker) ?? -1;
					if (localPosition >= 0) {
						causalExitPosition = chapterCursor + localPosition;
						break;
					}
					chapterCursor += item.chars;
				}
			}
		} else {
			const chapterPaths = (await this.listFiles(this.projectFile(params.projectId, "chapters"), signal)).filter((path) => /chapter-\d+\.md$/u.test(path)).sort();
			const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
			const finalizedChapters = isJsonRecord(project) && Array.isArray(project.finalizedChapters) ? new Set(project.finalizedChapters.filter(isPositiveInteger)) : new Set<number>();
			for (const chapterPath of chapterPaths) {
				const chapter = Number(chapterPath.match(/chapter-(\d+)\.md$/u)?.[1] ?? 0);
				const content = await this.readTextIfExists(chapterPath, signal);
				if (content === undefined) continue;
				finalizedChapterCount += 1;
				if (!finalizedChapters.has(chapter)) addIssue("chapter-not-finalized", "error", `chapter ${chapter} exists but is not marked finalized in project state`, 15);
				const summary = await this.readJsonIfExists(this.projectFile(params.projectId, `summaries/${chapterName(chapter)}.json`), signal);
				if (!isJsonRecord(summary) || !isPositiveInteger(summary.draftRevision)) addIssue("missing-final-summary", "error", `chapter ${chapter} has no valid finalized summary`, 15);
				const draftRevision = isJsonRecord(summary) && isPositiveInteger(summary.draftRevision) ? summary.draftRevision : undefined;
				const manifest = draftRevision === undefined ? undefined : await this.readJsonIfExists(this.projectFile(params.projectId, `work/chase-wife-assemblies/${chapterName(chapter)}-r${String(draftRevision).padStart(2, "0")}.json`), signal);
				const map = await this.readJsonIfExists(this.projectFile(params.projectId, `work/chase-wife-events/${chapterName(chapter)}.json`), signal);
				if (!isJsonRecord(map) || !Array.isArray(map.events)) {
					addIssue("missing-final-event-map", "error", `chapter ${chapter} has no valid event map`, 20);
					continue;
				}
				const eventMapHash = hashJson(map);
				if (!isJsonRecord(manifest) || manifest.eventMapHash !== eventMapHash || manifest.assembledHash !== sha256(normalizeText(content))) addIssue("stale-finalized-manifest", "error", `chapter ${chapter} finalized content is not bound to its current assembly manifest`, 20);
				if (isJsonRecord(summary)) sourceHashes.push(hashJson(summary));
				sourceHashes.push(sha256(content), eventMapHash, isJsonRecord(manifest) ? hashJson(manifest) : "missing-manifest");
				const events = map.events.filter(isChaseWifeEvent).sort((left, right) => left.eventId - right.eventId);
				const manifestEvents = isJsonRecord(manifest) && Array.isArray(manifest.eventDrafts) ? manifest.eventDrafts.filter(isJsonRecord) : [];
				const manifestEventSpecsValid = manifestEvents.length === events.length && events.every((event) => {
					const entry = manifestEvents.find((candidate) => candidate.eventId === event.eventId);
					return entry !== undefined && typeof entry.charCount === "number" && entry.charCount > 0 && entry.eventSpecHash === hashJson(event);
				});
				if (!manifestEventSpecsValid) addIssue("stale-finalized-manifest", "error", `chapter ${chapter} assembly manifest is not bound to every event specification`, 20);
				const chapterEventChars = events.map((event) => {
					const entry = manifestEvents.find((candidate) => candidate.eventId === event.eventId);
					return { event, chars: entry && typeof entry.charCount === "number" ? entry.charCount : 0 };
				});
				if (chapter === 1) {
					openingMode = map.openingMode === "cold-conflict" || map.openingMode === "result-first" || map.openingMode === "exit-in-progress" || map.openingMode === "quiet-dislocation" ? map.openingMode : "quiet-dislocation";
					causalExitMarker = typeof map.causalExitMarker === "string" ? map.causalExitMarker : undefined;
					if (typeof map.openingIntro === "string" && map.openingIntro.trim().length > 0 && !content.startsWith(chaseWifeChapterOnePrefix(map.openingIntro))) {
						addIssue("missing-intro-first-part", "error", "chapter 1 must begin with the standalone opening intro as its first part", 15);
					}
					const eventChars = chapterEventChars.reduce((sum, item) => sum + item.chars, 0);
					introChars = Math.max(0, countChineseCharacters(content) - eventChars);
					if (typeof map.openingConflictMarker === "string") {
						const localPosition = content.indexOf(map.openingConflictMarker);
						firstConflictPosition = localPosition < 0 ? -1 : localPosition;
					}
					if (causalExitMarker !== undefined) {
						const localPosition = content.indexOf(causalExitMarker);
						causalExitPosition = localPosition < 0 ? -1 : localPosition;
					}
				}
				for (const item of chapterEventChars) storyEvents.push({ chapter, event: item.event, chars: item.chars });
				totalChars += countChineseCharacters(content);
			}
			if (finalizedChapterCount === 0) addIssue("missing-finalized-chapters", "error", "finalized scope requires at least one finalized chapter", 20);
		}

		let cursor = introChars;
		let firstAgencyPosition = -1;
		let exitRatio = -1;
		let pursuitRatio = -1;
		let newLifeChars = 0;
		let previousHeroineAgency: number | undefined;
		let previousHeroineAgencyState: ChaseWifeAgencyState | undefined;
		let previousAgencyChapter: number | undefined;
		let heroineAgencyUpgradesBeforeExit = 0;
		const heroineAgencyUpgradeDimensions = new Set<string>();
		let irreversibleExitSeen = false;
		let previousInjuryMechanism: string | undefined;
		let repeatedInjuryMechanism = 0;
		for (const item of storyEvents) {
			if (item.event.targetTrack !== "male") {
				const agencyChapterChanged = previousAgencyChapter !== undefined && item.chapter !== previousAgencyChapter;
				if (previousHeroineAgency !== undefined && item.event.heroineAgencyBefore !== previousHeroineAgency) {
					// 章内严格连续；跨章允许上升（时间跳跃中的离屏成长），禁止无理由回退。
					const upwardAcrossChapter = agencyChapterChanged && item.event.heroineAgencyBefore > previousHeroineAgency;
					if (!upwardAcrossChapter) addIssue("agency-discontinuity", "error", `heroine agency does not continue into event ${item.event.eventId}`, 10);
				}
				if (item.event.heroineAgencyAfter < item.event.heroineAgencyBefore && item.event.setback === undefined) addIssue("agency-regression", "error", `heroine agency regresses in event ${item.event.eventId} without an explicit recovery beat`, 10);
				previousHeroineAgency = item.event.heroineAgencyAfter;
				previousAgencyChapter = item.chapter;
				if (item.event.heroineAgencyStateBefore !== undefined && item.event.heroineAgencyStateAfter !== undefined) {
					if (previousHeroineAgencyState !== undefined) {
						for (const dimension of ["epistemic", "relational", "material", "social", "future"] as const) {
							if (item.event.heroineAgencyStateBefore[dimension] !== previousHeroineAgencyState[dimension]) {
								const upwardAcrossChapterDimension = agencyChapterChanged && item.event.heroineAgencyStateBefore[dimension] > previousHeroineAgencyState[dimension];
								if (!upwardAcrossChapterDimension) addIssue("agency-state-discontinuity", "error", `heroine ${dimension} agency does not continue into event ${item.event.eventId}`, 10);
							}
						}
					}
					for (const dimension of ["epistemic", "relational", "material", "social", "future"] as const) {
						if (!irreversibleExitSeen && item.event.heroineAgencyStateAfter[dimension] > item.event.heroineAgencyStateBefore[dimension]) heroineAgencyUpgradeDimensions.add(dimension);
					}
					previousHeroineAgencyState = item.event.heroineAgencyStateAfter;
				}
				if (!irreversibleExitSeen && item.event.heroineAgencyAfter > item.event.heroineAgencyBefore) heroineAgencyUpgradesBeforeExit += 1;
			}
			if (item.event.injuryMechanism !== undefined && item.event.injuryMechanism === previousInjuryMechanism) repeatedInjuryMechanism += 1;
			else repeatedInjuryMechanism = 0;
			if (repeatedInjuryMechanism >= 2) addIssue("cross-chapter-repeated-injury", "error", `same injury mechanism repeats across chapter boundaries: ${item.event.injuryMechanism}`, 10);
			previousInjuryMechanism = item.event.injuryMechanism;
			if (firstAgencyPosition < 0 && item.event.targetTrack !== "male" && (item.event.heroineAgencyAfter > item.event.heroineAgencyBefore || ["micro-withdrawal", "boundary-test", "decision", "irreversible-exit", "self-rebuild", "final-boundary"].includes(item.event.role))) firstAgencyPosition = cursor;
			if (exitRatio < 0 && isFormalChaseWifeExit(item.event)) exitRatio = (openingMode === "exit-in-progress" && item.chapter === 1 && item.event.eventId === 1 ? cursor : cursor + item.chars) / Math.max(totalChars, 1);
			if (isFormalChaseWifeExit(item.event)) irreversibleExitSeen = true;
			if (pursuitRatio < 0 && ["pursuit-control", "pursuit-failure", "real-consequence"].includes(item.event.role)) pursuitRatio = (cursor + item.chars) / Math.max(totalChars, 1);
			if (item.event.role === "self-rebuild" || item.event.role === "final-boundary") newLifeChars += item.chars;
			cursor += item.chars;
		}
		const mode = params.mode ?? await this.chaseWifePacingMode(params.projectId, signal);
		const [exitMin, exitMax, pursuitMax] = mode === "fast-burn" ? [0.35, 0.45, 0.55] : [0.45, 0.55, 0.65];
		if (firstConflictPosition < 0 || firstConflictPosition > 250) addIssue("opening-conflict-late", timingSeverity, "first visible conflict is not verified within 250 characters of the full story", 15);
		if (firstAgencyPosition < 0 || firstAgencyPosition > totalChars * 0.12) addIssue("agency-late", timingSeverity, "heroine first active choice is too late or missing in the full story", 15);
		if (exitRatio < 0) addIssue("missing-irreversible-exit", timingSeverity, "the full story has no irreversible exit event", 20);
		else if (openingMode === "exit-in-progress") {
			const causalExitRatio = totalChars > 0 && causalExitPosition >= 0 ? causalExitPosition / totalChars : -1;
			if (causalExitRatio < 0 || causalExitRatio > exitMax) addIssue("causal-exit-timing", timingSeverity, `exit-in-progress must reveal the cause of the opening exit by ${Math.round(exitMax * 100)}% in ${mode} mode`, 15);
		} else if (exitRatio < exitMin || exitRatio > exitMax) addIssue("exit-timing", timingSeverity, `irreversible exit should land between ${Math.round(exitMin * 100)}%-${Math.round(exitMax * 100)}% in ${mode} mode`, 15);
		if (pursuitRatio < 0) addIssue("missing-pursuit", timingSeverity, "the full story has no male pursuit or consequence event", 15);
		else if (pursuitRatio > pursuitMax) addIssue("pursuit-late", timingSeverity, `male pursuit must begin by ${Math.round(pursuitMax * 100)}% in ${mode} mode`, 10);
		if (exitRatio >= 0 && openingMode !== "exit-in-progress" && heroineAgencyUpgradesBeforeExit < 2) addIssue("insufficient-agency-upgrades", timingSeverity, "the heroine must make at least two distinct active choices before or at the irreversible exit", 15);
		if (exitRatio >= 0 && openingMode !== "exit-in-progress" && heroineAgencyUpgradeDimensions.size > 0 && heroineAgencyUpgradeDimensions.size < 2) addIssue("narrow-agency-track", timingSeverity, "the heroine agency track must change at least two dimensions before exit", 10);
		if (totalChars > 0 && newLifeChars / totalChars < 0.15) addIssue("weak-new-life-track", evaluationMode === "gate" ? "error" : "warning", "heroine new life and final boundary occupy less than 15% of the full story", 5);
		const status = (issueRecords.some((issue) => issue.severity === "error") ? "error" : issueRecords.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const causalExitRatio = totalChars > 0 && causalExitPosition >= 0 ? causalExitPosition / totalChars : undefined;
		const metrics = { totalChars, firstConflictPosition: firstConflictPosition < 0 ? undefined : firstConflictPosition, firstAgencyRatio: firstAgencyPosition < 0 ? undefined : firstAgencyPosition / Math.max(totalChars, 1), exitRatio: exitRatio < 0 ? undefined : exitRatio, causalExitRatio, pursuitRatio: pursuitRatio < 0 ? undefined : pursuitRatio, newLifeRatio: totalChars > 0 ? newLifeChars / totalChars : 0, chapterCount: new Set(storyEvents.map((item) => item.chapter)).size, eventCount: storyEvents.length, openingMode, mode, evaluationMode, heroineAgencyUpgradesBeforeExit, heroineAgencyUpgradeDimensions: heroineAgencyUpgradeDimensions.size };
		const relativePath = "continuity/reports/chase-wife-story-pacing.json";
		const report = { projectId: params.projectId, scope, status, issues, issueRecords, metrics, sourceHashes, contentHash: sha256(sourceHashes.join("|")), generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async scoreChaseWifeChapter(params: ScoreChaseWifeChapterParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision?: number; total: number; passed: boolean; deductions: string[]; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const pacing = await this.checkChaseWifeChapterPacing({ projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, mode: params.mode }, signal);
		const deductions = pacing.issueRecords.map((issue) => issue.message);
		const total = Math.max(0, 100 - pacing.issueRecords.reduce((sum, issue) => sum + issue.deduction, 0));
		const passed = pacing.status !== "error" && total >= 70;
		const relativePath = `evaluations/chapter/${chapterName(params.chapter)}-chase-wife-pacing-score.json`;
		const result = { projectId: params.projectId, chapter: params.chapter, draftRevision: pacing.draftRevision, total, passed, deductions, metrics: pacing.metrics, contentHash: pacing.contentHash, eventMapHash: pacing.eventMapHash, manifestHash: pacing.manifestHash, generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, result, signal);
		return { ...result, path: relativePath };
	}

	// ==== Mystery Engine（female-social-suspense）====

	private async ensureMysteryProject(projectId: string, signal?: AbortSignal): Promise<void> {
		await this.ensureProject(projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		if (!isJsonRecord(project) || !hasPrimaryGenre(project, "female-social-suspense")) throw new Error("This tool is only available for projects with the female-social-suspense primary genre.");
	}

	private async readMysteryCase(projectId: string, signal?: AbortSignal): Promise<MysteryCase | undefined> {
		const confirmed = await this.readJsonIfExists(this.projectFile(projectId, "canon/mystery/truth-model.json"), signal);
		const value = confirmed ?? await this.readJsonIfExists(this.projectFile(projectId, "work/mystery/truth-model-proposed.json"), signal);
		return isJsonRecord(value) && isJsonRecord(value.case) ? value.case as unknown as MysteryCase : undefined;
	}

	private async readMysteryClues(projectId: string, signal?: AbortSignal): Promise<MysteryClue[]> {
		const value = await this.readJsonIfExists(this.projectFile(projectId, "outline/mystery/clue-ledger.json"), signal);
		if (!isJsonRecord(value) || !Array.isArray(value.clues)) return [];
		return value.clues.filter((item): item is MysteryClue => isJsonRecord(item) && typeof item.id === "string" && typeof item.observableFact === "string" && typeof item.firstAvailableChapter === "number").map((item) => item as unknown as MysteryClue);
	}

	private async readMysterySuspects(projectId: string, signal?: AbortSignal): Promise<MysterySuspect[]> {
		const confirmed = await this.readJsonIfExists(this.projectFile(projectId, "canon/mystery/suspect-model.json"), signal);
		const value = confirmed ?? await this.readJsonIfExists(this.projectFile(projectId, "work/mystery/suspect-model-proposed.json"), signal);
		if (!isJsonRecord(value) || !Array.isArray(value.suspects)) return [];
		return value.suspects.filter((item): item is MysterySuspect => isJsonRecord(item) && typeof item.id === "string" && typeof item.actualRole === "string").map((item) => item as unknown as MysterySuspect);
	}

	private async readMysteryCheckpoints(projectId: string, signal?: AbortSignal): Promise<MysteryInformationCheckpoint[]> {
		const value = await this.readJsonIfExists(this.projectFile(projectId, "outline/mystery/information-state.json"), signal);
		if (!isJsonRecord(value) || !Array.isArray(value.checkpoints)) return [];
		return value.checkpoints.filter((item): item is MysteryInformationCheckpoint => isJsonRecord(item) && typeof item.id === "string" && typeof item.afterChapter === "number").map((item) => item as unknown as MysteryInformationCheckpoint);
	}

	async saveMysteryCase(params: SaveMysteryCaseParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureMysteryProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const claimIds = new Set(params.case.truthClaims.map((claim) => claim.id));
		if (claimIds.size !== params.case.truthClaims.length) throw new Error("Mystery truth claim IDs must be unique.");
		const relativePath = params.status === "confirmed" ? "canon/mystery/truth-model.json" : "work/mystery/truth-model-proposed.json";
		const document = { version: 1, projectId: params.projectId, genre: "mystery", status: params.status, case: params.case, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async saveMysteryClueLedger(params: SaveMysteryClueLedgerParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; count: number }> {
		await this.ensureMysteryProject(params.projectId, signal);
		if (new Set(params.clues.map((clue) => clue.id)).size !== params.clues.length) throw new Error("Mystery clue IDs must be unique.");
		const relativePath = "outline/mystery/clue-ledger.json";
		const existing = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
		const prior = isJsonRecord(existing) && Array.isArray(existing.clues) ? existing.clues.filter(isJsonRecord) : [];
		const merged = [...prior.filter((item) => !params.clues.some((clue) => clue.id === item.id)), ...params.clues];
		const document = { version: 1, projectId: params.projectId, genre: "mystery", clues: merged, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath, count: params.clues.length };
	}

	async saveMysterySuspectModel(params: SaveMysterySuspectModelParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string; count: number }> {
		await this.ensureMysteryProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		if (new Set(params.suspects.map((suspect) => suspect.id)).size !== params.suspects.length) throw new Error("Mystery suspect IDs must be unique.");
		const relativePath = params.status === "confirmed" ? "canon/mystery/suspect-model.json" : "work/mystery/suspect-model-proposed.json";
		const document = { version: 1, projectId: params.projectId, genre: "mystery", status: params.status, suspects: params.suspects, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath, count: params.suspects.length };
	}

	async saveMysteryInformationState(params: SaveMysteryInformationStateParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; count: number }> {
		await this.ensureMysteryProject(params.projectId, signal);
		if (new Set(params.checkpoints.map((checkpoint) => checkpoint.id)).size !== params.checkpoints.length) throw new Error("Mystery information checkpoint IDs must be unique.");
		const relativePath = "outline/mystery/information-state.json";
		const document = { version: 1, projectId: params.projectId, genre: "mystery", checkpoints: params.checkpoints, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath, count: params.checkpoints.length };
	}

	async checkMysteryDesign(params: CheckMysteryDesignParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: MysteryIssue[]; counts: Record<string, number>; path: string }> {
		await this.ensureMysteryProject(params.projectId, signal);
		const caseData = await this.readMysteryCase(params.projectId, signal);
		const clues = await this.readMysteryClues(params.projectId, signal);
		const suspects = await this.readMysterySuspects(params.projectId, signal);
		const checkpoints = await this.readMysteryCheckpoints(params.projectId, signal);
		const issues = checkMysteryDesign(caseData, clues, suspects, checkpoints);
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = {
			version: 1,
			projectId: params.projectId,
			status,
			issues,
			counts: { claims: caseData?.truthClaims.length ?? 0, clues: clues.length, suspects: suspects.length, checkpoints: checkpoints.length },
			sourceHashes: [caseData, clues, suspects, checkpoints].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/mystery-design.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async checkMysteryFairness(params: CheckMysteryFairnessParams, signal?: AbortSignal): Promise<{ projectId: string; verdict: "fair" | "needs-work" | "unfair"; status: "ok" | "warning" | "error"; issues: MysteryIssue[]; supportedFinalClaims: string[]; unsupportedFinalClaims: Array<{ claimId: string; reason: string }>; clueCoverage: Record<string, { available: number; total: number }>; proofCoverage: Record<string, { completePaths: number; totalPaths: number; directClueIds: string[]; transitiveClueIds: string[] }>; path: string }> {
		await this.ensureMysteryProject(params.projectId, signal);
		const caseData = await this.readMysteryCase(params.projectId, signal);
		const clues = await this.readMysteryClues(params.projectId, signal);
		const checkpoints = await this.readMysteryCheckpoints(params.projectId, signal);
		const fairness = checkMysteryFairness(caseData, clues, checkpoints);
		const status: "ok" | "warning" | "error" = fairness.verdict === "fair" ? "ok" : fairness.verdict === "needs-work" ? "warning" : "error";
		const report = {
			version: 1,
			projectId: params.projectId,
			verdict: fairness.verdict,
			status,
			issues: fairness.issues,
			supportedFinalClaims: fairness.supportedFinalClaims,
			unsupportedFinalClaims: fairness.unsupportedFinalClaims,
			clueCoverage: fairness.clueCoverage,
			proofCoverage: fairness.proofCoverage,
			sourceHashes: [caseData, clues, checkpoints].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/mystery-fairness.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}
	// ==== Mature Marriage Crisis（structural relationship mechanism）====

	private async ensureMatureMarriageProject(projectId: string, signal?: AbortSignal): Promise<void> {
		await this.ensureProject(projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		if (!isJsonRecord(project) || !hasMatureMarriageCapability(project)) throw new Error("This tool is only available for projects with the mature-marriage-crisis relationship mechanism.");
	}

	private async readMatureMarriageStructure(projectId: string, signal?: AbortSignal): Promise<MatureMarriageStructure | undefined> {
		const confirmed = await this.readJsonIfExists(this.projectFile(projectId, "canon/marriage/structure.json"), signal);
		const value = confirmed ?? await this.readJsonIfExists(this.projectFile(projectId, "work/marriage/structure-proposed.json"), signal);
		return isJsonRecord(value) && isJsonRecord(value.structure) ? value.structure as unknown as MatureMarriageStructure : undefined;
	}

	private async readMatureMarriageRestructuring(projectId: string, signal?: AbortSignal): Promise<MatureMarriageRestructuringPlan | undefined> {
		const confirmed = await this.readJsonIfExists(this.projectFile(projectId, "canon/marriage/restructuring.json"), signal);
		const value = confirmed ?? await this.readJsonIfExists(this.projectFile(projectId, "work/marriage/restructuring-proposed.json"), signal);
		return isJsonRecord(value) && isJsonRecord(value.plan) ? value.plan as unknown as MatureMarriageRestructuringPlan : undefined;
	}

	async saveMatureMarriageStructure(params: SaveMatureMarriageStructureParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureMatureMarriageProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const relativePath = params.status === "confirmed" ? "canon/marriage/structure.json" : "work/marriage/structure-proposed.json";
		const document = { version: 1, projectId: params.projectId, genre: "marriage", status: params.status, structure: params.structure, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async saveMatureMarriageRestructuring(params: SaveMatureMarriageRestructuringParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureMatureMarriageProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const relativePath = params.status === "confirmed" ? "canon/marriage/restructuring.json" : "work/marriage/restructuring-proposed.json";
		const document = { version: 1, projectId: params.projectId, genre: "marriage", status: params.status, plan: params.plan, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async checkMatureMarriageStructure(params: CheckMatureMarriageStructureParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: MarriageIssue[]; counts: Record<string, number>; path: string }> {
		await this.ensureMatureMarriageProject(params.projectId, signal);
		const structure = await this.readMatureMarriageStructure(params.projectId, signal);
		const beatSheet = await this.readJsonIfExists(this.projectFile(params.projectId, "outline/genre/chase-wife-beat-sheet.json"), signal);
		const stayingLogic = isJsonRecord(beatSheet) && isJsonRecord(beatSheet.stayingLogic) ? beatSheet.stayingLogic as unknown as { materialReason?: string; socialReason?: string; familyReason?: string; careerReason?: string } : undefined;
		const issues = checkMatureMarriageStructure(structure, stayingLogic);
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = {
			version: 1,
			projectId: params.projectId,
			status,
			issues,
			counts: { economicItems: structure?.economicItems.length ?? 0, responsibilities: structure?.responsibilities.length ?? 0, decisionRights: structure?.decisionRights.length ?? 0, socialTies: structure?.socialTies.length ?? 0, inertiaFactors: structure?.inertiaFactors.length ?? 0, exitConstraints: structure?.exitConstraints.length ?? 0 },
			sourceHashes: [structure, beatSheet].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/marriage-structure.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async checkMatureMarriageRestructuring(params: CheckMatureMarriageRestructuringParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: MarriageIssue[]; path: string }> {
		await this.ensureMatureMarriageProject(params.projectId, signal);
		const structure = await this.readMatureMarriageStructure(params.projectId, signal);
		const plan = await this.readMatureMarriageRestructuring(params.projectId, signal);
		const issues = checkMatureMarriageRestructuring(structure, plan);
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = {
			version: 1,
			projectId: params.projectId,
			status,
			issues,
			sourceHashes: [structure, plan].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/marriage-restructuring.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}
	// ==== Professional Domain Engine（insurance-fraud-investigation）====

	private async ensureProfessionalProject(projectId: string, signal?: AbortSignal): Promise<void> {
		await this.ensureProject(projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		if (!isJsonRecord(project) || !hasProfessionalDomain(project, "insurance-fraud-investigation")) throw new Error("This tool is only available for projects with the insurance-fraud-investigation professional domain.");
	}

	private async readProfessionalDomainModel(projectId: string, signal?: AbortSignal): Promise<ProfessionalDomainModel | undefined> {
		const confirmed = await this.readJsonIfExists(this.projectFile(projectId, "canon/professional/domain-model.json"), signal);
		const value = confirmed ?? await this.readJsonIfExists(this.projectFile(projectId, "work/professional/domain-model-proposed.json"), signal);
		return isJsonRecord(value) && isJsonRecord(value.model) ? value.model as unknown as ProfessionalDomainModel : undefined;
	}

	private async readProfessionalCasePlan(projectId: string, signal?: AbortSignal): Promise<ProfessionalCasePlan | undefined> {
		const confirmed = await this.readJsonIfExists(this.projectFile(projectId, "canon/professional/case-plan.json"), signal);
		const value = confirmed ?? await this.readJsonIfExists(this.projectFile(projectId, "work/professional/case-plan-proposed.json"), signal);
		return isJsonRecord(value) && isJsonRecord(value.plan) ? value.plan as unknown as ProfessionalCasePlan : undefined;
	}

	async saveProfessionalDomainModel(params: SaveProfessionalDomainModelParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureProfessionalProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const canonicalModel = { ...params.model, domain: normalizeProfessionalDomain(params.model.domain) };
		const relativePath = params.status === "confirmed" ? "canon/professional/domain-model.json" : "work/professional/domain-model-proposed.json";
		const document = { version: 1, projectId: params.projectId, genre: "professional", status: params.status, model: canonicalModel, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async saveProfessionalCasePlan(params: SaveProfessionalCasePlanParams, signal?: AbortSignal): Promise<{ projectId: string; status: "proposed" | "confirmed"; path: string }> {
		await this.ensureProfessionalProject(params.projectId, signal);
		requireConfirmation(params.status, params.confirmation);
		const canonicalPlan = { ...params.plan, domain: normalizeProfessionalDomain(params.plan.domain) };
		const relativePath = params.status === "confirmed" ? "canon/professional/case-plan.json" : "work/professional/case-plan-proposed.json";
		const document = { version: 1, projectId: params.projectId, genre: "professional", status: params.status, plan: canonicalPlan, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, status: params.status, path: relativePath };
	}

	async checkProfessionalDomain(params: CheckProfessionalDomainParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: ProfessionalIssue[]; counts: Record<string, number>; path: string }> {
		await this.ensureProfessionalProject(params.projectId, signal);
		const model = await this.readProfessionalDomainModel(params.projectId, signal);
		const issues = checkProfessionalDomain(model, "insurance-fraud-investigation");
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = {
			version: 1,
			projectId: params.projectId,
			status,
			issues,
			counts: { authorities: model?.authorityBoundaries.length ?? 0, stages: model?.workflowStages.length ?? 0, evidenceSources: model?.evidenceSources.length ?? 0, guardrails: model?.guardrails.length ?? 0, escalationPaths: model?.escalationPaths.length ?? 0 },
			sourceHashes: [model].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/professional-domain.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async checkProfessionalCase(params: CheckProfessionalCaseParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: ProfessionalIssue[]; path: string }> {
		await this.ensureProfessionalProject(params.projectId, signal);
		const model = await this.readProfessionalDomainModel(params.projectId, signal);
		const plan = await this.readProfessionalCasePlan(params.projectId, signal);
		const issues = checkProfessionalCase(model, plan);
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = {
			version: 1,
			projectId: params.projectId,
			status,
			issues,
			sourceHashes: [model, plan].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/professional-case.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}
	// ==== Unified Narrative Event Layer ====

	private async readUnifiedEventMap(projectId: string, signal?: AbortSignal): Promise<UnifiedEventMap | undefined> {
		const value = await this.readJsonIfExists(this.projectFile(projectId, "outline/unified/event-map.json"), signal);
		return isJsonRecord(value) && Array.isArray(value.events) ? value as unknown as UnifiedEventMap : undefined;
	}

	async saveUnifiedEventMap(params: SaveUnifiedEventMapParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; path: string; events: number }> {
		await this.ensureProject(params.projectId, signal);
		const existing = await this.readUnifiedEventMap(params.projectId, signal);
		const priorEvents = existing?.events ?? [];
		const submittedIds = new Set(params.events.map((event) => event.eventId));
		if (submittedIds.size !== params.events.length) throw new Error("Unified event IDs must be unique.");
		for (const event of params.events) {
			if (event.chapter !== params.chapter) throw new Error("Unified events must belong to the submitted chapter.");
			const conflict = priorEvents.find((prior) => prior.eventId === event.eventId && prior.chapter !== params.chapter);
			if (conflict !== undefined) throw new Error(`Unified event id ${event.eventId} is already used in chapter ${conflict.chapter}.`);
		}
		const kept = priorEvents.filter((event) => event.chapter !== params.chapter);
		const merged = [...kept, ...params.events].sort((left, right) => left.chapter - right.chapter || left.eventId - right.eventId);
		const relativePath = "outline/unified/event-map.json";
		const document = { version: 1, projectId: params.projectId, events: merged, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, path: relativePath, events: params.events.length };
	}

	async checkUnifiedEventMap(params: CheckUnifiedEventMapParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: UnifiedIssue[]; metrics: Record<string, number>; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		const capabilities: UnifiedCapabilities = {
			hasMystery: isJsonRecord(project) && hasPrimaryGenre(project, "female-social-suspense"),
			hasMarriage: isJsonRecord(project) && hasMatureMarriageCapability(project),
			hasChaseWife: isJsonRecord(project) && hasChaseWifeCapability(project),
			hasProfessional: isJsonRecord(project) && hasProfessionalDomain(project, "insurance-fraud-investigation"),
		};
		const map = await this.readUnifiedEventMap(params.projectId, signal);
		const scopedEvents = map?.events.filter((event) => params.chapter === undefined || event.chapter === params.chapter) ?? [];
		const scopedMap = map === undefined ? undefined : { ...map, events: scopedEvents } as UnifiedEventMap;
		const refs = await this.buildUnifiedReferenceSets(params.projectId, signal);
		const issues = checkUnifiedEventMap(scopedMap, capabilities, refs);
		// Professional authority 不能绕过：存在 professional model/plan 时附加其校验结果
		if (capabilities.hasProfessional) {
			const model = await this.readProfessionalDomainModel(params.projectId, signal);
			const plan = await this.readProfessionalCasePlan(params.projectId, signal);
			if (model !== undefined && plan !== undefined) {
				const professionalIssues = checkProfessionalCase(model, plan);
				for (const professionalIssue of professionalIssues) issues.push({ code: professionalIssue.code, severity: professionalIssue.severity, message: `professional gate: ${professionalIssue.message}` });
			}
		}
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const stats = collisionStats(map);
		const report = {
			version: 1,
			projectId: params.projectId,
			...(params.chapter === undefined ? {} : { chapter: params.chapter }),
			status,
			issues,
			metrics: { totalEvents: map?.events.length ?? 0, scopedEvents: scopedEvents.length, collisionEvents: stats.collision },
			sourceHashes: [map].map(hashJson),
			generatedAt: new Date().toISOString(),
		};
		const relativePath = "continuity/reports/unified-event-map.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	private async buildUnifiedReferenceSets(projectId: string, signal?: AbortSignal): Promise<UnifiedReferenceSets> {
		const refs: UnifiedReferenceSets = {};
		const mysteryCase = await this.readMysteryCase(projectId, signal);
		const mysteryClues = await this.readMysteryClues(projectId, signal);
		const mysterySuspects = await this.readMysterySuspects(projectId, signal);
		if (mysteryCase !== undefined) {
			refs.claimIds = new Set(mysteryCase.truthClaims.map((claim) => claim.id));
			refs.claimRevealChapters = new Map(mysteryCase.truthClaims.filter((claim) => claim.plannedRevealChapter !== undefined).map((claim) => [claim.id, claim.plannedRevealChapter as number]));
		}
		if (mysteryClues.length > 0) refs.clueIds = new Set(mysteryClues.map((clue) => clue.id));
		if (mysterySuspects.length > 0) refs.suspectIds = new Set(mysterySuspects.map((suspect) => suspect.id));
		const marriageStructure = await this.readMatureMarriageStructure(projectId, signal);
		if (marriageStructure !== undefined) {
			refs.economicItemIds = new Set(marriageStructure.economicItems.map((item) => item.id));
			refs.responsibilityIds = new Set(marriageStructure.responsibilities.map((item) => item.id));
			refs.decisionRightIds = new Set(marriageStructure.decisionRights.map((item) => item.id));
			refs.socialTieIds = new Set(marriageStructure.socialTies.map((item) => item.id));
			refs.inertiaIds = new Set(marriageStructure.inertiaFactors.map((item) => item.id));
			refs.exitConstraintIds = new Set(marriageStructure.exitConstraints.map((item) => item.id));
		}
		const harmDocument = await this.readJsonIfExists(this.projectFile(projectId, "continuity/chase-wife-harm-ledger.json"), signal);
		const repairDocument = await this.readJsonIfExists(this.projectFile(projectId, "continuity/chase-wife-repair-ledger.json"), signal);
		if (isJsonRecord(harmDocument) && Array.isArray(harmDocument.harms)) refs.harmIds = new Set(harmDocument.harms.filter(isJsonRecord).map((item) => String(item.id)));
		if (isJsonRecord(repairDocument) && Array.isArray(repairDocument.repairs)) refs.repairIds = new Set(repairDocument.repairs.filter(isJsonRecord).map((item) => String(item.id)));
		const professionalModel = await this.readProfessionalDomainModel(projectId, signal);
		const professionalPlan = await this.readProfessionalCasePlan(projectId, signal);
		if (professionalModel !== undefined) {
			refs.evidenceSourceIds = new Set(professionalModel.evidenceSources.map((item) => item.id));
			refs.escalationPathIds = new Set(professionalModel.escalationPaths.map((item) => item.id));
		}
		if (professionalPlan !== undefined) {
			refs.professionalActionIds = new Set(professionalPlan.actions.map((item) => item.id));
			refs.conflictIds = new Set(professionalPlan.conflictsOfInterest.map((item) => item.id));
			refs.consequenceIds = new Set(professionalPlan.professionalConsequences.map((item) => item.id));
			if (professionalPlan.observations.length > 0) {
				refs.observationClueRefs = new Map(professionalPlan.observations.map((item) => [item.id, item.mysteryClueId]));
			}
		}
		return refs;
	}

	async saveUnifiedEventDraft(params: SaveUnifiedEventDraftParams, signal?: AbortSignal): Promise<SavedChapterDraftResult & { eventId: number }> {
		await this.ensureProject(params.projectId, signal);
		const directory = this.projectFile(params.projectId, `work/unified-event-drafts/${chapterName(params.chapter)}`);
		const prefix = `event-${padChapter(params.eventId)}-r`;
		const paths = await this.listFiles(directory, signal);
		const revisions = paths.map((path) => path.match(new RegExp(`${prefix}(\\d+)\\.md$`))?.[1]).filter((value): value is string => value !== undefined).map(Number);
		const revision = params.revision ?? ((revisions.length > 0 ? Math.max(...revisions) : 0) + 1);
		const path = this.projectFile(params.projectId, `work/unified-event-drafts/${chapterName(params.chapter)}/${prefix}${String(revision).padStart(2, "0")}.md`);
		if (params.revision !== undefined && (await this.readTextIfExists(path, signal)) !== undefined) throw new Error("Unified event draft revision already exists.");
		await this.writeAtomically(path, normalizeText(params.content), signal);
		return { projectId: params.projectId, documentType: "chapter-draft", chapter: params.chapter, eventId: params.eventId, revision, path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(params.content, "utf8") };
	}

	async checkUnifiedEventDraft(params: CheckUnifiedEventDraftParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; eventId: number; revision?: number; actualChars: number; status: "ok" | "warning" | "error"; issues: string[]; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const draft = params.revision === undefined ? await this.latestUnifiedEventDraft(params.projectId, params.chapter, params.eventId, signal) : { revision: params.revision, content: await this.readTextIfExists(this.projectFile(params.projectId, `work/unified-event-drafts/${chapterName(params.chapter)}/event-${padChapter(params.eventId)}-r${String(params.revision).padStart(2, "0")}.md`), signal) };
		const issues: string[] = [];
		if (!draft || draft.content === undefined) issues.push("event draft is missing");
		const actualChars = draft?.content === undefined ? 0 : countChineseCharacters(draft.content);
		if (draft?.content !== undefined && (actualChars < 60 || actualChars > 1500)) issues.push(`event draft has ${actualChars} characters; expected 60-1500`);
		if (draft?.content !== undefined && /(?:^|\n)\s*(?:事件\s*\\d+|情绪分析|状态变化|出口钩子)\s*[:：]/u.test(draft.content)) issues.push("event contains planning labels instead of narrative prose");
		const status = (issues.some((item) => item === "event draft is missing") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const relativePath = `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(params.eventId)}-unified.json`;
		const report = { projectId: params.projectId, chapter: params.chapter, eventId: params.eventId, revision: draft?.revision, actualChars, expectedChars: { min: 60, max: 1500 }, status, issues, contentHash: draft?.content === undefined ? undefined : sha256(draft.content), generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	private async latestUnifiedEventDraft(projectId: string, chapter: number, eventId: number, signal?: AbortSignal): Promise<{ path: string; revision: number; content: string } | undefined> {
		const directory = this.projectFile(projectId, `work/unified-event-drafts/${chapterName(chapter)}`);
		const paths = await this.listFiles(directory, signal);
		const matches = paths.map((path) => {
			const match = path.match(new RegExp(`event-${padChapter(eventId)}-r(\\d+)\\.md$`));
			return match ? { path, revision: Number(match[1]) } : undefined;
		}).filter((value): value is { path: string; revision: number } => value !== undefined).sort((left, right) => left.revision - right.revision);
		const latest = matches.at(-1);
		if (!latest) return undefined;
		const content = await this.readTextIfExists(latest.path, signal);
		return content === undefined ? undefined : { ...latest, content };
	}

	async saveUnifiedEventSemanticReport(params: SaveUnifiedEventSemanticReportParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; eventId: number; revision?: number; status: "ok" | "error"; issues: string[]; source: "model"; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const draft = params.revision === undefined ? await this.latestUnifiedEventDraft(params.projectId, params.chapter, params.eventId, signal) : { revision: params.revision, content: await this.readTextIfExists(this.projectFile(params.projectId, `work/unified-event-drafts/${chapterName(params.chapter)}/event-${padChapter(params.eventId)}-r${String(params.revision).padStart(2, "0")}.md`), signal) };
		if (!draft || draft.content === undefined) throw new Error("The unified semantic report requires an existing event draft.");
		const issues: string[] = [];
		if (!params.actionShown) issues.push("actionShown must be true");
		if (!params.consequenceShown) issues.push("consequenceShown must be true");
		const anchors = params.deltaEvidence.map((item) => ({ label: `delta ${item.dimension}`, anchor: item.evidence }));
		for (const item of anchors) {
			if (!isSemanticEvidenceAnchor(item.anchor)) issues.push(`${item.label} must be a prose anchor`);
			else {
				const anchorIssue = validateSemanticEvidenceAnchor(draft.content, item.anchor, item.label);
				if (anchorIssue !== undefined) issues.push(anchorIssue);
			}
		}
		const status = issues.length === 0 ? "ok" as const : "error" as const;
		const relativePath = `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(params.eventId)}-unified-semantics.json`;
		const report = { projectId: params.projectId, chapter: params.chapter, eventId: params.eventId, revision: draft.revision, status, issues, source: "model" as const, actionShown: params.actionShown, consequenceShown: params.consequenceShown, deltaEvidence: params.deltaEvidence, notes: params.notes, contentHash: sha256(draft.content), generatedAt: new Date().toISOString() };
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { ...report, path: relativePath };
	}

	async assembleUnifiedChapter(params: AssembleUnifiedChapterParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; eventCount: number; path: string; manifestPath: string }> {
		await this.ensureProject(params.projectId, signal);
		const map = await this.readUnifiedEventMap(params.projectId, signal);
		if (map === undefined) throw new Error("Unified assembly requires a unified event map.");
		const events = map.events.filter((event) => event.chapter === params.chapter).sort((left, right) => left.eventId - right.eventId);
		if (events.length === 0) throw new Error("Chapter has no unified events.");
		const eventMapHash = hashJson(map);
		const drafts: string[] = [];
		const manifestEvents: Array<{ eventId: number; revision: number; charCount: number; contentHash: string }> = [];
		for (const event of events) {
			const draft = await this.latestUnifiedEventDraft(params.projectId, params.chapter, event.eventId, signal);
			if (!draft) throw new Error(`Unified event draft ${event.eventId} is missing.`);
			const report = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(event.eventId)}-unified.json`), signal);
			const semantics = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${chapterName(params.chapter)}-event-${padChapter(event.eventId)}-unified-semantics.json`), signal);
			const draftHash = sha256(draft.content);
			if (!isJsonRecord(report) || report.status !== "ok" || report.revision !== draft.revision || report.contentHash !== draftHash) throw new Error(`Unified event ${event.eventId} must pass check_unified_event_draft for the current revision before assembly.`);
			if (!isJsonRecord(semantics) || semantics.source !== "model" || semantics.status !== "ok" || semantics.revision !== draft.revision || semantics.contentHash !== draftHash) throw new Error(`Unified event ${event.eventId} requires a current passing save_unified_event_semantic_report before assembly.`);
			drafts.push(draft.content.trim());
			manifestEvents.push({ eventId: event.eventId, revision: draft.revision, charCount: countChineseCharacters(draft.content), contentHash: draftHash });
		}
		const assembledContent = drafts.join("\n\n");
		const chapterDraft = await this.saveChapterDraftInternal({ projectId: params.projectId, chapter: params.chapter, revision: params.revision, content: assembledContent }, signal);
		const manifestEventRanges = manifestEvents.map((manifestEvent, index) => {
			const startChar = manifestEvents.slice(0, index).reduce((sum, item) => sum + item.charCount, 0);
			return { ...manifestEvent, startChar, endChar: startChar + manifestEvent.charCount };
		});
		const manifestPath = `work/unified-assemblies/${chapterName(params.chapter)}-r${String(chapterDraft.revision).padStart(2, "0")}.json`;
		const manifest = { version: 1, projectId: params.projectId, chapter: params.chapter, draftRevision: chapterDraft.revision, eventMapHash, eventDrafts: manifestEventRanges, assembledCharCount: countChineseCharacters(assembledContent), assembledHash: sha256(normalizeText(assembledContent)), generatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, draftRevision: chapterDraft.revision, eventCount: events.length, path: chapterDraft.path, manifestPath };
	}
	async saveNarrativeRealizations(params: SaveNarrativeRealizationParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; contentHash: string; path: string; records: number }> {
		await this.ensureProject(params.projectId, signal);
		const draft = await this.latestDraft(params.projectId, params.chapter, signal);
		if (!draft || draft.revision !== params.draftRevision) throw new Error("Narrative realization records must match the latest saved draft revision.");
		const contentHash = sha256(draft.content);
		// 保存时只校验锚点与重复；计划完整性（planned vs realized）由 check/finalize 门决定。
		const issues = checkNarrativeRealizations({
			content: draft.content,
			records: params.records,
			planned: params.records.map((record) => ({ contentType: record.contentType, engineRef: record.engineRef })),
			draftRevision: params.draftRevision,
			contentHash,
			latestDraftRevision: draft.revision,
			latestContentHash: contentHash,
		});
		const blockers = issues.filter((item) => item.severity === "error");
		if (blockers.length > 0) throw new Error(`Invalid narrative realization records: ${blockers.map((item) => item.message).join("; ")}`);
		const relativePath = `continuity/realizations/${chapterName(params.chapter)}.json`;
		const document = { version: 1, projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, contentHash, records: params.records, generatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, contentHash, path: relativePath, records: params.records.length };
	}

	async checkNarrativeRealizations(params: CheckNarrativeRealizationParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; status: "ok" | "warning" | "error"; issues: RealizationIssue[]; plannedCount: number; realizedCount: number; draftRevision?: number; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const draft = await this.latestDraft(params.projectId, params.chapter, signal);
		const relativePath = `continuity/realizations/${chapterName(params.chapter)}.json`;
		const stored = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
		const planned = await this.collectPlannedRealizations(params.projectId, params.chapter, signal);
		let issues: RealizationIssue[] = [];
		let realizedCount = 0;
		let draftRevision: number | undefined;
		if (!isJsonRecord(stored) || !Array.isArray(stored.records)) {
			if (planned.length > 0) issues.push({ code: "REALIZATION_MISSING", severity: "error", message: `no narrative realization records for chapter ${params.chapter} while ${planned.length} planned items require prose evidence` });
		} else {
			const records = stored.records.filter(isJsonRecord) as unknown as NarrativeRealizationRecord[];
			draftRevision = typeof stored.draftRevision === "number" ? stored.draftRevision : undefined;
			realizedCount = records.length;
			issues = checkNarrativeRealizations({
				content: draft?.content ?? "",
				records,
				planned,
				draftRevision,
				contentHash: typeof stored.contentHash === "string" ? stored.contentHash : undefined,
				latestDraftRevision: draft?.revision ?? -1,
				latestContentHash: draft === undefined ? "" : sha256(draft.content),
			});
		}
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = { version: 1, projectId: params.projectId, chapter: params.chapter, status, issues, plannedCount: planned.length, realizedCount, draftRevision, sourceHashes: [stored].map(hashJson), generatedAt: new Date().toISOString() };
		const reportPath = `continuity/reports/${chapterName(params.chapter)}-realization.json`;
		await this.writeVersionedJsonReport(params.projectId, reportPath, report, signal);
		return { ...report, path: reportPath };
	}

	private async collectPlannedRealizations(projectId: string, chapter: number, signal?: AbortSignal): Promise<PlannedRealization[]> {
		const unifiedMap = await this.readUnifiedEventMap(projectId, signal);
		const mysteryCase = await this.readMysteryCase(projectId, signal);
		const clues = await this.readMysteryClues(projectId, signal);
		const professionalPlan = await this.readProfessionalCasePlan(projectId, signal);
		return collectPlannedRealizations(chapter, { unifiedMap, mysteryCase, clues, professionalPlan });
	}

	private async enforceNarrativeRealizationGates(projectId: string, chapter: number, draftRevision: number, content: string, signal?: AbortSignal): Promise<void> {
		const planned = await this.collectPlannedRealizations(projectId, chapter, signal);
		if (planned.length === 0) return;
		const relativePath = `continuity/realizations/${chapterName(chapter)}.json`;
		const stored = await this.readJsonIfExists(this.projectFile(projectId, relativePath), signal);
		if (!isJsonRecord(stored) || !Array.isArray(stored.records)) throw new Error(`Chapter ${chapter} requires narrative realization records: ${planned.length} planned items must appear in the finalized prose.`);
		const records = stored.records.filter(isJsonRecord) as unknown as NarrativeRealizationRecord[];
		const issues = checkNarrativeRealizations({
			content,
			records,
			planned,
			draftRevision: typeof stored.draftRevision === "number" ? stored.draftRevision : undefined,
			contentHash: typeof stored.contentHash === "string" ? stored.contentHash : undefined,
			latestDraftRevision: draftRevision,
			latestContentHash: sha256(normalizeText(content)),
		});
		const blockers = issues.filter((item) => item.severity === "error");
		if (blockers.length > 0) throw new Error(`Chapter ${chapter} narrative realization gate failed: ${blockers.map((item) => item.message).join("; ")}`);
	}

	async saveStoryDistinctiveness(params: SaveStoryDistinctivenessParams, signal?: AbortSignal): Promise<{ projectId: string; chapter?: number; verdict: string; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const scope = params.chapter === undefined ? "story" : chapterName(params.chapter);
		const relativePath = `evaluations/distinctiveness/${scope}.json`;
		const document = { version: 1, projectId: params.projectId, chapter: params.chapter, profile: params.profile, generatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, chapter: params.chapter, verdict: params.profile.verdict, path: relativePath };
	}

	async checkStoryDistinctiveness(params: CheckStoryDistinctivenessParams, signal?: AbortSignal): Promise<{ projectId: string; chapter?: number; status: "ok" | "warning"; issues: DistinctivenessIssue[]; verdict?: string; stats: ReturnType<typeof distinctivenessStats>; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const scope = params.chapter === undefined ? "story" : chapterName(params.chapter);
		const stored = await this.readJsonIfExists(this.projectFile(params.projectId, `evaluations/distinctiveness/${scope}.json`), signal);
		const profile = isJsonRecord(stored) && isJsonRecord(stored.profile) ? stored.profile as unknown as StoryDistinctivenessProfile : undefined;
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		const capabilities = {
			hasMystery: isJsonRecord(project) && hasPrimaryGenre(project, "female-social-suspense"),
			hasMarriage: isJsonRecord(project) && hasMatureMarriageCapability(project),
			hasChaseWife: isJsonRecord(project) && hasChaseWifeCapability(project),
			hasProfessional: isJsonRecord(project) && hasProfessionalDomain(project, "insurance-fraud-investigation"),
		};
		const map = await this.readUnifiedEventMap(params.projectId, signal);
		const issues = profile === undefined ? [{ code: "DISTINCTIVENESS_PROFILE_MISSING", severity: "warning" as const, message: `no distinctiveness review exists for ${scope}` }] : checkStoryDistinctiveness({ profile, map, capabilities });
		const status = (issues.length > 0 ? "warning" : "ok") as "ok" | "warning";
		const stats = distinctivenessStats(map);
		const report = { version: 1, projectId: params.projectId, chapter: params.chapter, status, issues, verdict: profile?.verdict, stats, sourceHashes: [stored].map(hashJson), generatedAt: new Date().toISOString() };
		const reportPath = `continuity/reports/distinctiveness-${scope}.json`;
		await this.writeVersionedJsonReport(params.projectId, reportPath, report, signal);
		return { projectId: params.projectId, chapter: params.chapter, status, issues, verdict: profile?.verdict, stats, path: reportPath };
	}
	async checkMysteryRealizedFairness(params: CheckMysteryFairnessParams, signal?: AbortSignal): Promise<{ projectId: string; verdict: "fair" | "needs-work" | "unfair"; status: "ok" | "warning" | "error"; issues: RealizedFairnessIssue[]; supportedFinalClaims: string[]; unsupportedFinalClaims: Array<{ claimId: string; reason: string }>; proofCoverage: Record<string, { audience: "reader" | "heroine"; revealChapter?: number; completePaths: number; totalPaths: number; blockedPaths: Array<{ pathId: string; reason: string }> }>; path: string }> {
		await this.ensureMysteryProject(params.projectId, signal);
		const caseData = await this.readMysteryCase(params.projectId, signal);
		const clues = await this.readMysteryClues(params.projectId, signal);
		const unifiedMap = await this.readUnifiedEventMap(params.projectId, signal);
		const realizationPaths = (await this.listFiles(this.projectFile(params.projectId, "continuity/realizations"), signal)).filter((path) => /chapter-\d+\.json$/u.test(path));
		const realizations: Array<{ chapter: number; records: NarrativeRealizationRecord[] }> = [];
		for (const path of realizationPaths) {
			const match = path.match(/chapter-(\d+)\.json$/u);
			if (match === null) continue;
			const value = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(value) || !Array.isArray(value.records)) continue;
			realizations.push({ chapter: Number(match[1]), records: value.records.filter(isJsonRecord) as unknown as NarrativeRealizationRecord[] });
		}
		const result = checkRealizedFairness({ caseData, clues, unifiedMap, realizations });
		const status = (result.verdict === "fair" ? "ok" : result.verdict === "needs-work" ? "warning" : "error") as "ok" | "warning" | "error";
		const report = { version: 1, projectId: params.projectId, verdict: result.verdict, status, issues: result.issues, supportedFinalClaims: result.supportedFinalClaims, unsupportedFinalClaims: result.unsupportedFinalClaims, proofCoverage: result.proofCoverage, sourceHashes: [caseData, clues, unifiedMap, realizations].map(hashJson), generatedAt: new Date().toISOString() };
		const relativePath = "continuity/reports/mystery-realized-fairness.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { projectId: params.projectId, ...result, status, path: relativePath };
	}
	// ==== Female Social Suspense Vertical Design（垂直类型智能）====

	private async readSocialSuspenseDesign(projectId: string, signal?: AbortSignal): Promise<FemaleSocialSuspenseDesign | undefined> {
		const value = await this.readJsonIfExists(this.projectFile(projectId, "outline/genre/female-social-suspense-design.json"), signal);
		return isJsonRecord(value) && isJsonRecord(value.design) ? value.design as unknown as FemaleSocialSuspenseDesign : undefined;
	}

	async saveSocialSuspenseDesign(params: SaveSocialSuspenseDesignParams, signal?: AbortSignal): Promise<{ projectId: string; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const relativePath = "outline/genre/female-social-suspense-design.json";
		const document = { version: 1, projectId: params.projectId, design: params.design, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath };
	}

	async checkSocialSuspenseDesign(params: CheckSocialSuspenseDesignParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: VerticalIssue[]; counts: Record<string, number>; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const design = await this.readSocialSuspenseDesign(params.projectId, signal);
		const map = await this.readUnifiedEventMap(params.projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(params.projectId, "project.json"), signal);
		const capabilities = { hasProfessional: isJsonRecord(project) && hasProfessionalDomain(project, "insurance-fraud-investigation") };
		const issues = design === undefined ? [{ code: "SOCIAL_DESIGN_MISSING", severity: "error" as const, message: "no female social suspense design exists; save_social_suspense_design first" }] : checkSocialSuspenseDesign(design, map, capabilities);
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = { version: 1, projectId: params.projectId, status, issues, counts: { mechanisms: design?.socialArchitecture.systemMechanisms.length ?? 0, patterns: design?.marriagePatterns.length ?? 0, dilemmas: design?.professionalDilemmas.length ?? 0, movements: design?.storyMovements.length ?? 0, supportingCharacters: design?.supportingCharacters.length ?? 0 }, sourceHashes: [design, map].map(hashJson), generatedAt: new Date().toISOString() };
		const relativePath = "continuity/reports/female-social-suspense-design.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { projectId: params.projectId, status, issues, counts: report.counts, path: relativePath };
	}

	async saveCharacterContradictionProfile(params: SaveCharacterContradictionProfileParams, signal?: AbortSignal): Promise<{ projectId: string; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const relativePath = "outline/characters/contradiction-profiles.json";
		const existing = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
		const prior = isJsonRecord(existing) && Array.isArray(existing.profiles) ? existing.profiles.filter(isJsonRecord) : [];
		const merged = [...prior.filter((item) => typeof item.characterId !== "string" || item.characterId !== params.profile.characterId), params.profile];
		const document = { version: 1, projectId: params.projectId, profiles: merged, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath };
	}

	async checkCharacterComplexity(params: CheckCharacterComplexityParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: VerticalIssue[]; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const profileDocument = await this.readJsonIfExists(this.projectFile(params.projectId, "outline/characters/contradiction-profiles.json"), signal);
		const profile = isJsonRecord(profileDocument) && Array.isArray(profileDocument.profiles) ? profileDocument.profiles.find((item): item is HeroineContradictionProfile => isJsonRecord(item) && typeof item.characterId === "string") as HeroineContradictionProfile | undefined : undefined;
		const design = await this.readSocialSuspenseDesign(params.projectId, signal);
		const issues = checkCharacterComplexity(profile, design);
		const status = (issues.some((item) => item.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = { version: 1, projectId: params.projectId, status, issues, sourceHashes: [profileDocument, design].map(hashJson), generatedAt: new Date().toISOString() };
		const relativePath = "continuity/reports/character-complexity.json";
		await this.writeVersionedJsonReport(params.projectId, relativePath, report, signal);
		return { projectId: params.projectId, status, issues, path: relativePath };
	}

	async checkVerticalStoryQuality(params: CheckVerticalStoryQualityParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: VerticalIssue[]; verdict: string; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const map = await this.readUnifiedEventMap(params.projectId, signal);
		const design = await this.readSocialSuspenseDesign(params.projectId, signal);
		const professionalPlan = await this.readProfessionalCasePlan(params.projectId, signal);
		const marriageStructure = await this.readMatureMarriageStructure(params.projectId, signal);
		const clues = await this.readMysteryClues(params.projectId, signal);
		const harmDocument = await this.readJsonIfExists(this.projectFile(params.projectId, "continuity/chase-wife-harm-ledger.json"), signal);
		const refs = {
			map,
			design,
			professionalActions: professionalPlan === undefined ? undefined : new Set(professionalPlan.actions.map((action) => action.id)),
			marriageRefs: marriageStructure === undefined ? undefined : new Set([...marriageStructure.economicItems, ...marriageStructure.responsibilities, ...marriageStructure.decisionRights, ...marriageStructure.socialTies, ...marriageStructure.exitConstraints].map((item) => item.id)),
			clueIds: new Set(clues.map((clue) => clue.id)),
			harmIds: isJsonRecord(harmDocument) && Array.isArray(harmDocument.harms) ? new Set(harmDocument.harms.filter(isJsonRecord).map((item) => String(item.id))) : undefined,
		};
		const issues = checkVerticalQualityReview(params.review, refs);
		const status = (issues.length > 0 ? "error" : "ok") as "ok" | "error";
		const report = { version: 1, projectId: params.projectId, status, issues, review: params.review, sourceHashes: [map, design, professionalPlan, marriageStructure].map(hashJson), generatedAt: new Date().toISOString() };
		const relativePath = "evaluations/vertical-quality/story.json";
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(report, null, 2)}\n`, signal);
		return { projectId: params.projectId, status, issues, verdict: params.review.verdict, path: relativePath };
	}
	private async writeTransaction(projectId: string, chapter: number, entries: Array<{ relativePath: string; content: string }>, signal?: AbortSignal): Promise<string> {
		const transactionId = randomUUID();
		const transactionPath = this.projectFile(projectId, `transactions/${transactionId}.json`);
		const targets: TransactionTarget[] = entries.map((entry) => {
			const target = entry.relativePath;
			return { target, temporary: `${target}.${transactionId}.tmp` };
		});
		const log: TransactionLog = { transactionId, operation: "finalize-chapter", projectId, chapter, status: "pending", createdAt: new Date().toISOString(), targets };
		await this.writeAtomically(transactionPath, `${JSON.stringify(log, null, 2)}\n`, signal);
		try {
			for (const [index, entry] of entries.entries()) {
				throwIfAborted(signal);
				const temporaryPath = this.projectFile(projectId, targets[index].temporary);
				await mkdir(dirname(temporaryPath), { recursive: true });
				await writeFile(temporaryPath, entry.content, { encoding: "utf8", signal });
			}
			log.status = "ready";
			await this.writeAtomically(transactionPath, `${JSON.stringify(log, null, 2)}\n`, signal);
			for (const target of targets) await rename(this.projectFile(projectId, target.temporary), this.projectFile(projectId, target.target));
			log.status = "committed";
			await this.writeAtomically(transactionPath, `${JSON.stringify(log, null, 2)}\n`, signal);
			return transactionId;
		} catch (error) {
			throw error;
		}
	}

	private async recoverPendingTransactions(projectId: string, signal?: AbortSignal): Promise<void> {
		const transactionPaths = await this.listFiles(this.projectFile(projectId, "transactions"), signal);
		for (const path of transactionPaths.filter((candidate) => candidate.endsWith(".json"))) {
			const value = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(value) || (value.status !== "pending" && value.status !== "ready") || value.projectId !== projectId) continue;
			const targets = Array.isArray(value.targets) ? value.targets : [];
			const validTargets = targets.filter((item): item is JsonRecord => isJsonRecord(item) && typeof item.target === "string" && typeof item.temporary === "string");
			if (value.status === "pending") {
				for (const item of validTargets) {
					try {
						await unlink(this.projectFile(projectId, item.temporary as string));
					} catch (error) {
						if (!isFileNotFound(error)) throw error;
					}
				}
				await this.writeAtomically(path, `${JSON.stringify({ ...value, status: "failed" }, null, 2)}\n`, signal);
				continue;
			}
			const complete = validTargets.length === targets.length && (await Promise.all(validTargets.map(async (item) => {
				const temporaryExists = (await this.readTextIfExists(this.projectFile(projectId, item.temporary as string), signal)) !== undefined;
				const targetExists = (await this.readTextIfExists(this.projectFile(projectId, item.target as string), signal)) !== undefined;
				return temporaryExists || targetExists;
			}))).every(Boolean);
			if (complete) {
				for (const item of validTargets) {
					const temporaryPath = this.projectFile(projectId, item.temporary as string);
					const targetPath = this.projectFile(projectId, item.target as string);
					const temporaryExists = (await this.readTextIfExists(temporaryPath, signal)) !== undefined;
					if (!temporaryExists) continue;
					try {
						await unlink(targetPath);
					} catch (error) {
						if (!isFileNotFound(error)) throw error;
					}
					await rename(temporaryPath, targetPath);
				}
				await this.writeAtomically(path, `${JSON.stringify({ ...value, status: "committed" }, null, 2)}\n`, signal);
			} else {
				for (const item of validTargets) {
					try {
						await unlink(this.projectFile(projectId, item.temporary as string));
					} catch (error) {
						if (!isFileNotFound(error)) throw error;
					}
				}
				await this.writeAtomically(path, `${JSON.stringify({ ...value, status: "failed" }, null, 2)}\n`, signal);
			}
		}
	}

	async finalizeChapter(params: FinalizeChapterParams, signal?: AbortSignal): Promise<FinalizedChapterResult> {
		const projectDir = await this.ensureProject(params.projectId, signal);
		const lockPath = join(projectDir, ".chapter-finalize.lock");
		return this.withFileQueue(lockPath, async () => {
			throwIfAborted(signal);
			if (params.confirmation !== "USER_CONFIRMED") throw new Error("Finalization requires confirmation=USER_CONFIRMED.");
			const projectPath = this.projectFile(params.projectId, "project.json");
			const existingProject = await this.readJsonIfExists(projectPath, signal);
			if (!isJsonRecord(existingProject) || !isPositiveInteger(existingProject.nextChapter)) throw new Error("project.json has invalid project state.");
			const nextChapter = existingProject.nextChapter;
			if (!params.overwrite && params.chapter !== nextChapter) throw new Error(`Chapter ${params.chapter} is not the next chapter. Expected ${nextChapter}.`);
			const name = chapterName(params.chapter);
			const chapterPath = this.projectFile(params.projectId, `chapters/${name}.md`);
			const summaryPath = this.projectFile(params.projectId, `summaries/${name}.json`);
			if (!params.overwrite && ((await this.readTextIfExists(chapterPath, signal)) !== undefined || (await this.readTextIfExists(summaryPath, signal)) !== undefined)) throw new Error(`Chapter ${params.chapter} is already finalized.`);
			const planPath = this.projectFile(params.projectId, `work/chapter-plans/${name}.md`);
			const contractPath = this.projectFile(params.projectId, `work/scene-contracts/${name}.json`);
			const draft = await this.latestDraft(params.projectId, params.chapter, signal);
			if ((await this.readTextIfExists(planPath, signal)) === undefined) throw new Error(`Chapter ${params.chapter} requires a chapter plan.`);
			if ((await this.readTextIfExists(contractPath, signal)) === undefined) throw new Error(`Chapter ${params.chapter} requires scene contracts.`);
			if (!draft || draft.revision !== params.draftRevision) throw new Error(`Chapter ${params.chapter} draft revision ${params.draftRevision} is not the latest saved draft.`);
			if (normalizeText(params.content) !== draft.content) throw new Error("Finalized content must match the selected saved draft.");
			const integrityPath = this.projectFile(params.projectId, `continuity/reports/${name}-integrity.json`);
			const semanticPath = this.projectFile(params.projectId, `continuity/reports/${name}-semantic.json`);
			const integrity = await this.readJsonIfExists(integrityPath, signal);
			const semantic = await this.readJsonIfExists(semanticPath, signal);
			for (const [label, report] of [["integrity", integrity], ["semantic", semantic]] as const) {
				if (!isJsonRecord(report)) throw new Error(`Chapter ${params.chapter} requires a ${label} report.`);
				if (report.status === "error") throw new Error(`Chapter ${params.chapter} cannot be finalized while the ${label} report has errors.`);
				if (label === "semantic" && (report.source !== "model" || report.status !== "ok")) throw new Error(`Chapter ${params.chapter} requires a current model semantic report with status=ok.`);
				if (report.draftRevision !== params.draftRevision) throw new Error(`The ${label} report does not match draft revision ${params.draftRevision}.`);
			}
			if (hasChaseWifeCapability(existingProject)) {
				const eventMap = await this.readChaseWifeEventMap(params.projectId, params.chapter, signal);
				const converged = eventMap.source === "unified";
				const eventMapReport = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${name}-chase-wife-events.json`), signal);
				if (!isJsonRecord(eventMapReport) || eventMapReport.status !== "ok" || eventMapReport.eventMapHash !== eventMap.eventMapHash) throw new Error(`Chapter ${params.chapter} requires a current passing chase-wife event map report.`);
				for (const [index, event] of eventMap.events.entries()) {
					if (converged) {
						// Converged 模式：正文来自 unified 事件草稿，校验走 unified budget/semantic 报告（contentHash + revision 绑定）。
						const unifiedId = (eventMap.unifiedEventIds ?? [])[index];
						const draft = unifiedId === undefined ? undefined : await this.latestUnifiedEventDraft(params.projectId, params.chapter, unifiedId, signal);
						if (!draft) throw new Error(`Chapter ${params.chapter} requires unified event draft ${unifiedId}.`);
						const budgetReport = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${name}-event-${padChapter(unifiedId)}-unified.json`), signal);
						const semanticReport = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${name}-event-${padChapter(unifiedId)}-unified-semantics.json`), signal);
						if (!isJsonRecord(budgetReport) || budgetReport.status !== "ok" || budgetReport.revision !== draft.revision || budgetReport.contentHash !== sha256(draft.content)) throw new Error(`Chapter ${params.chapter} unified event ${unifiedId} has no current passing budget report.`);
						if (!isJsonRecord(semanticReport) || semanticReport.source !== "model" || semanticReport.status !== "ok" || semanticReport.revision !== draft.revision || semanticReport.contentHash !== sha256(draft.content)) throw new Error(`Chapter ${params.chapter} unified event ${unifiedId} has no current passing model semantic report.`);
						continue;
					}
					const draft = await this.latestChaseWifeEventDraft(params.projectId, params.chapter, event.eventId, signal);
					if (!draft) throw new Error(`Chapter ${params.chapter} requires event draft ${event.eventId}.`);
					const budgetReport = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${name}-event-${padChapter(event.eventId)}-chase-wife.json`), signal);
					const semanticReport = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${name}-event-${padChapter(event.eventId)}-semantics.json`), signal);
					if (!isJsonRecord(budgetReport) || budgetReport.status !== "ok" || budgetReport.revision !== draft.revision || budgetReport.contentHash !== sha256(draft.content) || budgetReport.eventSpecHash !== hashJson(event) || budgetReport.eventMapHash !== eventMap.eventMapHash) throw new Error(`Chapter ${params.chapter} event ${event.eventId} has no current passing budget report.`);
					if (!isJsonRecord(semanticReport) || semanticReport.source !== "model" || semanticReport.status !== "ok" || semanticReport.revision !== draft.revision || semanticReport.contentHash !== sha256(draft.content) || semanticReport.eventSpecHash !== hashJson(event) || semanticReport.eventMapHash !== eventMap.eventMapHash) throw new Error(`Chapter ${params.chapter} event ${event.eventId} has no current passing model semantic report.`);
				}
				const manifestPath = this.projectFile(params.projectId, `${converged ? "work/unified-assemblies" : "work/chase-wife-assemblies"}/${name}-r${String(params.draftRevision).padStart(2, "0")}.json`);
				const manifest = await this.readJsonIfExists(manifestPath, signal);
				if (!isJsonRecord(manifest) || manifest.draftRevision !== params.draftRevision || manifest.assembledHash !== sha256(draft.content) || (!converged && manifest.eventMapHash !== eventMap.eventMapHash)) throw new Error(`Chapter ${params.chapter} requires a current ${converged ? "unified" : "chase-wife"} assembly manifest.`);
				const manifestEvents = Array.isArray(manifest.eventDrafts) ? manifest.eventDrafts.filter(isJsonRecord) : [];
				// Converged 模式：unified 清单覆盖整章事件（多于 chase 投影数），逐事件按 unified id 校验。
				let manifestEventsValid = converged ? true : manifestEvents.length === eventMap.events.length;
				for (const [index, event] of eventMap.events.entries()) {
					if (converged) {
						const unifiedId = (eventMap.unifiedEventIds ?? [])[index];
						const currentEventDraft = unifiedId === undefined ? undefined : await this.latestUnifiedEventDraft(params.projectId, params.chapter, unifiedId, signal);
						const entry = unifiedId === undefined ? undefined : manifestEvents.find((candidate) => candidate.eventId === unifiedId);
						if (!currentEventDraft || !entry || entry.revision !== currentEventDraft.revision || entry.contentHash !== sha256(currentEventDraft.content)) manifestEventsValid = false;
						continue;
					}
					const currentEventDraft = await this.latestChaseWifeEventDraft(params.projectId, params.chapter, event.eventId, signal);
					const entry = manifestEvents.find((candidate) => candidate.eventId === event.eventId);
					if (!currentEventDraft || !entry || entry.revision !== currentEventDraft.revision || entry.contentHash !== sha256(currentEventDraft.content) || entry.eventSpecHash !== hashJson(event)) manifestEventsValid = false;
				}
				if (!manifestEventsValid) throw new Error(`Chapter ${params.chapter} requires an assembly manifest bound to every current event specification.`);
				const pacingReport = await this.readJsonIfExists(this.projectFile(params.projectId, `continuity/reports/${name}-chase-wife-pacing.json`), signal);
				if (!isJsonRecord(pacingReport) || pacingReport.status !== "ok" || pacingReport.draftRevision !== params.draftRevision || pacingReport.contentHash !== sha256(draft.content) || pacingReport.eventMapHash !== eventMap.eventMapHash || pacingReport.manifestHash !== hashJson(manifest)) throw new Error(`Chapter ${params.chapter} requires a current passing chase-wife chapter pacing report.`);
				const scoreReport = await this.readJsonIfExists(this.projectFile(params.projectId, `evaluations/chapter/${name}-chase-wife-pacing-score.json`), signal);
				if (!isJsonRecord(scoreReport) || scoreReport.passed !== true || scoreReport.draftRevision !== params.draftRevision || scoreReport.contentHash !== sha256(draft.content) || scoreReport.eventMapHash !== eventMap.eventMapHash || scoreReport.manifestHash !== hashJson(manifest)) throw new Error(`Chapter ${params.chapter} requires a current passing chase-wife chapter score.`);
				const aiArtifacts = await this.readJsonIfExists(this.projectFile(params.projectId, `evaluations/chapter/${name}-ai-artifacts-r${String(params.draftRevision).padStart(2, "0")}.json`), signal);
				if (!isJsonRecord(aiArtifacts) || aiArtifacts.draftRevision !== params.draftRevision || aiArtifacts.passed !== true || aiArtifacts.contentHash !== sha256(draft.content)) throw new Error(`Chapter ${params.chapter} requires a passing AI-artifact report for the selected draft.`);
				const readerReport = await this.readTextIfExists(this.projectFile(params.projectId, `evaluations/reader/${name}.md`), signal);
				const reviewReport = await this.readTextIfExists(this.projectFile(params.projectId, `evaluations/review/${name}.md`), signal);
				const readerData = readerReport === undefined ? undefined : parseStructuredQualityReport(readerReport);
				const reviewData = reviewReport === undefined ? undefined : parseStructuredQualityReport(reviewReport);
				const readerReady = readerReport?.includes(`draftRevision: ${params.draftRevision}`) === true && readerReport.includes(`contentHash: ${sha256(draft.content)}`) && isReaderReport(readerData) && readerReport.includes(`structuredReportHash: ${hashJson(readerData)}`) && readerData.status === "ok";
				const reviewReady = reviewReport?.includes(`draftRevision: ${params.draftRevision}`) === true && reviewReport.includes(`contentHash: ${sha256(draft.content)}`) && isReviewReport(reviewData) && reviewReport.includes(`structuredReportHash: ${hashJson(reviewData)}`) && reviewData.status === "ok" && reviewData.allowFinalize;
				if (!readerReady || !reviewReady) throw new Error(`Chapter ${params.chapter} requires current passing reader simulation and story review reports.`);
				const progress = await this.checkChaseWifeHarmRepairProgress({ projectId: params.projectId, chapter: params.chapter }, signal);
				if (progress.status === "stalled") throw new Error(`Chapter ${params.chapter} cannot be finalized while harm-repair progress is stalled: ${progress.issues.join("; ")}`);
			}
			// Narrative realization gates（planned ≠ realized）：仅当本章存在计划项时要求正文兑现证据；无计划项自动通过。
			await this.enforceNarrativeRealizationGates(params.projectId, params.chapter, params.draftRevision, params.content, signal);
			const timelinePath = this.projectFile(params.projectId, "timeline/events.json");
			const existingTimeline = await this.readJsonIfExists(timelinePath, signal);
			const timeline = Array.isArray(existingTimeline) ? existingTimeline.filter((event) => !isJsonRecord(event) || event.chapter !== params.chapter) : [];
			const timelineEvents = params.summary.events.map((description, index) => ({ id: `${name}-event-${index + 1}`, chapter: params.chapter, description }));
			const finalizedAt = new Date().toISOString();
			const summary = { ...params.summary, chapter: params.chapter, title: params.title, draftRevision: params.draftRevision, finalizedAt };
			const existingFinalized = Array.isArray(existingProject.finalizedChapters) ? existingProject.finalizedChapters.filter(isPositiveInteger) : [];
			const finalizedChapters = [...new Set([...existingFinalized, params.chapter])].sort((left, right) => left - right);
			const project = { ...existingProject, finalizedChapters, lastFinalizedChapter: Math.max(...finalizedChapters), nextChapter: Math.max(nextChapter, Math.max(...finalizedChapters) + 1), status: "writing", updatedAt: finalizedAt };
			const status = { projectId: params.projectId, status: project.status, nextChapter: project.nextChapter, lastFinalizedChapter: project.lastFinalizedChapter, finalizedChapters: project.finalizedChapters, updatedAt: finalizedAt };
			const transactionId = await this.writeTransaction(params.projectId, params.chapter, [
				{ relativePath: `chapters/${name}.md`, content: normalizeText(params.content) },
				{ relativePath: `summaries/${name}.json`, content: `${JSON.stringify(summary, null, 2)}\n` },
				{ relativePath: "timeline/events.json", content: `${JSON.stringify([...timeline, ...timelineEvents], null, 2)}\n` },
				{ relativePath: "project.json", content: `${JSON.stringify(project, null, 2)}\n` },
				{ relativePath: "status.json", content: `${JSON.stringify(status, null, 2)}\n` },
			], signal);
			return { projectId: params.projectId, chapter: params.chapter, chapterPath: this.relativeProjectPath(params.projectId, chapterPath), summaryPath: this.relativeProjectPath(params.projectId, summaryPath), timelinePath: this.relativeProjectPath(params.projectId, timelinePath), projectPath: this.relativeProjectPath(params.projectId, projectPath), transactionId };
		});
	}
}
