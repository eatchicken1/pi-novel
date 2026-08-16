import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { ProjectManifestSchema, WorkspaceManifestSchema } from "../src/index.ts";

describe("novel runtime contracts", () => {
	it("accepts a valid workspace manifest", () => {
		expect(
			Check(WorkspaceManifestSchema, {
				schemaVersion: 1,
				workspaceId: "workspace-1",
				rootPath: "D:\\Novels",
				createdAt: "2026-08-16T10:00:00.000Z",
				updatedAt: "2026-08-16T10:01:00.000Z",
			}),
		).toBe(true);
	});

	it("rejects an invalid workspace manifest", () => {
		expect(
			Check(WorkspaceManifestSchema, {
				schemaVersion: 1,
				workspaceId: "",
				rootPath: "D:\\Novels",
				createdAt: "not-a-date",
				updatedAt: "2026-08-16T10:01:00.000Z",
			}),
		).toBe(false);
	});

	it("accepts and rejects native project manifests at runtime", () => {
		expect(
			Check(ProjectManifestSchema, {
				schemaVersion: 1,
				projectId: "project-1",
				title: "A Project",
				language: "zh-CN",
				createdAt: null,
				updatedAt: null,
			}),
		).toBe(true);
		expect(
			Check(ProjectManifestSchema, {
				schemaVersion: 1,
				projectId: "folder/project-1",
				title: "A Project",
				language: "zh-CN",
				createdAt: null,
				updatedAt: null,
			}),
		).toBe(false);
	});
});
