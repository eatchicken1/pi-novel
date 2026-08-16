import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const ProjectIdSchema = Type.String({ minLength: 1 });
export const NativeProjectIdSchema = Type.String({ minLength: 1, pattern: "^[^\\s/\\\\]+$" });

export const ProjectKindSchema = Type.Union([Type.Literal("native"), Type.Literal("legacy")]);
export type ProjectKind = Static<typeof ProjectKindSchema>;

export const ProjectStatusSchema = Type.Union([
	Type.Literal("discovered"),
	Type.Literal("ready"),
	Type.Literal("needs_migration"),
	Type.Literal("conflict"),
	Type.Literal("invalid"),
]);
export type ProjectStatus = Static<typeof ProjectStatusSchema>;

export const ProjectManifestSchema = Type.Object(
	{
		schemaVersion: Type.Integer({ minimum: 1 }),
		projectId: NativeProjectIdSchema,
		title: Type.String({ minLength: 1 }),
		language: Type.String({ minLength: 1 }),
		createdAt: Type.Union([Type.Null(), ISODateStringSchema]),
		updatedAt: Type.Union([Type.Null(), ISODateStringSchema]),
	},
	{ additionalProperties: false },
);
export type ProjectManifest = Static<typeof ProjectManifestSchema>;

export const ProjectRecordSchema = Type.Object(
	{
		projectId: ProjectIdSchema,
		title: Type.String({ minLength: 1 }),
		rootPath: Type.String({ minLength: 1 }),
		kind: ProjectKindSchema,
		status: ProjectStatusSchema,
		wordCount: Type.Integer({ minimum: 0 }),
		lastModifiedAt: ISODateStringSchema,
		manifest: Type.Union([Type.Null(), ProjectManifestSchema]),
	},
	{ additionalProperties: false },
);
export type ProjectRecord = Static<typeof ProjectRecordSchema>;

export const ProjectListResponseSchema = Type.Object(
	{ projects: Type.Array(ProjectRecordSchema) },
	{ additionalProperties: false },
);

export const ProjectResponseSchema = Type.Object({ project: ProjectRecordSchema }, { additionalProperties: false });
