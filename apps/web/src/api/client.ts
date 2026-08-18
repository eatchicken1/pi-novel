import type {
	AgentRuntimeProfile,
	ApiError,
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
	RuntimeAgentId,
	RuntimeProfileListResponse,
	SelectDirectionInput,
	SetRuntimeProfileInput,
	TaskEvent,
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
	readonly code: string;
	readonly details: Record<string, unknown> | undefined;

	constructor(message: string, status = 0, code = "API_REQUEST_FAILED", details?: Record<string, unknown>) {
		super(message);
		this.name = "ApiClientError";
		this.status = status;
		this.code = code;
		this.details = details;
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
		let code = "API_REQUEST_FAILED";
		let details: Record<string, unknown> | undefined;
		try {
			const payload = (await response.json()) as { error?: ApiError };
			if (payload.error?.message) message = payload.error.message;
			if (payload.error?.code) code = payload.error.code;
			if (payload.error?.details) details = payload.error.details;
		} catch {
			// Preserve the status-based error when the server did not return JSON.
		}
		throw new ApiClientError(message, response.status, code, details);
	}
	return (await response.json()) as T;
}

export function getApiErrorMessage(error: unknown, fallback = "操作失败"): string {
	if (!(error instanceof ApiClientError)) return error instanceof Error ? error.message : fallback;
	const messages: Record<string, string> = {
		MODEL_AUTH_REQUIRED: "供应商尚未配置可用凭证。",
		RUNTIME_PROFILE_NOT_CONFIGURED: "当前 Agent 尚未配置运行模型。",
		RUNTIME_PROFILE_INVALID: "当前 Agent 的运行模型已不可用，请重新配置。",
		RUNTIME_MODEL_NOT_SELECTABLE: "只能选择已连接供应商提供的模型。",
		PROJECT_FOLDER_EXISTS: "这个作品文件夹已经存在，请换一个名称。",
		FORGE_SESSION_LOCKED: "当前故事阶段已锁定，不能再修改故事设置。",
		FORGE_DNA_REQUIRED: "请先完成创作 DNA，再开始探索方向。",
		FORGE_SESSION_NOT_FOUND: "找不到这个故事工作区。",
	};
	return messages[error.code] ?? (error.message || fallback);
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

export async function compareForgeDirections(sessionId: string): Promise<ForgeTask> {
	return (await request<{ task: ForgeTask }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/compare`, { method: "POST" })).task;
}

export async function recoverForgeMaterialization(sessionId: string): Promise<ForgeSession> {
	return (await request<{ session: ForgeSession }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/materialize/recover`, { method: "POST" })).session;
}

export async function getTaskEvents(taskId: string): Promise<TaskEvent[]> {
	return (await request<{ events: TaskEvent[] }>(`/api/tasks/${encodeURIComponent(taskId)}/events`)).events;
}

export async function getRuntimeProfiles(): Promise<AgentRuntimeProfile[]> {
	return (await request<RuntimeProfileListResponse>("/api/runtime/profiles")).profiles;
}

export async function setRuntimeProfile(agentId: RuntimeAgentId, input: SetRuntimeProfileInput): Promise<AgentRuntimeProfile[]> {
	return (await request<RuntimeProfileListResponse>(`/api/runtime/profiles/${encodeURIComponent(agentId)}`, { method: "PUT", body: JSON.stringify(input) })).profiles;
}

// SSE: use fetch so the local API token is sent with the stream request.
export function openTaskEventStream(taskId: string, onTask: (task: ForgeTask) => void, onError: () => void): () => void {
	const controller = new AbortController();
	const token = import.meta.env.VITE_PI_NOVEL_LOCAL_TOKEN;
	const headers = token ? { "X-Pi-Novel-Token": token } : undefined;
	void readTaskEventStream(`/api/tasks/${encodeURIComponent(taskId)}/events/stream`, headers, controller.signal, onTask).catch(() => {
		if (!controller.signal.aborted) onError();
	});
	return () => controller.abort();
}

async function readTaskEventStream(
	url: string,
	headers: HeadersInit | undefined,
	signal: AbortSignal,
	onTask: (task: ForgeTask) => void,
): Promise<void> {
	const response = await fetch(url, { headers, signal });
	if (!response.ok || response.body === null) throw new ApiClientError(`Task stream failed: ${response.status}`, response.status);

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	while (!signal.aborted) {
		const { done, value } = await reader.read();
		if (done) return;
		buffer += decoder.decode(value, { stream: true });
		const frames = buffer.split(/\r?\n\r?\n/);
		buffer = frames.pop() ?? "";
		for (const frame of frames) {
			const eventName = frame.match(/^event:\s*(.+)$/m)?.[1];
			const data = frame.match(/^data:\s*(.+)$/m)?.[1];
			if (eventName !== "task" || !data) continue;
			onTask(JSON.parse(data) as ForgeTask);
		}
	}
}

export async function getForgeArtifacts(sessionId: string): Promise<ForgeArtifactsResponse> {
	return request<ForgeArtifactsResponse>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/artifacts`);
}

export async function critiqueForgeCandidate(sessionId: string, input: CritiqueDirectionInput): Promise<ForgeTask> {
	return (await request<{ task: ForgeTask }>(`/api/forge/sessions/${encodeURIComponent(sessionId)}/candidate/critique`, { method: "POST", body: JSON.stringify(input) })).task;
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
