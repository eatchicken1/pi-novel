import { type Static, Type } from "typebox";
import { ProjectRecordSchema } from "./project.ts";

export const ProjectScanWarningCodeSchema = Type.Union([
	Type.Literal("DUPLICATE_PROJECT_ID"),
	Type.Literal("INVALID_MANIFEST"),
	Type.Literal("INVALID_LEGACY_METADATA"),
	Type.Literal("LEGACY_METADATA_PRESENT"),
	Type.Literal("UNREADABLE_DIRECTORY"),
]);
export type ProjectScanWarningCode = Static<typeof ProjectScanWarningCodeSchema>;

export const ProjectScanWarningSchema = Type.Object(
	{
		code: ProjectScanWarningCodeSchema,
		rootPath: Type.String({ minLength: 1 }),
		message: Type.String({ minLength: 1 }),
		projectId: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type ProjectScanWarning = Static<typeof ProjectScanWarningSchema>;

export const ProjectScanResultSchema = Type.Object(
	{
		projects: Type.Array(ProjectRecordSchema),
		warnings: Type.Array(ProjectScanWarningSchema),
	},
	{ additionalProperties: false },
);
export type ProjectScanResult = Static<typeof ProjectScanResultSchema>;
