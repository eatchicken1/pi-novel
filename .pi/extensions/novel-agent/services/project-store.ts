import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
	ChapterSummary,
	CheckContinuityParams,
	ContentFormat,
	DocumentType,
	FinalizeChapterParams,
	InitializeNovelParams,
	ReadStoryContextParams,
	SaveStoryDocumentParams,
} from "../schemas.ts";

const PROJECT_ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const DOCUMENT_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const MAX_CONTEXT_CHARS = 50_000;

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

export interface StoryContextResult {
	projectId: string;
	chapter?: number;
	files: string[];
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

export interface FinalizedChapterResult {
	projectId: string;
	chapter: number;
	chapterPath: string;
	summaryPath: string;
	timelinePath: string;
	projectPath: string;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted) {
		throw new Error("Novel operation aborted");
	}
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
		case "chapter-draft":
			return "drafts";
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

	private async ensureProject(projectId: string): Promise<string> {
		const projectDir = this.projectDirectory(projectId);
		try {
			await access(this.projectFile(projectId, "project.json"), constants.R_OK);
		} catch (error) {
			if (isFileNotFound(error)) {
				throw new Error(`Novel project "${projectId}" is not initialized.`);
			}
			throw error;
		}
		return projectDir;
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
		this.fileQueues.set(
			path,
			current.then(
				() => undefined,
				() => undefined,
			),
		);
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
		throwIfAborted(signal);
		let entries;
		try {
			entries = await readdir(directory, { withFileTypes: true });
		} catch (error) {
			if (isFileNotFound(error)) return [];
			throw error;
		}
		return entries
			.filter((entry) => entry.isFile() && (entry.name.endsWith(".md") || entry.name.endsWith(".json")))
			.map((entry) => join(directory, entry.name))
			.sort();
	}

	private documentPath(
		projectId: string,
		documentType: DocumentType,
		name: string | undefined,
		format: ContentFormat,
	): string {
		const extension = getDocumentExtension(format);
		if (documentType === "story-bible") return this.projectFile(projectId, `story-bible${extension}`);
		if (documentType === "style-guide") return this.projectFile(projectId, `style-guide${extension}`);
		if (!name) throw new Error(`documentType "${documentType}" requires a name.`);
		assertDocumentName(name);
		const directory = getDocumentDirectory(documentType);
		if (!directory) throw new Error(`Unsupported documentType "${documentType}".`);
		return this.projectFile(projectId, join(directory, `${name}${extension}`));
	}

	async initializeNovel(
		params: InitializeNovelParams,
		signal?: AbortSignal,
	): Promise<NovelProjectInfo> {
		const projectDir = this.projectDirectory(params.projectId);
		const projectPath = this.projectFile(params.projectId, "project.json");
		const existing = await this.readTextIfExists(projectPath, signal);
		if (existing !== undefined && !params.force) {
			throw new Error(`Novel project "${params.projectId}" already exists. Set force=true only to reset templates.`);
		}

		const now = new Date().toISOString();
		const project = {
			version: 1,
			projectId: params.projectId,
			title: params.title,
			genre: params.genre,
			targetWordCount: params.targetWordCount ?? 30_000,
			status: "planning",
			nextChapter: 1,
			createdAt: now,
			updatedAt: now,
		};

		const files: Record<string, string> = {
			"project.json": `${JSON.stringify(project, null, 2)}\n`,
			"style-guide.md": "# 风格指南\n\n## 已确认\n\n- 待用户确认\n",
			"story-bible.md": "# Story Bible\n\n## 故事提案\n\n- 待用户确认\n\n## 完整结局\n\n- 待用户确认\n",
			"outline/overview.md": "# 总纲\n\n- 待规划\n",
			"timeline/events.json": "[]\n",
			"continuity/unresolved-clues.json": "[]\n",
		};

		await mkdir(projectDir, { recursive: true });
		for (const relativePath of Object.keys(files)) {
			const path = this.projectFile(params.projectId, relativePath);
			if (!params.force && (await this.readTextIfExists(path, signal)) !== undefined) continue;
			await this.writeAtomically(path, files[relativePath], signal);
		}

		return {
			projectId: params.projectId,
			path: projectDir,
			title: params.title,
			genre: params.genre,
			createdAt: project.createdAt,
			updatedAt: project.updatedAt,
			files: Object.keys(files),
		};
	}

	async readStoryContext(
		params: ReadStoryContextParams,
		signal?: AbortSignal,
	): Promise<StoryContextResult> {
		await this.ensureProject(params.projectId);
		const sections = params.sections ?? [
			"project",
			"story-bible",
			"style-guide",
			"characters",
			"outline",
			"timeline",
			"summaries",
			"continuity",
		];
		const files: string[] = [];
		const parts: string[] = [];

		const addFile = async (relativePath: string, label: string): Promise<void> => {
			const path = this.projectFile(params.projectId, relativePath);
			const content = await this.readTextIfExists(path, signal);
			if (content === undefined) return;
			files.push(relativePath);
			parts.push(`${label} / ${relativePath}\n${content}`);
		};

		for (const section of sections) {
			if (section === "project") {
				await addFile("project.json", "project");
			} else if (section === "story-bible" || section === "style-guide") {
				await addFile(`${section}.md`, section);
			} else if (section === "summaries") {
				const summaryPaths = await this.listFiles(this.projectFile(params.projectId, "summaries"), signal);
				const selected = summaryPaths
					.filter((path) => path.endsWith(".json"))
					.filter((path) => {
						if (params.chapter === undefined) return true;
						const match = path.match(/chapter-(\d+)\.json$/);
						return match !== null && Number(match[1]) < params.chapter;
					})
					.slice(-2);
				for (const path of selected) {
					const content = await this.readTextIfExists(path, signal);
					if (content === undefined) continue;
					const relativePath = path.slice(this.projectDirectory(params.projectId).length + 1);
					files.push(relativePath);
					parts.push(`summaries / ${relativePath}\n${content}`);
				}
			} else {
				const directory = section === "characters" ? "characters" : section;
				const directoryFiles = await this.listFiles(this.projectFile(params.projectId, directory), signal);
				const selected = directoryFiles.slice(0, 20);
				for (const path of selected) {
					const content = await this.readTextIfExists(path, signal);
					if (content === undefined) continue;
					const relativePath = path.slice(this.projectDirectory(params.projectId).length + 1);
					files.push(relativePath);
					parts.push(`${section} / ${relativePath}\n${content}`);
				}
			}
		}
		if (params.chapter !== undefined) {
			const chapterName = `chapter-${padChapter(params.chapter)}`;
			await addFile(`drafts/${chapterName}-plan.md`, "chapter-plan");
			await addFile(`drafts/${chapterName}-draft.md`, "chapter-draft");
		}

		const fullText = parts.join("\n\n---\n\n");
		const truncated = fullText.length > MAX_CONTEXT_CHARS;
		return {
			projectId: params.projectId,
			chapter: params.chapter,
			files,
			truncated,
			text: truncated ? `${fullText.slice(0, MAX_CONTEXT_CHARS)}\n\n[context truncated]` : fullText,
		};
	}

	async saveStoryDocument(
		params: SaveStoryDocumentParams,
		signal?: AbortSignal,
	): Promise<SavedDocumentResult> {
		await this.ensureProject(params.projectId);
		const path = this.documentPath(params.projectId, params.documentType, params.name, params.format);
		const content = params.format === "json" ? normalizeJson(params.content, path) : normalizeText(params.content);
		await this.writeAtomically(path, content, signal);
		return {
			projectId: params.projectId,
			documentType: params.documentType,
			path: path.slice(this.projectDirectory(params.projectId).length + 1),
			bytes: Buffer.byteLength(content, "utf8"),
		};
	}

	async checkContinuity(
		params: CheckContinuityParams,
		signal?: AbortSignal,
	): Promise<ContinuityReport> {
		const projectDir = await this.ensureProject(params.projectId);
		const issues: ContinuityIssue[] = [];
		const checkedFiles: string[] = ["project.json"];
		const projectPath = this.projectFile(params.projectId, "project.json");
		const project = await this.readJsonIfExists(projectPath, signal);
		if (!isJsonRecord(project)) {
			issues.push({ severity: "error", code: "invalid-project", message: "project.json 不是对象。", path: "project.json" });
		}

		const summaryPaths = await this.listFiles(this.projectFile(params.projectId, "summaries"), signal);
		const chapterNumbers = new Map<number, string>();
		for (const path of summaryPaths.filter((candidate) => candidate.endsWith(".json"))) {
			const relativePath = path.slice(projectDir.length + 1);
			checkedFiles.push(relativePath);
			const summary = await this.readJsonIfExists(path, signal);
			if (!isJsonRecord(summary) || typeof summary.chapter !== "number") {
				issues.push({
					severity: "error",
					code: "invalid-summary",
					message: "章节摘要缺少数字 chapter 字段。",
					path: relativePath,
				});
				continue;
			}
			const previous = chapterNumbers.get(summary.chapter);
			if (previous) {
				issues.push({
					severity: "error",
					code: "duplicate-chapter-summary",
					message: `章节 ${summary.chapter} 存在重复摘要：${previous} 与 ${relativePath}。`,
					path: relativePath,
				});
			} else {
				chapterNumbers.set(summary.chapter, relativePath);
			}
		}

		const cluesPath = this.projectFile(params.projectId, "continuity/unresolved-clues.json");
		const clues = await this.readJsonIfExists(cluesPath, signal);
		checkedFiles.push("continuity/unresolved-clues.json");
		if (clues !== undefined && !Array.isArray(clues)) {
			issues.push({
				severity: "error",
				code: "invalid-unresolved-clues",
				message: "未解决伏笔文件必须是 JSON 数组。",
				path: "continuity/unresolved-clues.json",
			});
		}

		if (params.chapter !== undefined) {
			const draftPath = this.projectFile(params.projectId, `drafts/chapter-${padChapter(params.chapter)}-draft.md`);
			if ((await this.readTextIfExists(draftPath, signal)) === undefined) {
				issues.push({
					severity: "warning",
					code: "missing-chapter-draft",
					message: `未找到章节 ${params.chapter} 的标准草稿文件，检查可能不完整。`,
					path: `drafts/chapter-${padChapter(params.chapter)}-draft.md`,
				});
			} else {
				checkedFiles.push(`drafts/chapter-${padChapter(params.chapter)}-draft.md`);
			}
		}

		const status = issues.some((issue) => issue.severity === "error")
			? "error"
			: issues.length > 0
				? "warning"
				: "ok";
		const report: ContinuityReport = {
			projectId: params.projectId,
			chapter: params.chapter,
			generatedAt: new Date().toISOString(),
			status,
			issues,
			checkedFiles,
		};
		const reportName = params.chapter === undefined ? "project" : `chapter-${padChapter(params.chapter)}`;
		await this.writeAtomically(
			this.projectFile(params.projectId, `continuity/reports/${reportName}.json`),
			`${JSON.stringify(report, null, 2)}\n`,
			signal,
		);
		return report;
	}

	async finalizeChapter(
		params: FinalizeChapterParams,
		signal?: AbortSignal,
	): Promise<FinalizedChapterResult> {
		const projectDir = await this.ensureProject(params.projectId);
		const lockPath = join(projectDir, ".chapter-finalize.lock");
		return this.withFileQueue(lockPath, async () => {
			const chapterName = `chapter-${padChapter(params.chapter)}`;
			const chapterPath = this.projectFile(params.projectId, `chapters/${chapterName}.md`);
			const summaryPath = this.projectFile(params.projectId, `summaries/${chapterName}.json`);
			const timelinePath = this.projectFile(params.projectId, "timeline/events.json");
			const projectPath = this.projectFile(params.projectId, "project.json");
			if (!params.overwrite) {
				if ((await this.readTextIfExists(chapterPath, signal)) !== undefined) {
					throw new Error(`Chapter ${params.chapter} is already finalized.`);
				}
			if ((await this.readTextIfExists(summaryPath, signal)) !== undefined) {
					throw new Error(`Summary for chapter ${params.chapter} already exists.`);
				}
			}

			const existingProject = await this.readJsonIfExists(projectPath, signal);
			const project = isJsonRecord(existingProject) ? existingProject : {};
			const existingTimeline = await this.readJsonIfExists(timelinePath, signal);
			const timeline = Array.isArray(existingTimeline) ? existingTimeline : [];
			const timelineEvents = params.summary.events.map((description, index) => ({
				id: `${chapterName}-event-${index + 1}`,
				chapter: params.chapter,
				description,
			}));
			const summary: ChapterSummary & { chapter: number; title: string; finalizedAt: string } = {
				...params.summary,
				chapter: params.chapter,
				title: params.title,
				finalizedAt: new Date().toISOString(),
			};

			project.nextChapter = Math.max(
				typeof project.nextChapter === "number" ? project.nextChapter : 1,
				params.chapter + 1,
			);
			project.lastFinalizedChapter = params.chapter;
			project.status = "writing";
			project.updatedAt = new Date().toISOString();

			await this.writeAtomically(chapterPath, normalizeText(params.content), signal);
			await this.writeAtomically(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, signal);
			await this.writeAtomically(timelinePath, `${JSON.stringify([...timeline, ...timelineEvents], null, 2)}\n`, signal);
			await this.writeAtomically(projectPath, `${JSON.stringify(project, null, 2)}\n`, signal);

			return {
				projectId: params.projectId,
				chapter: params.chapter,
				chapterPath: chapterPath.slice(projectDir.length + 1),
				summaryPath: summaryPath.slice(projectDir.length + 1),
				timelinePath: timelinePath.slice(projectDir.length + 1),
				projectPath: projectPath.slice(projectDir.length + 1),
			};
		});
	}
}
