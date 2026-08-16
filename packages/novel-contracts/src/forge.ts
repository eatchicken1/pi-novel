import type { ISODateString } from "./common.ts";

export type ForgeSessionStatus = "draft" | "committed" | "archived";

export interface ForgeSession {
	forgeSessionId: string;
	workspaceId: string;
	status: ForgeSessionStatus;
	seed: string;
	genre: string | null;
	createdAt: ISODateString;
	updatedAt: ISODateString;
}
