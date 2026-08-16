import { BookOpen, FileText, FolderOpen, RefreshCw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";

interface LibraryPageProps {
	overview: WorkspaceOverview;
	onOpenProject: (project: ProjectRecord) => void;
	onRescan: () => Promise<void>;
}

export function LibraryPage({ overview, onOpenProject, onRescan }: LibraryPageProps) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<"all" | "native" | "legacy">("all");
	const [isScanning, setIsScanning] = useState(false);
	const projects = useMemo(() => overview.projects.filter((project) => (filter === "all" || project.kind === filter) && `${project.title} ${project.projectId}`.toLowerCase().includes(query.toLowerCase())), [filter, overview.projects, query]);

	async function rescan(): Promise<void> { setIsScanning(true); try { await onRescan(); } finally { setIsScanning(false); } }

	return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">02 / LIBRARY</p><h1>作品库 <span>Projects</span></h1><p>扫描结果会保留 Legacy 项目的来源类型，不会偷偷转换文件。</p></div><button className="quiet-button" onClick={rescan} disabled={isScanning}><RefreshCw size={15} className={isScanning ? "spin" : ""} /> {isScanning ? "扫描中" : "重新扫描"}</button></section><div className="library-toolbar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目名称或 ID" /></div><div className="filter-group"><SlidersHorizontal size={15} />{(["all", "native", "legacy"] as const).map((value) => <button key={value} className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{value === "all" ? "全部" : value === "native" ? "Native" : "Legacy"}</button>)}</div></div><div className="library-summary"><span><BookOpen size={15} /> {projects.length} 个项目</span><span><FileText size={15} /> {overview.summary.legacyProjectCount} 个需要迁移评估</span></div><div className="library-grid">{projects.map((project) => <button className="library-project" key={project.projectId} onClick={() => onOpenProject(project)}><div className="library-project-top"><div className={`project-mark ${project.kind}`}><FolderOpen size={18} /></div><span className={`status-pill ${project.kind}`}>{project.kind === "legacy" ? "LEGACY" : "NATIVE"}</span></div><h2>{project.title}</h2><p>{project.projectId}</p><div className="library-project-footer"><span>{project.status === "needs_migration" ? "只读适配 · 待迁移" : "可继续创作"}</span><span>{new Date(project.lastModifiedAt).toLocaleDateString("zh-CN")}</span></div></button>)}{projects.length === 0 && <div className="empty-card wide"><BookOpen size={20} /><div><strong>没有匹配的项目</strong><p>调整筛选条件，或将项目目录加入 Workspace 后重新扫描。</p></div></div>}</div></div>;
}
