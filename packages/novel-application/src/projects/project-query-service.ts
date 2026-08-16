import type { ProjectRecord } from "@earendil-works/pi-novel-contracts";
import type { WorkspaceService } from "../workspace/workspace-service.ts";

export class ProjectQueryService {
	private readonly workspaceService: WorkspaceService;

	constructor(workspaceService: WorkspaceService) {
		this.workspaceService = workspaceService;
	}

	async list(): Promise<ProjectRecord[]> {
		return (await this.workspaceService.getOverview())?.projects ?? [];
	}

	async get(projectId: string): Promise<ProjectRecord | null> {
		return (await this.list()).find((project) => project.projectId === projectId) ?? null;
	}
}
