import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";
import {
	ChangeOperationSchema,
	ChangeSetImpactSchema,
	ChangeSetReviewSchema,
	type ManuscriptPatch,
	ManuscriptPatchSchema,
} from "./patch.ts";

export const ChangeSetStatusSchema = Type.Union([
	Type.Literal("proposed"),
	Type.Literal("reviewing"),
	Type.Literal("accepted"),
	Type.Literal("rejected"),
	Type.Literal("committing"),
	Type.Literal("committed"),
	Type.Literal("conflict"),
	Type.Literal("failed"),
]);
export type ChangeSetStatus = Static<typeof ChangeSetStatusSchema>;

export const ChangeSetKindSchema = Type.Union([
	Type.Literal("content"),
	Type.Literal("structure"),
	Type.Literal("metadata"),
	Type.Literal("MANUSCRIPT_PATCH"),
	Type.Literal("RECONCILE_DISCOVERY"),
]);
export type ChangeSetKind = Static<typeof ChangeSetKindSchema>;

export const ChangeSetSourceSchema = Type.Union([Type.Literal("user"), Type.Literal("agent"), Type.Literal("system")]);
export type ChangeSetSource = Static<typeof ChangeSetSourceSchema>;

export const ChangeSetSchema = Type.Object(
	{
		changeSetId: Type.String({ minLength: 1 }),
		projectId: Type.String({ minLength: 1 }),
		title: Type.String({ minLength: 1 }),
		status: ChangeSetStatusSchema,
		kind: ChangeSetKindSchema,
		source: ChangeSetSourceSchema,
		intent: Type.String({ minLength: 1 }),
		baseRevision: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		operations: Type.Array(ChangeOperationSchema),
		impact: Type.Optional(ChangeSetImpactSchema),
		review: Type.Optional(ChangeSetReviewSchema),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
		committedAt: Type.Optional(ISODateStringSchema),
		patch: Type.Optional(ManuscriptPatchSchema),
		selectedCandidateId: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type ChangeSet = Static<typeof ChangeSetSchema>;

export const CreateChangeSetInputSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		title: Type.String({ minLength: 1 }),
		kind: ChangeSetKindSchema,
		source: ChangeSetSourceSchema,
		intent: Type.String({ minLength: 1 }),
		baseRevision: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		operations: Type.Array(ChangeOperationSchema, { minItems: 1 }),
		patch: Type.Optional(ManuscriptPatchSchema),
	},
	{ additionalProperties: false },
);
export type CreateChangeSetInput = Static<typeof CreateChangeSetInputSchema>;
export type ChangeSetPatch = ManuscriptPatch;

export const ChangeSetListResponseSchema = Type.Object(
	{ changeSets: Type.Array(ChangeSetSchema) },
	{ additionalProperties: false },
);
export const ChangeSetResponseSchema = Type.Object({ changeSet: ChangeSetSchema }, { additionalProperties: false });
