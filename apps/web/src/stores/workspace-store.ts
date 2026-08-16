import type { ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";

export interface WorkspaceStoreState {
	workspace: WorkspaceOverview | null;
	selectedProject: ProjectRecord | null;
	apiUnavailable: boolean;
}
