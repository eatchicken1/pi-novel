import type { DatabaseSync } from "node:sqlite";
import {
	type CommitRecord,
	CommitRecordSchema,
	type ProjectCheckpoint,
	ProjectCheckpointSchema,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";

export interface CommitJournalRow {
	journal_id: string;
	project_id: string;
	change_set_id: string;
	state: string;
	files_json: string;
	db_actions_json: string;
	started_at: string;
	completed_at: string | null;
}

export interface CommitJournal {
	journalId: string;
	projectId: string;
	changeSetId: string;
	state: "pending" | "applied" | "committed" | "rolled-back";
	files: Array<{ relativePath: string; tempPath: string }>;
	dbActions: string[];
	startedAt: string;
	completedAt: string | null;
}

interface CommitRow {
	commit_id: string;
	project_id: string;
	change_set_id: string | null;
	actor: string;
	summary: string;
	affected_files_json: string;
	before_hashes_json: string;
	after_hashes_json: string;
	resolved_issue_count: number;
	created_at: string;
}

export class CommitRepository {
	private readonly db: DatabaseSync;

	constructor(db: DatabaseSync) {
		this.db = db;
	}

	record(commit: CommitRecord): void {
		if (!Check(CommitRecordSchema, commit)) throw new Error("Invalid commit record");
		this.db
			.prepare(
				"INSERT INTO commits (commit_id, project_id, change_set_id, actor, summary, affected_files_json, before_hashes_json, after_hashes_json, resolved_issue_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				commit.commitId,
				commit.projectId,
				commit.changeSetId,
				commit.actor,
				commit.summary,
				JSON.stringify(commit.affectedFiles),
				JSON.stringify(commit.beforeHashes),
				JSON.stringify(commit.afterHashes),
				commit.resolvedIssueCount,
				commit.createdAt,
			);
	}

	list(projectId: string, limit = 100): CommitRecord[] {
		const rows = this.db
			.prepare("SELECT * FROM commits WHERE project_id = ? ORDER BY created_at DESC LIMIT ?")
			.all(projectId, limit) as unknown as CommitRow[];
		return rows.map((row) => ({
			commitId: row.commit_id,
			projectId: row.project_id,
			changeSetId: row.change_set_id,
			actor: row.actor as CommitRecord["actor"],
			summary: row.summary,
			affectedFiles: JSON.parse(row.affected_files_json) as string[],
			beforeHashes: JSON.parse(row.before_hashes_json) as Record<string, string>,
			afterHashes: JSON.parse(row.after_hashes_json) as Record<string, string>,
			resolvedIssueCount: row.resolved_issue_count,
			createdAt: row.created_at,
		}));
	}

	get(commitId: string): CommitRecord | null {
		const row = this.db.prepare("SELECT * FROM commits WHERE commit_id = ?").get(commitId) as CommitRow | undefined;
		if (row === undefined) return null;
		return {
			commitId: row.commit_id,
			projectId: row.project_id,
			changeSetId: row.change_set_id,
			actor: row.actor as CommitRecord["actor"],
			summary: row.summary,
			affectedFiles: JSON.parse(row.affected_files_json) as string[],
			beforeHashes: JSON.parse(row.before_hashes_json) as Record<string, string>,
			afterHashes: JSON.parse(row.after_hashes_json) as Record<string, string>,
			resolvedIssueCount: row.resolved_issue_count,
			createdAt: row.created_at,
		};
	}

	createCheckpoint(checkpoint: ProjectCheckpoint): void {
		if (!Check(ProjectCheckpointSchema, checkpoint)) throw new Error("Invalid checkpoint record");
		this.db
			.prepare(
				"INSERT INTO checkpoints (checkpoint_id, project_id, label, manifest_hashes_json, created_at) VALUES (?, ?, ?, ?, ?)",
			)
			.run(
				checkpoint.checkpointId,
				checkpoint.projectId,
				checkpoint.label,
				JSON.stringify(checkpoint.manifestHashes),
				checkpoint.createdAt,
			);
	}

	createJournal(journal: CommitJournal): void {
		this.db
			.prepare(
				"INSERT INTO commit_journals (journal_id, project_id, change_set_id, state, files_json, db_actions_json, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				journal.journalId,
				journal.projectId,
				journal.changeSetId,
				journal.state,
				JSON.stringify(journal.files),
				JSON.stringify(journal.dbActions),
				journal.startedAt,
				journal.completedAt,
			);
	}

	updateJournalState(journalId: string, state: CommitJournal["state"], completedAt: string | null): void {
		this.db
			.prepare("UPDATE commit_journals SET state = ?, completed_at = ? WHERE journal_id = ?")
			.run(state, completedAt, journalId);
	}

	pendingJournals(projectId: string): CommitJournal[] {
		const rows = this.db
			.prepare("SELECT * FROM commit_journals WHERE project_id = ? AND state IN ('pending', 'applied')")
			.all(projectId) as unknown as CommitJournalRow[];
		return rows.map((row) => ({
			journalId: row.journal_id,
			projectId: row.project_id,
			changeSetId: row.change_set_id,
			state: row.state as CommitJournal["state"],
			files: JSON.parse(row.files_json) as CommitJournal["files"],
			dbActions: JSON.parse(row.db_actions_json) as string[],
			startedAt: row.started_at,
			completedAt: row.completed_at,
		}));
	}
}
