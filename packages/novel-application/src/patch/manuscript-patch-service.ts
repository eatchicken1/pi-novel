import type {
	ChangeOperation,
	ChangeSet,
	ManuscriptPatch,
	ManuscriptPatchCandidate,
	PatchGenerationInput,
	RevisionImpact,
} from "@earendil-works/pi-novel-contracts";
import type { ChangeSetService } from "../changesets/change-set-service.ts";
import type { ModelRuntimePort, NovelEnginePort, ProjectDatabaseRegistryPort } from "../ports.ts";
import type { AgentRuntimeService } from "../runtime/agent-runtime-service.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";
import { textHash } from "./text-anchor.ts";

const DEFAULT_CONSTRAINTS = ["不改变确认事实", "不新增人物", "不改变时间线", "保持 POV", "保持人物声音"];

export class ManuscriptPatchService {
	private readonly workspace: WorkspaceService;
	private readonly engine: NovelEnginePort;
	private readonly registry: ProjectDatabaseRegistryPort;
	private readonly runtime: AgentRuntimeService;
	private readonly model: ModelRuntimePort;
	private readonly changeSets: ChangeSetService;

	constructor(input: {
		workspace: WorkspaceService;
		engine: NovelEnginePort;
		registry: ProjectDatabaseRegistryPort;
		runtime: AgentRuntimeService;
		model: ModelRuntimePort;
		changeSets: ChangeSetService;
	}) {
		this.workspace = input.workspace;
		this.engine = input.engine;
		this.registry = input.registry;
		this.runtime = input.runtime;
		this.model = input.model;
		this.changeSets = input.changeSets;
	}

	async validate(projectId: string, chapter: number, input: PatchGenerationInput): Promise<void> {
		const { workspaceRoot, project } = await this.project(projectId);
		const capabilities = await this.engine.getCapabilities(workspaceRoot, projectId);
		if (capabilities?.narrativePatch !== "supported") throw new Error("NARRATIVE_PATCH_UNSUPPORTED");
		const document = await this.engine.readChapter(workspaceRoot, projectId, project.kind, chapter);
		if (document === null) throw new Error("CHAPTER_NOT_FOUND");
		const metadata = this.registry.open(projectId, project.rootPath).chapterMetadata.get(projectId, chapter);
		if (metadata?.workflowStatus === "finalized" && input.reopenConfirmed !== true)
			throw new Error("CHAPTER_REOPEN_REQUIRED");
		if (
			input.anchor.chapterId !== String(chapter) &&
			input.anchor.chapterId !== `chapter-${String(chapter).padStart(3, "0")}`
		)
			throw new Error("PATCH_TARGET_CONFLICT");
		if (input.anchor.baseContentHash !== document.contentHash) throw new Error("PATCH_BASE_STALE");
		if (
			textHash(document.text.slice(input.anchor.startOffset, input.anchor.endOffset)) !==
			input.anchor.selectedTextHash
		)
			throw new Error("PATCH_TARGET_CONFLICT");
		await this.runtime.resolveInvocation("chapter.reviser");
	}

	async generate(projectId: string, chapter: number, input: PatchGenerationInput): Promise<ChangeSet> {
		const { workspaceRoot, project } = await this.project(projectId);
		await this.validate(projectId, chapter, input);
		const document = await this.engine.readChapter(workspaceRoot, projectId, project.kind, chapter);
		if (document === null) throw new Error("CHAPTER_NOT_FOUND");
		const original = document.text.slice(input.anchor.startOffset, input.anchor.endOffset);
		const invocation = await this.runtime.resolveInvocation("chapter.reviser");
		const constraints = input.constraints ?? DEFAULT_CONSTRAINTS;
		const workflow = this.registry.open(projectId, project.rootPath).chapterWorkflow.get(projectId, chapter);
		const reviewContext = (await this.engine.reviewSources(workspaceRoot, projectId).catch(() => []))
			.filter((entry) => entry.chapter === null || entry.chapter === chapter)
			.slice(0, 10)
			.map((entry) => `${entry.sourceCode}: ${entry.message}`)
			.join("；");
		const prompt = buildPrompt({
			goal: input.goal,
			original,
			prefix: input.anchor.prefixContext,
			suffix: input.anchor.suffixContext,
			constraints,
			chapterSummary: workflow?.settlement?.summary.whatChanged?.join("；") ?? "暂无已确认章节摘要",
			reviewContext: reviewContext || "当前章节暂无相关审校上下文",
		});
		const output = await this.model.generateText(workspaceRoot, invocation, prompt);
		const impact = await this.analyzeImpact(workspaceRoot, projectId, chapter);
		const candidates = parseCandidates(output, original, input.outputCount ?? 1).map((candidate) => ({
			...candidate,
			impact,
		}));
		const target = `manuscript/chapter-${String(chapter).padStart(3, "0")}.md`;
		const operations = candidates.map(
			(candidate, index): ChangeOperation => ({
				operationId: `patch-${chapter}-${index + 1}`,
				kind: "replace-text",
				target,
				baseHash: document.contentHash,
				startChar: input.anchor.startOffset,
				endChar: input.anchor.endOffset,
				text: candidate.replacement,
				anchor: input.anchor,
			}),
		);
		const patch: ManuscriptPatch = {
			goal: input.goal,
			target,
			constraints,
			operations,
			impact,
			provenance: {
				agentId: invocation.agentId,
				runtimeModelId: invocation.modelId,
				thinkingLevel: invocation.thinkingLevel,
			},
			baseRevision: document.revision,
			baseContentHash: document.contentHash,
			anchor: input.anchor,
			candidates,
		};
		return this.changeSets.create({
			projectId,
			title: `第 ${chapter} 章：${input.goal}`,
			kind: "MANUSCRIPT_PATCH",
			source: "agent",
			intent: input.goal,
			baseRevision: String(document.revision),
			operations: [operations[0]!],
			patch,
		});
	}

	private async analyzeImpact(workspaceRoot: string, projectId: string, chapter: number): Promise<RevisionImpact> {
		const report = await this.engine.analyzeRevisionImpact(workspaceRoot, projectId, { changedChapter: chapter });
		if (report !== null && report.causalCoverage === "partial" && report.items !== undefined)
			return report as RevisionImpact;
		return {
			severity: report?.severity ?? "safe-local",
			causalCoverage: "partial",
			items: report?.items ?? [
				{
					category: "CURRENT_CHAPTER",
					certainty: "KNOWN",
					description: "修改目标位于当前章节。",
					evidence: {
						sourceType: "chapter",
						sourceId: String(chapter),
						chapterId: String(chapter),
						description: "作者选择的当前章节正文片段。",
					},
				},
			],
			affectedChapters: report?.affectedChapters ?? [chapter],
			affectedCharacters: report?.affectedCharacters ?? [],
			affectedThreads: report?.affectedThreads ?? [],
			affectedClues: report?.affectedClues ?? [],
			affectedPromises: report?.affectedPromises ?? [],
			summary: report?.summary ?? "影响分析仅基于已确认故事状态。",
			analyzedAt: report?.analyzedAt ?? new Date().toISOString(),
		};
	}

	private async project(
		projectId: string,
	): Promise<{ workspaceRoot: string; project: { rootPath: string; kind: "native" | "legacy" } }> {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (overview === null || project === undefined) throw new Error("PROJECT_NOT_FOUND");
		return { workspaceRoot: overview.manifest.rootPath, project };
	}
}

function buildPrompt(input: {
	goal: string;
	original: string;
	prefix: string;
	suffix: string;
	constraints: string[];
	chapterSummary: string;
	reviewContext: string;
}): string {
	return [
		"你是 Chapter Reviser。只提出正文修改候选，不直接写入文件。",
		`目标：${input.goal}`,
		`选中文本：\n${input.original}`,
		`前文：\n${input.prefix}`,
		`后文：\n${input.suffix}`,
		`已确认章节摘要：${input.chapterSummary}`,
		`相关审校上下文：${input.reviewContext}`,
		`约束：${input.constraints.join("；")}`,
		'请返回 JSON：{"candidates":[{"replacement":"...","explanation":"..."}]}。',
	].join("\n\n");
}

function parseCandidates(output: string, original: string, count: 1 | 3): ManuscriptPatchCandidate[] {
	const cleaned = output
		.replace(/^```(?:json)?\s*/u, "")
		.replace(/\s*```$/u, "")
		.trim();
	const parsed = safeJson(cleaned);
	const raw =
		isRecord(parsed) && Array.isArray(parsed.candidates) ? parsed.candidates : Array.isArray(parsed) ? parsed : [];
	const candidates: ManuscriptPatchCandidate[] = raw
		.filter(isRecord)
		.map((entry, index) => ({
			candidateId: `candidate-${index + 1}`,
			original,
			replacement: typeof entry.replacement === "string" ? entry.replacement : "",
			explanation: typeof entry.explanation === "string" ? entry.explanation : "AI 提出的局部措辞修改。",
		}))
		.filter((entry) => entry.replacement.length > 0)
		.slice(0, count);
	if (candidates.length > 0) return candidates;
	return [
		{
			candidateId: "candidate-1",
			original,
			replacement: output.trim(),
			explanation: "模型返回了未结构化文本，已作为单一候选保留。",
		},
	];
}

function safeJson(value: string): unknown {
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
