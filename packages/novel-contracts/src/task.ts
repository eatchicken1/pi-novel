import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const TaskStatusSchema = Type.Union([
	Type.Literal("queued"),
	Type.Literal("running"),
	Type.Literal("succeeded"),
	Type.Literal("failed"),
	Type.Literal("cancelled"),
]);
export type TaskStatus = Static<typeof TaskStatusSchema>;

export const NovelTaskSchema = Type.Object(
	{
		taskId: Type.String({ minLength: 1 }),
		projectId: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		type: Type.String({ minLength: 1 }),
		status: TaskStatusSchema,
		createdAt: ISODateStringSchema,
		updatedAt: ISODateStringSchema,
		errorMessage: Type.Union([Type.Null(), Type.String()]),
	},
	{ additionalProperties: false },
);
export type NovelTask = Static<typeof NovelTaskSchema>;
