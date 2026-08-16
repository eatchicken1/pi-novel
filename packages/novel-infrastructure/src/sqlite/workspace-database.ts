import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
	type ProjectRecord,
	ProjectRecordSchema,
	type WorkspaceManifest,
	WorkspaceManifestSchema,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";
import { WorkspaceManifestValidationError } from "../filesystem/workspace-files.ts";
import { applyWorkspaceMigrations } from "./workspace-migrations.ts";

interface WorkspaceRow {
	workspace_id: string;
	root_path: string;
	manifest_json: string;
	last_scan_at: string | null;
}

interface ProjectRow {
	project_id: string;
	title: string;
	root_path: string;
	kind: ProjectRecord["kind"];
	status: ProjectRecord["status"];
	word_count: number;
	last_modified_at: string;
	manifest_json: string | null;
}

export class WorkspaceDatabase {
	private readonly db: DatabaseSync;

	constructor(databasePath: string) {
		mkdirSync(dirname(databasePath), { recursive: true });
		this.db = new DatabaseSync(databasePath);
		applyWorkspaceMigrations(this.db);
	}

	close(): void {
		this.db.close();
	}

	upsertWorkspace(manifest: WorkspaceManifest, lastScanAt: string | null): void {
		this.db
			.prepare(
				"INSERT INTO workspace_metadata (workspace_id, root_path, manifest_json, last_scan_at) VALUES (?, ?, ?, ?) ON CONFLICT(workspace_id) DO UPDATE SET root_path = excluded.root_path, manifest_json = excluded.manifest_json, last_scan_at = excluded.last_scan_at",
			)
			.run(manifest.workspaceId, manifest.rootPath, JSON.stringify(manifest), lastScanAt);
	}

	readWorkspace(): { manifest: WorkspaceManifest; lastScanAt: string | null } | null {
		const row = this.db.prepare("SELECT * FROM workspace_metadata LIMIT 1").get() as WorkspaceRow | undefined;
		if (!row) return null;
		let parsed: unknown;
		try {
			parsed = JSON.parse(row.manifest_json);
		} catch (error) {
			throw new WorkspaceManifestValidationError("Workspace manifest in SQLite is not valid JSON", { cause: error });
		}
		if (!Check(WorkspaceManifestSchema, parsed)) {
			throw new WorkspaceManifestValidationError("Workspace manifest in SQLite is invalid");
		}
		return { manifest: parsed, lastScanAt: row.last_scan_at };
	}

	replaceProjects(projects: ProjectRecord[]): void {
		const projectIds = new Set<string>();
		for (const project of projects) {
			const projectId = project.projectId;
			if (!Check(ProjectRecordSchema, project)) throw new Error(`Invalid project record: ${projectId}`);
			if (projectIds.has(project.projectId)) throw new Error(`Duplicate project ID: ${project.projectId}`);
			projectIds.add(project.projectId);
		}
		this.db.exec("BEGIN IMMEDIATE");
		try {
			this.db.exec("DELETE FROM projects");
			const statement = this.db.prepare(
				"INSERT INTO projects (project_id, title, root_path, kind, status, word_count, last_modified_at, manifest_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			);
			for (const project of projects) {
				statement.run(
					project.projectId,
					project.title,
					project.rootPath,
					project.kind,
					project.status,
					project.wordCount,
					project.lastModifiedAt,
					project.manifest ? JSON.stringify(project.manifest) : null,
				);
			}
			this.db.exec("COMMIT");
		} catch (error) {
			this.db.exec("ROLLBACK");
			throw error;
		}
	}

	listProjects(): ProjectRecord[] {
		const rows = this.db
			.prepare("SELECT * FROM projects ORDER BY last_modified_at DESC")
			.all() as unknown as ProjectRow[];
		return rows.map((row) => ({
			projectId: row.project_id,
			title: row.title,
			rootPath: row.root_path,
			kind: row.kind,
			status: row.status,
			wordCount: row.word_count,
			lastModifiedAt: row.last_modified_at,
			manifest: row.manifest_json ? (JSON.parse(row.manifest_json) as ProjectRecord["manifest"]) : null,
		}));
	}
}
