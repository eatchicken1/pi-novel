import { BookOpen, ChevronDown, Compass, Cpu, FileText, Search, Settings2, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, Outlet, useOutletContext } from "react-router-dom";
import type { ModelCatalog, ModelCatalogEntry, ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";
import { getModelCatalog, getProjects, getWorkspace, initializeWorkspace, rescanWorkspace } from "../api/client.ts";
import { novelQueryKeys } from "../api/query-keys.ts";
import { AuthModelPanel, type RuntimePanelMode } from "../features/settings/AuthModelPanel.tsx";
import { WorkspaceOnboarding } from "../features/workspace/WorkspaceOnboarding.tsx";

const EMPTY_CATALOG: ModelCatalog = { providers: [], defaultModelId: null };

export interface AppShellContext {
	overview: WorkspaceOverview;
	catalog: ModelCatalog;
	selectedModel: ModelCatalogEntry | null;
	onOpenProject(project: ProjectRecord): void;
	onNavigate(path: string): void;
	onRescan(): Promise<void>;
	onSelectModel(model: ModelCatalogEntry): void;
}

export function useAppShellContext(): AppShellContext {
	return useOutletContext<AppShellContext>();
}

export function AppShell() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const location = useLocation();
	const [runtimePanelMode, setRuntimePanelMode] = useState<RuntimePanelMode | null>(null);
	const [selectedModelId, setSelectedModelId] = useState<string | null>(() => window.localStorage.getItem("pi-novel:selected-model"));
	const workspaceQuery = useQuery({
		queryKey: novelQueryKeys.workspace,
		queryFn: async () => {
			const workspace = await getWorkspace();
			if (workspace) return workspace;
			const savedPath = window.localStorage.getItem("pi-novel:workspace-path");
			return savedPath ? initializeWorkspace(savedPath) : null;
		},
	});
	const projectsQuery = useQuery({
		queryKey: novelQueryKeys.projects,
		queryFn: getProjects,
		enabled: Boolean(workspaceQuery.data),
	});
	const catalogQuery = useQuery({ queryKey: novelQueryKeys.models, queryFn: getModelCatalog });
	const initializeMutation = useMutation({
		mutationFn: async (path: string) => ({ path, workspace: await initializeWorkspace(path) }),
		onSuccess: async ({ path, workspace }) => {
			window.localStorage.setItem("pi-novel:workspace-path", path);
			queryClient.setQueryData(novelQueryKeys.workspace, workspace);
			queryClient.setQueryData(novelQueryKeys.projects, workspace.projects);
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

	const workspace = workspaceQuery.data;
	const catalog = catalogQuery.data ?? EMPTY_CATALOG;
	const overview = workspace ? { ...workspace, projects: projectsQuery.data ?? workspace.projects } : null;
	const selectedModel = findModel(catalog, selectedModelId);

	useEffect(() => {
		if (selectedModelId || !catalog.defaultModelId) return;
		setSelectedModelId(catalog.defaultModelId);
		window.localStorage.setItem("pi-novel:selected-model", catalog.defaultModelId);
	}, [catalog.defaultModelId, selectedModelId]);

	function openProject(project: ProjectRecord): void {
		window.localStorage.setItem("pi-novel:selected-project", project.projectId);
		navigate(`/project/${encodeURIComponent(project.projectId)}/manuscript`);
	}

	function selectModel(model: ModelCatalogEntry): void {
		const id = `${model.providerId}/${model.modelId}`;
		setSelectedModelId(id);
		window.localStorage.setItem("pi-novel:selected-model", id);
		setRuntimePanelMode(null);
	}

	if (workspaceQuery.isPending) return <div className="loading-screen"><Sparkles size={18} /> 正在连接 Workspace…</div>;
	if (!overview) {
		return <WorkspaceOnboarding apiUnavailable={workspaceQuery.isError} onInitialize={(path) => initializeMutation.mutateAsync(path).then(() => undefined)} />;
	}

	const context: AppShellContext = {
		overview,
		catalog,
		selectedModel,
		onOpenProject: openProject,
		onNavigate: navigate,
		onRescan: () => rescanMutation.mutateAsync().then(() => undefined),
		onSelectModel: selectModel,
	};
	const isLibrary = location.pathname.startsWith("/library");
	return (
		<div className="app-shell">
			<div className="shell-body">
				<aside className="app-rail">
					<div className="rail-workspace"><div className="rail-brand"><Sparkles size={15} /> Pi-Novel</div><div className="rail-path"><span>工作区</span><strong>{compactPath(overview.manifest.rootPath)}</strong><Compass size={14} /></div></div>
					<nav className="rail-nav"><NavItem icon={<FileText size={16} />} label="起笔" active={location.pathname === "/"} onClick={() => navigate("/")} /><NavItem icon={<BookOpen size={16} />} label="作品" active={isLibrary} onClick={() => navigate("/library")} /><NavItem icon={<Search size={16} />} label="搜索" active={false} onClick={() => navigate("/library")} /><NavItem icon={<Settings2 size={16} />} label="设置" active={location.pathname === "/settings"} onClick={() => navigate("/settings")} /></nav>
					<button className="rail-user" onClick={() => setRuntimePanelMode("auth")}><div className="avatar"><UserRound size={15} /></div><div><strong>本地作者</strong><span>供应商与模型</span></div></button>
				</aside>
				<main className="main-content">
					<div className="workspace-toolbar"><div className="toolbar-context"><span className="toolbar-kicker">PI-NOVEL WORKSPACE</span><strong>{compactPath(overview.manifest.rootPath)}</strong></div><div className="toolbar-actions"><span className="policy-note"><span className="status-dot green" /> 作者为权威</span><button className="model-trigger" onClick={() => setRuntimePanelMode("models")}><span className="toolbar-action-icon"><Cpu size={15} /></span><span><small>当前模型</small><strong>{selectedModel?.name ?? "选择模型"}</strong></span><ChevronDown size={14} /></button><button className="auth-trigger" onClick={() => setRuntimePanelMode("auth")}><UserRound size={15} /><span>供应商登录</span><em>0/{catalog.providers.length || 7}</em></button></div></div>
					<Outlet context={context} />
				</main>
			</div>
			{runtimePanelMode && <AuthModelPanel mode={runtimePanelMode} catalog={catalog} selectedModel={selectedModel} onModeChange={setRuntimePanelMode} onSelectModel={selectModel} onClose={() => setRuntimePanelMode(null)} />}
		</div>
	);
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) {
	return <button className={`rail-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function compactPath(path: string): string {
	const parts = path.split(/[\\/]/).filter(Boolean);
	return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path;
}

function findModel(catalog: ModelCatalog, modelId: string | null): ModelCatalogEntry | null {
	if (!modelId) return null;
	for (const provider of catalog.providers) {
		const model = provider.models.find((entry) => `${entry.providerId}/${entry.modelId}` === modelId);
		if (model) return model;
	}
	return null;
}
