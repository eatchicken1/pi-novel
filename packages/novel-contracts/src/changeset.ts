import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const ChangeSetStatusSchema = Type.Union([
	Type.Literal("proposed"),
	Type.Literal("confirmed"),
	Type.Literal("committed"),
	Type.Literal("rejected"),
]);
export type ChangeSetStatus = Static<typeof ChangeSetStatusSchema>;

export const ChangeSetKindSchema = Type.Union([
	Type.Literal("content"),
	Type.Literal("structure"),
	Type.Literal("metadata"),
]);
export type ChangeSetKind = Static<typeof ChangeSetKindSchema>;

export const ChangeSetSchema = Type.Object(
	{
		changeSetId: Type.String({ minLength: 1 }),
		projectId: Type.String({ minLength: 1 }),
		title: Type.String({ minLength: 1 }),
		status: ChangeSetStatusSchema,
		kind: ChangeSetKindSchema,
		baseRevision: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ChangeSet = Static<typeof ChangeSetSchema>;
