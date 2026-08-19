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
	private readonly cancelled = new Set<string>();
	private readonly controllers = new Map<string, AbortController>();
	private readonly runs = new Map<string, AgentRun>();
	private readonly nextSequences = new Map<string, number>();

	constructor(repository: TaskRepositoryPort, runtime: AgentRuntimePort, clock: ClockPort) {
		this.repository = repository;
		this.runtime = runtime;
		this.clock = clock;
	}

	async create(input: CreateTaskInput, workspaceRoot: string, idempotencyKey?: string): Promise<NovelTask> {
		const { task, run } = this.createRecord(input, workspaceRoot, idempotencyKey);
		if (run === null) return task;
		void this.runTask(task, run, (signal) =>
			this.runtime
				.startTask({
					taskId: task.taskId,
					workspaceRoot,
					projectId: input.projectId,
					intent: input.intent,
					modelId: input.modelId,
					signal,
				})
				.then(() => ({})),
		);
		return task;
	}

	async createWithRunner(
		input: CreateTaskInput,
		workspaceRoot: string,
		runner: (signal: AbortSignal) => Promise<{ resultRef?: string }>,
		idempotencyKey?: string,
	): Promise<NovelTask> {
		const { task, run } = this.createRecord(input, workspaceRoot, idempotencyKey);
		if (run === null) return task;
		void this.runTask(task, run, runner);
		return task;
	}

	private createRecord(
		input: CreateTaskInput,
		workspaceRoot: string,
		idempotencyKey?: string,
	): { task: NovelTask; run: AgentRun | null } {
		if (idempotencyKey !== undefined && idempotencyKey.length > 0) {
			const existing = this.idempotency.get(`${workspaceRoot}\u0000${idempotencyKey}`);
			if (existing !== undefined) {
				const replay = this.repository.getTask(existing);
				if (replay !== null) {
					return { task: replay, run: null };
				}
			}
		}
		const now = this.clock.now();
		const task: NovelTask = {
			taskId: `task-${randomUUID()}`,
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
		if (idempotencyKey !== undefined && idempotencyKey.length > 0)
			this.idempotency.set(`${workspaceRoot}\u0000${idempotencyKey}`, task.taskId);
		const run: AgentRun = {
			agentRunId: `run-${randomUUID()}`,
			taskId: task.taskId,
			model: input.modelId ?? null,
			intent: input.intent,
			status: "queued",
			startedAt: null,
			completedAt: null,
			producedArtifacts: [],
		};
		this.repository.createAgentRun(run);
		this.runs.set(task.taskId, run);
		return { task, run };
	}

	private async runTask(
		task: NovelTask,
		run: AgentRun,
		runner: (signal: AbortSignal) => Promise<{ resultRef?: string }>,
	): Promise<void> {
		if (this.cancelled.has(task.taskId)) {
			this.runs.delete(task.taskId);
			return;
		}
		const startedAt = this.clock.now();
		const running: NovelTask = { ...task, status: "running", startedAt, updatedAt: startedAt };
		const runningRun: AgentRun = { ...run, status: "running", startedAt };
		this.repository.updateTask(running);
		this.repository.updateAgentRun(runningRun);
		this.emit(task.taskId, "task.started", { taskId: task.taskId, type: task.type });
		const controller = new AbortController();
		this.controllers.set(task.taskId, controller);
		try {
			const result = await runner(controller.signal);
			if (this.cancelled.has(task.taskId)) return;
			const completedAt = this.clock.now();
			const current = this.repository.getTask(task.taskId);
			const succeeded: NovelTask = {
				...(current ?? running),
				status: "succeeded",
				...(result.resultRef === undefined ? {} : { resultRef: result.resultRef }),
				completedAt,
				updatedAt: completedAt,
			};
			this.repository.updateTask(succeeded);
			const succeededRun = { ...runningRun, status: "succeeded" as const, completedAt };
			this.repository.updateAgentRun(succeededRun);
			this.runs.set(task.taskId, succeededRun);
			if (result.resultRef !== undefined)
				this.emit(task.taskId, "changeset.created", { resultRef: result.resultRef });
			this.emit(task.taskId, "task.completed", { taskId: task.taskId });
		} catch (error) {
			if (this.cancelled.has(task.taskId)) return;
			const completedAt = this.clock.now();
			const current = this.repository.getTask(task.taskId);
			const failed: NovelTask = {
				...(current ?? running),
				status: "failed",
				errorMessage: error instanceof Error ? error.message : String(error),
				completedAt,
				updatedAt: completedAt,
			};
			this.repository.updateTask(failed);
			const failedRun = { ...runningRun, status: "failed" as const, completedAt };
			this.repository.updateAgentRun(failedRun);
			this.runs.set(task.taskId, failedRun);
			this.emit(task.taskId, "task.failed", { taskId: task.taskId, error: failed.errorMessage });
		} finally {
			this.controllers.delete(task.taskId);
			this.runs.delete(task.taskId);
		}
	}

	async get(taskId: string): Promise<NovelTask> {
		const task = this.repository.getTask(taskId);
		if (task === null) throw new Error("TASK_NOT_FOUND");
		return task;
	}

	async cancel(taskId: string): Promise<NovelTask> {
		const task = this.repository.getTask(taskId);
		if (task === null) throw new Error("TASK_NOT_FOUND");
		if (task.forgeSessionId !== null) throw new Error("TASK_NOT_CANCELLABLE");
		if (task.status === "succeeded" || task.status === "failed" || task.status === "cancelled") {
			throw new Error("TASK_INVALID_STATE");
		}
		this.cancelled.add(taskId);
		this.controllers.get(taskId)?.abort();
		this.runtime.cancelTask(taskId);
		const run = this.runs.get(taskId);
		if (run !== undefined) {
			this.repository.updateAgentRun({ ...run, status: "cancelled", completedAt: this.clock.now() });
		}
		const cancelled: NovelTask = {
			...task,
			status: "cancelled",
			completedAt: this.clock.now(),
			updatedAt: this.clock.now(),
		};
		this.repository.updateTask(cancelled);
		this.emit(taskId, "task.failed", { taskId, cancelled: true });
		return cancelled;
	}

	listEvents(taskId: string, afterSequence = 0): TaskEvent[] {
		return this.repository.listEvents(taskId, afterSequence);
	}

	emit(taskId: string, type: TaskEventType, payload?: Record<string, unknown>): void {
		const sequence = Math.max(this.repository.maxSequence(taskId), this.nextSequences.get(taskId) ?? 0) + 1;
		this.nextSequences.set(taskId, sequence);
		this.repository.appendEvent({
			eventId: `event-${randomUUID()}`,
			taskId,
			sequence,
			type,
			...(payload === undefined ? {} : { payload }),
			createdAt: this.clock.now(),
		});
	}
}
