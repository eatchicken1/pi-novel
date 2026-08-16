import type { ModelCatalog, ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";

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
	const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...init });
	if (!response.ok) throw new ApiClientError(`API request failed: ${response.status}`, response.status);
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
