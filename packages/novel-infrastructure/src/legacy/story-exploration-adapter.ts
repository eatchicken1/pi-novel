import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import type {
	DirectionCandidate,
	ForgeSession,
	StoryConstraint,
	StoryDirectionComparison,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import {
	type StoryDirectionCandidate as LegacyStoryDirectionCandidate,
	type StoryDirectionComparison as LegacyStoryDirectionComparison,
	StoryDirectionCandidateSchema,
} from "../../../../.pi/extensions/novel-agent/schemas.ts";
import { NovelProjectStore } from "../../../../.pi/extensions/novel-agent/services/project-store.ts";

interface ModelRuntimePort {
	generateText(workspaceRoot: string, modelId: string, prompt: string, signal?: AbortSignal): Promise<string>;
}

interface StoryExplorationInput {
	workspaceRoot: string;
	forgeSessionId: string;
	seed: string;
	narrativeDNA: NonNullable<ForgeSession["narrativeDNA"]>;
	hardConstraints: StoryConstraint[];
	preferences: StoryConstraint[];
	modelId: string;
	count: number;
	previousCandidates: DirectionCandidate[];
}

interface StoryExplorationPort {
	generateDirections(
		input: StoryExplorationInput,
		signal?: AbortSignal,
	): Promise<{ candidates: DirectionCandidate[]; comparison: StoryDirectionComparison }>;
	critiqueDirection(
		input: {
			workspaceRoot: string;
			modelId: string;
			seed: string;
			candidate: DirectionCandidate;
			instruction: string;
		},
		signal?: AbortSignal,
	): Promise<string>;
}

export class LegacyStoryExplorationAdapter implements StoryExplorationPort {
	private readonly runtime: ModelRuntimePort;

	constructor(runtime: ModelRuntimePort) {
		this.runtime = runtime;
	}

	async generateDirections(
		input: StoryExplorationInput,
		signal?: AbortSignal,
	): Promise<{ candidates: DirectionCandidate[]; comparison: StoryDirectionComparison }> {
		const runtimeRoot = resolve(input.workspaceRoot, ".pi-novel", "sessions", input.forgeSessionId, "runtime");
		const projectId = `forge-${input.forgeSessionId.replaceAll("-", "").slice(0, 48)}`;
		const store = new NovelProjectStore(runtimeRoot);
		await store.initializeNovel({
			projectId,
			title: input.narrativeDNA.coreExperience.slice(0, 80) || "Forge Runtime",
			genre: input.narrativeDNA.genre,
		});
		const prompt = buildDirectionPrompt(input);
		const output = await this.runtime.generateText(input.workspaceRoot, input.modelId, prompt, signal);
		const parsed = parseModelOutput(output);
		const rawCandidates = readCandidateArray(parsed);
		if (rawCandidates.length < input.count)
			throw new ForgeAdapterError(
				"FORGE_MODEL_OUTPUT_INVALID",
				`Model returned ${rawCandidates.length} directions; expected ${input.count}`,
			);
		const candidates = rawCandidates
			.slice(0, input.count)
			.map((raw) => this.toCandidate(raw, input.previousCandidates.length > 0 ? 2 : 1));
		const legacyCandidates = candidates.map(toLegacyCandidate);
		const comparison = this.buildComparison(legacyCandidates);
		const legacyResult = await store.exploreStoryDirections(
			{ projectId, seed: input.seed, candidates: legacyCandidates, comparison },
			signal,
		);
		if (legacyResult.status === "blocked")
			throw new ForgeAdapterError(
				"FORGE_DIRECTIONS_REJECTED",
				"Legacy story direction checks rejected the generated candidates",
			);
		return { candidates, comparison: toContractComparison(comparison) };
	}

	async critiqueDirection(
		input: {
			workspaceRoot: string;
			modelId: string;
			seed: string;
			candidate: DirectionCandidate;
			instruction: string;
		},
		signal?: AbortSignal,
	): Promise<string> {
		const prompt = `你是 Pi-Novel 的故事设计审阅器。只审阅下面这一个候选方向，不要重写它。\n\n种子：${input.seed}\n候选：${JSON.stringify(input.candidate, null, 2)}\n作者要求：${input.instruction}\n\n输出 3-5 条具体问题，以及每条问题对应的可验证修改建议。不要输出 Markdown 标题。`;
		return this.runtime.generateText(input.workspaceRoot, input.modelId, prompt, signal);
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
			artifactId: randomUUID(),
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
			createdAt,
		};
	}

	private buildComparison(candidates: LegacyStoryDirectionCandidate[]): LegacyStoryDirectionComparison {
		const candidateIds = candidates.map((candidate) => candidate.id);
		return {
			dimensions: [
				{
					dimension: "mysteryPotential",
					assessment: "comparable",
					candidateIds,
					reason: "所有候选都保留了独立的核心谜团，需由作者比较揭示路径。",
				},
				{
					dimension: "socialDepth",
					assessment: "comparable",
					candidateIds,
					reason: "社会机制分别落在不同的关系与制度压力上。",
				},
				{
					dimension: "relationshipDepth",
					assessment: "comparable",
					candidateIds,
					reason: "关系断裂点与角色信念均被单独建模。",
				},
				{
					dimension: "endingPotential",
					assessment: "comparable",
					candidateIds,
					reason: "结局形态明确，后续由作者选择承诺。",
				},
			],
			recommendedCandidateIds: [candidateIds[0] ?? ""],
			notes: ["系统推荐仅用于比较排序，不构成作者确认。"],
		};
	}
}

function buildDirectionPrompt(input: StoryExplorationInput): string {
	const hard = input.hardConstraints.map((constraint) => `- ${constraint.text}`).join("\n") || "- 无";
	const preferences = input.preferences.map((constraint) => `- ${constraint.text}`).join("\n") || "- 无";
	const previous =
		input.previousCandidates.length === 0
			? "无"
			: JSON.stringify(
					input.previousCandidates.map((candidate) => ({
						centralMystery: candidate.centralMystery,
						socialMechanism: candidate.socialMechanism,
						relationshipFaultLine: candidate.relationshipFaultLine,
						endingShape: candidate.endingShape,
					})),
					null,
					2,
				);
	return `你是 Pi-Novel Forge 的故事方向生成器。根据一个故事种子生成恰好 ${input.count} 个真正不同的方向。它们必须在 centralMystery、socialMechanism、relationshipFaultLine、professionalDependency、endingShape、centralDilemma 至少三个维度上不同，不能只替换人名。\n\n种子：${input.seed}\n叙事 DNA：${JSON.stringify(input.narrativeDNA)}\n硬约束（必须满足）：\n${hard}\n偏好（尽量满足）：\n${preferences}\n已有方向（不要重复）：\n${previous}\n\n只输出 JSON：{"candidates":[...]}。每个 candidate 必须包含 title、logline、corePremise、centralMystery、socialMechanism、protagonistGoal、protagonistBlindSpot、relationshipFaultLine、spouseCoreBelief、professionalDependency、centralDilemma、majorCost、climaxIdea、endingShape、distinctiveMechanism、readerPromise、majorRisks（字符串数组）。不要输出 Markdown，不要输出说明。`;
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

function toContractComparison(comparison: LegacyStoryDirectionComparison): StoryDirectionComparison {
	return { ...comparison, createdAt: new Date().toISOString() };
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

export class ForgeAdapterError extends Error {
	readonly code: string;

	constructor(code: string, message: string, cause?: unknown) {
		super(message, cause instanceof Error ? { cause } : undefined);
		this.name = "ForgeAdapterError";
		this.code = code;
	}
}
