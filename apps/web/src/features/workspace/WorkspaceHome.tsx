import { ArrowRight, BookOpen, FolderOpen, WandSparkles } from "lucide-react";
import { useState } from "react";
import type { CreateForgeSessionInput, ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";

interface WorkspaceHomeProps {
	overview: WorkspaceOverview | null;
	onNavigate: (path: string) => void;
	onOpenProject: (project: ProjectRecord) => void;
	onRescan: () => Promise<void>;
	onCreateForgeSession: (input: CreateForgeSessionInput) => Promise<void>;
	onOpenWorkspaceSetup: () => void;
}

export function WorkspaceHome({ overview, onNavigate, onOpenProject, onRescan, onCreateForgeSession, onOpenWorkspaceSetup }: WorkspaceHomeProps) {
	const [seed, setSeed] = useState("");
	const [genre, setGenre] = useState("");
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function startForge(): Promise<void> {
		if (!seed.trim()) { setError("请先输入故事种子"); return; }
		setIsCreating(true); setError(null);
		try {
			await onCreateForgeSession({ seed: seed.trim(), ...(genre ? { genreHint: genre } : {}) });
		} catch (cause) { setError(cause instanceof Error ? cause.message : "故事工作区创建失败"); } finally { setIsCreating(false); }
	}

	if (overview === null) return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">HOME</p><h1>起笔台</h1><p>先留下故事种子，Workspace 可以稍后设置。</p></div></section><section className="home-grid"><div className="card forge-card"><div className="card-kicker"><WandSparkles size={16} /> Story Seed</div><h2>今天想写一个怎样的故事？</h2><p className="muted">先记录想法。开始构建时，系统会在需要的位置引导你设置 Workspace 和运行时。</p><textarea value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="描述故事核心" /><div className="forge-footer"><span>{error ?? "Workspace 尚未设置"}</span><button className="primary-button" type="button" onClick={startForge} disabled={isCreating}>开始构建 <ArrowRight size={15} /></button></div><button className="text-button" type="button" onClick={onOpenWorkspaceSetup}>先设置 Workspace</button></div></section></div>;
	return (
		<div className="page-stack">
			<section className="page-heading"><div><p className="eyebrow">HOME</p><h1>起笔台</h1><p>先留下故事种子，接着继续最近的创作。</p></div></section>
			<section className="home-grid">
				<div className="card forge-card"><div className="card-kicker"><WandSparkles size={16} /> Story Seed</div><h2>今天想写一个怎样的故事？</h2><p className="muted">类型只是可选提示，方向由你决定。</p><div className="genre-row"><button className={`genre-chip ${genre === "" ? "selected" : ""}`} type="button" onClick={() => setGenre("")}>暂未确定</button>{["悬疑", "都市", "言情", "历史"].map((entry) => <button key={entry} className={`genre-chip ${genre === entry ? "selected" : ""}`} type="button" onClick={() => setGenre(entry)}>{entry}</button>)}</div><textarea value={seed} onChange={(event) => setSeed(event.target.value)} placeholder="描述故事核心，例如：一个退休老师回到故乡寻找失踪妹妹" /><div className="forge-footer"><span>{error ?? (seed.length > 0 ? `${seed.length} 字已输入` : "先记录，不替你预先决定方向")}</span><button className="primary-button" type="button" onClick={startForge} disabled={isCreating}>{isCreating ? "创建中" : "开始构建"} <ArrowRight size={15} /></button></div></div>
				<div className="card next-action-card"><div className="card-title-row"><h2>继续创作</h2><span className="live-dot">本地保存</span></div>{overview.projects.length > 0 ? <><p className="muted">最近打开的作品</p><button className="project-card next-project" type="button" onClick={() => onOpenProject(overview.projects[0])}><div className="project-mark"><FolderOpen size={17} /></div><div className="project-card-body"><strong>{overview.projects[0].title}</strong><span>继续进入文稿</span></div><ArrowRight size={15} /></button><button className="text-button" type="button" onClick={() => onNavigate("/library")}>查看全部作品 <ArrowRight size={14} /></button></> : <div className="empty-card"><BookOpen size={20} /><div><strong>还没有作品</strong><p>可以先留下 Story Seed，或从作品库打开已有原稿。</p></div></div>}</div>
			</section>
			<section className="section-heading"><div><h2>最近打开</h2><p>从当前 Workspace 的扫描结果恢复上下文。</p></div><button className="text-button" onClick={() => onNavigate("/library")}>查看作品库 <ArrowRight size={14} /></button></section>
			<div className="recent-grid">{overview.projects.slice(0, 4).map((project) => <ProjectCard key={project.projectId} project={project} onClick={() => onOpenProject(project)} />)}{overview.projects.length === 0 && <div className="empty-card"><BookOpen size={20} /><div><strong>还没有发现作品</strong><p>把包含 <code>novel.yaml</code> 或 <code>project.json</code> 的项目目录放入 Workspace，然后重新扫描。</p></div></div>}</div>
		</div>
	);
}

function ProjectCard({ project, onClick }: { project: ProjectRecord; onClick: () => void }) { return <button className="project-card" type="button" aria-label={`打开项目 ${project.title}`} onClick={onClick}><div className={`project-mark ${project.kind}`}><FolderOpen size={17} /></div><div className="project-card-body"><strong>{project.title}</strong><span>{project.kind === "legacy" ? "只读作品" : "可编辑作品"}</span></div><div className="project-card-meta"><span>{project.status === "needs_migration" ? "待迁移" : "已就绪"}</span><small>{formatProjectDate(project.lastModifiedAt)}</small></div></button>; }

function formatProjectDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "日期未知" : date.toLocaleDateString("zh-CN");
}
