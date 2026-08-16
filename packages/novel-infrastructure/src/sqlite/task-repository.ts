import { DatabaseSync } from "node:sqlite";
import { applyWorkspaceMigrations } from "./workspace-migrations.ts";
import {
	type AgentRun,
	AgentRunSchema,
	type NovelTask,
	NovelTaskSchema,
	type TaskEvent,
	TaskEventSchema,
} from "@earendil-works/pi-novel-contracts";
import { Check } from "typebox/value";

interface TaskRow {
	task_id: string;
	project_id: string | null;
	forge_session_id: string | null;
	type: string;
	status: string;
	progress_json: string | null;
	result_ref: string | null;
	error_message: string | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
	updated_at: string;
}

interface TaskEventRow {
	event_id: string;
	task_id: string;
	sequence: number;
	type: string;
	payload_json: string | null;
	created_at: string;
}

interface AgentRunRow {
	agent_run_id: string;
	task_id: string;
	model: string | null;
	intent: string;
	status: string;
	started_at: string | null;
	completed_at: string | null;
	usage_json: string | null;
	produced_artifacts_json: string;
}

function parseTask(row: TaskRow): NovelTask {
	const parsed: unknown = {
		taskId: row.task_id,
		projectId: row.project_id,
		forgeSessionId: row.forge_session_id,
		type: row.type,
		status: row.status,
		...(row.progress_json === null ? {} : { progress: JSON.parse(row.progress_json) }),
		resultRef: row.result_ref,
		errorMessage: row.error_message,
		createdAt: row.created_at,
		startedAt: row.started_at,
		completedAt: row.completed_at,
		updatedAt: row.updated_at,
	};
	if (!Check(NovelTaskSchema, parsed)) throw new Error("Stored task failed contract validation");
	return parsed;
}

// Task / AgentRun / TaskEvent 全在 workspace DB（task 生命周期跨 project 与 forge）。
export class TaskRepository {
	private readonly db: DatabaseSync;
	private readonly path: string;

	constructor(databasePath: string) {
		this.path = databasePath;
		this.db = new DatabaseSync(databasePath);
		applyWorkspaceMigrations(this.db);
	}

	close(): void {
		this.db.close();
	}

	get databasePath(): string {
		return this.path;
	}

	createTask(task: NovelTask): void {
		if (!Check(NovelTaskSchema, task)) throw new Error("Invalid task record");
		this.db
			.prepare(
				"INSERT INTO tasks (task_id, project_id, forge_session_id, type, status, progress_json, result_ref, error_message, created_at, started_at, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				task.taskId,
				task.projectId,
				task.forgeSessionId,
				task.type,
				task.status,
				task.progress === undefined ? null : JSON.stringify(task.progress),
				task.resultRef,
				task.errorMessage,
				task.createdAt,
				task.startedAt,
				task.completedAt,
				task.updatedAt,
			);
	}

	updateTask(task: NovelTask): void {
		this.db
			.prepare(
				"UPDATE tasks SET status = ?, progress_json = ?, result_ref = ?, error_message = ?, started_at = ?, completed_at = ?, updated_at = ? WHERE task_id = ?",
			)
			.run(
				task.status,
				task.progress === undefined ? null : JSON.stringify(task.progress),
				task.resultRef,
				task.errorMessage,
				task.startedAt,
				task.completedAt,
				task.updatedAt,
				task.taskId,
			);
	}

	getTask(taskId: string): NovelTask | null {
		const row = this.db.prepare("SELECT * FROM tasks WHERE task_id = ?").get(taskId) as TaskRow | undefined;
		return row === undefined ? null : parseTask(row);
	}

	listTasks(filter: { projectId?: string; status?: string; limit?: number } = {}): NovelTask[] {
		const conditions: string[] = [];
		const params: Array<string | number> = [];
		if (filter.projectId !== undefined) { conditions.push("project_id = ?"); params.push(filter.projectId); }
		if (filter.status !== undefined) { conditions.push("status = ?"); params.push(filter.status); }
		const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
		const rows = this.db
			.prepare(`SELECT * FROM tasks${where} ORDER BY created_at DESC LIMIT ?`)
			.all(...params, filter.limit ?? 50) as unknown as TaskRow[];
		return rows.map(parseTask);
	}

	appendEvent(event: TaskEvent): void {
		if (!Check(TaskEventSchema, event)) throw new Error("Invalid task event record");
		this.db
			.prepare("INSERT INTO task_events (event_id, task_id, sequence, type, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
			.run(event.eventId, event.taskId, event.sequence, event.type, event.payload === undefined ? null : JSON.stringify(event.payload), event.createdAt);
	}

	listEvents(taskId: string, afterSequence = 0): TaskEvent[] {
		const rows = this.db
			.prepare("SELECT * FROM task_events WHERE task_id = ? AND sequence > ? ORDER BY sequence ASC")
			.all(taskId, afterSequence) as unknown as TaskEventRow[];
		return rows.map((row) => ({
			eventId: row.event_id,
			taskId: row.task_id,
			sequence: row.sequence,
			type: row.type as TaskEvent["type"],
			...(row.payload_json === null ? {} : { payload: JSON.parse(row.payload_json) }),
			createdAt: row.created_at,
		}));
	}

	maxSequence(taskId: string): number {
		const row = this.db.prepare("SELECT COALESCE(MAX(sequence), 0) AS s FROM task_events WHERE task_id = ?").get(taskId) as { s: number };
		return Number(row.s);
	}

	createAgentRun(run: AgentRun): void {
		if (!Check(AgentRunSchema, run)) throw new Error("Invalid agent run record");
		this.db
			.prepare(
				"INSERT INTO agent_runs (agent_run_id, task_id, model, intent, status, started_at, completed_at, usage_json, produced_artifacts_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			)
			.run(
				run.agentRunId,
				run.taskId,
				run.model,
				run.intent,
				run.status,
				run.startedAt,
				run.completedAt,
				run.usage === undefined ? null : JSON.stringify(run.usage),
				JSON.stringify(run.producedArtifacts),
			);
	}

	updateAgentRun(run: AgentRun): void {
		this.db
			.prepare("UPDATE agent_runs SET status = ?, completed_at = ?, usage_json = ?, produced_artifacts_json = ? WHERE agent_run_id = ?")
			.run(run.status, run.completedAt, run.usage === undefined ? null : JSON.stringify(run.usage), JSON.stringify(run.producedArtifacts), run.agentRunId);
	}

	getAgentRun(agentRunId: string): AgentRun | null {
		const row = this.db.prepare("SELECT * FROM agent_runs WHERE agent_run_id = ?").get(agentRunId) as AgentRunRow | undefined;
		if (row === undefined) return null;
		return {
			agentRunId: row.agent_run_id,
			taskId: row.task_id,
			model: row.model,
			intent: row.intent,
			status: row.status as AgentRun["status"],
			startedAt: row.started_at,
			completedAt: row.completed_at,
			...(row.usage_json === null ? {} : { usage: JSON.parse(row.usage_json) }),
			producedArtifacts: JSON.parse(row.produced_artifacts_json) as string[],
		};
	}
}
