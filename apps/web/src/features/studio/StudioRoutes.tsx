import { ArrowLeft, ClipboardCheck, FileText, History, Layers3, PenLine, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useStudioShellContext } from "./StudioShell.tsx";

export function ManuscriptRoute() {
	const { project } = useStudioShellContext();
	return <StudioEmptyState icon={<PenLine size={24} />} title="尚未创建正文" description={`项目《${project.title}》还没有正文，完成章节后将在这里显示。`} status="等待正文" />;
}

export function StructureRoute() {
	return <StudioEmptyState icon={<Layers3 size={24} />} title="结构视图" description="当前作品还没有章节或场景结构。" status="暂无结构" />;
}

export function CanonRoute() {
	return <StudioEmptyState icon={<FileText size={24} />} title="故事事实" description="当前作品还没有角色、事实或时间线资料。" status="暂无资料" />;
}

export function ReviewRoute() {
	return <StudioEmptyState icon={<ClipboardCheck size={24} />} title="审校" description="当前作品还没有需要处理的审校记录。" status="暂无审校记录" />;
}

export function HistoryRoute() {
	return <StudioEmptyState icon={<History size={24} />} title="历史" description="当前作品还没有提交历史或变更记录。" status="暂无历史记录" />;
}

export function LegacyStudioRedirectFallback() {
	return <StudioEmptyState icon={<Sparkles size={24} />} title="项目不可用" description="无法解析 Studio 项目，请从作品库重新选择。" status="需要重新选择" />;
}

function StudioEmptyState({ icon, title, description, status }: { icon: ReactNode; title: string; description: string; status: string }) {
	const navigate = useNavigate();
	return <div className="studio-empty studio-mode-empty"><div className="studio-empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p><span className="status-pill neutral">{status}</span><button className="quiet-button" type="button" onClick={() => navigate("/library")}><ArrowLeft size={14} /> 返回作品库</button></div>;
}
