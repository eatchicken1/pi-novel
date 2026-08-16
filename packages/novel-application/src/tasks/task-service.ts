import { randomUUID } from "node:crypto";
import type {
	AgentRun,
	CreateTaskInput,
	NovelTask,
	TaskEvent,
	TaskEventType,
} from "@earendil-works/pi-novel-contracts";
import type { AgentRuntimePort, ClockPort, TaskRepositoryPort } from "../ports.ts";

// Task / AgentRun / SSE：HTTP route 不等待 AI 工作；事件持久化支持 Last-Event-ID 恢复。
export class TaskService {
	private readonly repository: TaskRepositoryPort;
	private readonly runtime: AgentRuntimePort;
	private readonly clock: ClockPort;
	private readonly idempotency = new Map<string, string>();

	constructor(repository: TaskRepositoryPort, runtime: AgentRuntimePort, clock: ClockPort) {
		this.repository = repository;
		this.runtime = runtime;
		this.clock = clock;
	}

	async create(input: CreateTaskInput, workspaceRoot: string, idempotencyKey?: string): Promise<NovelTask> {
		if (idempotencyKey !== undefined && idempotencyKey.length > 0) {
			const existing = this.idempotency.get(idempotencyKey);
			if (existing !== undefined) {
				const replay = this.repository.getTask(existing);
				if (replay !== null) return replay;
			}
		}
		const now = this.clock.now();
		const task: NovelTask = {
			taskId: "task-" + randomUUID(),
			projectId: input.projectId,
			forgeSessionId: input.forgeSessionId ?? null,
			type: input.type,
			status: "queued",
			resultRef: null,
			errorMessage: null,
			createdAt: now,
			startedAt: null,
			completedAt: null,
			updatedAt: now,
		};
		this.repository.createTask(task);
		if (idempotencyKey !== undefined && idempotencyKey.length > 0) this.idempotency.set(idempotencyKey, task.taskId);
		this.emit(task.taskId, "task.started", { taskId: task.taskId, type: task.type });
		const run: AgentRun = {
			agentRunId: "run-" + randomUUID(),
			taskId: task.taskId,
			model: input.modelId ?? null,
			intent: input.intent,
			status: "queued",
			startedAt: null,
			completedAt: null,
			producedArtifacts: [],
		};
		this.repository.createAgentRun(run);
		void this.runtime.startTask({
			taskId: task.taskId,
			workspaceRoot,
			projectId: input.projectId,
			intent: input.intent,
			modelId: input.modelId,
		}).then(() => undefined).catch((error: unknown) => {
			const failed = this.repository.getTask(task.taskId);
			if (failed !== null) {
				this.repository.updateTask({ ...failed, status: "failed", errorMessage: String(error), completedAt: this.clock.now(), updatedAt: this.clock.now() });
				this.emit(task.taskId, "task.failed", { taskId: task.taskId, error: String(error) });
			}
		});
		return task;
	}

	async get(taskId: string): Promise<NovelTask> {
		const task = this.repository.getTask(taskId);
		if (task === null) throw new Error("TASK_NOT_FOUND");
		return task;
	}

	async cancel(taskId: string): Promise<NovelTask> {
		const task = this.repository.getTask(taskId);
		if (task === null) throw new Error("TASK_NOT_FOUND");
		if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
			throw new Error("TASK_INVALID_STATE");
		}
		this.runtime.cancelTask(taskId);
		const cancelled: NovelTask = { ...task, status: "cancelled", completedAt: this.clock.now(), updatedAt: this.clock.now() };
		this.repository.updateTask(cancelled);
		this.emit(taskId, "task.failed", { taskId, cancelled: true });
		return cancelled;
	}

	listEvents(taskId: string, afterSequence = 0): TaskEvent[] {
		return this.repository.listEvents(taskId, afterSequence);
	}

	emit(taskId: string, type: TaskEventType, payload?: Record<string, unknown>): void {
		const sequence = this.repository.maxSequence(taskId) + 1;
		this.repository.appendEvent({
			eventId: "event-" + randomUUID(),
			taskId,
			sequence,
			type,
			...(payload === undefined ? {} : { payload }),
			createdAt: this.clock.now(),
		});
	}
}
