import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export interface ProjectMigration {
	id: string;
	sql: string;
}

export function loadProjectMigrations(): ProjectMigration[] {
	return [
		{
			id: "001_project_initial.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/001_project_initial.sql", import.meta.url)), "utf8"),
		},
		{
			id: "003_project_product.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/003_project_product.sql", import.meta.url)), "utf8"),
		},
		{
			id: "004_commit_recovery.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/004_commit_recovery.sql", import.meta.url)), "utf8"),
		},
		{
			id: "007_chapter_workflow.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/007_chapter_workflow.sql", import.meta.url)), "utf8"),
		},
		{
			id: "008_chapter_metadata.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/008_chapter_metadata.sql", import.meta.url)), "utf8"),
		},
		{
			id: "009_narrative_patch.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/009_narrative_patch.sql", import.meta.url)), "utf8"),
		},
	];
}

export function applyProjectMigrations(db: DatabaseSync): void {
	db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
	const applied = new Set(
		(db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as Array<{ id: string }>).map((row) => row.id),
	);
	for (const migration of loadProjectMigrations()) {
		if (applied.has(migration.id)) continue;
		db.exec("BEGIN IMMEDIATE");
		try {
			db.exec(migration.sql);
			db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
				migration.id,
				new Date().toISOString(),
			);
			db.exec("COMMIT");
		} catch (error) {
			db.exec("ROLLBACK");
			throw error;
		}
	}
}
