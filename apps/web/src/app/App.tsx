import { BookOpen, ChevronDown, Compass, Cpu, FileText, Search, Settings2, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { ModelCatalog, ModelCatalogEntry, ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";
import { getModelCatalog, getWorkspace, initializeWorkspace, rescanWorkspace } from "../api/client.ts";
import { routeFromPath, pathForRoute, type AppRoute } from "./router.tsx";
import { LibraryPage } from "../features/library/LibraryPage.tsx";
import { AuthModelPanel, type RuntimePanelMode } from "../features/settings/AuthModelPanel.tsx";
import { StudioPage } from "../features/studio/StudioPage.tsx";
import { WorkspaceHome } from "../features/workspace/WorkspaceHome.tsx";
import { WorkspaceOnboarding } from "../features/workspace/WorkspaceOnboarding.tsx";

export function App() {
	const [workspace, setWorkspace] = useState<WorkspaceOverview | null>(null);
	const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("projectId") ?? window.localStorage.getItem("pi-novel:selected-project"));
	const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
	const [route, setRoute] = useState<AppRoute>(() => routeFromPath(window.location.pathname));
	const [loading, setLoading] = useState(true);
	const [apiUnavailable, setApiUnavailable] = useState(false);
	const [catalog, setCatalog] = useState<ModelCatalog>({ providers: [], defaultModelId: null });
	const [selectedModelId, setSelectedModelId] = useState<string | null>(() => window.localStorage.getItem("pi-novel:selected-model"));
	const [runtimePanelMode, setRuntimePanelMode] = useState<RuntimePanelMode | null>(null);

	useEffect(() => {
		void getWorkspace().then(async (value) => {
			if (value) return value;
			const savedPath = window.localStorage.getItem("pi-novel:workspace-path");
			return savedPath ? initializeWorkspace(savedPath) : null;
		}).then((value) => setWorkspace(value)).catch(() => setApiUnavailable(true)).finally(() => setLoading(false));
	}, []);
	useEffect(() => { void getModelCatalog().then(setCatalog).catch(() => undefined); }, []);
	useEffect(() => {
		if (selectedModelId || !catalog.defaultModelId) return;
		setSelectedModelId(catalog.defaultModelId);
	}, [catalog.defaultModelId, selectedModelId]);
	useEffect(() => {
		if (!workspace || !selectedProjectId) return;
		setSelectedProject(workspace.projects.find((project) => project.projectId === selectedProjectId) ?? null);
	}, [selectedProjectId, workspace]);
	useEffect(() => {
		const onPopState = () => {
			setRoute(routeFromPath(window.location.pathname));
			setSelectedProjectId(new URLSearchParams(window.location.search).get("projectId"));
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, []);

	function navigate(nextRoute: AppRoute): void {
		window.history.pushState({}, "", pathForRoute(nextRoute));
		setRoute(nextRoute);
	}

	function openProject(project: ProjectRecord): void { setSelectedProject(project); setSelectedProjectId(project.projectId); window.localStorage.setItem("pi-novel:selected-project", project.projectId); window.history.pushState({}, "", `/studio?projectId=${encodeURIComponent(project.projectId)}`); setRoute("studio"); }

	async function initialize(path: string): Promise<void> { const next = await initializeWorkspace(path); window.localStorage.setItem("pi-novel:workspace-path", path); setWorkspace(next); setApiUnavailable(false); navigate("home"); }
	async function rescan(): Promise<void> { setWorkspace(await rescanWorkspace()); }
	function selectModel(model: ModelCatalogEntry): void { const id = `${model.providerId}/${model.modelId}`; setSelectedModelId(id); window.localStorage.setItem("pi-novel:selected-model", id); setRuntimePanelMode(null); }
	const selectedModel = findModel(catalog, selectedModelId);

	if (loading) return <div className="loading-screen"><Sparkles size={18} /> 正在连接 Workspace…</div>;
	if (!workspace) return <WorkspaceOnboarding apiUnavailable={apiUnavailable} onInitialize={initialize} />;

	return <div className="app-shell"><div className="shell-body"><aside className="app-rail"><div className="rail-workspace"><div className="rail-brand"><Sparkles size={15} /> Pi-Novel</div><div className="rail-path"><span>工作区</span><strong>{compactPath(workspace.manifest.rootPath)}</strong><Compass size={14} /></div></div><nav className="rail-nav"><NavItem icon={<PenIcon />} label="起笔" active={route === "home"} onClick={() => navigate("home")} /><NavItem icon={<BookOpen size={16} />} label="作品" active={route === "library"} onClick={() => navigate("library")} /><NavItem icon={<Search size={16} />} label="搜索" active={false} onClick={() => navigate("library")} /><NavItem icon={<Settings2 size={16} />} label="设置" active={false} onClick={() => setRuntimePanelMode("auth")} /></nav><button className="rail-user" onClick={() => setRuntimePanelMode("auth")}><div className="avatar"><UserRound size={15} /></div><div><strong>本地作者</strong><span>供应商与模型</span></div></button></aside><main className="main-content"><div className="workspace-toolbar"><div className="toolbar-context"><span className="toolbar-kicker">PI-NOVEL WORKSPACE</span><strong>{compactPath(workspace.manifest.rootPath)}</strong></div><div className="toolbar-actions"><span className="policy-note"><span className="status-dot green" /> 作者为权威</span><button className="model-trigger" onClick={() => setRuntimePanelMode("models")}><span className="toolbar-action-icon"><Cpu size={15} /></span><span><small>当前模型</small><strong>{selectedModel?.name ?? "选择模型"}</strong></span><ChevronDown size={14} /></button><button className="auth-trigger" onClick={() => setRuntimePanelMode("auth")}><UserRound size={15} /><span>供应商登录</span><em>0/{catalog.providers.length || 7}</em></button></div></div>{route === "home" && <WorkspaceHome overview={workspace} onNavigate={navigate} onOpenProject={openProject} onRescan={rescan} />}{route === "library" && <LibraryPage overview={workspace} onOpenProject={openProject} onRescan={rescan} />}{route === "studio" && <StudioPage project={selectedProject} />}</main></div>{runtimePanelMode && <AuthModelPanel mode={runtimePanelMode} catalog={catalog} selectedModel={selectedModel} onModeChange={setRuntimePanelMode} onSelectModel={selectModel} onClose={() => setRuntimePanelMode(null)} />}</div>;
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode; label: string; active: boolean; onClick: () => void }) { return <button className={`rail-item ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>; }
function compactPath(path: string): string { const parts = path.split(/[\\/]/).filter(Boolean); return parts.length > 2 ? `…/${parts.slice(-2).join("/")}` : path; }
function PenIcon() { return <FileText size={16} />; }
function findModel(catalog: ModelCatalog, modelId: string | null): ModelCatalogEntry | null {
	if (!modelId) return null;
	for (const provider of catalog.providers) {
		const model = provider.models.find((entry) => `${entry.providerId}/${entry.modelId}` === modelId);
		if (model) return model;
	}
	return null;
}
