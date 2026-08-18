import { Cpu, KeyRound, Sparkles } from "lucide-react";
import { createBrowserRouter, Navigate, useSearchParams } from "react-router-dom";
import { AppShell, useAppShellContext } from "./AppShell.tsx";
import { LibraryPage } from "../features/library/LibraryPage.tsx";
import { StudioShell } from "../features/studio/StudioShell.tsx";
import {
	CanonRoute,
	HistoryRoute,
	ManuscriptRoute,
	ReviewRoute,
	StructureRoute,
} from "../features/studio/StudioRoutes.tsx";
import { WorkspaceHome } from "../features/workspace/WorkspaceHome.tsx";
import { ForgePage } from "../features/forge/ForgePage.tsx";

// Studio 使用嵌套路由：URL（/manuscript | /structure | /canon | /review |
// /history）必须真正对应 Studio mode，禁止 URL 与页面内部状态脱节。
export const router = createBrowserRouter([
	{
		path: "/",
		element: <AppShell />,
		children: [
			{ index: true, element: <HomeRoute /> },
			{ path: "library", element: <LibraryRoute /> },
			{ path: "forge/:sessionId", element: <ForgePage /> },
			{
				path: "project/:projectId",
				element: <StudioShell />,
				children: [
					{ index: true, element: <Navigate replace to="manuscript" /> },
					{ path: "manuscript/:chapterId?", element: <ManuscriptRoute /> },
					{ path: "structure", element: <StructureRoute /> },
					{ path: "canon", element: <CanonRoute /> },
					{ path: "review", element: <ReviewRoute /> },
					{ path: "history", element: <HistoryRoute /> },
				],
			},
			{ path: "settings", element: <SettingsRoute /> },
			{ path: "studio", element: <LegacyStudioRedirect /> },
			{ path: "*", element: <Navigate replace to="/" /> },
		],
	},
]);

function HomeRoute() {
	const context = useAppShellContext();
	return <WorkspaceHome overview={context.overview} onNavigate={context.onNavigate} onOpenProject={context.onOpenProject} onRescan={context.onRescan} onCreateForgeSession={context.onCreateForgeSession} />;
}

function LibraryRoute() {
	const context = useAppShellContext();
	return <LibraryPage overview={context.overview} onOpenProject={context.onOpenProject} onRescan={context.onRescan} />;
}

function SettingsRoute() {
	const { catalog, profiles, onOpenProviders, onNavigate } = useAppShellContext();
	const connectedProviders = catalog.providers.filter((provider) => provider.status === "connected").length;
	return <div className="page-stack settings-page"><section className="page-heading"><div><p className="eyebrow">03 / SETTINGS</p><h1>工作区设置 <span>Runtime & Providers</span></h1><p>集中管理本地运行时凭证与 Agent 的模型配置。</p></div><button className="quiet-button" type="button" onClick={() => onNavigate("/")}>返回首页</button></section><section className="settings-grid"><article className="card settings-card settings-card-feature"><div className="settings-card-icon purple"><KeyRound size={17} /></div><div><p className="eyebrow">PROVIDERS</p><h2>供应商与凭证</h2><p>查看连接状态、配置 API Key，或复制 CLI OAuth 登录命令。</p><button className="primary-button" type="button" onClick={() => onOpenProviders()}>管理供应商</button></div><strong className="settings-stat">{connectedProviders}/{catalog.providers.length}<small>已连接</small></strong></article><article className="card settings-card"><div className="settings-card-icon blue"><Cpu size={17} /></div><div><p className="eyebrow">AGENT RUNTIME</p><h2>Agent 运行配置</h2><p>右上角 Runtime 入口可以为 Forge Explorer、Comparator 和 Critic 分别选择模型。</p><button className="secondary-button" type="button" onClick={() => onNavigate("/")}>返回首页配置</button></div><strong className="settings-stat">{profiles.length}<small>已保存配置</small></strong></article></section><div className="settings-note"><Sparkles size={15} /><span>凭证与 Runtime Profile 保存在当前 Workspace，本地重启后会恢复；作者确认仍是所有写入操作的最终入口。</span></div></div>;
}

function LegacyStudioRedirect() {
	const [searchParams] = useSearchParams();
	const projectId = searchParams.get("projectId");
	return projectId ? <Navigate replace to={`/project/${encodeURIComponent(projectId)}/manuscript`} /> : <Navigate replace to="/" />;
}
