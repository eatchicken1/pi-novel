import { type Static, Type } from "typebox";
import { ISODateStringSchema } from "./common.ts";

// Thinking levels mirror pi-ai: "off" plus the six reasoning efforts.
export const ModelThinkingLevelSchema = Type.Union([
	Type.Literal("off"),
	Type.Literal("minimal"),
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
	Type.Literal("xhigh"),
	Type.Literal("max"),
]);
export type ModelThinkingLevel = Static<typeof ModelThinkingLevelSchema>;

export const ThinkingLevelSchema = Type.Union([
	Type.Literal("minimal"),
	Type.Literal("low"),
	Type.Literal("medium"),
	Type.Literal("high"),
	Type.Literal("xhigh"),
	Type.Literal("max"),
]);
export type ThinkingLevel = Static<typeof ThinkingLevelSchema>;

// Agents that exist today. Future agents (chapter.writer etc.) are reserved
// in the union so profiles remain forward-compatible, but only implemented
// agents are exported as runtime constants.
export const RuntimeAgentIdSchema = Type.Union([
	Type.Literal("forge.explorer"),
	Type.Literal("forge.comparator"),
	Type.Literal("forge.critic"),
	Type.Literal("chapter.planner"),
	Type.Literal("chapter.writer"),
	Type.Literal("chapter.reviser"),
	Type.Literal("manuscript.reviewer"),
]);
export type RuntimeAgentId = Static<typeof RuntimeAgentIdSchema>;

export const IMPLEMENTED_RUNTIME_AGENTS: readonly RuntimeAgentId[] = [
	"forge.explorer",
	"forge.comparator",
	"forge.critic",
];

export const AgentRuntimeProfileSchema = Type.Object(
	{
		agentId: RuntimeAgentIdSchema,
		modelId: Type.String({ minLength: 1 }),
		thinkingLevel: ModelThinkingLevelSchema,
		updatedAt: ISODateStringSchema,
	},
	{ additionalProperties: false },
);
export type AgentRuntimeProfile = Static<typeof AgentRuntimeProfileSchema>;

export const SetRuntimeProfileInputSchema = Type.Object(
	{
		modelId: Type.String({ minLength: 1 }),
		thinkingLevel: ModelThinkingLevelSchema,
	},
	{ additionalProperties: false },
);
export type SetRuntimeProfileInput = Static<typeof SetRuntimeProfileInputSchema>;

export const RuntimeProfileListResponseSchema = Type.Object(
	{ profiles: Type.Array(AgentRuntimeProfileSchema) },
	{ additionalProperties: false },
);
export type RuntimeProfileListResponse = Static<typeof RuntimeProfileListResponseSchema>;

// The resolved invocation a business operation executes against. The Web never
// picks this freely; it comes from the saved AgentRuntimeProfile of the agent
// that owns the operation.
export const RuntimeInvocationSchema = Type.Object(
	{
		agentId: RuntimeAgentIdSchema,
		modelId: Type.String({ minLength: 1 }),
		thinkingLevel: ModelThinkingLevelSchema,
	},
	{ additionalProperties: false },
);
export type RuntimeInvocation = Static<typeof RuntimeInvocationSchema>;
