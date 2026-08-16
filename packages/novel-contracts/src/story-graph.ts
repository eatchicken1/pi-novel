import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

export const StoryNodeTypeSchema = Type.Union([
	Type.Literal("event"),
	Type.Literal("chapter"),
	Type.Literal("character"),
	Type.Literal("clue"),
	Type.Literal("claim"),
	Type.Literal("promise"),
	Type.Literal("professional-action"),
	Type.Literal("relationship-state"),
]);
export type StoryNodeType = Static<typeof StoryNodeTypeSchema>;

export const StoryEdgeTypeSchema = Type.Union([
	Type.Literal("causes"),
	Type.Literal("reveals"),
	Type.Literal("involves"),
	Type.Literal("depends-on"),
	Type.Literal("harms"),
	Type.Literal("repairs"),
	Type.Literal("pays-off"),
	Type.Literal("knows"),
]);
export type StoryEdgeType = Static<typeof StoryEdgeTypeSchema>;

export const StoryNodeSchema = Type.Object(
	{
		nodeId: Type.String({ minLength: 1 }),
		type: StoryNodeTypeSchema,
		ref: Type.String({ minLength: 1 }),
		label: Type.Union([Type.Null(), Type.String({ minLength: 1 })]),
		chapter: Type.Union([Type.Null(), Type.Integer({ minimum: 1 })]),
		meta: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number(), Type.Boolean()])),
	},
	{ additionalProperties: false },
);
export type StoryNode = Static<typeof StoryNodeSchema>;

export const StoryEdgeSchema = Type.Object(
	{
		edgeId: Type.String({ minLength: 1 }),
		sourceNodeId: Type.String({ minLength: 1 }),
		targetNodeId: Type.String({ minLength: 1 }),
		type: StoryEdgeTypeSchema,
		label: Type.Union([Type.Null(), Type.String()]),
	},
	{ additionalProperties: false },
);
export type StoryEdge = Static<typeof StoryEdgeSchema>;

// Story Graph 是 derived read model，不是第二 authority。
export const StoryGraphSchema = Type.Object(
	{
		projectId: Type.String({ minLength: 1 }),
		nodes: Type.Array(StoryNodeSchema),
		edges: Type.Array(StoryEdgeSchema),
		sourceHash: Type.String({ minLength: 1 }),
		generatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type StoryGraph = Static<typeof StoryGraphSchema>;

export const StoryGraphQuerySchema = Type.Object(
	{
		chapterFrom: Type.Optional(Type.Integer({ minimum: 1 })),
		chapterTo: Type.Optional(Type.Integer({ minimum: 1 })),
		nodeTypes: Type.Optional(Type.Array(StoryNodeTypeSchema, { minItems: 1 })),
		characterId: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);
export type StoryGraphQuery = Static<typeof StoryGraphQuerySchema>;
