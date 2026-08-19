import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";
import { RevisionImpactSchema } from "./patch.ts";

export const CommitActorSchema = Type.Union([Type.Literal("user"), Type.Literal("agent"), Type.Literal("system")]);
export type CommitActor = Static<typeof CommitActorSchema>;

export const CommitRecordSchema = Type.Object(
	{
		commitId: Type.String({ minLength: 1 }),
		projectId: Type.String({ minLength: 1 }),
		changeSetId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		actor: CommitActorSchema,
		summary: Type.String({ minLength: 1 }),
		affectedFiles: Type.Array(Type.String({ minLength: 1 })),
		beforeHashes: Type.Record(Type.String(), Type.String()),
		afterHashes: Type.Record(Type.String(), Type.String()),
		resolvedIssueCount: Type.Integer({ minimum: 0 }),
		createdAt: ISODateStringSchema,
		patch: Type.Optional(
			Type.Object(
				{
					chapter: Type.Integer({ minimum: 1 }),
					goal: Type.String({ minLength: 1 }),
					original: Type.String(),
					replacement: Type.String(),
					agentId: Type.String({ minLength: 1 }),
					runtimeModelId: Type.String({ minLength: 1 }),
					impact: RevisionImpactSchema,
				},
				{ additionalProperties: false },
			),
		),
	},
	{ additionalProperties: false },
);
export type CommitRecord = Static<typeof CommitRecordSchema>;

export const HistoryEntrySchema = Type.Object(
	{
		commitId: Type.String({ minLength: 1 }),
		projectId: Type.String({ minLength: 1 }),
		changeSetId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		actor: CommitActorSchema,
		summary: Type.String({ minLength: 1 }),
		affectedFiles: Type.Array(Type.String({ minLength: 1 })),
		resolvedIssueCount: Type.Integer({ minimum: 0 }),
		createdAt: ISODateStringSchema,
		patch: Type.Optional(
			Type.Object(
				{
					chapter: Type.Integer({ minimum: 1 }),
					goal: Type.String({ minLength: 1 }),
					original: Type.String(),
					replacement: Type.String(),
					agentId: Type.String({ minLength: 1 }),
					runtimeModelId: Type.String({ minLength: 1 }),
					impact: RevisionImpactSchema,
				},
				{ additionalProperties: false },
			),
		),
	},
	{ additionalProperties: false },
);
export type HistoryEntry = Static<typeof HistoryEntrySchema>;

export const HistoryListResponseSchema = Type.Object(
	{ entries: Type.Array(HistoryEntrySchema) },
	{ additionalProperties: false },
);
export const CommitResponseSchema = Type.Object({ commit: CommitRecordSchema }, { additionalProperties: false });

export const ProjectCheckpointSchema = Type.Object(
	{
		checkpointId: Type.String({ minLength: 1 }),
		projectId: Type.String({ minLength: 1 }),
		label: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		manifestHashes: Type.Record(Type.String(), Type.String()),
		createdAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type ProjectCheckpoint = Static<typeof ProjectCheckpointSchema>;
