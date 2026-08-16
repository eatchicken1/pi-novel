import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const ForgeSessionStatusSchema = Type.Union([
	Type.Literal("draft"),
	Type.Literal("committed"),
	Type.Literal("archived"),
]);
export type ForgeSessionStatus = Static<typeof ForgeSessionStatusSchema>;

export const ForgeSessionSchema = Type.Object(
	{
		forgeSessionId: Type.String({ minLength: 1 }),
		workspaceId: Type.String({ minLength: 1 }),
		status: ForgeSessionStatusSchema,
		seed: Type.String(),
		genre: Type.Union([Type.Null(), Type.String()]),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ForgeSession = Static<typeof ForgeSessionSchema>;
