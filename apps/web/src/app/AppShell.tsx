import { BookOpen, Check, ChevronDown, Compass, Cpu, FileText, Search, Settings2, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Outlet, useOutletContext } from "react-router-dom";
import type {
	AgentRuntimeProfile,
	ConfigureModelApiKeyInput,
	CreateForgeSessionInput,
	ModelCatalog,
	ModelCatalogEntry,
	ProjectRecord,
	RuntimeAgentId,
	SetRuntimeProfileInput,
	WorkspaceOverview,
} from "@earendil-works/pi-novel-contracts";
import { clearModelApiKey, configureModelApiKey, createForgeSession, getApiErrorMessage, getBootstrap, getHealth, getModelCatalog, getProjects, getRuntimeProfiles, getWorkspace, initializeWorkspace, rescanWorkspace, setRuntimeProfile } from "../api/client.ts";
import { novelQueryKeys } from "../api/query-keys.ts";
import { AuthModelPanel } from "../features/settings/AuthModelPanel.tsx";
import { WorkspaceSetupDialog } from "../features/workspace/WorkspaceOnboarding.tsx";

const EMPTY_CATALOG: ModelCatalog = { providers: [] };

export interface AppShellContext {
	overview: WorkspaceOverview | null;
	catalog: ModelCatalog;
	profiles: AgentRuntimeProfile[];
	runtimeAgentId: RuntimeAgentId;
	onSetRuntimeAgentId(agentId: RuntimeAgentId): void;
	onSetRuntimeProfile(agentId: RuntimeAgentId, input: SetRuntimeProfileInput): Promise<void>;
	onOpenProviders(providerId?: string): void;
	onOpenRuntime(agentId?: RuntimeAgentId): void;
	onOpenProject(project: ProjectRecord): void;
	onNavigate(path: string): void;
	onRescan(): Promise<void>;
	onConfigureApiKey(input: ConfigureModelApiKeyInput): Promise<void>;
	onClearApiKey(providerId: string): Promise<void>;
	onCreateForgeSession(input: CreateForgeSessionInput): Promise<void>;
	onOpenWorkspaceSetup(): void;
}

export function useAppShellContext(): AppShellContext {
	return useOutletContext<AppShellContext>();
}

const RUNTIME_AGENT_LABELS: Record<RuntimeAgentId, string> = {
	"forge.explorer": "Forge Explorer",
	"forge.comparator": "Forge Comparator",
	"forge.critic": "Forge Critic",
	"chapter.planner": "Chapter Planner",
	"chapter.writer": "Chapter Writer",
	"chapter.reviser": "Chapter Reviser",
	"manuscript.reviewer": "Manuscript Reviewer",
};

export function AppShell() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const [providerPanelOpen, setProviderPanelOpen] = useState(false);
	const [providerPanelInitial, setProviderPanelInitial] = useState<string | undefined>(undefined);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [workspaceSetupOpen, setWorkspaceSetupOpen] = useState(false);
	const [runtimeAgentId, setRuntimeAgentId] = useState<RuntimeAgentId>("forge.explorer");
	const pendingAction = useRef<(() => Promise<void>) | null>(null);
	const defaultRuntimeAgentId = runtimeAgentForPath(location.pathname);
	useEffect(() => {
		if (!pickerOpen && !providerPanelOpen) return;
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setPickerOpen(false);
				setProviderPanelOpen(false);
			}
		};
		document.addEventListener("keydown", closeOnEscape);
		const previousOverflow = document.body.style.overflow;
		if (providerPanelOpen) document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", closeOnEscape);
			if (providerPanelOpen) document.body.style.overflow = previousOverflow;
		};
	}, [pickerOpen, providerPanelOpen]);
	useEffect(() => {
		if (defaultRuntimeAgentId) setRuntimeAgentId(defaultRuntimeAgentId);
	}, [defaultRuntimeAgentId]);
	const healthQuery = useQuery({ queryKey: ["health"], queryFn: getHealth, retry: false });
	const bootstrapQuery = useQuery({ queryKey: novelQueryKeys.bootstrap, queryFn: getBootstrap, retry: false, enabled: healthQuery.data?.status === "ok" });
	const workspaceQuery = useQuery({
		queryKey: novelQueryKeys.workspace,
		queryFn: async () => {
			const workspace = await getWorkspace();
			if (workspace) return workspace;
			const savedPath = window.localStorage.getItem("pi-novel:workspace-path");
			return savedPath ? initializeWorkspace(savedPath) : null;
		},
		retry: false,
		enabled: healthQuery.data?.status === "ok",
	});
	const projectsQuery = useQuery({
		queryKey: novelQueryKeys.projects,
		queryFn: getProjects,
		enabled: Boolean(workspaceQuery.data),
	});
	const catalogQuery = useQuery({ queryKey: novelQueryKeys.models, queryFn: getModelCatalog });
	const profilesQuery = useQuery({ queryKey: novelQueryKeys.runtimeProfiles, queryFn: getRuntimeProfiles, enabled: Boolean(workspaceQuery.data) });
	const initializeMutation = useMutation({
		mutationFn: async (path: string) => ({ path, workspace: await initializeWorkspace(path) }),
		 onSuccess: async ({ path, workspace }) => {
			window.localStorage.setItem("pi-novel:workspace-path", path);
			queryClient.setQueryData(novelQueryKeys.workspace, workspace);
			queryClient.setQueryData(novelQueryKeys.projects, workspace.projects);
			queryClient.setQueryData(novelQueryKeys.bootstrap, { api: "ready", workspace: { status: "ready", summary: workspace }, runtime: { configured: false } });
			const continuation = pendingAction.current;
			pendingAction.current = null;
			if (continuation !== null) { await continuation(); return; }
			await navigate("/");
		},
	});
	const rescanMutation = useMutation({
		mutationFn: rescanWorkspace,
		onSuccess: (workspace) => {
			queryClient.setQueryData(novelQueryKeys.workspace, workspace);
			queryClient.setQueryData(novelQueryKeys.projects, workspace.projects);
		},
	});
	const configureApiKeyMutation = useMutation({
		mutationFn: configureModelApiKey,
		onSuccess: (catalog) => {
		queryClient.setQueryData(novelQueryKeys.models, catalog);
		if (pendingAction.current !== null) {
			setProviderPanelOpen(false);
			setPickerOpen(true);
		}
	},
	});
	const clearApiKeyMutation = useMutation({
		mutationFn: clearModelApiKey,
		onSuccess: (catalog) => queryClient.setQueryData(novelQueryKeys.models, catalog),
	});
	const setProfileMutation = useMutation({
		mutationFn: ({ agentId, input }: { agentId: RuntimeAgentId; input: SetRuntimeProfileInput }) => setRuntimeProfile(agentId, input),
		onSuccess: (profiles) => queryClient.setQueryData(novelQueryKeys.runtimeProfiles, profiles),
	});
	const createForgeMutation = useMutation({
		mutationFn: createForgeSession,
		onSuccess: (session) => navigate(`/forge/${session.forgeSessionId}`),
	});

	const workspace = bootstrapQuery.data?.workspace.summary ?? workspaceQuery.data;
	const catalog = catalogQuery.data ?? EMPTY_CATALOG;
	const profiles = profilesQuery.data ?? [];
	const overview = workspace ? { ...workspace, projects: projectsQuery.data ?? workspace.projects } : null;
	const bootstrapState = healthQuery.isPending || (healthQuery.data?.status === "ok" && bootstrapQuery.isPending)
		? "BOOTING"
		: healthQuery.isError
			? "API_OFFLINE"
			: bootstrapQuery.isError && (bootstrapQuery.error instanceof Error && "status" in bootstrapQuery.error && bootstrapQuery.error.status === 401)
				? "SESSION_INVALID"
				: overview === null
					? "WORKSPACE_UNSET"
					: "READY";
	useEffect(() => {
		if (workspace?.manifest.rootPath) void queryClient.invalidateQueries({ queryKey: novelQueryKeys.models });
	}, [queryClient, workspace?.manifest.rootPath]);

	function openProject(project: ProjectRecord): void {
		window.localStorage.setItem("pi-novel:selected-project", project.projectId);
		navigate(`/project/${encodeURIComponent(project.projectId)}/manuscript`);
	}

	async function applyProfile(agentId: RuntimeAgentId, input: SetRuntimeProfileInput): Promise<void> {
		await setProfileMutation.mutateAsync({ agentId, input });
		setPickerOpen(false);
		const continuation = pendingAction.current;
		pendingAction.current = null;
		if (continuation !== null) await continuation();
	}

	async function ensureWorkspace(): Promise<boolean> {
		if (overview !== null) return true;
		setWorkspaceSetupOpen(true);
		return false;
	}

	async function ensureForgeRuntime(): Promise<boolean> {
		if (profiles.some((profile) => profile.agentId === "forge.explorer")) return true;
		setRuntimeAgentId("forge.explorer");
		setPickerOpen(true);
		return false;
	}

	async function guardedForge(input: CreateForgeSessionInput): Promise<void> {
		const continuation = async () => {
			if (!(await ensureForgeRuntime())) { pendingAction.current = async () => { await createForgeMutation.mutateAsync(input); }; return; }
			await createForgeMutation.mutateAsync(input);
		};
		if (!(await ensureWorkspace())) { pendingAction.current = continuation; return; }
		if (!(await ensureForgeRuntime())) { pendingAction.current = continuation; return; }
		await continuation();
	}

	const context: AppShellContext = {
		overview,
		catalog,
		profiles,
		runtimeAgentId,
		onSetRuntimeAgentId: setRuntimeAgentId,
		onSetRuntimeProfile: applyProfile,
		onOpenProviders: (providerId) => { setProviderPanelInitial(providerId); setProviderPanelOpen(true); },
		onOpenRuntime: (agentId) => { if (agentId) setRuntimeAgentId(agentId); setPickerOpen(true); },
		onOpenProject: openProject,
		onNavigate: navigate,
		onRescan: () => rescanMutation.mutateAsync().then(() => undefined),
		onConfigureApiKey: (input) => configureApiKeyMutation.mutateAsync(input).then(() => undefined),
		onClearApiKey: (providerId) => clearApiKeyMutation.mutateAsync(providerId).then(() => undefined),
		onCreateForgeSession: guardedForge,
		onOpenWorkspaceSetup: () => setWorkspaceSetupOpen(true),
	};
	const isLibraryArea = location.pathname.startsWith("/library") || location.pathname.startsWith("/project/");
	const isSettings = location.pathname === "/settings";
	return (
		<div className="app-shell">
			<BootstrapBanner state={bootstrapState} onReconnect={() => { void healthQuery.refetch(); void workspaceQuery.refetch(); }} />
			<div className="shell-body">
				<aside className="app-rail">
					<div className="rail-workspace"><div className="rail-brand"><Sparkles size={15} /> Pi-Novel</div><div className="rail-path"><span>工作区</span><strong>{overview ? compactPath(overview.manifest.rootPath) : "尚未设置"}</strong><Compass size={14} /></div></div>
					<nav className="rail-nav"><NavItem icon={<FileText size={16} />} label="起笔" active={location.pathname === "/"} onClick={() => navigate("/")} /><NavItem icon={<BookOpen size={16} />} label="作品" active={isLibraryArea} onClick={() => navigate("/library")} /><NavItem icon={<Settings2 size={16} />} label="设置" active={isSettings} onClick={() => navigate("/settings")} /></nav>
					<div className="rail-user"><div className="avatar"><UserRound size={15} /></div><div><strong>本地作者</strong><span>运行时统一入口</span></div></div>
				</aside>
				<main className="main-content">
					<div className="workspace-toolbar"><div className="toolbar-context"><span className="toolbar-kicker">PI-NOVEL WORKSPACE</span><strong>{overview ? compactPath(overview.manifest.rootPath) : "尚未设置"}</strong></div><div className="toolbar-actions"><span className="policy-note"><span className="status-dot green" /> 作者为权威</span><RuntimePickerTrigger activeAgentId={defaultRuntimeAgentId ? runtimeAgentId : null} agentId={runtimeAgentId} catalog={catalog} profiles={profiles} open={pickerOpen} onToggle={() => setPickerOpen((open) => !open)} /></div></div>
					<Outlet context={context} />
				</main>
			</div>
			{pickerOpen && <RuntimePicker catalog={catalog} profiles={profiles} agentId={runtimeAgentId} onAgentChange={setRuntimeAgentId} onApply={applyProfile} onManageProviders={() => { setPickerOpen(false); setProviderPanelInitial(undefined); setProviderPanelOpen(true); }} onClose={() => setPickerOpen(false)} />}
			{providerPanelOpen && <AuthModelPanel catalog={catalog} initialProviderId={providerPanelInitial} onConfigureApiKey={(input) => configureApiKeyMutation.mutateAsync(input).then(() => undefined)} onClearApiKey={(providerId) => clearApiKeyMutation.mutateAsync(providerId).then(() => undefined)} onClose={() => { setProviderPanelOpen(false); setProviderPanelInitial(undefined); }} />}
			{workspaceSetupOpen && <WorkspaceSetupDialog onInitialize={(path) => initializeMutation.mutateAsync(path).then(() => setWorkspaceSetupOpen(false))} onClose={() => setWorkspaceSetupOpen(false)} />}
		</div>
	);
}

function BootstrapBanner({ state, onReconnect }: { state: "BOOTING" | "API_OFFLINE" | "SESSION_INVALID" | "WORKSPACE_UNSET" | "READY"; onReconnect: () => void }) {
	if (state === "READY") return null;
	const message = state === "BOOTING" ? "正在连接本地服务…" : state === "API_OFFLINE" ? "本地服务未连接。" : state === "SESSION_INVALID" ? "本地会话已失效。" : "Workspace 尚未设置。";
	return <div className={`bootstrap-banner ${state.toLowerCase()}`} role="status"><span>{message}</span>{state !== "BOOTING" && <button className="text-button" type="button" onClick={onReconnect}>重新连接</button>}</div>;
}

function RuntimePickerTrigger({ activeAgentId, agentId, catalog, profiles, open, onToggle }: { activeAgentId: RuntimeAgentId | null; agentId: RuntimeAgentId; catalog: ModelCatalog; profiles: AgentRuntimeProfile[]; open: boolean; onToggle: () => void }) {
	const profile = profiles.find((entry) => entry.agentId === agentId) ?? null;
	const model = profile ? findModel(catalog, profile.modelId) : null;
	const invalid = profile !== null && model === null;
	const label = activeAgentId ? `当前操作 · ${RUNTIME_AGENT_LABELS[activeAgentId]}` : "Runtime 快速配置";
	const activeProfile = activeAgentId ? profiles.find((entry) => entry.agentId === activeAgentId) ?? null : null;
	const activeModel = activeProfile ? findModel(catalog, activeProfile.modelId) : null;
	return <button className="model-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={onToggle}><span className="toolbar-action-icon"><Cpu size={15} /></span><span><small>{label}</small><strong>{activeAgentId ? (activeModel ? `${activeModel.name} · ${thinkingLevelLabel(activeProfile?.thinkingLevel ?? "off")}` : "未配置运行时") : "管理运行配置"}</strong></span><ChevronDown size={14} className={open ? "chevron-up" : ""} /></button>;
}

function RuntimePicker({ catalog, profiles, agentId, onAgentChange, onApply, onManageProviders, onClose }: {
	catalog: ModelCatalog;
	profiles: AgentRuntimeProfile[];
	agentId: RuntimeAgentId;
	onAgentChange(agentId: RuntimeAgentId): void;
	onApply(agentId: RuntimeAgentId, input: SetRuntimeProfileInput): Promise<void>;
	onManageProviders(): void;
	onClose(): void;
}) {
	const connectedProviders = catalog.providers.filter((provider) => provider.status === "connected");
	const profile = profiles.find((entry) => entry.agentId === agentId) ?? null;
	const connectedModels = useMemo(() => useModelsOf(connectedProviders), [catalog]);
	const currentModel = profile ? findModel(catalog, profile.modelId) : null;
	const [modelId, setModelId] = useState(profile?.modelId ?? (connectedModels[0] ? `${connectedModels[0].providerId}/${connectedModels[0].modelId}` : ""));
	const [thinkingLevel, setThinkingLevel] = useState(profile?.thinkingLevel ?? "off");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		const profileModel = profile?.modelId && connectedModels.some((model) => `${model.providerId}/${model.modelId}` === profile.modelId) ? profile.modelId : null;
		const firstConnectedModel = connectedModels[0];
		const nextModelId = profileModel ?? (firstConnectedModel ? `${firstConnectedModel.providerId}/${firstConnectedModel.modelId}` : "");
		const nextModel = findModel(catalog, nextModelId);
		setModelId(nextModelId);
		setThinkingLevel(profileModel === nextModelId ? profile?.thinkingLevel ?? "off" : nextModel?.thinkingLevels[0] ?? "off");
		setError(null);
	}, [agentId, catalog, connectedModels, profile?.modelId, profile?.thinkingLevel]);
	const selectedModel = findModel(catalog, modelId);
	const levels = selectedModel?.thinkingLevels ?? ["off"];
	const modelInvalid = profile !== null && currentModel === null;
	const canApply = connectedModels.length > 0 && modelId !== "" && selectedModel !== null;
	const [modelSearch, setModelSearch] = useState("");
	const [modelMenuOpen, setModelMenuOpen] = useState(false);
	const filteredModels = useMemo(() => {
		const query = modelSearch.trim().toLowerCase();
		return connectedModels.filter((model) => `${model.name} ${model.providerId} ${model.modelId}`.toLowerCase().includes(query));
	}, [connectedModels, modelSearch]);

	async function save(): Promise<void> {
		if (!canApply) return;
		setSaving(true); setError(null);
		try {
			await onApply(agentId, { modelId, thinkingLevel });
		} catch (cause) {
			setError(getApiErrorMessage(cause, "保存失败"));
			setSaving(false);
		}
	}

	const popoverRef = useRef<HTMLElement>(null);
	useEffect(() => {
		function closeOnOutsidePointer(event: PointerEvent): void {
			if (event.target instanceof Element && event.target.closest(".model-trigger")) return;
			if (event.target instanceof Node && !popoverRef.current?.contains(event.target)) onClose();
		}
		document.addEventListener("pointerdown", closeOnOutsidePointer);
		return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
	}, [onClose]);

	return <div className="runtime-popover-layer"><section ref={popoverRef} className="runtime-popover" role="dialog" aria-labelledby="runtime-picker-title">
		<header className="runtime-popover-header"><div><p className="eyebrow">AGENT RUNTIME</p><h3 id="runtime-picker-title">Agent 运行配置</h3></div><button className="icon-button" type="button" aria-label="关闭运行配置" onClick={onClose}><X size={15} /></button></header>
		{connectedProviders.length === 0 ? <div className="runtime-popover-empty"><Cpu size={20} /><strong>未配置运行时</strong><p>连接一个供应商后，才能为 Agent 选择模型。</p><button className="primary-button" onClick={onManageProviders}>配置供应商</button></div> : <>
			<label className="runtime-field">配置 Agent<select value={agentId} onChange={(event) => onAgentChange(event.target.value as RuntimeAgentId)}>{Object.entries(RUNTIME_AGENT_LABELS).filter(([id]) => isImplementedAgent(id)).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
			<div className="runtime-field"><span>模型</span><button className="runtime-model-trigger" type="button" aria-expanded={modelMenuOpen} onClick={() => setModelMenuOpen((open) => !open)}>{selectedModel ? `${selectedModel.name} · ${selectedModel.providerId}` : "选择模型"}<ChevronDown size={14} /></button>{modelMenuOpen && <div className="runtime-model-menu"><div className="runtime-model-search"><Search size={14} /><input autoFocus value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} placeholder="搜索已连接模型" /></div>{filteredModels.length === 0 ? <p className="runtime-model-empty">没有匹配的已连接模型。</p> : filteredModels.map((model) => { const value = `${model.providerId}/${model.modelId}`; return <button className={`runtime-model-option ${value === modelId ? "selected" : ""}`} type="button" key={value} onClick={() => { setModelId(value); setThinkingLevel(model.thinkingLevels[0] ?? "off"); setModelMenuOpen(false); setModelSearch(""); }}><span><strong>{model.name}</strong><small>{model.providerId} · {model.contextWindow.toLocaleString()} context</small></span>{value === modelId && <Check size={14} />}</button>; })}</div>}</div>
			<div className="runtime-field"><span>思考强度</span><div className="thinking-options" role="group" aria-label="思考强度">{levels.map((level) => <button className={level === thinkingLevel ? "selected" : ""} type="button" key={level} onClick={() => setThinkingLevel(level as SetRuntimeProfileInput["thinkingLevel"])}>{thinkingLevelLabel(level)}</button>)}</div></div>
			{modelInvalid && <div className="inline-alert"><Cpu size={13} /> 当前配置的模型不再可用（供应商未连接）；请重新选择。</div>}
			{error && <div className="inline-alert"><Cpu size={13} /> {error}</div>}
			<div className="runtime-popover-actions"><button className="primary-button" onClick={save} disabled={saving || !canApply}>{saving ? "保存中…" : "应用配置"}</button><button className="quiet-button" onClick={onManageProviders}>管理供应商 →</button></div>
			<p className="runtime-popover-note">配置保存在 workspace.sqlite，重启后恢复。</p>
		</>}
	</section></div>;
}

function useModelsOf(providers: { providerId: string; models: ModelCatalogEntry[] }[]): ModelCatalogEntry[] {
	return providers.flatMap((provider) => provider.models.map((model) => ({ ...model, providerId: provider.providerId })));
}

function isImplementedAgent(agentId: string): boolean {
	return agentId === "forge.explorer" || agentId === "forge.comparator" || agentId === "forge.critic";
}

function thinkingLevelLabel(level: string): string {
	return ({ off: "Off（不思考）", minimal: "Minimal", low: "Low", medium: "Medium", high: "High", xhigh: "X-High", max: "Max" })[level] ?? level;
}

function runtimeAgentForPath(pathname: string): RuntimeAgentId | null {
	if (pathname.startsWith("/forge/")) return "forge.explorer";
	return null;
}

function NavItem({ icon, label, active, disabled, title, onClick }: { icon: ReactNode; label: string; active: boolean; disabled?: boolean; title?: string; onClick: () => void }) {
	return <button className={`rail-item ${active ? "active" : ""} ${disabled ? "disabled" : ""}`} type="button" aria-label={label} aria-current={active ? "page" : undefined} disabled={disabled} title={title} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function compactPath(path: string): string {
	const parts = path.split(/[\\/]/).filter(Boolean);
	return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path;
}

function findModel(catalog: ModelCatalog, modelId: string): ModelCatalogEntry | null {
	for (const provider of catalog.providers) {
		const model = provider.models.find((entry) => `${entry.providerId}/${entry.modelId}` === modelId);
		if (model) return model;
	}
	return null;
}
