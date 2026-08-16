import type { ISODateString } from "./common.ts";

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface NovelTask {
	taskId: string;
	projectId: string | null;
	type: string;
	status: TaskStatus;
	createdAt: ISODateString;
	updatedAt: ISODateString;
	errorMessage: string | null;
}
