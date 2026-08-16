import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const TaskStatusSchema = Type.Union([
	Type.Literal("queued"),
	Type.Literal("running"),
	Type.Literal("awaiting-user"),
	Type.Literal("succeeded"),
	Type.Literal("failed"),
	Type.Literal("cancelled"),
]);
export type TaskStatus = Static<typeof TaskStatusSchema>;

export const NovelTaskSchema = Type.Object(
	{
		taskId: Type.String({ minLength: 1 }),
		projectId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		forgeSessionId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		type: Type.String({ minLength: 1 }),
		status: TaskStatusSchema,
		progress: Type.Optional(
			Type.Object(
				{
					phase: Type.String({ minLength: 1 }),
					percent: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
				},
				{ additionalProperties: false },
			),
		),
		resultRef: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		errorMessage: Type.Union([Type.Null(), Type.String()]),
		createdAt: ISODateStringSchema,
		startedAt: Type.Union([Type.Null(), ISODateStringSchema]),
		completedAt: Type.Union([Type.Null(), ISODateStringSchema]),
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type NovelTask = Static<typeof NovelTaskSchema>;

export const TaskEventTypeSchema = Type.Union([
	Type.Literal("task.started"),
	Type.Literal("task.progress"),
	Type.Literal("agent.message"),
	Type.Literal("artifact.proposed"),
	Type.Literal("changeset.created"),
	Type.Literal("task.awaiting-user"),
	Type.Literal("task.completed"),
	Type.Literal("task.failed"),
]);
export type TaskEventType = Static<typeof TaskEventTypeSchema>;

export const TaskEventSchema = Type.Object(
	{
		eventId: Type.String({ minLength: 1 }),
		taskId: Type.String({ minLength: 1 }),
		sequence: Type.Integer({ minimum: 1 }),
		type: TaskEventTypeSchema,
		payload: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
		createdAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type TaskEvent = Static<typeof TaskEventSchema>;

export const AgentRunStatusSchema = Type.Union([
	Type.Literal("queued"),
	Type.Literal("running"),
	Type.Literal("succeeded"),
	Type.Literal("failed"),
	Type.Literal("cancelled"),
]);
export type AgentRunStatus = Static<typeof AgentRunStatusSchema>;

export const AgentRunSchema = Type.Object(
	{
		agentRunId: Type.String({ minLength: 1 }),
		taskId: Type.String({ minLength: 1 }),
		model: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		intent: Type.String({ minLength: 1 }),
		status: AgentRunStatusSchema,
		startedAt: Type.Union([Type.Null(), ISODateStringSchema]),
		completedAt: Type.Union([Type.Null(), ISODateStringSchema]),
		usage: Type.Optional(Type.Record(Type.String(), Type.Number())),
		producedArtifacts: Type.Array(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type AgentRun = Static<typeof AgentRunSchema>;

export const CreateTaskInputSchema = Type.Object(
	{
		projectId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		forgeSessionId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		type: Type.String({ minLength: 1 }),
		intent: Type.String({ minLength: 1 }),
		modelId: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type CreateTaskInput = Static<typeof CreateTaskInputSchema>;

export const TaskResponseSchema = Type.Object({ task: NovelTaskSchema }, { additionalProperties: false });
export const TaskEventListResponseSchema = Type.Object(
	{ events: Type.Array(TaskEventSchema) },
	{ additionalProperties: false },
);
export const AgentRunResponseSchema = Type.Object({ run: AgentRunSchema }, { additionalProperties: false });
