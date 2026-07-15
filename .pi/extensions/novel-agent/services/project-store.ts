import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
	CheckContinuityParams,
	CheckAiArtifactsParams,
	CheckChaseWifeArcParams,
	ChaseWifeBeat,
	CompareDraftVersionsParams,
	ContentFormat,
	CreateVoiceFingerprintParams,
	DocumentType,
	ExtractChapterFactsParams,
	FinalizeChapterParams,
	Genre,
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
	SaveContinuityReportParams,
	SaveChaseWifeBeatSheetParams,
	SaveQualityReportParams,
	SaveSceneContractParams,
	SaveStoryDocumentParams,
	SaveWorkflowCheckpointParams,
	UpdateCharacterStateParams,
	UpdateClueLedgerParams,
	UpdateTimelineParams,
	ExportManuscriptParams,
} from "../schemas.ts";

const PROJECT_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DOCUMENT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const DEFAULT_CONTEXT_CHARS = 50_000;
const CHASE_WIFE_PHASES = [
	"opening-injury",
	"escalation",
	"paywall-hook",
	"exit",
	"self-rebuild",
	"male-pursuit",
	"exposure",
	"public-consequence",
	"closure",
] as const;
const CHASE_WIFE_PHASE_ORDER = new Map<string, number>(CHASE_WIFE_PHASES.map((phase, index) => [phase, index]));

type JsonRecord = Record<string, unknown>;

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

function countWords(content: string): number {
	return content.trim() === "" ? 0 : content.trim().split(/\s+/u).length;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isChaseWifeBeat(value: unknown): value is ChaseWifeBeat {
	if (!isJsonRecord(value)) return false;
	const beatNumber = value.beat;
	if (typeof beatNumber !== "number" || !Number.isInteger(beatNumber) || beatNumber < 1 || beatNumber > 24) return false;
	if (typeof value.phase !== "string" || !CHASE_WIFE_PHASE_ORDER.has(value.phase)) return false;
	const sceneCount = value.sceneCount;
	if (typeof sceneCount !== "number" || !Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > 5) return false;
	if (!isNonEmptyString(value.goal) || !isNonEmptyString(value.conflict) || !isNonEmptyString(value.actionOrConsequence)) return false;
	if (!isNonEmptyString(value.emotionBefore) || !isNonEmptyString(value.emotionAfter) || !isNonEmptyString(value.painPoint)) return false;
	if (!isNonEmptyString(value.rewardPoint) || !isNonEmptyString(value.hook)) return false;
	return Array.isArray(value.emotionStack) && value.emotionStack.length > 0 && value.emotionStack.every(isNonEmptyString);
}

function normalizeGenre(genre: Genre): string {
	const aliases: Record<string, string> = {
		都市悬疑: "suspense",
		都市情感: "urban-romance",
		轻幻想: "light-fantasy",
		追妻文: "chase-wife",
	};
	return aliases[genre] ?? genre;
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
		const genre = normalizeGenre(params.genre);
		const project = {
			version: 1,
			projectId: params.projectId,
			title: params.title,
			genre,
			targetWordCount: params.targetWordCount ?? 30_000,
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
			if (params.includeCurrentDraft !== false) {
				const drafts = await this.listFiles(this.projectFile(params.projectId, "work/drafts"), signal);
				const currentDraft = drafts.filter((path) => new RegExp(`${current}-r\\d+\\.md$`).test(path)).at(-1);
				if (currentDraft) await addFile(this.relativeProjectPath(params.projectId, currentDraft), "chapter-draft");
			}
			if (params.includePreviousChapterEnding && params.chapter > 1) await addFile(`chapters/${chapterName(params.chapter - 1)}.md`, "previous-chapter");
		}
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
		const path = this.documentPath(params.projectId, params.documentType, params.name, params.format);
		const content = params.format === "json" ? normalizeJson(params.content, path) : normalizeText(params.content);
		await this.writeAtomically(path, content, signal);
		return { projectId: params.projectId, documentType: params.documentType, path: this.relativeProjectPath(params.projectId, path), bytes: Buffer.byteLength(content, "utf8") };
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
		const status = issues.some((issue) => issue.severity === "error") ? "error" : issues.length > 0 ? "warning" : "ok";
		const report: ContinuityReport = { projectId: params.projectId, chapter: params.chapter, draftRevision, generatedAt: new Date().toISOString(), status, issues, checkedFiles };
		const reportName = params.chapter === undefined ? "project-integrity" : `${chapterName(params.chapter)}-integrity`;
		await this.writeAtomically(this.projectFile(params.projectId, `continuity/reports/${reportName}.json`), `${JSON.stringify(report, null, 2)}\n`, signal);
		return report;
	}

	async saveContinuityReport(params: SaveContinuityReportParams, signal?: AbortSignal): Promise<ContinuityReport> {
		await this.ensureProject(params.projectId, signal);
		const report: ContinuityReport = { projectId: params.projectId, chapter: params.chapter, draftRevision: params.draftRevision, generatedAt: new Date().toISOString(), status: params.status, issues: params.issues.map((issue) => ({ severity: issue.severity === "suggestion" ? "warning" : issue.severity, code: issue.category, message: issue.problem, path: issue.evidence[0]?.file })), checkedFiles: [] };
		await this.writeAtomically(this.projectFile(params.projectId, `continuity/reports/${chapterName(params.chapter)}-semantic.json`), `${JSON.stringify({ ...report, detailedIssues: params.issues }, null, 2)}\n`, signal);
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
		const scope = params.chapter === undefined ? "manuscript" : chapterName(params.chapter);
		const relativePath = `evaluations/${kind}/${scope}.md`;
		const header = [`# ${kind} report`, `projectId: ${params.projectId}`, params.chapter === undefined ? undefined : `chapter: ${params.chapter}`, params.draftRevision === undefined ? undefined : `draftRevision: ${params.draftRevision}`, ""].filter((line): line is string => line !== undefined).join("\n");
		const path = this.projectFile(params.projectId, relativePath);
		await this.writeAtomically(path, normalizeText(`${header}\n${params.content}`), signal);
		return { projectId: params.projectId, kind, path: relativePath, draftRevision: params.draftRevision };
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
		const leftSet = new Set(left.split(/\s+/u).filter(Boolean));
		const rightSet = new Set(right.split(/\s+/u).filter(Boolean));
		const intersection = [...leftSet].filter((word) => rightSet.has(word)).length;
		const union = new Set([...leftSet, ...rightSet]).size;
		const relativePath = `evaluations/chapter/${chapterName(params.chapter)}-diff-r${params.leftRevision}-r${params.rightRevision}.json`;
		const result = { projectId: params.projectId, chapter: params.chapter, leftRevision: params.leftRevision, rightRevision: params.rightRevision, leftWords, rightWords, changedCharacters: [...left].filter((character, index) => character !== [...right][index]).length, similarity: union === 0 ? 1 : Number((intersection / union).toFixed(4)), generatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(result, null, 2)}\n`, signal);
		return { ...result, path: relativePath };
	}

	async exportManuscript(params: ExportManuscriptParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; chapters: number; words: number }> {
		await this.ensureProject(params.projectId, signal);
		const paths = await this.listFiles(this.projectFile(params.projectId, "chapters"), signal);
		const sections: string[] = [];
		let words = 0;
		for (const path of paths.filter((candidate) => candidate.endsWith(".md"))) {
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
		return { projectId: params.projectId, path: relativePath, chapters: paths.length, words };
	}

	async checkAiArtifacts(params: CheckAiArtifactsParams, signal?: AbortSignal): Promise<{ projectId: string; chapter: number; draftRevision: number; status: "ok" | "warning"; findings: string[]; path: string }> {
		await this.ensureProject(params.projectId, signal);
		const draft = params.draftRevision === undefined ? await this.latestDraft(params.projectId, params.chapter, signal) : { revision: params.draftRevision, content: await this.readTextIfExists(this.draftPath(params.projectId, params.chapter, params.draftRevision), signal) };
		if (!draft || draft.content === undefined) throw new Error("The requested chapter draft does not exist.");
		const findings: string[] = [];
		const sentences = draft.content.split(/[。！？!?]+/u).map((sentence) => sentence.trim()).filter(Boolean);
		const starts = new Map<string, number>();
		for (const sentence of sentences) {
			const start = [...sentence].slice(0, 4).join("");
			starts.set(start, (starts.get(start) ?? 0) + 1);
		}
		if ([...starts.values()].some((count) => count >= 3)) findings.push("重复句式开头");
		for (const pattern of ["仿佛", "似乎", "不禁", "总之", "这意味着"]) {
			if ((draft.content.match(new RegExp(pattern, "gu")) ?? []).length >= 3) findings.push(`高频模板表达：${pattern}`);
		}
		if ((draft.content.match(/——/gu) ?? []).length >= 4) findings.push("破折号使用频率较高");
		const result = { projectId: params.projectId, chapter: params.chapter, draftRevision: draft.revision, status: findings.length === 0 ? "ok" as const : "warning" as const, findings, generatedAt: new Date().toISOString() };
		const relativePath = `evaluations/chapter/${chapterName(params.chapter)}-ai-artifacts-r${String(draft.revision).padStart(2, "0")}.json`;
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(result, null, 2)}\n`, signal);
		return { ...result, path: relativePath };
	}

	private async ensureChaseWifeProject(projectId: string, signal?: AbortSignal): Promise<void> {
		await this.ensureProject(projectId, signal);
		const project = await this.readJsonIfExists(this.projectFile(projectId, "project.json"), signal);
		if (!isJsonRecord(project) || project.genre !== "chase-wife") throw new Error("This tool is only available for the chase-wife genre branch.");
	}

	async saveChaseWifeBeatSheet(params: SaveChaseWifeBeatSheetParams, signal?: AbortSignal): Promise<{ projectId: string; path: string; beats: number }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const beats = [...params.beats].sort((left, right) => left.beat - right.beat);
		if (beats.length < 12 || beats.length > 24) throw new Error("Chase-wife beat sheets must contain 12-24 beats.");
		const beatNumbers = beats.map((beat) => beat.beat);
		if (new Set(beatNumbers).size !== beatNumbers.length) throw new Error("Chase-wife beat numbers must be unique.");
		if (beatNumbers.some((beatNumber, index) => beatNumber !== index + 1)) throw new Error("Chase-wife beat numbers must be contiguous starting at 1.");
		if (beats.some((beat) => beat.phase === "paywall-hook" && beat.beat > Math.ceil(beats.length / 2))) throw new Error("The chase-wife paywall hook must appear in the opening half.");
		const relativePath = "outline/genre/chase-wife-beat-sheet.json";
		const document = { version: 1, genre: "chase-wife", projectId: params.projectId, beats, updatedAt: new Date().toISOString() };
		await this.writeAtomically(this.projectFile(params.projectId, relativePath), `${JSON.stringify(document, null, 2)}\n`, signal);
		return { projectId: params.projectId, path: relativePath, beats: beats.length };
	}

	async checkChaseWifeArc(params: CheckChaseWifeArcParams, signal?: AbortSignal): Promise<{ projectId: string; status: "ok" | "warning" | "error"; issues: string[]; checkedBeats: number; path: string }> {
		await this.ensureChaseWifeProject(params.projectId, signal);
		const relativePath = "outline/genre/chase-wife-beat-sheet.json";
		const value = await this.readJsonIfExists(this.projectFile(params.projectId, relativePath), signal);
		const issues: string[] = [];
		let hasStructuralError = false;
		let checkedBeats = 0;
		if (!isJsonRecord(value) || !Array.isArray(value.beats)) {
			issues.push("missing or invalid chase-wife beat sheet");
			hasStructuralError = true;
		} else {
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
			const phases = new Set<string>(orderedBeats.map((beat) => beat.phase));
			for (const phase of CHASE_WIFE_PHASES) if (!phases.has(phase)) {
				issues.push(`missing required phase: ${phase}`);
				hasStructuralError = true;
			}
			let previousPhaseIndex = -1;
			for (const beat of orderedBeats) {
				const phaseIndex = CHASE_WIFE_PHASE_ORDER.get(beat.phase) ?? -1;
				if (phaseIndex < previousPhaseIndex) {
					issues.push("chase-wife phases must follow the defined emotional arc order");
					hasStructuralError = true;
					break;
				}
				previousPhaseIndex = phaseIndex;
			}
			if (orderedBeats.some((beat) => beat.phase === "paywall-hook" && beat.beat > Math.ceil(orderedBeats.length / 2))) {
				issues.push("the paywall hook must appear in the opening half");
				hasStructuralError = true;
			}
			const earlyPain = orderedBeats.filter((beat) => beat.beat <= Math.ceil(orderedBeats.length / 2) && beat.painPoint.trim().length > 0).length;
			const lateReward = orderedBeats.filter((beat) => beat.beat > Math.ceil(orderedBeats.length / 2) && beat.rewardPoint.trim().length > 0).length;
			if (earlyPain === 0) issues.push("opening half has no explicit pain-point accumulation");
			if (lateReward === 0) issues.push("ending half has no explicit reward or consequence release");
		}
		const status = (hasStructuralError ? "error" : issues.length > 0 ? "warning" : "ok") as "ok" | "warning" | "error";
		const report = { projectId: params.projectId, genre: "chase-wife", generatedAt: new Date().toISOString(), status, issues, checkedBeats };
		const reportPath = "continuity/reports/chase-wife-arc.json";
		await this.writeAtomically(this.projectFile(params.projectId, reportPath), `${JSON.stringify(report, null, 2)}\n`, signal);
		return { ...report, path: reportPath };
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
				for (const item of validTargets) await rename(this.projectFile(projectId, item.temporary as string), this.projectFile(projectId, item.target as string));
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
				if (report.draftRevision !== params.draftRevision) throw new Error(`The ${label} report does not match draft revision ${params.draftRevision}.`);
			}
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
