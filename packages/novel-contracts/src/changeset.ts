import type { ISODateString } from "./common.ts";

export type ChangeSetStatus = "proposed" | "confirmed" | "committed" | "rejected";

export interface ChangeSet {
	changeSetId: string;
	projectId: string;
	title: string;
	status: ChangeSetStatus;
	baseRevision: string | null;
	createdAt: ISODateString;
	updatedAt: ISODateString;
}
