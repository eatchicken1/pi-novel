import type {
	CommitForgeInput,
	ConfigureModelApiKeyInput,
	CreateForgeSessionInput,
	CritiqueDirectionInput,
	ForgeArtifactsResponse,
	ForgeSession,
	ForgeTask,
	GenerateDirectionsInput,
	MaterializeForgeInput,
	ModelCatalog,
	ProjectRecord,
	SelectDirectionInput,
	UpdateForgeSessionInput,
	WorkspaceOverview,
} from "@earendil-works/pi-novel-contracts";

interface WorkspaceResponse {
	workspace: WorkspaceOverview | null;
}

interface ProjectsResponse {
	projects: ProjectRecord[];
}

export class ApiClientError extends Error {
	readonly status: number;

	constructor(message: string, status = 0) {
		super(message);
		this.name = "ApiClientError";
		this.status = status;
	}
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
	const headers = new Headers(init?.headers);
	headers.set("Content-Type", "application/json");
	const token = import.meta.env.VITE_PI_NOVEL_LOCAL_TOKEN;
	if (token) headers.set("X-Pi-Novel-Token", token);
	const response = await fetch(url, { ...init, headers });
	if (!response.ok) {
		let message = `API request failed: ${response.status}`;
		try {
			const payload = (await response.json()) as { error?: { message?: string } };
			if (payload.error?.message) message = payload.error.message;
		} catch {
			// Preserve the status-based error when the server did not return JSON.
		}
		throw new ApiClientError(message, response.status);
	}
	return (await response.json()) as T;
}

export async function getWorkspace(): Promise<WorkspaceOverview | null> {
	return (await request<WorkspaceResponse>("/api/workspace")).workspace;
}

export async function initializeWorkspace(path: string): Promise<WorkspaceOverview> {
	return (await request<WorkspaceResponse>("/api/workspace/initialize", { method: "POST", body: JSON.stringify({ path }) })).workspace as WorkspaceOverview;
}

export async function rescanWorkspace(): Promise<WorkspaceOverview> {
	return (await request<WorkspaceResponse>("/api/workspace/rescan", { method: "POST" })).workspace as WorkspaceOverview;
}

export async function getProjects(): Promise<ProjectRecord[]> {
	return (await request<ProjectsResponse>("/api/projects")).projects;
}

export async function getModelCatalog(): Promise<ModelCatalog> {
	return request<ModelCatalog>("/api/models/catalog");
}

export async function configureModelApiKey(input: ConfigureModelApiKeyInput): Promise<ModelCatalog> {
	return request<ModelCatalog>(`/api/models/providers/${encodeURIComponent(input.providerId)}/api-key`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export async function clearModelApiKey(providerId: string): Promise<ModelCatalog> {
	return request<ModelCatalog>(`/api/models/providers/${encodeURIComponent(providerId)}/api-key`, { method: "DELETE" });
}

export async function createForgeSession(input: CreateForgeSessionInput): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>("/api/forge/sessions", { method: "POST", body: JSON.stringify(input) })).session;
}

export async function getForgeSession(sessionId: string): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}`)).session;
}

export async function updateForgeSession(sessionId: string, input: UpdateForgeSessionInput): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}`, { method: "PATCH", body: JSON.stringify(input) })).session;
}

export async function generateForgeDirections(sessionId: string, input: GenerateDirectionsInput): Promise<ForgeTask> {
	return (await request<{ task: ForgeTask }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/directions`, { method: "POST", body: JSON.stringify(input) })).task;
}

export async function regenerateForgeDirections(sessionId: string, input: GenerateDirectionsInput): Promise<ForgeTask> {
	return (await request<{ task: ForgeTask }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/regenerate`, { method: "POST", body: JSON.stringify(input) })).task;
}

export async function getForgeArtifacts(sessionId: string): Promise<ForgeArtifactsResponse> {
	return request<ForgeArtifactsResponse>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/artifacts`);
}

export async function critiqueForgeCandidate(sessionId: string, input: CritiqueDirectionInput): Promise<ForgeArtifactsResponse> {
	return request<ForgeArtifactsResponse>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/candidate/critique`, { method: "POST", body: JSON.stringify(input) });
}

export async function selectForgeDirection(sessionId: string, input: SelectDirectionInput): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/selection`, { method: "POST", body: JSON.stringify(input) })).session;
}

export async function commitForgeSession(sessionId: string, input: CommitForgeInput): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/commit`, { method: "POST", body: JSON.stringify(input) })).session;
}

export async function materializeForgeSession(sessionId: string, input: MaterializeForgeInput): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/materialize`, { method: "POST", body: JSON.stringify(input) })).session;
}

export async function getForgeTask(taskId: string): Promise<ForgeTask> {
	return (await request<{ task: ForgeTask }>(`/api/tasks/${encodeURIComponent(taskId)}`)).task;
}
