import { Cpu, KeyRound, Sparkles } from "lucide-react";
import { createBrowserRouter, Navigate, useSearchParams } from "react-router-dom";
import { AppShell, useAppShellContext } from "./AppShell.tsx";
import type { ModelCatalog, RuntimeAgentId } from "@earendil-works/pi-novel-contracts";
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
	return <WorkspaceHome overview={context.overview} onNavigate={context.onNavigate} onOpenProject={context.onOpenProject} onRescan={context.onRescan} onCreateForgeSession={context.onCreateForgeSession} onOpenWorkspaceSetup={context.onOpenWorkspaceSetup} />;
}

function LibraryRoute() {
	const context = useAppShellContext();
	return <LibraryPage overview={context.overview} onOpenProject={context.onOpenProject} onRescan={context.onRescan} onOpenWorkspaceSetup={context.onOpenWorkspaceSetup} />;
}

function SettingsRoute() {
	const { catalog, profiles, onOpenProviders, onOpenRuntime, onNavigate, onOpenWorkspaceSetup } = useAppShellContext();
	const connectedProviders = catalog.providers.filter((provider) => provider.status === "connected").length;
	const agents: Array<{ id: RuntimeAgentId; label: string }> = [{ id: "forge.explorer", label: "方向探索" }, { id: "forge.comparator", label: "方向比较" }, { id: "forge.critic", label: "方向批评" }, { id: "chapter.reviser", label: "章节修订" }];
	return <div className="page-stack settings-page"><section className="page-heading"><div><p className="eyebrow">03 / SETTINGS</p><h1>工作区设置</h1><p>在这里完整管理 Workspace、供应商凭证和每个 Agent 的运行模型。</p></div><button className="quiet-button" type="button" onClick={() => onNavigate("/")}>返回起笔台</button></section><section className="settings-grid"><article className="card settings-card settings-card-feature"><div className="settings-card-icon purple"><KeyRound size={17} /></div><div><p className="eyebrow">WORKSPACE</p><h2>创作工作区</h2><p>更换或重新打开本地作品目录。连接工作区不会自动改写已有文件。</p><button className="primary-button" type="button" onClick={onOpenWorkspaceSetup}>设置 Workspace</button></div></article><article className="card settings-card settings-card-feature"><div className="settings-card-icon purple"><KeyRound size={17} /></div><div><p className="eyebrow">PROVIDERS</p><h2>供应商与凭证</h2><p>查看连接状态、配置 API Key，或复制 CLI OAuth 登录命令。</p><button className="primary-button" type="button" onClick={() => onOpenProviders()}>管理供应商</button></div><strong className="settings-stat">{connectedProviders}<small>已连接</small></strong></article><article className="card settings-card settings-runtime-card"><div className="settings-card-icon blue"><Cpu size={17} /></div><div><p className="eyebrow">AGENT RUNTIME</p><h2>Agent 运行配置</h2><p>每个创作操作都有自己的模型配置。点击某一项即可直接打开对应设置。</p><div className="runtime-profile-list">{agents.map((agent) => { const profile = profiles.find((entry) => entry.agentId === agent.id); const modelName = profile ? findModelName(catalog, profile.modelId) : "未配置"; return <div className="runtime-profile-row" key={agent.id}><span><strong>{agent.label}</strong><small>{modelName} · {profile?.thinkingLevel ?? "未配置"}</small></span><button className="secondary-button" type="button" onClick={() => onOpenRuntime(agent.id)}>配置</button></div>; })}</div></div></article></section><div className="settings-note"><Sparkles size={15} /><span>凭证与 Runtime Profile 保存在当前 Workspace；页面右上角 Runtime 只是当前操作的快速配置入口。</span></div></div>;
}

function findModelName(catalog: ModelCatalog, modelId: string): string {
	for (const provider of catalog.providers) { const model = provider.models.find((entry) => `${provider.providerId}/${entry.modelId}` === modelId); if (model) return model.name; }
	return "模型不可用";
}

function LegacyStudioRedirect() {
	const [searchParams] = useSearchParams();
	const projectId = searchParams.get("projectId");
	return projectId ? <Navigate replace to={`/project/${encodeURIComponent(projectId)}/manuscript`} /> : <Navigate replace to="/" />;
}
