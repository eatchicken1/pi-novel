import { ArrowLeft, FileText, Layers3 } from "lucide-react";
import { NavLink, Outlet, useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { ProjectRecord } from "@earendil-works/pi-novel-contracts";
import { useAppShellContext } from "../../app/AppShell.tsx";

interface StudioShellContext {
	project: ProjectRecord;
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
	const { overview } = useAppShellContext();
	const navigate = useNavigate();
	const project = overview?.projects.find((entry) => entry.projectId === projectId) ?? null;
	if (!project) return <div className="studio-empty"><Layers3 size={24} /><h2>项目不可用</h2><p>这个项目可能已从 Workspace 扫描结果中移除。</p><button className="quiet-button" type="button" onClick={() => navigate("/library")}><ArrowLeft size={14} /> 返回作品库</button></div>;
	return <div className="studio-page"><div className="studio-topbar"><div className="studio-title"><div className={`project-mark ${project.kind}`}><FileText size={16} /></div><div><strong>{project.title}</strong><span>{project.kind === "legacy" ? "只读作品 · 写入保护" : "可编辑作品"}</span></div></div><nav className="studio-tabs" aria-label="Studio 视图">{STUDIO_MODES.map((entry) => <NavLink key={entry.mode} to={entry.path} className={({ isActive }) => (isActive ? "active" : "")} aria-label={`打开${entry.label}视图`}>{entry.label}</NavLink>)}</nav><button className="icon-button studio-back-button" type="button" aria-label="返回作品库" title="返回作品库" onClick={() => navigate("/library")}><ArrowLeft size={16} /></button></div><Outlet context={{ project } satisfies StudioShellContext} /></div>;
}
