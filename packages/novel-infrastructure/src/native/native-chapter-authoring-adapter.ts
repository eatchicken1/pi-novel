import { createHash, randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, open, rename, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
	ChapterAuthoringPort,
	ChapterDocumentView,
	ProjectDatabaseRegistryPort,
} from "@earendil-works/pi-novel-application";
import type {
	ChapterDraft,
	ChapterSettlement,
	CreateChapterInput,
	FinalizeChapterInput,
	ReconcileInput,
	ReconcileReport,
	SaveDraftInput,
} from "@earendil-works/pi-novel-contracts";

function hash(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function fileName(chapter: number): string {
	return `chapter-${String(chapter).padStart(3, "0")}.md`;
}

function projectRoot(root: string, projectId: string): string {
	return existsSync(join(root, "novel.yaml")) ? root : join(root, projectId);
}

function chapterPath(root: string, projectId: string, chapter: number): string {
	return join(projectRoot(root, projectId), "manuscript", fileName(chapter));
}

function titleFrom(content: string): string | null {
	return content.match(/^#\s+(.+)$/mu)?.[1]?.trim() ?? null;
}

export class NativeChapterAuthoringAdapter implements ChapterAuthoringPort {
	private readonly registry: ProjectDatabaseRegistryPort;

	constructor(registry: ProjectDatabaseRegistryPort) {
		this.registry = registry;
	}

	private storedRevision(workspaceRoot: string, projectId: string, chapter: number): number {
		return (
			this.registry.open(projectId, projectRoot(workspaceRoot, projectId)).chapterMetadata.get(projectId, chapter)
				?.draftRevision ?? 0
		);
	}

	async createChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		input: CreateChapterInput,
	): Promise<ChapterDocumentView> {
		if (kind !== "native") throw new Error("AUTHORING_UNSUPPORTED");
		const directory = join(projectRoot(workspaceRoot, projectId), "manuscript");
		await mkdir(directory, { recursive: true });
		const chapter =
			readdirSync(directory)
				.filter((entry) => /^chapter-\d{3}\.md$/u.test(entry))
				.reduce((max, entry) => Math.max(max, Number(entry.slice(8, 11))), 0) + 1;
		const content = input.content ?? `# ${input.title.trim()}\n\n`;
		const path = join(directory, fileName(chapter));
		if (existsSync(path)) throw new Error("CHAPTER_ALREADY_EXISTS");
		await writeAtomically(path, content);
		return this.document(workspaceRoot, projectId, chapter, input.title.trim());
	}

	async saveDraft(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: SaveDraftInput,
	): Promise<ChapterDraft> {
		if (kind !== "native") throw new Error("AUTHORING_UNSUPPORTED");
		const path = chapterPath(workspaceRoot, projectId, chapter);
		const current = existsSync(path) ? readFileSync(path, "utf8") : null;
		if (current !== null && input.baseContentHash === undefined) throw new Error("CHAPTER_BASE_HASH_REQUIRED");
		if (input.baseContentHash !== undefined && (current === null || hash(current) !== input.baseContentHash))
			throw new Error("CHAPTER_EXTERNAL_MODIFICATION");
		const previousRevision = this.storedRevision(workspaceRoot, projectId, chapter);
		if (input.revision !== undefined && input.revision <= previousRevision) throw new Error("CHAPTER_REVISION_STALE");
		const revision = Math.max(previousRevision + 1, input.revision ?? previousRevision + 1);
		await mkdir(join(projectRoot(workspaceRoot, projectId), "manuscript"), { recursive: true });
		await writeAtomically(path, input.content);
		const metadata = await stat(path);
		return {
			projectId,
			chapter,
			draftRevision: revision,
			contentHash: hash(input.content),
			content: input.content,
			updatedAt: metadata.mtime.toISOString(),
		};
	}

	async readDraft(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
	): Promise<ChapterDraft | null> {
		if (kind !== "native") throw new Error("AUTHORING_UNSUPPORTED");
		const path = chapterPath(workspaceRoot, projectId, chapter);
		if (!existsSync(path)) return null;
		const content = readFileSync(path, "utf8");
		const metadata = await stat(path);
		return {
			projectId,
			chapter,
			draftRevision: this.storedRevision(workspaceRoot, projectId, chapter) || 1,
			contentHash: hash(content),
			content,
			updatedAt: metadata.mtime.toISOString(),
		};
	}

	async reconcileChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: ReconcileInput,
	): Promise<ReconcileReport> {
		const draft = await this.readDraft(workspaceRoot, projectId, kind, chapter);
		if (draft === null) throw new Error("CHAPTER_NOT_FOUND");
		if (draft.draftRevision !== input.draftRevision || draft.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		const divergences: ReconcileReport["divergences"] = [];
		for (const match of draft.content.matchAll(/(创作发现|正文发现|事实改变|计划偏离)\s*[:：]\s*(.+)/gu)) {
			const description = match[2]?.trim();
			if (description === undefined || description.length === 0) continue;
			const marker = match[1];
			divergences.push({
				divergenceId: `native-${divergences.length + 1}`,
				kind:
					marker === "事实改变"
						? "fact-change"
						: marker === "计划偏离"
							? "planned-event-missing"
							: "prose-discovery",
				plannedRef: null,
				description,
				evidence: match[0],
				severity: marker === "事实改变" ? "warning" : "info",
			});
		}
		const now = new Date().toISOString();
		return {
			projectId,
			chapter,
			draftRevision: draft.draftRevision,
			contentHash: draft.contentHash,
			status: divergences.length === 0 ? "aligned" : "divergent",
			divergences,
			authorDecision: null,
			changeSetId: null,
			createdAt: now,
			updatedAt: now,
		};
	}

	async finalizeChapter(
		workspaceRoot: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: FinalizeChapterInput,
		_settlement: ChapterSettlement,
	): Promise<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }> {
		if (kind !== "native") throw new Error("AUTHORING_UNSUPPORTED");
		const draft = await this.readDraft(workspaceRoot, projectId, kind, chapter);
		if (draft === null) throw new Error("CHAPTER_NOT_FOUND");
		if (
			draft.draftRevision !== input.draftRevision ||
			draft.contentHash !== input.contentHash ||
			hash(input.content) !== input.contentHash
		)
			throw new Error("DRAFT_STALE");
		if (readFileSync(chapterPath(workspaceRoot, projectId, chapter), "utf8") !== input.content)
			throw new Error("CHAPTER_EXTERNAL_MODIFICATION");
		return { projectId, chapter, memoryCommitted: false, transactionId: randomUUID() };
	}

	private async document(
		workspaceRoot: string,
		projectId: string,
		chapter: number,
		title: string,
	): Promise<ChapterDocumentView> {
		const path = chapterPath(workspaceRoot, projectId, chapter);
		const text = readFileSync(path, "utf8");
		const metadata = await stat(path);
		return {
			projectId,
			chapter,
			title: title || titleFrom(text),
			text,
			contentHash: hash(text),
			revision: 1,
			updatedAt: metadata.mtime.toISOString(),
		};
	}
}

async function syncDirectory(directory: string): Promise<void> {
	try {
		const directoryHandle = await open(directory, "r");
		try {
			await directoryHandle.sync();
		} finally {
			await directoryHandle.close();
		}
	} catch {
		// Windows may not allow opening a directory as a file. The file itself is already synced.
	}
}

async function writeAtomically(path: string, content: string): Promise<void> {
	const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
	try {
		await writeFile(temporary, content, "utf8");
		const temporaryHandle = await open(temporary, "r+");
		try {
			await temporaryHandle.sync();
		} finally {
			await temporaryHandle.close();
		}
		await rename(temporary, path);
		await syncDirectory(dirname(path));
	} catch (error) {
		await unlink(temporary).catch(() => undefined);
		throw error;
	}
}

export class ChapterAuthoringRouter implements ChapterAuthoringPort {
	private readonly native: ChapterAuthoringPort;
	private readonly legacy: ChapterAuthoringPort;

	constructor(native: ChapterAuthoringPort, legacy: ChapterAuthoringPort) {
		this.native = native;
		this.legacy = legacy;
	}

	private adapter(kind: "native" | "legacy"): ChapterAuthoringPort {
		return kind === "native" ? this.native : this.legacy;
	}

	createChapter(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		input: CreateChapterInput,
	): Promise<ChapterDocumentView> {
		return this.adapter(kind).createChapter(root, projectId, kind, input);
	}

	saveDraft(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: SaveDraftInput,
	): Promise<ChapterDraft> {
		return this.adapter(kind).saveDraft(root, projectId, kind, chapter, input);
	}

	readDraft(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
	): Promise<ChapterDraft | null> {
		return this.adapter(kind).readDraft(root, projectId, kind, chapter);
	}

	reconcileChapter(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: ReconcileInput,
	): Promise<ReconcileReport> {
		return this.adapter(kind).reconcileChapter(root, projectId, kind, chapter, input);
	}

	finalizeChapter(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: FinalizeChapterInput,
		settlement: ChapterSettlement,
	): Promise<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }> {
		return this.adapter(kind).finalizeChapter(root, projectId, kind, chapter, input, settlement);
	}
}
