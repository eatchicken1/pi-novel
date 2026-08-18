import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { MaterializationJournalEntry, MaterializationJournalStatus } from "@earendil-works/pi-novel-application";
import { applyWorkspaceMigrations } from "./workspace-migrations.ts";

interface JournalRow {
	forge_session_id: string;
	status: string;
	project_id: string | null;
	target_folder: string;
	staging_path: string | null;
	attempts: number;
	error_message: string | null;
	created_at: string;
	updated_at: string;
}

export class MaterializationJournalRepository {
	private readonly db: DatabaseSync;

	constructor(databasePath: string) {
		mkdirSync(dirname(databasePath), { recursive: true });
		this.db = new DatabaseSync(databasePath);
		applyWorkspaceMigrations(this.db);
	}

	close(): void {
		this.db.close();
	}

	get(sessionId: string): MaterializationJournalEntry | null {
		const row = this.db.prepare("SELECT * FROM materialization_journal WHERE forge_session_id = ?").get(sessionId) as
			| JournalRow
			| undefined;
		return row ? toEntry(row) : null;
	}

	update(entry: MaterializationJournalEntry): void {
		this.db
			.prepare(
				"INSERT INTO materialization_journal (forge_session_id, status, project_id, target_folder, staging_path, attempts, error_message, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(forge_session_id) DO UPDATE SET status = excluded.status, project_id = excluded.project_id, target_folder = excluded.target_folder, staging_path = excluded.staging_path, attempts = excluded.attempts, error_message = excluded.error_message, updated_at = excluded.updated_at",
			)
			.run(
				entry.forgeSessionId,
				entry.status,
				entry.projectId,
				entry.targetFolder,
				entry.stagingPath,
				entry.attempts,
				entry.errorMessage,
				entry.createdAt,
				entry.updatedAt,
			);
	}
}

function toEntry(row: JournalRow): MaterializationJournalEntry {
	return {
		forgeSessionId: row.forge_session_id,
		status: row.status as MaterializationJournalStatus,
		projectId: row.project_id,
		targetFolder: row.target_folder,
		stagingPath: row.staging_path,
		attempts: row.attempts,
		errorMessage: row.error_message,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
