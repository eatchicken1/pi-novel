import { ArrowRight, BookOpen, CheckSquare, FilePlus2, FolderOpen, GitBranch, RefreshCw, Search, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";
import type { CreateForgeSessionInput, ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";

interface WorkspaceHomeProps {
	overview: WorkspaceOverview;
	onNavigate: (path: string) => void;
	onOpenProject: (project: ProjectRecord) => void;
	onRescan: () => Promise<void>;
	onCreateForgeSession: (input: CreateForgeSessionInput) => Promise<void>;
}

export function WorkspaceHome({ overview, onNavigate, onOpenProject, onRescan, onCreateForgeSession }: WorkspaceHomeProps) {
	const [seed, setSeed] = useState("");
	const [genre, setGenre] = useState("悬疑");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [scanError, setScanError] = useState<string | null>(null);
	const [isScanning, setIsScanning] = useState(false);

	async function rescan(): Promise<void> {
		setIsScanning(true);
		setScanError(null);
		try { await onRescan(); } catch (cause) { setScanError(cause instanceof Error ? cause.message : "重新扫描失败"); } finally { setIsScanning(false); }
	}

	async function startForge(): Promise<void> {
		if (!seed.trim()) { setError("请先输入故事种子"); return; }
		setIsCreating(true); setError(null);
		try {
			await onCreateForgeSession({ seed: seed.trim(), narrativeDNA: { genre, narrativeScale: "中长篇", coreExperience: seed.trim(), pacing: "持续升级", pov: "限制视角", endingTone: "余韵明确", readerPromise: "真相与关系同时推进" } });
		} catch (cause) { setError(cause instanceof Error ? cause.message : "Forge Session 创建失败"); } finally { setIsCreating(false); }
	}

	return (
		<div className="page-stack">
			<section className="page-heading"><div><p className="eyebrow">01 / WORKSPACE</p><h1>工作区 & 首页 <span>Library + Forge</span></h1><p>从这里管理所有小说，或开始创建新的故事。</p></div><button className="quiet-button" type="button" onClick={rescan} disabled={isScanning}><RefreshCw size={15} className={isScanning ? "spin" : ""} /> {isScanning ? "扫描中" : "重新扫描"}</button></section>
			{scanError && <div className="inline-alert" role="alert"><RefreshCw size={14} /> {scanError}</div>}
			<section className="home-grid">
				<div className="card forge-card"><div className="card-kicker"><WandSparkles size={16} /> Forge</div><h2>你想构建一个怎样的故事？</h2><p className="muted">先明确故事种子，再让方向候选进入作者比较。</p><div className="genre-row">{["玄幻", "悬疑", "科幻", "都市", "言情", "历史"].map((entry) => <button key={entry} className={`genre-chip ${genre === entry ? "selected" : ""}`} onClick={() => setGenre(entry)}>{entry}</button>)}</div><textarea value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="描述你想创作的故事核心，例如：封闭海岛、记忆、真相" /><div className="forge-footer"><span>{error ?? (seed.length > 0 ? `${seed.length} 字已输入` : "Forge Session 尚未创建")}</span><button className="primary-button" onClick={startForge} disabled={isCreating}>{isCreating ? "创建中" : "开始构建"} <ArrowRight size={15} /></button></div></div>
				<div className="card overview-card"><div className="card-title-row"><h2>工作区概览</h2><span className="live-dot">索引已连接</span></div><div className="metric-grid"><Metric label="作品" value={String(overview.summary.projectCount)} /><Metric label="Native" value={String(overview.summary.nativeProjectCount)} /><Metric label="Legacy" value={String(overview.summary.legacyProjectCount)} tone="warning" /><Metric label="字数" value={formatNumber(overview.summary.wordCount)} /></div><div className="todo-block"><div className="todo-header"><span>待办事项</span><span>本地索引</span></div>{["检查待迁移 Legacy 项目", "确认 Workspace 路径", "为首个项目建立结构索引"].map((item, index) => <div className="todo-item" key={item}><CheckSquare size={14} /><span>{item}</span><small>{index === 0 ? overview.summary.legacyProjectCount : 0}</small></div>)}</div></div>
			</section>
			<section className="section-heading"><div><h2>最近打开</h2><p>从当前 Workspace 的扫描结果恢复上下文。</p></div><button className="text-button" onClick={() => onNavigate("/library")}>查看作品库 <ArrowRight size={14} /></button></section>
			<div className="recent-grid">{overview.projects.slice(0, 4).map((project) => <ProjectCard key={project.projectId} project={project} onClick={() => onOpenProject(project)} />)}{overview.projects.length === 0 && <div className="empty-card"><BookOpen size={20} /><div><strong>还没有发现作品</strong><p>把包含 <code>novel.yaml</code> 或 <code>project.json</code> 的项目目录放入 Workspace，然后重新扫描。</p></div></div>}<button className="new-project-card" onClick={() => onNavigate("/library")}><FilePlus2 size={18} /><span>新建项目</span></button></div>
			<section className="home-bottom-grid"><div className="mini-card"><div className="mini-icon purple"><GitBranch size={17} /></div><div><strong>Story Graph</strong><span>结构索引将在 Studio 中逐步接入</span></div></div><div className="mini-card"><div className="mini-icon blue"><Search size={17} /></div><div><strong>全局搜索</strong><span>跨项目检索接口已预留</span></div></div><div className="mini-card"><div className="mini-icon green"><Sparkles size={17} /></div><div><strong>AI Workspace</strong><span>只对确认后的 ChangeSet 执行操作</span></div></div></section>
		</div>
	);
}

function Metric({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) { return <div className="metric"><span>{label}</span><strong className={tone === "warning" ? "warning-value" : ""}>{value}</strong></div>; }

function ProjectCard({ project, onClick }: { project: ProjectRecord; onClick: () => void }) { return <button className="project-card" type="button" aria-label={`打开项目 ${project.title}`} onClick={onClick}><div className={`project-mark ${project.kind}`}><FolderOpen size={17} /></div><div className="project-card-body"><strong>{project.title}</strong><span>{project.kind === "legacy" ? "Legacy 只读适配" : "Native 项目"}</span></div><div className="project-card-meta"><span>{project.status === "needs_migration" ? "待迁移" : "已就绪"}</span><small>{formatProjectDate(project.lastModifiedAt)}</small></div></button>; }

function formatNumber(value: number): string { return new Intl.NumberFormat("zh-CN").format(value); }

function formatProjectDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "日期未知" : date.toLocaleDateString("zh-CN");
}
