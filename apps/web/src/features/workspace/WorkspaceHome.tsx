import { ArrowRight, BookOpen, CheckSquare, FilePlus2, FolderOpen, GitBranch, RefreshCw, Search, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import type { ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";
import type { AppRoute } from "../../app/router.tsx";

interface WorkspaceHomeProps {
	overview: WorkspaceOverview;
	onNavigate: (route: AppRoute) => void;
	onOpenProject: (project: ProjectRecord) => void;
	onRescan: () => Promise<void>;
}

export function WorkspaceHome({ overview, onNavigate, onOpenProject, onRescan }: WorkspaceHomeProps) {
	const [seed, setSeed] = useState("");
	const [isScanning, setIsScanning] = useState(false);

	async function rescan(): Promise<void> {
		setIsScanning(true);
		try { await onRescan(); } finally { setIsScanning(false); }
	}

	return (
		<div className="page-stack">
			<section className="page-heading"><div><p className="eyebrow">01 / WORKSPACE</p><h1>工作区 & 首页 <span>Library + Forge</span></h1><p>从这里管理所有小说，或开始创建新的故事。</p></div><button className="quiet-button" onClick={rescan} disabled={isScanning}><RefreshCw size={15} className={isScanning ? "spin" : ""} /> {isScanning ? "扫描中" : "重新扫描"}</button></section>
			<section className="home-grid">
				<div className="card forge-card"><div className="card-kicker"><WandSparkles size={16} /> Forge</div><h2>你想构建一个怎样的故事？</h2><p className="muted">每个伟大的故事，都起于一个好的问题。</p><div className="genre-row">{["玄幻", "悬疑", "科幻", "都市", "言情", "历史"].map((genre, index) => <button key={genre} className={`genre-chip ${index === 1 ? "selected" : ""}`}>{genre}</button>)}</div><textarea value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="描述你想创作的故事核心，例如：封闭海岛、记忆、真相" /><div className="forge-footer"><span>{seed.length > 0 ? `${seed.length} 字已输入` : "Forge Session 尚未创建"}</span><button className="primary-button" onClick={() => onNavigate("library")}>开始构建 <ArrowRight size={15} /></button></div></div>
				<div className="card overview-card"><div className="card-title-row"><h2>工作区概览</h2><span className="live-dot">索引已连接</span></div><div className="metric-grid"><Metric label="作品" value={String(overview.summary.projectCount)} /><Metric label="Native" value={String(overview.summary.nativeProjectCount)} /><Metric label="Legacy" value={String(overview.summary.legacyProjectCount)} tone="warning" /><Metric label="字数" value={formatNumber(overview.summary.wordCount)} /></div><div className="todo-block"><div className="todo-header"><span>待办事项</span><span>本地索引</span></div>{["检查待迁移 Legacy 项目", "确认 Workspace 路径", "为首个项目建立结构索引"].map((item, index) => <div className="todo-item" key={item}><CheckSquare size={14} /><span>{item}</span><small>{index === 0 ? overview.summary.legacyProjectCount : 0}</small></div>)}</div></div>
			</section>
			<section className="section-heading"><div><h2>最近打开</h2><p>从当前 Workspace 的扫描结果恢复上下文。</p></div><button className="text-button" onClick={() => onNavigate("library")}>查看作品库 <ArrowRight size={14} /></button></section>
			<div className="recent-grid">{overview.projects.slice(0, 4).map((project) => <ProjectCard key={project.projectId} project={project} onClick={() => onOpenProject(project)} />)}{overview.projects.length === 0 && <div className="empty-card"><BookOpen size={20} /><div><strong>还没有发现作品</strong><p>把包含 <code>novel.yaml</code> 或 <code>project.json</code> 的项目目录放入 Workspace，然后重新扫描。</p></div></div>}<button className="new-project-card" onClick={() => onNavigate("library")}><FilePlus2 size={18} /><span>新建项目</span></button></div>
			<section className="home-bottom-grid"><div className="mini-card"><div className="mini-icon purple"><GitBranch size={17} /></div><div><strong>Story Graph</strong><span>结构索引将在 Studio 中逐步接入</span></div></div><div className="mini-card"><div className="mini-icon blue"><Search size={17} /></div><div><strong>全局搜索</strong><span>跨项目检索接口已预留</span></div></div><div className="mini-card"><div className="mini-icon green"><Sparkles size={17} /></div><div><strong>AI Workspace</strong><span>只对确认后的 ChangeSet 执行操作</span></div></div></section>
		</div>
	);
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) { return <div className="metric"><span>{label}</span><strong className={tone === "warning" ? "warning-value" : ""}>{value}</strong></div>; }

function ProjectCard({ project, onClick }: { project: ProjectRecord; onClick: () => void }) { return <button className="project-card" onClick={onClick}><div className={`project-mark ${project.kind}`}><FolderOpen size={17} /></div><div className="project-card-body"><strong>{project.title}</strong><span>{project.kind === "legacy" ? "Legacy 只读适配" : "Native 项目"}</span></div><div className="project-card-meta"><span>{project.status === "needs_migration" ? "待迁移" : "已就绪"}</span><small>{new Date(project.lastModifiedAt).toLocaleDateString("zh-CN")}</small></div></button>; }

function formatNumber(value: number): string { return new Intl.NumberFormat("zh-CN").format(value); }
