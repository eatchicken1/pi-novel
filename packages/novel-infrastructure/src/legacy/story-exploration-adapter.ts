import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type {
	ConstraintValidation,
	DirectionCandidate,
	ForgeSession,
	RuntimeInvocation,
	StoryConstraint,
	StoryDirectionComparison,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import {
	type StoryDirectionCandidate as LegacyStoryDirectionCandidate,
	StoryDirectionCandidateSchema,
} from "../../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../../.pi/extensions/novel-agent/services/project-store.ts";
import { validateStoryDirectionComparison } from "../../../../.pi/extensions/novel-agent/services/story-design.ts";
import {
	normalizePrimaryGenre,
	normalizeProfessionalDomain,
	normalizeRelationshipMechanism,
} from "../../../../.pi/extensions/novel-agent/services/story-profile.ts";

interface ModelRuntimePort {
	generateText(
		workspaceRoot: string,
		invocation: RuntimeInvocation,
		prompt: string,
		signal?: AbortSignal,
	): Promise<string>;
}

interface StoryExplorationInput {
	workspaceRoot: string;
	forgeSessionId: string;
	seed: string;
	narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
	hardConstraints: StoryConstraint[];
	preferences: StoryConstraint[];
	invocation: RuntimeInvocation;
	count: number;
	previousCandidates: DirectionCandidate[];
	repairHint?: string;
}

interface StoryExplorationPort {
	generateDirections(
		input: StoryExplorationInput,
		signal?: AbortSignal,
	): Promise<{ candidates: DirectionCandidate[]; comparison: StoryDirectionComparison | null }>;
	critiqueDirection(
		input: {
			workspaceRoot: string;
			invocation: RuntimeInvocation;
			seed: string;
			candidate: DirectionCandidate;
			instruction: string;
		},
		signal?: AbortSignal,
	): Promise<string>;
	compareDirections(
		input: {
			workspaceRoot: string;
			invocation: RuntimeInvocation;
			seed: string;
			narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
			hardConstraints: StoryConstraint[];
			preferences: StoryConstraint[];
			candidates: DirectionCandidate[];
		},
		signal?: AbortSignal,
	): Promise<StoryDirectionComparison>;
}

const COMPARISON_DIMENSIONS = [
	"Narrative Drive（叙事驱动力）",
	"Character Agency（角色能动性）",
	"Conflict Sustainability（冲突可持续性）",
	"Mystery / Question Strength（谜团/问题强度）",
	"Distinctiveness（独特性）",
	"Ending Potential（结局潜力）",
	"Long-form Sustainability（长篇可持续性）",
	"Major Risk（主要风险）",
];

export class LegacyStoryExplorationAdapter implements StoryExplorationPort {
	private readonly runtime: ModelRuntimePort;
	private readonly skillRoots: readonly string[];

	constructor(runtime: ModelRuntimePort, options?: { skillRoots?: readonly string[] }) {
		this.runtime = runtime;
		this.skillRoots = options?.skillRoots ?? [join(homedir(), ".pi", "skills"), join(process.cwd(), ".pi", "skills")];
	}

	async generateDirections(
		input: StoryExplorationInput,
		signal?: AbortSignal,
	): Promise<{ candidates: DirectionCandidate[]; comparison: StoryDirectionComparison | null }> {
		const runtimeRoot = resolve(input.workspaceRoot, ".pi-novel", "sessions", input.forgeSessionId, "runtime");
		const projectId = `forge-${input.forgeSessionId.replaceAll("-", "").slice(0, 48)}`;
		const store = new NovelProjectStore(runtimeRoot);
		// The runtime project persists across generations for auditability;
		// initialization is skipped once it exists.
		try {
			await store.initializeNovel({
				projectId,
				title: input.narrativeDNA.coreExperience.slice(0, 80) || "Forge Runtime",
				genre: input.narrativeDNA.genre,
			});
		} catch (error) {
			if (!errorMessageContains(error, "already exists")) throw error;
		}
		const skillContext = await this.compileSkillContext(input.narrativeDNA.genre);
		const prompt = buildDirectionPrompt(input, skillContext);
		const output = await this.runtime.generateText(input.workspaceRoot, input.invocation, prompt, signal);
		const parsed = parseModelOutput(output);
		const rawCandidates = readCandidateArray(parsed);
		if (rawCandidates.length < input.count)
			throw new ForgeAdapterError(
				"FORGE_TOO_FEW_CANDIDATES",
				`Model returned ${rawCandidates.length} directions; expected ${input.count}`,
			);
		const generation =
			input.previousCandidates.reduce((max, candidate) => Math.max(max, candidate.generation), 0) + 1;
		const allCandidates = rawCandidates.slice(0, input.count).map((raw) => this.toCandidate(raw, generation));
		// Hard-constraint gate: FAIL candidates are dropped before they can
		// reach the author as ordinary proposals.
		const gated = allCandidates.filter((candidate) => candidate.constraintValidation.status !== "FAIL");
		if (gated.length < input.count) {
			const failing = allCandidates.filter((candidate) => candidate.constraintValidation.status === "FAIL");
			throw new ForgeAdapterError(
				"FORGE_CONSTRAINT_GATE",
				`${failing.length} candidate(s) failed the hard-constraint gate: ${failing
					.map((candidate) => `${candidate.title}: ${candidate.constraintValidation.reasons.join("; ")}`)
					.join(" | ")}`,
			);
		}
		const candidates = gated;
		const legacyCandidates = candidates.map(toLegacyCandidate);
		const legacyResult = await store.exploreStoryDirections(
			{
				projectId,
				seed: input.seed,
				candidates: legacyCandidates,
				comparison: undefined,
			},
			signal,
		);
		if (legacyResult.status === "blocked") {
			const blockedCodes = legacyResult.blockers?.map((blocker) => blocker.code).join(", ") ?? "unknown";
			throw new ForgeAdapterError(
				"FORGE_DIRECTIONS_NOT_DISTINCT",
				`Legacy direction checks rejected the candidates (${blockedCodes}); directions are not distinct enough`,
			);
		}
		return { candidates, comparison: null };
	}

	async critiqueDirection(
		input: {
			workspaceRoot: string;
			invocation: RuntimeInvocation;
			seed: string;
			candidate: DirectionCandidate;
			instruction: string;
		},
		signal?: AbortSignal,
	): Promise<string> {
		const prompt = `你是 Pi-Novel 的故事设计审阅器（forge.critic）。只审阅下面这一个候选方向，不要重写它。\n\n种子：${input.seed}\n候选：${JSON.stringify(input.candidate, null, 2)}\n作者要求：${input.instruction}\n\n输出 3-5 条具体问题，以及每条问题对应的可验证修改建议。不要输出 Markdown 标题。`;
		return this.runtime.generateText(input.workspaceRoot, input.invocation, prompt, signal);
	}

	async compareDirections(
		input: {
			workspaceRoot: string;
			invocation: RuntimeInvocation;
			seed: string;
			narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
			hardConstraints: StoryConstraint[];
			preferences: StoryConstraint[];
			candidates: DirectionCandidate[];
		},
		signal?: AbortSignal,
	): Promise<StoryDirectionComparison> {
		const skillContext = await this.compileSkillContext(input.narrativeDNA.genre);
		const prompt = buildComparisonPrompt(input, skillContext);
		const output = await this.runtime.generateText(input.workspaceRoot, input.invocation, prompt, signal);
		const parsed = parseModelOutput(output);
		const comparison = parseComparison(parsed);
		const findings = validateStoryDirectionComparison(
			comparison,
			input.candidates.map((candidate) => candidate.candidateId),
		);
		if (findings.some((finding) => finding.severity === "error")) {
			throw new ForgeAdapterError(
				"FORGE_COMPARISON_INVALID",
				`Comparison references unknown candidates: ${findings
					.filter((finding) => finding.severity === "error")
					.map((finding) => finding.message)
					.join("; ")}`,
			);
		}
		return { ...comparison, createdAt: new Date().toISOString() };
	}

	private toCandidate(raw: Record<string, unknown>, generation: number): DirectionCandidate {
		const createdAt = new Date().toISOString();
		const candidateId = `direction-${randomUUID()}`;
		const logline = requiredString(raw, "logline");
		const centralMystery = requiredString(raw, "centralMystery");
		const socialMechanism = requiredString(raw, "socialMechanism");
		const protagonistGoal = requiredString(raw, "protagonistGoal");
		const protagonistBlindSpot = requiredString(raw, "protagonistBlindSpot");
		const relationshipFaultLine = requiredString(raw, "relationshipFaultLine");
		const spouseCoreBelief = requiredString(raw, "spouseCoreBelief");
		const professionalDependency = requiredString(raw, "professionalDependency");
		const centralDilemma = requiredString(raw, "centralDilemma");
		const majorCost = requiredString(raw, "majorCost");
		const climaxIdea = requiredString(raw, "climaxIdea");
		const endingShape = requiredString(raw, "endingShape");
		const distinctiveMechanism = requiredString(raw, "distinctiveMechanism");
		return {
			candidateId,
			artifactId: candidateId,
			generation,
			status: "proposed",
			title: requiredString(raw, "title"),
			logline,
			corePremise: requiredString(raw, "corePremise", logline),
			centralMystery,
			socialMechanism,
			characterEngine: `${protagonistGoal}；盲点：${protagonistBlindSpot}`,
			relationshipFaultLine,
			centralDilemma,
			readerPromise: requiredString(raw, "readerPromise", `${centralMystery} / ${endingShape}`),
			endingShape,
			climaxIdea,
			majorRisks: [majorCost, ...readStringArray(raw, "majorRisks")],
			distinctiveFeatures: [distinctiveMechanism, spouseCoreBelief, professionalDependency],
			constraintValidation: readConstraintValidation(raw),
			createdAt,
		};
	}

	private async compileSkillContext(genre: string): Promise<string> {
		const root = this.skillRoots.find((candidate) => existsSync(candidate));
		if (!root) return "";
		const normalizedGenre = normalizePrimaryGenre(genre);
		const mechanism = normalizeRelationshipMechanism(genre);
		const domain = normalizeProfessionalDomain(genre);
		const candidates = new Set<string>([
			`genre-${normalizedGenre}`,
			...(mechanism !== normalizedGenre ? [`mechanism-${mechanism}`] : []),
			...(domain !== normalizedGenre ? [`domain-${domain}`] : []),
		]);
		const sections: string[] = [];
		for (const skillId of candidates) {
			const section = await this.loadSkill(root, skillId);
			if (section) sections.push(section);
		}
		return sections.join("\n\n");
	}

	private async loadSkill(root: string, skillId: string): Promise<string | null> {
		const skillDir = join(root, skillId);
		if (!existsSync(join(skillDir, "SKILL.md"))) return null;
		try {
			const skill = await readFile(join(skillDir, "SKILL.md"), "utf8");
			const [frontMatter, ...body] = skill.split(/^---\s*$/mu).filter((part) => part.trim().length > 0);
			const name = frontMatter?.match(/^name:\s*(.+)$/mu)?.[1]?.trim() ?? skillId;
			const description = frontMatter?.match(/^description:\s*(.+)$/mu)?.[1]?.trim() ?? "";
			const resourceRefs = [...skill.matchAll(/`resources\/([A-Za-z0-9._-]+)`/gu)].map((match) => match[1]);
			const resources: string[] = [];
			for (const ref of [...new Set(resourceRefs)]) {
				const resourcePath = join(skillDir, "resources", ref);
				if (!existsSync(resourcePath)) continue;
				const content = await readFile(resourcePath, "utf8");
				resources.push(`### resources/${ref}\n${content.trim()}`);
			}
			return `## Skill: ${name}${description ? ` — ${description}` : ""}\n${body.join("\n").trim()}\n\n${resources.join("\n\n")}`;
		} catch (error) {
			if (isMissingFile(error)) return null;
			throw error;
		}
	}
}

function buildDirectionPrompt(input: StoryExplorationInput, skillContext: string): string {
	const hard = input.hardConstraints.map((constraint) => `- ${constraint.text}`).join("\n") || "- 无";
	const preferences = input.preferences.map((constraint) => `- ${constraint.text}`).join("\n") || "- 无";
	const previous =
		input.previousCandidates.length === 0
			? "无"
			: JSON.stringify(
					input.previousCandidates.map((candidate) => ({
						title: candidate.title,
						centralMystery: candidate.centralMystery,
						socialMechanism: candidate.socialMechanism,
						relationshipFaultLine: candidate.relationshipFaultLine,
						endingShape: candidate.endingShape,
					})),
					null,
					2,
				);
	const repair = input.repairHint ? `\n\n上一轮生成未通过门禁，本轮必须修正：${input.repairHint}` : "";
	return `你是 Pi-Novel Forge 的故事方向生成器（forge.explorer）。根据一个故事种子生成恰好 ${input.count} 个真正不同的方向。它们必须在 centralMystery、socialMechanism、relationshipFaultLine、professionalDependency、endingShape、centralDilemma 至少三个维度上不同，不能只替换人名。\n\n种子：${input.seed}\n叙事 DNA：${JSON.stringify(input.narrativeDNA)}\n硬约束（必须满足）：\n${hard}\n偏好（尽量满足）：\n${preferences}\n已有方向（不要重复）：\n${previous}${repair}\n\n${skillContext ? `题材 Skill 上下文（必须遵守其中的类型不变量）：\n${skillContext}` : ""}\n\n只输出 JSON：{"candidates":[...]}。每个 candidate 必须包含 title、logline、corePremise、centralMystery、socialMechanism、protagonistGoal、protagonistBlindSpot、relationshipFaultLine、spouseCoreBelief、professionalDependency、centralDilemma、majorCost、climaxIdea、endingShape、distinctiveMechanism、readerPromise、majorRisks（字符串数组），以及 constraintValidation：{"status":"PASS"|"FAIL"|"UNCERTAIN","reasons":[...]}。硬约束全部满足时为 PASS，任何一条不满足为 FAIL（必须给出违反哪条），无法判断为 UNCERTAIN。不要输出 Markdown，不要输出说明。`;
}

function buildComparisonPrompt(
	input: {
		seed: string;
		narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
		hardConstraints: StoryConstraint[];
		preferences: StoryConstraint[];
		candidates: DirectionCandidate[];
	},
	skillContext: string,
): string {
	const hard = input.hardConstraints.map((constraint) => `- ${constraint.text}`).join("\n") || "- 无";
	const preferences = input.preferences.map((constraint) => `- ${constraint.text}`).join("\n") || "- 无";
	const candidates = JSON.stringify(
		input.candidates.map((candidate) => ({
			candidateId: candidate.candidateId,
			title: candidate.title,
			logline: candidate.logline,
			centralMystery: candidate.centralMystery,
			socialMechanism: candidate.socialMechanism,
			characterEngine: candidate.characterEngine,
			relationshipFaultLine: candidate.relationshipFaultLine,
			centralDilemma: candidate.centralDilemma,
			readerPromise: candidate.readerPromise,
			endingShape: candidate.endingShape,
			climaxIdea: candidate.climaxIdea,
			majorRisks: candidate.majorRisks,
			distinctiveFeatures: candidate.distinctiveFeatures,
			constraintValidation: candidate.constraintValidation,
		})),
		null,
		2,
	);
	return `你是 Pi-Novel Forge 的方向比较器（forge.comparator）。比较下面的候选方向，为每个维度给出定性判断，禁止编造数字评分。\n\n种子：${input.seed}\n叙事 DNA：${JSON.stringify(input.narrativeDNA)}\n硬约束：\n${hard}\n偏好：\n${preferences}\n\n候选方向（candidateId 必须原样引用）：\n${candidates}\n\n${skillContext ? `题材 Skill 上下文：\n${skillContext}` : ""}\n\n只输出 JSON：{"dimensions":[{"dimension":"<维度>","assessment":"stronger"|"comparable"|"weaker"|"risk","candidateIds":["..."],"reason":"..."}],"recommendedCandidateIds":["..."],"notes":["..."]}。\n维度必须覆盖（可以用中文或英文标签）：${COMPARISON_DIMENSIONS.join("、")}。\n每个维度必须引用存在的 candidateId；"risk" 表示该候选在该维度存在重大风险。recommendedCandidateIds 是综合排序（不构成作者确认）。不要输出 Markdown。`;
}

function parseComparison(value: unknown): StoryDirectionComparison {
	const record = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
	const dimensions = Array.isArray(record.dimensions)
		? (record.dimensions as Array<Record<string, unknown>>).map((entry) => ({
				dimension: String(entry.dimension ?? ""),
				assessment: normalizeAssessment(entry.assessment),
				candidateIds: Array.isArray(entry.candidateIds) ? entry.candidateIds.map(String) : [],
				reason: String(entry.reason ?? ""),
			}))
		: [];
	const recommendedCandidateIds = Array.isArray(record.recommendedCandidateIds)
		? record.recommendedCandidateIds.map(String)
		: [];
	const notes = Array.isArray(record.notes) ? record.notes.map(String) : [];
	if (dimensions.length === 0)
		throw new ForgeAdapterError("FORGE_COMPARISON_INVALID", "Comparison output has no dimensions");
	if (
		dimensions.some(
			(entry) => entry.dimension.length === 0 || entry.reason.length === 0 || entry.candidateIds.length === 0,
		)
	)
		throw new ForgeAdapterError("FORGE_COMPARISON_INVALID", "Comparison dimension entries are incomplete");
	return { dimensions, recommendedCandidateIds, notes, createdAt: new Date().toISOString() };
}

function normalizeAssessment(value: unknown): "stronger" | "comparable" | "weaker" | "risk" {
	if (value === "stronger" || value === "comparable" || value === "weaker" || value === "risk") return value;
	throw new ForgeAdapterError("FORGE_COMPARISON_INVALID", `Unknown comparison assessment: ${String(value)}`);
}

function readConstraintValidation(record: Record<string, unknown>): ConstraintValidation {
	const value = record.constraintValidation;
	if (typeof value !== "object" || value === null) {
		return { status: "UNCERTAIN", reasons: ["Model did not self-report constraint validation"] };
	}
	const statusValue = (value as Record<string, unknown>).status;
	const status =
		statusValue === "PASS" || statusValue === "FAIL" || statusValue === "UNCERTAIN" ? statusValue : "UNCERTAIN";
	const reasons = Array.isArray((value as Record<string, unknown>).reasons)
		? ((value as Record<string, unknown>).reasons as unknown[]).filter(
				(entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
			)
		: [];
	return { status, reasons: reasons.length > 0 ? reasons : ["No reasons provided"] };
}

function parseModelOutput(output: string): unknown {
	const trimmed = output
		.trim()
		.replace(/^```(?:json)?\s*/u, "")
		.replace(/\s*```$/u, "");
	try {
		return JSON.parse(trimmed) as unknown;
	} catch {
		const start = trimmed.indexOf("{");
		const end = trimmed.lastIndexOf("}");
		if (start < 0 || end <= start)
			throw new ForgeAdapterError("FORGE_MODEL_OUTPUT_INVALID", "Model output is not valid JSON");
		try {
			return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
		} catch (error) {
			throw new ForgeAdapterError("FORGE_MODEL_OUTPUT_INVALID", "Model output is not valid JSON", error);
		}
	}
}

function readCandidateArray(value: unknown): Record<string, unknown>[] {
	const array: unknown[] = Array.isArray(value)
		? value
		: typeof value === "object" && value !== null && Array.isArray((value as Record<string, unknown>).candidates)
			? ((value as Record<string, unknown>).candidates as unknown[])
			: [];
	return array.filter(isRecord);
}

function toLegacyCandidate(candidate: DirectionCandidate): LegacyStoryDirectionCandidate {
	const [distinctiveMechanism, spouseCoreBelief, professionalDependency] = candidate.distinctiveFeatures;
	const legacy = {
		id: candidate.candidateId,
		logline: candidate.logline,
		centralMystery: candidate.centralMystery,
		socialMechanism: candidate.socialMechanism,
		protagonistGoal: candidate.characterEngine,
		protagonistBlindSpot: candidate.characterEngine,
		relationshipFaultLine: candidate.relationshipFaultLine,
		spouseCoreBelief: spouseCoreBelief ?? candidate.relationshipFaultLine,
		professionalDependency: professionalDependency ?? candidate.corePremise,
		centralDilemma: candidate.centralDilemma,
		majorCost: candidate.majorRisks[0] ?? "关系与真相必须付出代价",
		climaxIdea: candidate.climaxIdea,
		endingShape: candidate.endingShape,
		distinctiveMechanism: distinctiveMechanism ?? candidate.corePremise,
		majorRisks: candidate.majorRisks,
	};
	if (!Check(StoryDirectionCandidateSchema, legacy))
		throw new ForgeAdapterError(
			"FORGE_MODEL_OUTPUT_INVALID",
			`Candidate ${candidate.candidateId} does not satisfy Legacy direction contract`,
		);
	return legacy;
}

function requiredString(record: Record<string, unknown>, key: string, fallback?: string): string {
	const value = record[key];
	if (typeof value === "string" && value.trim()) return value.trim();
	if (fallback?.trim()) return fallback.trim();
	throw new ForgeAdapterError("FORGE_MODEL_OUTPUT_INVALID", `Model candidate field is missing: ${key}`);
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
	const value = record[key];
	if (!Array.isArray(value))
		throw new ForgeAdapterError("FORGE_MODEL_OUTPUT_INVALID", `Model candidate field must be an array: ${key}`);
	const result = value
		.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
		.map((entry) => entry.trim());
	if (result.length === 0)
		throw new ForgeAdapterError("FORGE_MODEL_OUTPUT_INVALID", `Model candidate field is empty: ${key}`);
	return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessageContains(error: unknown, needle: string): boolean {
	return error instanceof Error && error.message.includes(needle);
}

function isMissingFile(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export class ForgeAdapterError extends Error {
	readonly code: string;

	constructor(code: string, message: string, cause?: unknown) {
		super(message, cause instanceof Error ? { cause } : undefined);
		this.name = "ForgeAdapterError";
		this.code = code;
	}
}
