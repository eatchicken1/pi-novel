import type {
	ReviewIssue,
	ReviewIssueStatus,
	ReviewListResponse,
	ReviewSummary,
} from "@earendil-works/pi-novel-contracts";
import type { NovelEnginePort, ProjectDatabaseRegistryPort } from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

// Review projection：从持久化检查报告派生，不重跑 checker；
// resolved 只能由 refresh（重新投影）自动更新，用户只能 acknowledge/dismiss。
export class ReviewService {
	private readonly workspace: WorkspaceService;
	private readonly engine: NovelEnginePort;
	private readonly registry: ProjectDatabaseRegistryPort;
	private readonly id: { id(): string };

	constructor(dependencies: {
		workspace: WorkspaceService;
		engine: NovelEnginePort;
		registry: ProjectDatabaseRegistryPort;
		id: { id(): string };
	}) {
		this.workspace = dependencies.workspace;
		this.engine = dependencies.engine;
		this.registry = dependencies.registry;
		this.id = dependencies.id;
	}

	private async handle(projectId: string) {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined) throw new Error("PROJECT_NOT_FOUND");
		return this.registry.open(projectId, project.rootPath).review;
	}

	async refresh(projectId: string): Promise<ReviewSummary> {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined || overview === null) throw new Error("PROJECT_NOT_FOUND");
		const repository = this.registry.open(projectId, project.rootPath).review;
		const sources = await this.engine.reviewSources(overview.manifest.rootPath, projectId).catch(() => []);
		const now = new Date().toISOString();
		const seenSourceCodes = new Set<string>();
		for (const source of sources) {
			const issue: ReviewIssue = {
				issueId: this.id.id(),
				projectId,
				sourceCode: source.sourceCode,
				severity: source.severity,
				priority: source.priority,
				scope: source.scope,
				repairScope: source.repairScope,
				blockingForCurrentAction: source.blockingForCurrentAction,
				chapter: source.chapter,
				scene: source.scene,
				landingChapter: source.landingChapter,
				message: source.message,
				evidence: source.evidence,
				status: "open",
				firstSeenAt: now,
				lastSeenAt: now,
				resolvedAt: null,
			};
			repository.upsert(issue);
			seenSourceCodes.add(source.sourceCode);
		}
		// 已消失的来源 → resolved（不允许用户假装 resolved，只有重投影能改）
		repository.markResolvedBySource(projectId, [...seenSourceCodes], now);
		return repository.summary(projectId);
	}

	async list(projectId: string, filter: { severity?: string; scope?: string; chapter?: number; status?: string } = {}): Promise<ReviewListResponse> {
		const repository = await this.handle(projectId);
		return { issues: repository.list(projectId, filter), summary: repository.summary(projectId) };
	}

	async acknowledge(projectId: string, issueId: string): Promise<ReviewIssue> {
		const repository = await this.handle(projectId);
		repository.updateStatus(issueId, "acknowledged", null);
		const issue = repository.list(projectId).find((candidate) => candidate.issueId === issueId);
		if (issue === undefined) throw new Error("ISSUE_NOT_FOUND");
		return issue;
	}

	async dismiss(projectId: string, issueId: string): Promise<ReviewIssue> {
		const repository = await this.handle(projectId);
		repository.updateStatus(issueId, "dismissed", null);
		const issue = repository.list(projectId).find((candidate) => candidate.issueId === issueId);
		if (issue === undefined) throw new Error("ISSUE_NOT_FOUND");
		return issue;
	}

	async summary(projectId: string): Promise<ReviewSummary> {
		const repository = await this.handle(projectId);
		return repository.summary(projectId);
	}
}
