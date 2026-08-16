import type {
	ChapterDocument,
	ChapterSummary,
	ProjectDetail,
	ProjectReadModel,
	ProjectStatusSnapshot,
} from "@earendil-works/pi-novel-contracts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";
import type { NovelEnginePort } from "../ports.ts";

// Project read models：Library/Studio 不直接读 engine JSON；
// 这里从 workspace registry + NovelEnginePort 组装（只读意图）。
export class ProjectReadService {
	private readonly workspace: WorkspaceService;
	private readonly engine: NovelEnginePort;

	constructor(workspace: WorkspaceService, engine: NovelEnginePort) {
		this.workspace = workspace;
		this.engine = engine;
	}

	private async project(projectId: string) {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined || overview === null) throw new Error("PROJECT_NOT_FOUND");
		return { project, workspaceRoot: overview.manifest.rootPath };
	}

	async listReadModels(): Promise<ProjectReadModel[]> {
		const overview = await this.workspace.getOverview();
		if (overview === null) return [];
		const models: ProjectReadModel[] = [];
		for (const project of overview.projects) {
			const detail = await this.detail(project.projectId).catch(() => null);
			models.push({
				projectId: project.projectId,
				title: project.title,
				path: project.rootPath,
				kind: project.kind,
				status: project.status,
				currentChapter: detail?.currentChapter ?? null,
				chapterCount: detail?.chapterCount ?? 0,
				wordCount: project.wordCount,
				primaryGenre: detail?.primaryGenre ?? null,
				relationshipMechanisms: detail?.relationshipMechanisms ?? [],
				pendingChangeCount: 0,
				blockingIssueCount: 0,
				currentMovement: detail?.currentMovement ?? null,
				memoryStatus: detail?.memoryStatus ?? null,
				updatedAt: project.lastModifiedAt,
			});
		}
		return models;
	}

	async detail(projectId: string): Promise<ProjectDetail> {
		const { project } = await this.project(projectId);
		const engineStatus = await this.engine.getStatus(project.rootPath, projectId).catch(() => null);
		const chapters = await this.engine.listChapters(project.rootPath, projectId, project.kind).catch(() => []);
		return {
			projectId: project.projectId,
			title: project.title,
			path: project.rootPath,
			kind: project.kind,
			status: project.status,
			primaryGenre: null,
			relationshipMechanisms: [],
			wordCount: project.wordCount,
			chapterCount: chapters.length,
			currentChapter: engineStatus?.nextChapter ?? null,
			memoryStatus: engineStatus?.memoryStatus ?? null,
			currentMovement: engineStatus?.currentMovement ?? null,
			updatedAt: project.lastModifiedAt,
		};
	}

	async status(projectId: string): Promise<ProjectStatusSnapshot> {
		const { project } = await this.project(projectId);
		const engineStatus = await this.engine.getStatus(project.rootPath, projectId).catch(() => null);
		return {
			projectId: project.projectId,
			status: project.status,
			nextChapter: engineStatus?.nextChapter ?? null,
			finalizedChapters: engineStatus?.finalizedChapters ?? [],
			memoryStatus: engineStatus?.memoryStatus ?? null,
			continuityStatus: engineStatus?.continuityStatus ?? null,
			openThreads: engineStatus?.openThreads ?? null,
			overdueThreads: engineStatus?.overdueThreads ?? null,
			unresolvedSetups: engineStatus?.unresolvedSetups ?? null,
			downstreamReviewRequired: engineStatus?.downstreamReviewRequired ?? null,
			currentMovement: engineStatus?.currentMovement ?? null,
			updatedAt: project.lastModifiedAt,
		};
	}

	async chapters(projectId: string): Promise<ChapterSummary[]> {
		const { project } = await this.project(projectId);
		const views = await this.engine.listChapters(project.rootPath, projectId, project.kind).catch(() => []);
		return views.map((view) => ({
			chapter: view.chapter,
			title: view.title,
			wordCount: view.wordCount,
			contentHash: view.contentHash,
			revision: view.revision,
			finalized: view.finalized,
			updatedAt: view.updatedAt,
		}));
	}

	async chapter(projectId: string, chapter: number): Promise<ChapterDocument> {
		const { project } = await this.project(projectId);
		const view = await this.engine.readChapter(project.rootPath, projectId, project.kind, chapter).catch(() => null);
		if (view === null) throw new Error("CHAPTER_NOT_FOUND");
		return {
			projectId,
			chapter: view.chapter,
			title: view.title,
			text: view.text,
			contentHash: view.contentHash,
			revision: view.revision,
			updatedAt: view.updatedAt,
		};
	}
}
