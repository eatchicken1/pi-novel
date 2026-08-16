import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { nowIso, type ProjectRecord, type WorkspaceManifest } from "@earendil-works/pi-novel-contracts";
import { afterEach, describe, expect, it } from "vitest";
import {
	loadWorkspaceMigrations,
	ProjectScanner,
	resolveWorkspacePath,
	WorkspaceDatabase,
	WorkspaceFiles,
	WorkspaceManifestValidationError,
} from "../src/index.ts";

let workspaceRoot: string | undefined;

afterEach(async () => {
	if (workspaceRoot) await rm(workspaceRoot, { recursive: true, force: true });
	workspaceRoot = undefined;
});

describe("ProjectScanner", () => {
	it("scans native and legacy projects without mixing their metadata", async () => {
		const root = await createWorkspace();
		await createNativeProject(root, "native-folder", "native-project", "Native Project");
		await createLegacyProject(root, "legacy-folder", { project_id: "legacy-project", title: "Legacy Project" });

		const result = await new ProjectScanner().scan(root);

		expect(result.projects.map((project) => project.kind)).toEqual(expect.arrayContaining(["legacy", "native"]));
		expect(result.projects).toHaveLength(2);
		expect(result.warnings).toEqual([]);
	});

	it("prefers native metadata and reports legacy metadata beside it", async () => {
		const root = await createWorkspace();
		const projectPath = await createNativeProject(root, "mixed", "native-project", "Native Project");
		await writeFile(join(projectPath, "project.json"), JSON.stringify({ title: "Legacy Project" }));

		const result = await new ProjectScanner().scan(root);

		expect(result.projects).toHaveLength(1);
		expect(result.projects[0]?.kind).toBe("native");
		expect(result.warnings).toEqual([
			expect.objectContaining({ code: "LEGACY_METADATA_PRESENT", rootPath: projectPath }),
		]);
	});

	it("isolates malformed YAML and JSON while retaining valid projects", async () => {
		const root = await createWorkspace();
		await createNativeProject(root, "valid", "valid-project", "Valid Project");
		await mkdir(join(root, "bad-yaml"), { recursive: true });
		await writeFile(join(root, "bad-yaml", "novel.yaml"), "project_id: [broken");
		await mkdir(join(root, "bad-json"), { recursive: true });
		await writeFile(join(root, "bad-json", "project.json"), "{broken");

		const result = await new ProjectScanner().scan(root);

		expect(result.projects.map((project) => project.projectId)).toEqual(["valid-project"]);
		expect(result.warnings.map((warning) => warning.code).sort()).toEqual([
			"INVALID_LEGACY_METADATA",
			"INVALID_MANIFEST",
		]);
	});

	it("reports duplicate IDs instead of returning ambiguous projects", async () => {
		const root = await createWorkspace();
		const firstPath = await createNativeProject(root, "first", "same-project", "First");
		const secondPath = await createNativeProject(root, "second", "same-project", "Second");

		const result = await new ProjectScanner().scan(root);

		expect(result.projects).toEqual([]);
		expect(result.warnings).toEqual([
			expect.objectContaining({ code: "DUPLICATE_PROJECT_ID", rootPath: firstPath, projectId: "same-project" }),
			expect.objectContaining({ code: "DUPLICATE_PROJECT_ID", rootPath: secondPath, projectId: "same-project" }),
		]);
	});

	it("keeps project identity stable when its directory is renamed", async () => {
		const root = await createWorkspace();
		const originalPath = await createNativeProject(root, "folder-a", "stable-project", "Stable Project");
		const first = await new ProjectScanner().scan(root);
		const renamedPath = join(root, "folder-b");
		await rename(originalPath, renamedPath);

		const second = await new ProjectScanner().scan(root);

		expect(first.projects[0]?.projectId).toBe("stable-project");
		expect(second.projects[0]?.projectId).toBe("stable-project");
		expect(second.projects[0]?.rootPath).toBe(renamedPath);
	});

	it("rejects an invalid native project ID instead of falling back to the directory name", async () => {
		const root = await createWorkspace();
		await mkdir(join(root, "folder-name"), { recursive: true });
		await writeFile(join(root, "folder-name", "novel.yaml"), "title: Missing ID\n");

		const result = await new ProjectScanner().scan(root);

		expect(result.projects).toEqual([]);
		expect(result.warnings[0]).toEqual(expect.objectContaining({ code: "INVALID_MANIFEST" }));
	});

	it("returns an empty result for an empty workspace", async () => {
		const root = await createWorkspace();

		expect(await new ProjectScanner().scan(root)).toEqual({ projects: [], warnings: [] });
	});
});

describe("workspace files and persistence", () => {
	it("validates workspace manifests and guards paths", async () => {
		const root = await createWorkspace();
		const files = new WorkspaceFiles(root);
		const manifest = createWorkspaceManifest(root);
		await files.writeManifest(manifest);

		expect(await files.readManifest()).toEqual(manifest);
		expect(() => resolveWorkspacePath(root, "..", "outside")).toThrow("escapes the Workspace root");

		await writeFile(files.paths.manifest, "{broken");
		await expect(files.readManifest()).rejects.toBeInstanceOf(WorkspaceManifestValidationError);
		await writeFile(files.paths.manifest, JSON.stringify({ workspaceId: "missing-fields" }));
		await expect(files.readManifest()).rejects.toBeInstanceOf(WorkspaceManifestValidationError);
	});

	it("applies each SQLite migration once and preserves data on invalid replacement", async () => {
		const root = await createWorkspace();
		const databasePath = join(root, "workspace.sqlite");
		const database = new WorkspaceDatabase(databasePath);
		const manifest = createWorkspaceManifest(root);
		const project = createProject(root, "project-1");
		database.upsertWorkspace(manifest, null);
		database.replaceProjects([project]);
		database.close();

		const reopened = new WorkspaceDatabase(databasePath);
		expect(reopened.listProjects()).toEqual([project]);
		expect(() => reopened.replaceProjects([project, invalidProject()])).toThrow("Invalid project record");
		expect(reopened.listProjects()).toEqual([project]);
		reopened.close();

		const raw = new DatabaseSync(databasePath);
		expect(raw.prepare("SELECT id FROM schema_migrations ORDER BY id").all()).toEqual([{ id: "001_initial.sql" }]);
		raw.close();
		expect(loadWorkspaceMigrations().map((migration) => migration.id)).toEqual(["001_initial.sql"]);
	});

	it("rejects a corrupted stored workspace manifest", async () => {
		const root = await createWorkspace();
		const databasePath = join(root, "workspace.sqlite");
		const database = new WorkspaceDatabase(databasePath);
		database.upsertWorkspace(createWorkspaceManifest(root), null);
		database.close();

		const raw = new DatabaseSync(databasePath);
		raw.prepare("UPDATE workspace_metadata SET manifest_json = ?").run("{broken");
		raw.close();

		const reopened = new WorkspaceDatabase(databasePath);
		expect(() => reopened.readWorkspace()).toThrow(WorkspaceManifestValidationError);
		reopened.close();
	});
});

async function createWorkspace(): Promise<string> {
	workspaceRoot = await mkdtemp(join(tmpdir(), "pi-novel-boundary-"));
	return workspaceRoot;
}

async function createNativeProject(
	root: string,
	directoryName: string,
	projectId: string,
	title: string,
): Promise<string> {
	const projectPath = join(root, directoryName);
	await mkdir(projectPath, { recursive: true });
	await writeFile(
		join(projectPath, "novel.yaml"),
		[`schema_version: 1`, `project_id: ${projectId}`, `title: ${title}`, ""].join("\n"),
	);
	return projectPath;
}

async function createLegacyProject(
	root: string,
	directoryName: string,
	metadata: Record<string, string>,
): Promise<void> {
	const projectPath = join(root, directoryName);
	await mkdir(projectPath, { recursive: true });
	await writeFile(join(projectPath, "project.json"), JSON.stringify(metadata));
}

function createWorkspaceManifest(root: string): WorkspaceManifest {
	const timestamp = nowIso();
	return {
		schemaVersion: 1,
		workspaceId: "workspace-1",
		rootPath: root,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

function createProject(root: string, projectId: string): ProjectRecord {
	return {
		projectId,
		title: "Project",
		rootPath: join(root, "project"),
		kind: "native",
		status: "ready",
		wordCount: 0,
		lastModifiedAt: nowIso(),
		manifest: {
			schemaVersion: 1,
			projectId,
			title: "Project",
			language: "zh-CN",
			createdAt: null,
			updatedAt: null,
		},
	};
}

function invalidProject(): ProjectRecord {
	return { ...createProject("D:\\workspace", "invalid"), title: "" };
}
