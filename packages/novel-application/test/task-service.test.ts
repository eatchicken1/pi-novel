import type { AgentRun, CreateTaskInput, NovelTask, TaskEvent } from "@earendil-works/pi-novel-contracts";
import { describe, expect, it } from "vitest";
import type { AgentRuntimePort, ClockPort, TaskRepositoryPort } from "../src/ports.ts";
import { TaskService } from "../src/tasks/task-service.ts";

const input: CreateTaskInput = {
	projectId: "project-1",
	forgeSessionId: null,
	type: "chapter.generate",
	intent: "Generate chapter 1",
	modelId: "openai/test",
};

describe("TaskService lifecycle", () => {
	it("persists running and succeeded states and agent run transitions", async () => {
		const repository = new InMemoryTaskRepository();
		const runtime = new ControllableRuntime();
		const service = new TaskService(repository, runtime, clock());

		const task = await service.create(input, "D:\\workspace", "request-1");
		await waitFor(() => repository.tasks.get(task.taskId)?.status === "running");
		expect(repository.tasks.get(task.taskId)?.startedAt).not.toBeNull();
		expect(repository.runs[0]?.status).toBe("running");

		runtime.resolve();
		await waitFor(() => repository.tasks.get(task.taskId)?.status === "succeeded");
		expect(repository.runs[0]?.status).toBe("succeeded");
		expect(repository.events.map((event) => event.type)).toEqual(["task.started", "task.completed"]);
	});

	it("does not overwrite cancellation with a late runtime completion", async () => {
		const repository = new InMemoryTaskRepository();
		const runtime = new ControllableRuntime();
		const service = new TaskService(repository, runtime, clock());

		const task = await service.create(input, "D:\\workspace", "request-2");
		await waitFor(() => repository.tasks.get(task.taskId)?.status === "running");
		const cancelled = await service.cancel(task.taskId);
		expect(cancelled.status).toBe("cancelled");
		expect(repository.runs[0]?.status).toBe("cancelled");

		runtime.resolve();
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(repository.tasks.get(task.taskId)?.status).toBe("cancelled");
		expect(repository.events.at(-1)?.payload).toEqual({ taskId: task.taskId, cancelled: true });
	});

	it("persists runtime failures instead of leaving tasks queued", async () => {
		const repository = new InMemoryTaskRepository();
		const service = new TaskService(
			repository,
			{
				startTask: async () => {
					throw new Error("provider unavailable");
				},
				cancelTask: () => undefined,
				subscribe: () => () => undefined,
			},
			clock(),
		);

		const task = await service.create(input, "D:\\workspace", "request-3");
		await waitFor(() => repository.tasks.get(task.taskId)?.status === "failed");
		expect(repository.tasks.get(task.taskId)?.errorMessage).toBe("provider unavailable");
		expect(repository.runs[0]?.status).toBe("failed");
	});
});

class ControllableRuntime implements AgentRuntimePort {
	private releasePromise: (() => void) | null = null;
	private readonly gate = new Promise<void>((resolve) => {
		this.releasePromise = resolve;
	});

	async startTask(): Promise<void> {
		await this.gate;
	}

	resolve(): void {
		this.releasePromise?.();
	}

	cancelTask(): void {}

	subscribe(): () => void {
		return () => undefined;
	}
}

class InMemoryTaskRepository implements TaskRepositoryPort {
	readonly tasks = new Map<string, NovelTask>();
	readonly runs: AgentRun[] = [];
	readonly events: TaskEvent[] = [];

	createTask(task: NovelTask): void {
		this.tasks.set(task.taskId, task);
	}

	updateTask(task: NovelTask): void {
		this.tasks.set(task.taskId, task);
	}

	getTask(taskId: string): NovelTask | null {
		return this.tasks.get(taskId) ?? null;
	}

	listTasks(): NovelTask[] {
		return [...this.tasks.values()];
	}

	appendEvent(event: TaskEvent): void {
		this.events.push(event);
	}

	listEvents(taskId: string, afterSequence = 0): TaskEvent[] {
		return this.events.filter((event) => event.taskId === taskId && event.sequence > afterSequence);
	}

	maxSequence(taskId: string): number {
		return this.events.reduce((max, event) => (event.taskId === taskId ? Math.max(max, event.sequence) : max), 0);
	}

	createAgentRun(run: AgentRun): void {
		this.runs.push(run);
	}

	updateAgentRun(run: AgentRun): void {
		const index = this.runs.findIndex((entry) => entry.agentRunId === run.agentRunId);
		if (index >= 0) this.runs[index] = run;
	}

	getAgentRun(agentRunId: string): AgentRun | null {
		return this.runs.find((run) => run.agentRunId === agentRunId) ?? null;
	}
}

function clock(): ClockPort {
	return { now: () => "2026-08-18T00:00:00.000Z" };
}

async function waitFor(predicate: () => boolean): Promise<void> {
	for (let attempt = 0; attempt < 50; attempt += 1) {
		if (predicate()) return;
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
	throw new Error("Condition did not become true");
}
