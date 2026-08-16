import type { StudioSnapshot } from "@earendil-works/pi-novel-contracts";
import type { NovelEnginePort, ProjectDatabaseRegistryPort, TaskRepositoryPort } from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";
import type { ProjectReadService } from "../projects/project-read-service.ts";
import type { ReviewService } from "../review/review-service.ts";

// Studio snapshot：只含 UI 需要的 read model；不泄漏 engine 内部 JSON。
export class StudioService {
	private readonly workspace: WorkspaceService;
	private readonly reads: ProjectReadService;
	private readonly review: ReviewService;
	private readonly registry: ProjectDatabaseRegistryPort;
	private readonly tasks: TaskRepositoryPort;
	private readonly engine: NovelEnginePort;

	constructor(dependencies: {
		workspace: WorkspaceService;
		reads: ProjectReadService;
		review: ReviewService;
		registry: ProjectDatabaseRegistryPort;
		tasks: TaskRepositoryPort;
		engine: NovelEnginePort;
	}) {
		this.workspace = dependencies.workspace;
		this.reads = dependencies.reads;
		this.review = dependencies.review;
		this.registry = dependencies.registry;
		this.tasks = dependencies.tasks;
		this.engine = dependencies.engine;
	}

	async getSnapshot(projectId: string, activeChapter?: number): Promise<StudioSnapshot> {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined || overview === null) throw new Error("PROJECT_NOT_FOUND");
		const detail = await this.reads.detail(projectId);
		const chapters = await this.reads.chapters(projectId);
		const pendingChangeSets = this.registry.open(projectId, project.rootPath).changesets.listPending(projectId);
		const activeTasks = this.tasks.listTasks({ projectId, status: "running", limit: 10 }).concat(this.tasks.listTasks({ projectId, status: "queued", limit: 10 }));
		const reviewSummary = await this.review.summary(projectId);
		const status = await this.engine.getStatus(overview.manifest.rootPath, projectId).catch(() => null);
		const recommendedNextActions: Array<{ tool: string; reason: string; chapter?: number }> = [];
		if (status?.memoryStatus === "stale") {
			recommendedNextActions.push({ tool: "repair_narrative_memory", reason: "派生内存过期，先重建" });
		} else if (status?.nextChapter !== null && status?.nextChapter !== undefined) {
			recommendedNextActions.push({ tool: "plan_chapter", reason: "规划下一章", chapter: status.nextChapter });
		}
		if (reviewSummary.blockingCount > 0) {
			recommendedNextActions.push({ tool: "review", reason: "存在阻塞性评审问题" });
		}
		return {
			project,
			detail,
			chapters,
			activeChapter: activeChapter ?? null,
			manuscriptRevision: chapters.reduce((max, chapter) => Math.max(max, chapter.revision), 0),
			pendingChangeSets,
			activeTasks: [...new Map(activeTasks.map((task) => [task.taskId, task])).values()],
			reviewSummary,
			workflowStatus: status?.memoryStatus === "stale" ? "needs-repair" : pendingChangeSets.length > 0 ? "review-pending" : "drafting",
			recommendedNextActions,
		};
	}
}
