import type { CommitRecord, HistoryEntry } from "@earendil-works/pi-novel-contracts";
import type { ProjectDatabaseRegistryPort } from "../ports.ts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

export class HistoryService {
	private readonly workspace: WorkspaceService;
	private readonly registry: ProjectDatabaseRegistryPort;

	constructor(workspace: WorkspaceService, registry: ProjectDatabaseRegistryPort) {
		this.workspace = workspace;
		this.registry = registry;
	}

	private async handle(projectId: string) {
		const overview = await this.workspace.getOverview();
		const project = overview?.projects.find((candidate) => candidate.projectId === projectId);
		if (project === undefined) throw new Error("PROJECT_NOT_FOUND");
		return this.registry.open(projectId, project.rootPath).commits;
	}

	async list(projectId: string, limit = 100): Promise<HistoryEntry[]> {
		const repository = await this.handle(projectId);
		return repository.list(projectId, limit).map((record) => ({
			commitId: record.commitId,
			projectId: record.projectId,
			changeSetId: record.changeSetId,
			actor: record.actor,
			summary: record.summary,
			affectedFiles: record.affectedFiles,
			resolvedIssueCount: record.resolvedIssueCount,
			createdAt: record.createdAt,
			...(record.patch === undefined ? {} : { patch: record.patch }),
		}));
	}

	async get(projectId: string, commitId: string): Promise<CommitRecord> {
		const repository = await this.handle(projectId);
		const record = repository.get(commitId);
		if (record === null || record.projectId !== projectId) throw new Error("COMMIT_NOT_FOUND");
		return record;
	}
}
