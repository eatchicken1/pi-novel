import type { ISODateString } from "./common.ts";

export const WORKSPACE_SCHEMA_VERSION = 1;

export interface WorkspaceManifest {
	schemaVersion: number;
	workspaceId: string;
	rootPath: string;
	createdAt: ISODateString;
	updatedAt: ISODateString;
}

export interface WorkspaceSummary {
	projectCount: number;
	nativeProjectCount: number;
	legacyProjectCount: number;
	wordCount: number;
	lastScanAt: ISODateString | null;
}

export interface WorkspaceOverview {
	manifest: WorkspaceManifest;
	projects: import("./project.ts").ProjectRecord[];
	summary: WorkspaceSummary;
}

export interface InitializeWorkspaceInput {
	path: string;
}
