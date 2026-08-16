import type { ISODateString } from "./common.ts";

export type ProjectKind = "native" | "legacy";
export type ProjectStatus = "discovered" | "ready" | "needs_migration";

export interface ProjectManifest {
	schemaVersion: number;
	projectId: string;
	title: string;
	language: string;
	createdAt: ISODateString | null;
	updatedAt: ISODateString | null;
}

export interface ProjectRecord {
	projectId: string;
	title: string;
	rootPath: string;
	kind: ProjectKind;
	status: ProjectStatus;
	wordCount: number;
	lastModifiedAt: ISODateString;
	manifest: ProjectManifest | null;
}
