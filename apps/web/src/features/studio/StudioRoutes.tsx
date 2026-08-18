import { ArrowLeft, ClipboardCheck, FileText, History, Layers3, PenLine, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useStudioShellContext } from "./StudioShell.tsx";

// 本轮（Round 3.1）：Studio 路由必须真正对应 mode，且不允许假交互。
// Manuscript 尚未接通真实正文，因此显示真实 Empty State；Round 4 实现真实文稿。
export function ManuscriptRoute() {
	const { project } = useStudioShellContext();
	return <StudioEmptyState icon={<PenLine size={24} />} title="尚未创建正文" description={`项目《${project.title}》还没有正文。正文编辑器接通后，章节内容会在这里恢复。`} status="Round 4 · 真实文稿" />;
}

export function StructureRoute() {
	return <StudioEmptyState icon={<Layers3 size={24} />} title="结构视图" description="章节与场景结构将在这里呈现。当前项目没有可展示的结构数据。" status="Coming Later" />;
}

export function CanonRoute() {
	return <StudioEmptyState icon={<FileText size={24} />} title="正史" description="角色、事实与时间线的正史条目将在这里管理。当前没有正史数据。" status="Coming Later" />;
}

export function ReviewRoute() {
	return <StudioEmptyState icon={<ClipboardCheck size={24} />} title="审校" description="审校问题列表将在这里呈现。当前项目没有审校记录。" status="Coming Later" />;
}

export function HistoryRoute() {
	return <StudioEmptyState icon={<History size={24} />} title="历史" description="提交历史与变更集将在这里呈现。当前没有历史记录。" status="Coming Later" />;
}

export function LegacyStudioRedirectFallback() {
	return <StudioEmptyState icon={<Sparkles size={24} />} title="项目不可用" description="无法解析 Studio 项目，请从作品库重新选择。" status="需要重新选择" />;
}

function StudioEmptyState({ icon, title, description, status }: { icon: ReactNode; title: string; description: string; status: string }) {
	const navigate = useNavigate();
	return <div className="studio-empty studio-mode-empty"><div className="studio-empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p><span className="status-pill neutral">{status}</span><button className="quiet-button" type="button" onClick={() => navigate("/library")}><ArrowLeft size={14} /> 返回作品库</button></div>;
}
