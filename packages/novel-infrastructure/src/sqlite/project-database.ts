import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

const PROJECT_MIGRATION = {
	id: "001_project_initial.sql",
	sql: `
CREATE TABLE IF NOT EXISTS project_metadata (project_id TEXT PRIMARY KEY, title TEXT NOT NULL, language TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS story_commitments (commitment_id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL, payload_json TEXT NOT NULL, committed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS forge_provenance (provenance_id TEXT PRIMARY KEY, forge_session_id TEXT NOT NULL, source_artifact_id TEXT NOT NULL, created_at TEXT NOT NULL);
`,
} as const;

export class ProjectDatabase {
	private readonly db: DatabaseSync;

	constructor(databasePath: string) {
		mkdirSync(dirname(databasePath), { recursive: true });
		this.db = new DatabaseSync(databasePath);
		this.db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");
		const applied = this.db.prepare("SELECT id FROM schema_migrations").all() as Array<{ id: string }>;
		if (!applied.some((entry) => entry.id === PROJECT_MIGRATION.id)) {
			this.db.exec("BEGIN IMMEDIATE");
			try {
				this.db.exec(PROJECT_MIGRATION.sql);
				this.db
					.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)")
					.run(PROJECT_MIGRATION.id, new Date().toISOString());
				this.db.exec("COMMIT");
			} catch (error) {
				this.db.exec("ROLLBACK");
				throw error;
			}
		}
	}

	writeFoundation(input: {
		projectId: string;
		title: string;
		language: string;
		createdAt: string;
		candidateId: string;
		commitment: unknown;
		forgeSessionId: string;
		sourceArtifactId: string;
	}): void {
		this.db
			.prepare(
				"INSERT INTO project_metadata (project_id, title, language, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
			)
			.run(input.projectId, input.title, input.language, input.createdAt, input.createdAt);
		this.db
			.prepare(
				"INSERT INTO story_commitments (commitment_id, candidate_id, payload_json, committed_at) VALUES (?, ?, ?, ?)",
			)
			.run(input.sourceArtifactId, input.candidateId, JSON.stringify(input.commitment), input.createdAt);
		this.db
			.prepare(
				"INSERT INTO forge_provenance (provenance_id, forge_session_id, source_artifact_id, created_at) VALUES (?, ?, ?, ?)",
			)
			.run(input.sourceArtifactId, input.forgeSessionId, input.sourceArtifactId, input.createdAt);
	}

	close(): void {
		this.db.close();
	}
}
