import { ArrowLeft, FileText, Layers3 } from "lucide-react";
import { NavLink, Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { ProjectRecord, ProjectCapabilities, RuntimeAgentId } from "@earendil-works/pi-novel-contracts";
import { useQuery } from "@tanstack/react-query";
import { getProjectCapabilities } from "../../api/client.ts";
import { novelQueryKeys } from "../../api/query-keys.ts";
import { useAppShellContext } from "../../app/AppShell.tsx";

interface StudioShellContext {
	project: ProjectRecord;
	capabilities: ProjectCapabilities | null;
	onEnsureRuntime(agentId: RuntimeAgentId, continuation: () => Promise<void>): Promise<boolean>;
}

export function useStudioShellContext(): StudioShellContext {
	return useOutletContext<StudioShellContext>();
}

export type StudioMode = "manuscript" | "structure" | "canon" | "review" | "history";

const STUDIO_MODES: Array<{ mode: StudioMode; label: string; path: string }> = [
	{ mode: "manuscript", label: "文稿", path: "manuscript" },
	{ mode: "structure", label: "结构", path: "structure" },
	{ mode: "canon", label: "正史", path: "canon" },
	{ mode: "review", label: "审校", path: "review" },
	{ mode: "history", label: "历史", path: "history" },
];

// URL 路径直接对应 Studio 视图，避免地址和页面状态脱节。
export function StudioShell() {
	const { projectId } = useParams();
	const { overview, onEnsureRuntime } = useAppShellContext();
	const navigate = useNavigate();
	const project = overview?.projects.find((entry) => entry.projectId === projectId) ?? null;
	const capabilitiesQuery = useQuery({ queryKey: novelQueryKeys.capabilities(projectId ?? ""), queryFn: () => getProjectCapabilities(projectId ?? ""), enabled: projectId !== undefined });
	if (!project) return <div className="studio-empty"><Layers3 size={24} /><h2>项目不可用</h2><p>这个项目可能已从 Workspace 扫描结果中移除。</p><button className="quiet-button" type="button" onClick={() => navigate("/library")}><ArrowLeft size={14} /> 返回作品库</button></div>;
	const capabilities = capabilitiesQuery.data ?? null;
	const visibleModes = STUDIO_MODES.filter((entry) => capabilityForMode(capabilities, entry.mode) !== "unsupported");
	return <div className="studio-page"><div className="studio-topbar"><button className="quiet-button studio-back-button" type="button" onClick={() => navigate("/library")}><ArrowLeft size={14} /> 作品</button><div className="studio-title"><div className="project-mark"><FileText size={16} /></div><div><strong>{project.title}</strong><span>作者工作区</span></div></div><nav className="studio-tabs" aria-label="Studio 视图">{visibleModes.map((entry) => { const status = capabilityForMode(capabilities, entry.mode); return <NavLink key={entry.mode} to={entry.path} className={({ isActive }) => `${isActive ? "active" : ""} ${status === "coming_later" ? "disabled" : ""}`} aria-label={`打开${entry.label}视图`} onClick={(event) => { if (status === "coming_later") event.preventDefault(); }}>{entry.label}{status === "coming_later" && <small>稍后</small>}</NavLink>; })}</nav><span className="studio-runtime-label">Writer · High</span></div><Outlet context={{ project, capabilities, onEnsureRuntime } satisfies StudioShellContext} /></div>;
}

function capabilityForMode(capabilities: ProjectCapabilities | null, mode: StudioMode) {
	if (capabilities === null) return "supported" as const;
	return mode === "manuscript" ? capabilities.manuscriptRead : mode === "structure" ? capabilities.storyGraph : mode === "canon" ? capabilities.canon : mode === "review" ? capabilities.chapterReview : capabilities.history;
}
