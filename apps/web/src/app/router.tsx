import { ArrowLeft, Layers3, Settings2 } from "lucide-react";
import { useState } from "react";
import { createBrowserRouter, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, useAppShellContext } from "./AppShell.tsx";
import { LibraryPage } from "../features/library/LibraryPage.tsx";
import { AuthModelPanel } from "../features/settings/AuthModelPanel.tsx";
import type { RuntimePanelMode } from "../features/settings/AuthModelPanel.tsx";
import { StudioPage } from "../features/studio/StudioPage.tsx";
import { WorkspaceHome } from "../features/workspace/WorkspaceHome.tsx";

export const router = createBrowserRouter([
	{
		path: "/",
		element: <AppShell />,
		children: [
			{ index: true, element: <HomeRoute /> },
			{ path: "library", element: <LibraryRoute /> },
			{ path: "forge/:sessionId", element: <ForgePlaceholderRoute /> },
			{ path: "project/:projectId/manuscript/:chapterId?", element: <ProjectRoute /> },
			{ path: "project/:projectId/structure", element: <ProjectRoute /> },
			{ path: "project/:projectId/canon", element: <ProjectRoute /> },
			{ path: "project/:projectId/review", element: <ProjectRoute /> },
			{ path: "project/:projectId/history", element: <ProjectRoute /> },
			{ path: "settings", element: <SettingsRoute /> },
			{ path: "studio", element: <LegacyStudioRedirect /> },
			{ path: "*", element: <Navigate replace to="/" /> },
		],
	},
]);

function HomeRoute() {
	const context = useAppShellContext();
	return <WorkspaceHome overview={context.overview} onNavigate={context.onNavigate} onOpenProject={context.onOpenProject} onRescan={context.onRescan} />;
}

function LibraryRoute() {
	const context = useAppShellContext();
	return <LibraryPage overview={context.overview} onOpenProject={context.onOpenProject} onRescan={context.onRescan} />;
}

function ProjectRoute() {
	const { projectId } = useParams();
	const { overview } = useAppShellContext();
	const project = overview.projects.find((entry) => entry.projectId === projectId) ?? null;
	return <StudioPage project={project} />;
}

function ForgePlaceholderRoute() {
	const navigate = useNavigate();
	return <div className="studio-empty"><Layers3 size={24} /><h2>Forge Vertical Slice 尚未开始</h2><p>本路由已预留，当前 Round 2.5 只完成基础架构硬化。</p><button className="secondary-button" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回工作区</button></div>;
}

function SettingsRoute() {
	const { catalog, selectedModel, onSelectModel } = useAppShellContext();
	const navigate = useNavigate();
	const [mode, setMode] = useState<RuntimePanelMode>("auth");
	return <div className="studio-empty"><Settings2 size={24} /><h2>运行时设置</h2><p>登录供应商并选择模型。设置面板已打开。</p><AuthModelPanel mode={mode} catalog={catalog} selectedModel={selectedModel} onModeChange={setMode} onSelectModel={onSelectModel} onClose={() => navigate("/")} /></div>;
}

function LegacyStudioRedirect() {
	const [searchParams] = useSearchParams();
	const projectId = searchParams.get("projectId");
	return projectId ? <Navigate replace to={`/project/${encodeURIComponent(projectId)}/manuscript`} /> : <Navigate replace to="/" />;
}
