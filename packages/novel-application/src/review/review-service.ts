import type { ReviewIssue, ReviewListResponse, ReviewSummary } from "@earendil-works/pi-novel-contracts";
import type { NovelEnginePort, ProjectDatabaseRegistryPort } from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

function reviewIssueDedupKey(issue: {
	sourceCode: string;
	scope: string;
	chapter: number | null;
	landingChapter: number | null;
	scene: string | null;
}): string {
	const scopeKey =
		issue.scope === "chapter" || issue.scope === "scene" || issue.scope === "future-chapter"
			? `${issue.scope}:${issue.chapter ?? "?"}`
			: issue.scope;
	const landing = issue.landingChapter === null ? "-" : String(issue.landingChapter);
	return `${issue.sourceCode}|${scopeKey}|landing:${landing}|${issue.scene ?? "-"}`;
}

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
		const seenDedupKeys = new Set<string>();
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
			seenDedupKeys.add(reviewIssueDedupKey(issue));
		}
		// 已消失的来源 → resolved（不允许用户假装 resolved，只有重投影能改）
		repository.markResolvedByDedupKeys(projectId, [...seenDedupKeys], now);
		return repository.summary(projectId);
	}

	async list(
		projectId: string,
		filter: { severity?: string; scope?: string; chapter?: number; status?: string } = {},
	): Promise<ReviewListResponse> {
		const repository = await this.handle(projectId);
		await this.refresh(projectId);
		const issues = repository.list(projectId, filter);
		const structural = issues.filter(
			(issue) =>
				issue.scope === "movement" ||
				issue.scope === "story-design" ||
				issue.scope === "manuscript" ||
				["event-graph", "architecture", "foundation", "manuscript"].includes(issue.repairScope),
		);
		const current = issues.filter(
			(issue) => (issue.scope === "scene" || issue.scope === "chapter") && !structural.includes(issue),
		);
		const future = issues.filter(
			(issue) =>
				issue.scope === "future-chapter" ||
				(issue.landingChapter !== null && issue.landingChapter > (filter.chapter ?? 0)),
		);
		const suggestions = issues.filter(
			(issue) =>
				!issue.blockingForCurrentAction &&
				(issue.priority === "P3" || issue.priority === "P4") &&
				!structural.includes(issue),
		);
		const summary = repository.summary(projectId);
		const recommendation =
			summary.canFinalize === true
				? summary.currentCount === 0
					? "ready-to-finalize"
					: "ready-to-settle"
				: "continue-revision";
		return {
			issues,
			summary,
			current,
			future,
			structural,
			suggestions,
			canFinalize: summary.canFinalize,
			recommendation,
		};
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
