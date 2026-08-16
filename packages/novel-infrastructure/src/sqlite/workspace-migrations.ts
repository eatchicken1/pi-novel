import { readFileSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

export interface WorkspaceMigration {
	id: string;
	sql: string;
}

export function loadWorkspaceMigrations(): WorkspaceMigration[] {
	return [
		{
			id: "001_initial.sql",
			sql: readFileSync(fileURLToPath(new URL("./migrations/001_initial.sql", import.meta.url)), "utf8"),
		},
		{
			id: "002_forge_vertical_slice.sql",
			sql: readFileSync(
				fileURLToPath(new URL("./migrations/002_forge_vertical_slice.sql", import.meta.url)),
				"utf8",
			),
		},
	];
}

export function applyWorkspaceMigrations(db: DatabaseSync): void {
	db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
	const applied = new Set(
		(db.prepare("SELECT id FROM schema_migrations ORDER BY id").all() as Array<{ id: string }>).map((row) => row.id),
	);
	for (const migration of loadWorkspaceMigrations()) {
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
