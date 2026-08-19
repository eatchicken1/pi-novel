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
	ChapterResource,
	ChapterSummary,
	ChapterDocument,
	ChapterDraft,
	CreateChapterInput,
	ChapterWorkflowSnapshot,
	SaveDraftInput,
	ReconcileInput,
	ReconcileReport,
	ReconcileDecisionInput,
	ChapterSettlement,
	SettlementInput,
	FinalizeChapterInput,
	ChangeSet,
	CreateChangeSetInput,
	BootstrapResponse,
	ProjectCapabilities,
	ReviewListResponse,
	HistoryEntry,
	PatchGenerationInput,
	NovelTask,
} from "@earendil-works/pi-novel-contracts";

export type ApiHealth = { status: "ok"; service: "pi-novel-api" };

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
	if (init?.body !== undefined) headers.set("Content-Type", "application/json");
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
		DRAFT_STALE: "正文已经发生变化，请刷新章节后重试。",
		RECONCILIATION_REQUIRED: "请先完成正文与计划对齐。",
		RECONCILIATION_NOT_DIVERGENT: "当前没有需要处理的分歧。",
		CHANGESET_REQUIRED: "接受创作发现需要先生成故事变更。",
		CHANGESET_NOT_COMMITTED: "请先提交已接受的故事变更。",
		SETTLEMENT_REQUIRED: "请先确认本章结算。",
		FINALIZATION_BLOCKED: "当前章节仍有阻塞问题，暂时不能定稿。",
		CHAPTER_EXTERNAL_MODIFICATION: "章节文件已在外部修改，请刷新后重试。",
		CHAPTER_REVISION_STALE: "章节版本已经过期，请刷新后重试。",
		PATCH_TARGET_CONFLICT: "选中的正文无法唯一定位，请重新加载后再选择。",
		PATCH_BASE_STALE: "选中的正文版本已经过期，请重新加载后再选择。",
		CHANGESET_STALE: "正文已经变化，这项修改需要重新生成。",
		CHANGESET_ALREADY_COMMITTED: "这项修改已经提交。",
		NARRATIVE_PATCH_UNSUPPORTED: "当前作品暂不支持 AI 正文修改。",
		CHANGESET_INVALID_STATE: "这项修改当前不能执行，请先完成上一步确认。",
		CHAPTER_REOPEN_REQUIRED: "继续修改会重新开启章节修订。",
	};
	return messages[error.code] ?? (error.message || fallback);
}

export async function getWorkspace(): Promise<WorkspaceOverview | null> {
	return (await request<WorkspaceResponse>("/api/workspace")).workspace;
}

export async function getHealth(): Promise<ApiHealth> {
	return request<ApiHealth>("/api/health");
}

export async function getBootstrap(): Promise<BootstrapResponse> {
	return request<BootstrapResponse>("/api/bootstrap");
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

export async function getProjectCapabilities(projectId: string): Promise<ProjectCapabilities> {
	return request<ProjectCapabilities>(`/api/projects/${encodeURIComponent(projectId)}/capabilities`);
}

export async function getReview(projectId: string): Promise<ReviewListResponse> {
	return request<ReviewListResponse>(`/api/projects/${encodeURIComponent(projectId)}/review`);
}

export async function updateReviewIssue(projectId: string, issueId: string, action: "acknowledge" | "dismiss"): Promise<void> {
	await request<{ issue: { issueId: string; status: string } }>(`/api/projects/${encodeURIComponent(projectId)}/review/${encodeURIComponent(issueId)}/${action}`, { method: "POST" });
}

export async function getHistory(projectId: string): Promise<HistoryEntry[]> {
	return (await request<{ entries: HistoryEntry[] }>(`/api/projects/${encodeURIComponent(projectId)}/history`)).entries;
}

export async function getChapters(projectId: string): Promise<ChapterSummary[]> {
	return (await request<{ chapters: ChapterSummary[] }>(`/api/projects/${encodeURIComponent(projectId)}/chapters`)).chapters;
}

export async function getChapterResource(projectId: string, chapter: number): Promise<ChapterResource> {
	return (await request<{ chapter: ChapterResource }>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}`)).chapter;
}

export async function createChapter(projectId: string, input: CreateChapterInput): Promise<ChapterDocument> {
	return (await request<{ chapter: ChapterDocument }>(`/api/projects/${encodeURIComponent(projectId)}/chapters`, { method: "POST", body: JSON.stringify(input) })).chapter;
}

export async function saveChapterDraft(projectId: string, chapter: number, input: SaveDraftInput): Promise<ChapterDraft> {
	return request<ChapterDraft>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/draft`, { method: "PUT", body: JSON.stringify(input) });
}

export async function getChapterWorkflow(projectId: string, chapter: number): Promise<ChapterWorkflowSnapshot> {
	return request<ChapterWorkflowSnapshot>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/workflow`);
}

export async function reconcileChapter(projectId: string, chapter: number, input: ReconcileInput): Promise<ReconcileReport> {
	return request<ReconcileReport>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/reconcile`, { method: "POST", body: JSON.stringify(input) });
}

export async function decideChapterReconcile(projectId: string, chapter: number, input: ReconcileDecisionInput): Promise<{ report: ReconcileReport; changeSetId: string | null }> {
	return request<{ report: ReconcileReport; changeSetId: string | null }>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/reconcile/decision`, { method: "POST", body: JSON.stringify(input) });
}

export async function settleChapter(projectId: string, chapter: number, input: SettlementInput): Promise<ChapterSettlement> {
	return request<ChapterSettlement>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/settlement`, { method: "POST", body: JSON.stringify(input) });
}

export async function finalizeChapter(projectId: string, chapter: number, input: FinalizeChapterInput): Promise<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }> {
	return request<{ projectId: string; chapter: number; memoryCommitted: boolean; transactionId: string }>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/finalize`, { method: "POST", body: JSON.stringify(input) });
}

export async function createChangeSet(projectId: string, input: CreateChangeSetInput): Promise<ChangeSet> {
	return (await request<{ changeSet: ChangeSet }>(`/api/projects/${encodeURIComponent(projectId)}/changesets`, { method: "POST", body: JSON.stringify(input) })).changeSet;
}

export async function acceptChangeSet(projectId: string, changeSetId: string, selectedCandidateId?: string): Promise<ChangeSet> {
	return (await request<{ changeSet: ChangeSet }>(`/api/projects/${encodeURIComponent(projectId)}/changesets/${encodeURIComponent(changeSetId)}/accept`, { method: "POST", body: JSON.stringify(selectedCandidateId === undefined ? {} : { selectedCandidateId }) })).changeSet;
}

export async function commitChangeSet(projectId: string, changeSetId: string): Promise<ChangeSet> {
	return (await request<{ changeSet: ChangeSet }>(`/api/projects/${encodeURIComponent(projectId)}/changesets/${encodeURIComponent(changeSetId)}/commit`, { method: "POST", headers: { "X-Idempotency-Key": `chapter-discovery-${changeSetId}` }, body: JSON.stringify({ actor: "user" }) })).changeSet;
}

export async function rejectChangeSet(projectId: string, changeSetId: string): Promise<ChangeSet> {
	return (await request<{ changeSet: ChangeSet }>(`/api/projects/${encodeURIComponent(projectId)}/changesets/${encodeURIComponent(changeSetId)}/reject`, { method: "POST" })).changeSet;
}

export async function getChangeSet(projectId: string, changeSetId: string): Promise<ChangeSet> {
	return (await request<{ changeSet: ChangeSet }>(`/api/projects/${encodeURIComponent(projectId)}/changesets/${encodeURIComponent(changeSetId)}`)).changeSet;
}

export async function generateManuscriptPatch(projectId: string, chapter: number, input: PatchGenerationInput): Promise<ChangeSet> {
	const task = (await request<{ task: NovelTask }>(`/api/projects/${encodeURIComponent(projectId)}/chapters/${chapter}/patches`, { method: "POST", headers: { "X-Idempotency-Key": `narrative-patch-${projectId}-${chapter}-${input.anchor.baseContentHash}-${input.anchor.startOffset}-${input.anchor.endOffset}` }, body: JSON.stringify(input) })).task;
	return waitForNarrativePatchTask(projectId, task);
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

async function waitForNarrativePatchTask(projectId: string, initial: NovelTask): Promise<ChangeSet> {
	return new Promise<ChangeSet>((resolve, reject) => {
		const controller = new AbortController();
		const token = import.meta.env.VITE_PI_NOVEL_LOCAL_TOKEN;
		const headers = token ? { "X-Pi-Novel-Token": token } : undefined;
		void (async () => {
			try {
				const response = await fetch(`/api/tasks/${encodeURIComponent(initial.taskId)}/events/stream`, { headers, signal: controller.signal });
				if (!response.ok || response.body === null) throw new ApiClientError(`Task stream failed: ${response.status}`, response.status);
				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				const processFrames = async (): Promise<boolean> => {
					const frames = buffer.split(/\r?\n\r?\n/);
					buffer = frames.pop() ?? "";
					for (const frame of frames) {
						const eventName = frame.match(/^event:\s*(.+)$/m)?.[1];
						const data = frame.match(/^data:\s*(.+)$/m)?.[1];
						if (eventName !== "task" || !data) continue;
						const task = JSON.parse(data) as NovelTask;
						if (task.status === "succeeded" && task.resultRef !== null) {
							controller.abort();
							resolve(await getChangeSet(projectId, task.resultRef));
							return true;
						}
						if (task.status === "failed" || task.status === "cancelled") {
							controller.abort();
							reject(new ApiClientError(task.errorMessage ?? "Patch task failed", 500, task.errorMessage ?? "PATCH_TASK_FAILED"));
							return true;
						}
					}
					return false;
				};
				while (!controller.signal.aborted) {
					const { done, value } = await reader.read();
					if (value !== undefined) buffer += decoder.decode(value, { stream: !done });
					if (await processFrames()) return;
					if (done) throw new Error("PATCH_TASK_STREAM_ENDED");
				}
			} catch (error) {
				if (!controller.signal.aborted) reject(error);
			}
		})();
	});
}
