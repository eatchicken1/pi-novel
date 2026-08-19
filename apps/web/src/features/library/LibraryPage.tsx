import { BookOpen, FileText, FolderOpen, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ProjectRecord, WorkspaceOverview } from "@earendil-works/pi-novel-contracts";

interface LibraryPageProps {
	overview: WorkspaceOverview | null;
	onOpenProject: (project: ProjectRecord) => void;
	onRescan: () => Promise<void>;
	onOpenWorkspaceSetup: () => void;
}

export function LibraryPage({ overview, onOpenProject, onRescan, onOpenWorkspaceSetup }: LibraryPageProps) {
	const [query, setQuery] = useState("");
	const [filter, setFilter] = useState<"all" | "native" | "legacy">("all");
	const [isScanning, setIsScanning] = useState(false);
	const [scanError, setScanError] = useState<string | null>(null);
	const projects = useMemo(() => (overview?.projects ?? []).filter((project) => (filter === "all" || project.kind === filter) && `${project.title} ${project.projectId}`.toLowerCase().includes(query.toLowerCase())), [filter, overview?.projects, query]);

	async function rescan(): Promise<void> { setIsScanning(true); setScanError(null); try { await onRescan(); } catch (cause) { setScanError(cause instanceof Error ? cause.message : "重新扫描失败"); } finally { setIsScanning(false); } }
	function clearFilters(): void { setQuery(""); setFilter("all"); }

	if (overview === null) return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">02 / LIBRARY</p><h1>作品库</h1><p>设置 Workspace 后，作品会在这里显示。</p></div></section><div className="empty-card wide"><BookOpen size={20} /><div><strong>尚未设置 Workspace</strong><p>所有小说都会保存在统一目录下。</p><button className="primary-button" type="button" onClick={onOpenWorkspaceSetup}>选择工作区</button></div></div></div>;

	return <div className="page-stack"><section className="page-heading"><div><p className="eyebrow">02 / LIBRARY</p><h1>作品库 <span>Projects</span></h1><p>扫描结果会保留 Legacy 项目的来源类型，不会偷偷转换文件。</p></div><button className="quiet-button" type="button" onClick={rescan} disabled={isScanning}><RefreshCw size={15} className={isScanning ? "spin" : ""} /> {isScanning ? "扫描中" : "重新扫描"}</button></section>{scanError && <div className="inline-alert" role="alert"><RefreshCw size={14} /> {scanError}</div>}<div className="library-toolbar"><div className="search-box"><Search size={16} /><input aria-label="搜索项目名称或 ID" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目名称或 ID" />{query && <button className="search-clear" type="button" aria-label="清除搜索" onClick={() => setQuery("")}><X size={14} /></button>}</div><div className="filter-group" role="group" aria-label="项目类型筛选"><SlidersHorizontal size={15} />{(["all", "native", "legacy"] as const).map((value) => <button key={value} type="button" className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "全部" : value === "native" ? "Native" : "Legacy"}</button>)}</div></div><div className="library-summary"><span><BookOpen size={15} /> {projects.length} 个项目</span><span><FileText size={15} /> {overview.summary.legacyProjectCount} 个需要迁移评估</span></div><div className="library-grid">{projects.map((project) => <button className="library-project" type="button" key={project.projectId} aria-label={`打开项目 ${project.title}`} onClick={() => onOpenProject(project)}><div className="library-project-top"><div className={`project-mark ${project.kind}`}><FolderOpen size={18} /></div><span className={`status-pill ${project.kind}`}>{project.kind === "legacy" ? "LEGACY" : "NATIVE"}</span></div><h2>{project.title}</h2><p>{project.projectId}</p><div className="library-project-footer"><span>{project.status === "needs_migration" ? "只读适配 · 待迁移" : "可继续创作"}</span><span>{formatProjectDate(project.lastModifiedAt)}</span></div></button>)}{projects.length === 0 && <div className="empty-card wide"><BookOpen size={20} /><div><strong>没有匹配的项目</strong><p>调整筛选条件，或将项目目录加入 Workspace 后重新扫描。</p>{(query || filter !== "all") && <button className="text-button" type="button" onClick={clearFilters}>清除筛选 <X size={13} /></button>}</div></div>}</div></div>;
}

function formatProjectDate(value: string): string {
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? "日期未知" : date.toLocaleDateString("zh-CN");
}
