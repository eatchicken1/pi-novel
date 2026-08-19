export const novelQueryKeys = {
	workspace: ["workspace"] as const,
	projects: ["projects"] as const,
	chapters: (projectId: string) => ["projects", projectId, "chapters"] as const,
	chapter: (projectId: string, chapter: number) => ["projects", projectId, "chapters", chapter] as const,
	models: ["models"] as const,
	runtimeProfiles: ["runtime", "profiles"] as const,
	forgeSession: (sessionId: string) => ["forge", sessionId, "session"] as const,
	forgeArtifacts: (sessionId: string) => ["forge", sessionId, "artifacts"] as const,
	forgeTask: (taskId: string) => ["tasks", taskId] as const,
};
