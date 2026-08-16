export const novelQueryKeys = {
	workspace: ["workspace"] as const,
	projects: ["projects"] as const,
	models: ["models"] as const,
	forgeSession: (sessionId: string) => ["forge", sessionId, "session"] as const,
	forgeArtifacts: (sessionId: string) => ["forge", sessionId, "artifacts"] as const,
	forgeTask: (taskId: string) => ["tasks", taskId] as const,
};
