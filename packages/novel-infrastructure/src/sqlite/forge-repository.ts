import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
	ForgeArtifact,
	ForgeSession,
	ForgeTask,
	NarrativeDna,
	StoryConstraint,
	TaskEvent,
} from "@earendil-works/pi-novel-contracts";
import { applyWorkspaceMigrations } from "./workspace-migrations.ts";

interface SessionRow {
	forge_session_id: string;
	workspace_id: string;
	status: ForgeSession["status"];
	seed: string;
	genre_hint: string | null;
	title_candidate: string | null;
	narrative_dna_json: string;
	hard_constraints_json: string;
	preferences_json: string;
	created_at: string;
	updated_at: string;
	selected_candidate_id: string | null;
	committed_at: string | null;
	materialized_project_id: string | null;
	current_task_id: string | null;
	runtime_relative_path: string;
	failure_code: string | null;
	failure_message: string | null;
}

interface ArtifactRow {
	artifact_id: string;
	forge_session_id: string;
	kind: ForgeArtifact["kind"];
	relative_path: string;
	candidate_id: string | null;
	summary: string | null;
	created_at: string;
}

interface TaskRow {
	task_id: string;
	forge_session_id: string;
	type: string;
	status: ForgeTask["status"];
	progress_phase: string;
	created_at: string;
	updated_at: string;
	error_message: string | null;
}

interface TaskEventRow {
	event_id: string;
	task_id: string;
	sequence: number;
	type: string;
	payload_json: string | null;
	created_at: string;
}

export class ForgeRepository {
	private readonly db: DatabaseSync;

	constructor(databasePath: string) {
		mkdirSync(dirname(databasePath), { recursive: true });
		this.db = new DatabaseSync(databasePath);
		applyWorkspaceMigrations(this.db);
	}

	close(): void {
		this.db.close();
	}

	createSession(session: ForgeSession): void {
		this.db
			.prepare(
				"INSERT INTO forge_sessions (forge_session_id, workspace_id, status, seed, genre_hint, title_candidate, narrative_dna_json, hard_constraints_json, preferences_json, created_at, updated_at, selected_candidate_id, committed_at, materialized_project_id, current_task_id, runtime_relative_path, failure_code, failure_message) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				session.forgeSessionId,
				session.workspaceId,
				session.status,
				session.seed,
				session.genreHint ?? null,
				session.titleCandidate,
				JSON.stringify(session.narrativeDNA),
				JSON.stringify(session.hardConstraints),
				JSON.stringify(session.preferences),
				session.createdAt,
				session.updatedAt,
				session.selectedCandidateId,
				session.committedAt,
				session.materializedProjectId,
				session.currentTaskId,
				session.runtimeRelativePath,
				session.failureCode,
				session.failureMessage,
			);
	}

	getSession(sessionId: string): ForgeSession | null {
		const row = this.db.prepare("SELECT * FROM forge_sessions WHERE forge_session_id = ?").get(sessionId) as
			| SessionRow
			| undefined;
		return row ? toSession(row) : null;
	}

	updateSession(session: ForgeSession): void {
		this.db
			.prepare(
				"UPDATE forge_sessions SET status = ?, seed = ?, genre_hint = ?, title_candidate = ?, narrative_dna_json = ?, hard_constraints_json = ?, preferences_json = ?, updated_at = ?, selected_candidate_id = ?, committed_at = ?, materialized_project_id = ?, current_task_id = ?, runtime_relative_path = ?, failure_code = ?, failure_message = ? WHERE forge_session_id = ?",
			)
			.run(
				session.status,
				session.seed,
				session.genreHint ?? null,
				session.titleCandidate,
				JSON.stringify(session.narrativeDNA),
				JSON.stringify(session.hardConstraints),
				JSON.stringify(session.preferences),
				session.updatedAt,
				session.selectedCandidateId,
				session.committedAt,
				session.materializedProjectId,
				session.currentTaskId,
				session.runtimeRelativePath,
				session.failureCode,
				session.failureMessage,
				session.forgeSessionId,
			);
	}

	listArtifacts(sessionId: string): ForgeArtifact[] {
		const rows = this.db
			.prepare("SELECT * FROM forge_artifacts WHERE forge_session_id = ? ORDER BY created_at ASC")
			.all(sessionId) as unknown as ArtifactRow[];
		return rows.map(toArtifact);
	}

	addArtifact(artifact: ForgeArtifact): void {
		this.db
			.prepare(
				"INSERT OR REPLACE INTO forge_artifacts (artifact_id, forge_session_id, kind, relative_path, candidate_id, summary, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				artifact.artifactId,
				artifact.forgeSessionId,
				artifact.kind,
				artifact.relativePath,
				artifact.candidateId ?? null,
				artifact.summary ?? null,
				artifact.createdAt,
			);
	}

	createTask(task: ForgeTask): void {
		this.db
			.prepare(
				"INSERT INTO tasks (task_id, project_id, forge_session_id, type, status, progress_phase, created_at, updated_at, error_message) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				task.taskId,
				task.forgeSessionId,
				task.type,
				task.status,
				task.progressPhase,
				task.createdAt,
				task.updatedAt,
				task.errorMessage,
			);
	}

	getTask(taskId: string): ForgeTask | null {
		const row = this.db
			.prepare(
				"SELECT task_id, forge_session_id, type, status, progress_phase, created_at, updated_at, error_message FROM tasks WHERE task_id = ?",
			)
			.get(taskId) as TaskRow | undefined;
		return row ? toTask(row) : null;
	}

	updateTask(task: ForgeTask): void {
		this.db
			.prepare(
				"UPDATE tasks SET status = ?, progress_phase = ?, updated_at = ?, error_message = ? WHERE task_id = ?",
			)
			.run(task.status, task.progressPhase, task.updatedAt, task.errorMessage, task.taskId);
	}

	appendTaskEvent(event: TaskEvent): void {
		this.db
			.prepare(
				"INSERT OR REPLACE INTO task_events (event_id, task_id, sequence, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
			)
			.run(
				event.eventId,
				event.taskId,
				event.sequence,
				event.type,
				event.payload ? JSON.stringify(event.payload) : null,
				event.createdAt,
			);
	}

	listTaskEvents(taskId: string, afterSequence: number): TaskEvent[] {
		const rows = this.db
			.prepare("SELECT * FROM task_events WHERE task_id = ? AND sequence > ? ORDER BY sequence ASC")
			.all(taskId, afterSequence) as unknown as TaskEventRow[];
		return rows.map(toTaskEvent);
	}

	taskEventSequence(taskId: string): number {
		const row = this.db
			.prepare("SELECT COALESCE(MAX(sequence), 0) AS sequence FROM task_events WHERE task_id = ?")
			.get(taskId) as { sequence: number };
		return row.sequence;
	}
}

function toSession(row: SessionRow): ForgeSession {
	return {
		forgeSessionId: row.forge_session_id,
		workspaceId: row.workspace_id,
		status: row.status,
		seed: row.seed,
		...(row.genre_hint ? { genreHint: row.genre_hint } : {}),
		titleCandidate: row.title_candidate,
		narrativeDNA: parseJson<NarrativeDna | null>(row.narrative_dna_json, null),
		hardConstraints: parseJson<StoryConstraint[]>(row.hard_constraints_json, []),
		preferences: parseJson<StoryConstraint[]>(row.preferences_json, []),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		selectedCandidateId: row.selected_candidate_id,
		committedAt: row.committed_at,
		materializedProjectId: row.materialized_project_id,
		currentTaskId: row.current_task_id,
		runtimeRelativePath: row.runtime_relative_path || `sessions/${row.forge_session_id}`,
		failureCode: row.failure_code,
		failureMessage: row.failure_message,
	};
}

function toArtifact(row: ArtifactRow): ForgeArtifact {
	return {
		artifactId: row.artifact_id,
		forgeSessionId: row.forge_session_id,
		kind: row.kind,
		relativePath: row.relative_path,
		createdAt: row.created_at,
		...(row.candidate_id ? { candidateId: row.candidate_id } : {}),
		...(row.summary ? { summary: row.summary } : {}),
	};
}

function toTaskEvent(row: TaskEventRow): TaskEvent {
	return {
		eventId: row.event_id,
		taskId: row.task_id,
		sequence: row.sequence,
		type: row.type as TaskEvent["type"],
		...(row.payload_json ? { payload: JSON.parse(row.payload_json) as Record<string, unknown> } : {}),
		createdAt: row.created_at,
	};
}

function toTask(row: TaskRow): ForgeTask {
	return {
		taskId: row.task_id,
		forgeSessionId: row.forge_session_id,
		type: row.type,
		status: row.status,
		progressPhase: row.progress_phase,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		errorMessage: row.error_message,
	};
}

function parseJson<T>(value: string, fallback: T): T {
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}
