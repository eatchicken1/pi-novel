import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";
import { ProjectRecordSchema } from "./project.ts";
import { ProjectScanWarningSchema } from "./scan.ts";

export const WORKSPACE_SCHEMA_VERSION = 1;

export const WorkspaceManifestSchema = Type.Object(
	{
		schemaVersion: Type.Integer({ minimum: 1 }),
		workspaceId: Type.String({ minLength: 1 }),
		rootPath: Type.String({ minLength: 1 }),
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type WorkspaceManifest = Static<typeof WorkspaceManifestSchema>;

export const WorkspaceSummarySchema = Type.Object(
	{
		projectCount: Type.Integer({ minimum: 0 }),
		nativeProjectCount: Type.Integer({ minimum: 0 }),
		legacyProjectCount: Type.Integer({ minimum: 0 }),
		wordCount: Type.Integer({ minimum: 0 }),
		lastScanAt: Type.Union([Type.Null(), ISODateStringSchema]),
	},
	{ additionalProperties: false },
);
export type WorkspaceSummary = Static<typeof WorkspaceSummarySchema>;

export const WorkspaceOverviewSchema = Type.Object(
	{
		manifest: WorkspaceManifestSchema,
		projects: Type.Array(ProjectRecordSchema),
		summary: WorkspaceSummarySchema,
		warnings: Type.Array(ProjectScanWarningSchema),
	},
	{ additionalProperties: false },
);
export type WorkspaceOverview = Static<typeof WorkspaceOverviewSchema>;

export const InitializeWorkspaceInputSchema = Type.Object(
	{ path: Type.String({ minLength: 1, pattern: "\\S" }) },
	{ additionalProperties: false },
);
export type InitializeWorkspaceInput = Static<typeof InitializeWorkspaceInputSchema>;

export const WorkspaceResponseSchema = Type.Object(
	{ workspace: Type.Union([Type.Null(), WorkspaceOverviewSchema]) },
	{ additionalProperties: false },
);

export const BootstrapResponseSchema = Type.Object(
	{
		api: Type.Literal("ready"),
		workspace: Type.Object(
			{
				status: Type.Union([Type.Literal("ready"), Type.Literal("unset")]),
				summary: Type.Union([WorkspaceOverviewSchema, Type.Null()]),
			},
			{ additionalProperties: false },
		),
		runtime: Type.Object({ configured: Type.Boolean() }, { additionalProperties: false }),
	},
	{ additionalProperties: false },
);
export type BootstrapResponse = Static<typeof BootstrapResponseSchema>;
