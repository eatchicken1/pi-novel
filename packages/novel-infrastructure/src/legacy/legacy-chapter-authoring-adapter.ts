import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ChapterAuthoringPort, ChapterDocumentView } from "@earendil-works/pi-novel-application";
import type {
	ChapterDraft,
	ChapterSettlement,
	CreateChapterInput,
	FinalizeChapterInput,
	ReconcileInput,
	ReconcileReport,
	SaveDraftInput,
} from "@earendil-works/pi-novel-contracts";
import { NovelProjectStore } from "../../../../.pi/extensions/novel-agent/services/project-store.ts";

function sha256(content: string): string {
	return createHash("sha256").update(content, "utf8").digest("hex");
}

function legacyProjectRoot(root: string, projectId: string): string {
	if (existsSync(join(root, "project.json"))) return root;
	if (existsSync(join(root, projectId, "project.json"))) return join(root, projectId);
	return join(root, "novels", projectId);
}

function legacyWorkspaceRoot(root: string): string {
	if (!existsSync(join(root, "project.json"))) return root;
	return dirname(root).endsWith("novels") ? dirname(dirname(root)) : root;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeParse(filePath: string): unknown {
	try {
		return JSON.parse(readFileSync(filePath, "utf8"));
	} catch {
		return null;
	}
}

export class LegacyChapterAuthoringAdapter implements ChapterAuthoringPort {
	private readonly stores = new Map<string, NovelProjectStore>();

	private storeFor(workspaceRoot: string): NovelProjectStore {
		const existing = this.stores.get(workspaceRoot);
		if (existing !== undefined) return existing;
		const store = new NovelProjectStore(workspaceRoot);
		this.stores.set(workspaceRoot, store);
		return store;
	}

	createChapter(
		_root: string,
		_projectId: string,
		kind: "native" | "legacy",
		_input: CreateChapterInput,
	): Promise<ChapterDocumentView> {
		if (kind !== "legacy") return Promise.reject(new Error("AUTHORING_UNSUPPORTED"));
		return Promise.reject(new Error("AUTHORING_UNSUPPORTED"));
	}

	async saveDraft(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: SaveDraftInput,
	): Promise<ChapterDraft> {
		if (kind !== "legacy") throw new Error("AUTHORING_UNSUPPORTED");
		const workspaceRoot = legacyWorkspaceRoot(root);
		if (!existsSync(join(legacyProjectRoot(workspaceRoot, projectId), "project.json")))
			throw new Error("CHAPTER_NOT_FOUND");
		await this.storeFor(workspaceRoot).saveChapterDraft({
			projectId,
			chapter,
			content: input.content,
			revision: input.revision,
		});
		const draft = this.readLegacyDraft(workspaceRoot, projectId, chapter);
		if (draft === null) throw new Error("CHAPTER_NOT_FOUND");
		return draft;
	}

	readDraft(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
	): Promise<ChapterDraft | null> {
		if (kind !== "legacy") return Promise.reject(new Error("AUTHORING_UNSUPPORTED"));
		return Promise.resolve(this.readLegacyDraft(legacyWorkspaceRoot(root), projectId, chapter));
	}

	async reconcileChapter(
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: ReconcileInput,
	): Promise<ReconcileReport> {
		if (kind !== "legacy") throw new Error("AUTHORING_UNSUPPORTED");
		const workspaceRoot = legacyWorkspaceRoot(root);
		const draft = this.readLegacyDraft(workspaceRoot, projectId, chapter);
		if (draft === null) throw new Error("CHAPTER_NOT_FOUND");
		if (draft.draftRevision !== input.draftRevision || draft.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		const projectRoot = legacyProjectRoot(workspaceRoot, projectId);
		const divergences: ReconcileReport["divergences"] = [];
		const realization = safeParse(
			join(projectRoot, "continuity", "reports", `chapter-${String(chapter).padStart(3, "0")}-realization.json`),
		);
		if (isRecord(realization) && Array.isArray(realization.issues)) {
			for (const issue of realization.issues as Array<Record<string, unknown>>) {
				if (typeof issue.message !== "string") continue;
				divergences.push({
					divergenceId: `realization-${divergences.length + 1}`,
					kind: "planned-event-missing",
					plannedRef: typeof issue.code === "string" ? issue.code : null,
					description: issue.message,
					evidence: null,
					severity: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warning" : "info",
				});
			}
		}
		for (const match of draft.content.matchAll(/(?:创作发现|正文发现|事实改变)\s*[:：]\s*(.+)/gu)) {
			const description = match[1]?.trim();
			if (description !== undefined && description.length > 0)
				divergences.push({
					divergenceId: `discovery-${divergences.length + 1}`,
					kind: "prose-discovery",
					plannedRef: null,
					description,
					evidence: match[0],
					severity: "info",
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
		root: string,
		projectId: string,
		kind: "native" | "legacy",
		chapter: number,
		input: FinalizeChapterInput,
		settlement: ChapterSettlement,
	): Promise<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }> {
		if (kind !== "legacy") throw new Error("AUTHORING_UNSUPPORTED");
		const workspaceRoot = legacyWorkspaceRoot(root);
		const draft = this.readLegacyDraft(workspaceRoot, projectId, chapter);
		if (draft === null) throw new Error("CHAPTER_NOT_FOUND");
		if (draft.draftRevision !== input.draftRevision || draft.contentHash !== input.contentHash)
			throw new Error("DRAFT_STALE");
		const normalizedContent = input.content.endsWith("\n") ? input.content : `${input.content}\n`;
		if (sha256(normalizedContent) !== input.contentHash) throw new Error("DRAFT_STALE");
		const result = await this.storeFor(workspaceRoot).finalizeChapter({
			projectId,
			chapter,
			title: input.title,
			content: input.content,
			draftRevision: input.draftRevision,
			confirmation: "USER_CONFIRMED",
			overwrite: input.overwrite,
			summary: settlement.summary,
		});
		return { projectId, chapter, memoryCommitted: result.memoryCommitted, transactionId: result.transactionId };
	}

	private readLegacyDraft(root: string, projectId: string, chapter: number): ChapterDraft | null {
		const projectRoot = legacyProjectRoot(root, projectId);
		if (!existsSync(join(projectRoot, "project.json"))) return null;
		const draftDirectory = join(projectRoot, "work", "drafts");
		let files: string[];
		try {
			files = readdirSync(draftDirectory);
		} catch {
			return null;
		}
		const prefix = `chapter-${String(chapter).padStart(3, "0")}-r`;
		const latest = files
			.map((file) => {
				const match = file.match(new RegExp(`^${prefix}(\\d+)\\.md$`, "u"));
				return match === null ? undefined : { file, revision: Number(match[1]) };
			})
			.filter((value): value is { file: string; revision: number } => value !== undefined)
			.sort((left, right) => left.revision - right.revision)
			.at(-1);
		if (latest === undefined) return null;
		const content = readFileSync(join(draftDirectory, latest.file), "utf8");
		return {
			projectId,
			chapter,
			draftRevision: latest.revision,
			contentHash: sha256(content),
			content,
			updatedAt: new Date(0).toISOString(),
		};
	}
}
