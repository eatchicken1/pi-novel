import { AlertTriangle, ArrowLeft, Check, ClipboardCheck, FileText, History, Layers3, PenLine, Save, Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReconcileReport, SettlementInput } from "@earendil-works/pi-novel-contracts";
import { acceptChangeSet, commitChangeSet, createChapter, decideChapterReconcile, finalizeChapter, getApiErrorMessage, getChapterResource, getChapters, reconcileChapter, saveChapterDraft, settleChapter } from "../../api/client.ts";
import { novelQueryKeys } from "../../api/query-keys.ts";
import { useStudioShellContext } from "./StudioShell.tsx";

export function ManuscriptRoute() {
	const { project } = useStudioShellContext();
	const { chapterId } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [content, setContent] = useState("");
	const [dirty, setDirty] = useState(false);
	const [savedDraft, setSavedDraft] = useState<{ revision: number; contentHash: string } | null>(null);
	const [discovery, setDiscovery] = useState("");
	const chaptersQuery = useQuery({ queryKey: novelQueryKeys.chapters(project.projectId), queryFn: () => getChapters(project.projectId) });
	const chapter = chapterId === undefined ? null : Number(chapterId);
	const resourceQuery = useQuery({ queryKey: novelQueryKeys.chapter(project.projectId, chapter ?? 0), queryFn: () => getChapterResource(project.projectId, chapter ?? 0), enabled: chapter !== null && Number.isInteger(chapter) });
	const createMutation = useMutation({ mutationFn: (title: string) => createChapter(project.projectId, { title }), onSuccess: (created) => { void queryClient.invalidateQueries({ queryKey: novelQueryKeys.chapters(project.projectId) }); navigate(`/project/${encodeURIComponent(project.projectId)}/manuscript/${created.chapter}`); } });
	const saveMutation = useMutation({ mutationFn: ({ chapterNumber, content, baseContentHash, revision }: { chapterNumber: number; content: string; baseContentHash: string; revision: number }) => saveChapterDraft(project.projectId, chapterNumber, { content, baseContentHash, revision }), onSuccess: (draft) => { setDirty(false); setSavedDraft({ revision: draft.draftRevision, contentHash: draft.contentHash }); void queryClient.invalidateQueries({ queryKey: novelQueryKeys.chapter(project.projectId, draft.chapter) }); } });
	const refreshWorkflow = () => queryClient.invalidateQueries({ queryKey: novelQueryKeys.chapter(project.projectId, chapter ?? 0) });
	const reconcileMutation = useMutation({ mutationFn: ({ chapterNumber, draftRevision, contentHash }: { chapterNumber: number; draftRevision: number; contentHash: string }) => reconcileChapter(project.projectId, chapterNumber, { draftRevision, contentHash }), onSuccess: () => { void refreshWorkflow(); } });
	const decideMutation = useMutation({ mutationFn: ({ chapterNumber, report, decision, discovery }: { chapterNumber: number; report: ReconcileReport; decision: "prose-was-wrong" | "accept-creative-discovery"; discovery?: string }) => decideChapterReconcile(project.projectId, chapterNumber, { draftRevision: report.draftRevision, contentHash: report.contentHash, decision, ...(decision === "accept-creative-discovery" ? { changeSet: { title: `接受第 ${chapterNumber} 章创作发现`, kind: "structure", intent: discovery ?? "接受正文产生的新创作发现，并记录到故事变更日志。", baseRevision: null, operations: [{ operationId: `creative-discovery-${chapterNumber}`, kind: "replace-document", target: `work/creative-discoveries/chapter-${String(chapterNumber).padStart(3, "0")}.md`, text: `# 第 ${chapterNumber} 章创作发现\n\n${discovery ?? ""}\n` }] } } : {}) }), onSuccess: () => { void refreshWorkflow(); } });
	const commitDiscoveryMutation = useMutation({ mutationFn: (changeSetId: string) => acceptChangeSet(project.projectId, changeSetId).then(() => commitChangeSet(project.projectId, changeSetId)), onSuccess: () => { void refreshWorkflow(); } });
	const settlementMutation = useMutation({ mutationFn: ({ chapterNumber, input }: { chapterNumber: number; input: SettlementInput }) => settleChapter(project.projectId, chapterNumber, input), onSuccess: () => { void refreshWorkflow(); } });
	const finalizeMutation = useMutation({ mutationFn: ({ chapterNumber, title, content, draftRevision, contentHash }: { chapterNumber: number; title: string; content: string; draftRevision: number; contentHash: string }) => finalizeChapter(project.projectId, chapterNumber, { title, content, draftRevision, contentHash, confirmation: "USER_CONFIRMED" }), onSuccess: () => { void refreshWorkflow(); void queryClient.invalidateQueries({ queryKey: novelQueryKeys.chapters(project.projectId) }); } });
	useEffect(() => { if (resourceQuery.data) { setContent(resourceQuery.data.content); setDirty(false); setSavedDraft(resourceQuery.data.workflow?.draft ? { revision: resourceQuery.data.workflow.draft.draftRevision, contentHash: resourceQuery.data.workflow.draft.contentHash } : { revision: resourceQuery.data.metadata.revision, contentHash: resourceQuery.data.metadata.contentHash }); } }, [resourceQuery.data]);
	useEffect(() => {
		const firstChapter = chaptersQuery.data?.[0]?.chapter;
		if (chapter === null && firstChapter !== undefined) navigate(`/project/${encodeURIComponent(project.projectId)}/manuscript/${firstChapter}`, { replace: true });
	}, [chapter, chaptersQuery.data, navigate, project.projectId]);
	if (chaptersQuery.isPending) return <StudioEmptyState icon={<PenLine size={24} />} title="正在读取正文" description="正在读取 manuscript Markdown。" status="读取中" />;
	if (chapter === null && (chaptersQuery.data?.length ?? 0) === 0) return <StudioEmptyState icon={<PenLine size={24} />} title="尚未创建正文" description={`项目《${project.title}》还没有正文。`} status="等待正文" action={<button className="primary-button" type="button" onClick={() => createMutation.mutate("第一章")}>创建第一章</button>} />;
	const activeChapter = chapter ?? chaptersQuery.data?.[0]?.chapter ?? null;
	if (activeChapter === null) return null;
	if (resourceQuery.isPending || !resourceQuery.data) return <StudioEmptyState icon={<PenLine size={24} />} title="正在打开章节" description="正在读取章节 Markdown。" status="读取中" />;
	const resource = resourceQuery.data;
	const activeChapterNumber = activeChapter;
	function draftRevision(): number { return savedDraft?.revision ?? resource.workflow?.draft?.draftRevision ?? resource.metadata.revision; }
	function contentHash(): string { return savedDraft?.contentHash ?? resource.workflow?.draft?.contentHash ?? resource.metadata.contentHash; }
	function save(): void { saveMutation.mutate({ chapterNumber: activeChapterNumber, content, baseContentHash: contentHash(), revision: draftRevision() + 1 }); }
	function runReconcile(): void { reconcileMutation.mutate({ chapterNumber: activeChapterNumber, draftRevision: draftRevision(), contentHash: contentHash() }); }
	function confirmSettlement(input: SettlementInput): void { settlementMutation.mutate({ chapterNumber: activeChapterNumber, input }); }
	function finalize(): void { if (resource.workflow?.settlement === null || resource.workflow?.settlement === undefined) return; finalizeMutation.mutate({ chapterNumber: activeChapterNumber, title: resource.metadata.title ?? `第 ${activeChapterNumber} 章`, content, draftRevision: draftRevision(), contentHash: contentHash() }); }
	const workflow = resource.workflow;
	if (workflow === null) return <StudioEmptyState icon={<PenLine size={24} />} title="章节工作流不可用" description="当前章节没有可用的工作流状态，请刷新后重试。" status="状态缺失" />;
	return <div className="studio-grid"><aside className="navigator-panel"><div className="panel-heading"><span>章节</span></div>{(chaptersQuery.data ?? []).map((entry) => <button className={`tree-item ${entry.chapter === activeChapter ? "selected" : ""}`} type="button" key={entry.chapter} onClick={() => navigate(`/project/${encodeURIComponent(project.projectId)}/manuscript/${entry.chapter}`)}><FileText size={13} /> {String(entry.chapter).padStart(2, "0")} {entry.title ?? "未命名章节"}</button>)}<button className="tree-item" type="button" onClick={() => createMutation.mutate(`第 ${(chaptersQuery.data?.length ?? 0) + 1} 章`)}>+ 新章节</button></aside><main className="editor-panel"><div className="editor-meta"><span>第 {activeChapter} 章 · {resource.metadata.title ?? "未命名章节"}</span><span>{dirty ? "未保存" : workflow?.phase === "finalized" ? "已定稿" : "已保存"}</span></div><article className="document-editor"><textarea aria-label="文稿正文" value={content} onChange={(event) => { setContent(event.target.value); setDirty(true); }} /></article><div className="editor-footer"><span>字数 {[...content].length}</span><button className="primary-button" type="button" onClick={save} disabled={!dirty || saveMutation.isPending}><Save size={14} /> {saveMutation.isPending ? "保存中" : "保存草稿"}</button>{saveMutation.isError && <span className="form-error">{getApiErrorMessage(saveMutation.error, "保存失败")}</span>}</div></main><aside className="context-panel"><div className="context-heading"><div><span className="eyebrow">CHAPTER WORKFLOW</span><strong>第 {activeChapter} 章</strong></div></div><WorkflowStep label="保存草稿" active={dirty === false} done={dirty === false} /><WorkflowStep label="正文对齐" active={workflow?.reconcile === null} done={workflow?.reconcile?.status === "aligned" || workflow?.reconcile?.status === "creative-discovery-accepted"} /><WorkflowStep label="章节结算" active={workflow?.canSettle === true && workflow.settlement === null} done={workflow?.settlement !== null} /><WorkflowStep label="正式定稿" active={workflow?.canFinalize === true} done={workflow?.phase === "finalized"} />{workflow?.reconcile === null ? <div className="inspector-card"><strong>先运行 Reconcile</strong><p>检查正文是否兑现计划，也允许记录写作过程中出现的新发现。</p><button className="primary-button" type="button" onClick={runReconcile} disabled={dirty || reconcileMutation.isPending}>{reconcileMutation.isPending ? "检查中" : "检查正文与计划"}</button></div> : <ReconcilePanel report={workflow.reconcile} discovery={discovery} onDiscoveryChange={setDiscovery} onDecision={(decision) => decideMutation.mutate({ chapterNumber: activeChapterNumber, report: workflow.reconcile!, decision, discovery })} onCommit={(id) => commitDiscoveryMutation.mutate(id)} busy={decideMutation.isPending || commitDiscoveryMutation.isPending} />}{workflow?.canSettle === true && workflow.settlement === null && <SettlementPanel chapter={activeChapterNumber} draftRevision={draftRevision()} contentHash={contentHash()} onConfirm={confirmSettlement} busy={settlementMutation.isPending} />}{workflow?.settlement !== null && workflow?.phase !== "finalized" && <div className="inspector-card"><strong>本章事实已确认</strong><p>长期记忆尚未提交。确认正文没有继续变化后，再正式定稿。</p><button className="primary-button" type="button" onClick={finalize} disabled={dirty || !workflow.canFinalize || finalizeMutation.isPending}>{finalizeMutation.isPending ? "定稿中" : "正式定稿"}</button>{!workflow.canFinalize && <p className="form-error">当前仍有阻塞问题或待处理变更。</p>}</div>}{workflow?.phase === "finalized" && <div className="inspector-card"><Check size={16} /><strong>本章已正式定稿</strong><p>本章事实已封存，可继续下一章。</p></div>}{[saveMutation, reconcileMutation, decideMutation, settlementMutation, finalizeMutation].some((mutation) => mutation.isError) && <p className="form-error">{getApiErrorMessage([saveMutation, reconcileMutation, decideMutation, settlementMutation, finalizeMutation].find((mutation) => mutation.isError)?.error, "章节工作流操作失败")}</p>}</aside></div>;
}

function WorkflowStep({ label, active, done }: { label: string; active: boolean; done: boolean }) { return <div className={`workflow-step ${active ? "active" : ""} ${done ? "done" : ""}`}><span>{done ? <Check size={12} /> : "·"}</span>{label}</div>; }

function ReconcilePanel({ report, discovery, onDiscoveryChange, onDecision, onCommit, busy }: { report: ReconcileReport; discovery: string; onDiscoveryChange(value: string): void; onDecision(decision: "prose-was-wrong" | "accept-creative-discovery"): void; onCommit(changeSetId: string): void; busy: boolean }) {
	if (report.status === "aligned") return <div className="inspector-card"><Check size={16} /><strong>正文与计划已对齐</strong><p>没有检测到需要作者裁决的分歧，可以进入章节结算。</p></div>;
	if (report.status === "prose-correction-required") return <div className="inspector-card"><AlertTriangle size={16} /><strong>需要修正文稿</strong><p>作者判断正文偏离了计划。修改正文后保存，系统会重新开始对齐。</p></div>;
	if (report.status === "creative-discovery-accepted") return <div className="inspector-card"><Check size={16} /><strong>已接受创作发现</strong><p>{report.changeSetId ? "故事变更已生成，提交后才能进入章节结算。" : "故事变更已接受。"}</p>{report.changeSetId && <button className="primary-button" type="button" onClick={() => onCommit(report.changeSetId!)} disabled={busy}>{busy ? "提交中" : "提交故事变更"}</button>}</div>;
	return <div className="inspector-card"><AlertTriangle size={16} /><strong>发现正文与计划有分歧</strong>{report.divergences.map((divergence) => <p key={divergence.divergenceId}>{divergence.description}</p>)}<label className="workflow-field">如果正文更好，请记录创作发现<textarea value={discovery} onChange={(event) => onDiscoveryChange(event.target.value)} placeholder="例如：人物在写作中决定主动追查，而不是等待线索出现。" /></label><div className="workflow-actions"><button className="quiet-button" type="button" onClick={() => onDecision("prose-was-wrong")} disabled={busy}>正文偏了，回去修改</button><button className="primary-button" type="button" onClick={() => onDecision("accept-creative-discovery")} disabled={busy || !discovery.trim()}>接受创作发现</button></div></div>;
}

function SettlementPanel({ chapter, draftRevision, contentHash, onConfirm, busy }: { chapter: number; draftRevision: number; contentHash: string; onConfirm(input: SettlementInput): void; busy: boolean }) {
	const [changes, setChanges] = useState("");
	const [knowledge, setKnowledge] = useState("");
	const [threads, setThreads] = useState("");
	function confirm(): void { const items = lines(changes); onConfirm({ draftRevision, contentHash, summary: { pov: "", time: "", locations: [], characters: [], events: items, newFacts: items, relationshipChanges: [], cluesIntroduced: [], cluesResolved: [], itemsChanged: [], openQuestions: [], ...(items.length > 0 ? { whatChanged: items } : {}) }, knowledgeChanges: lines(knowledge).map((change) => ({ characterId: "author-noted", change })), relationshipChanges: [], objects: [], threads: lines(threads), promises: [], clues: [], professionalState: [], timelineChanges: [], confirmation: "USER_CONFIRMED" }); }
	return <div className="inspector-card settlement-card"><strong>章节结算</strong><p>确认这一章真正改变了哪些状态。确认后，长期记忆仍要等正式定稿才提交。</p><label className="workflow-field">本章实际改变了什么<textarea value={changes} onChange={(event) => setChanges(event.target.value)} placeholder="每行写一项；没有变化可留空。" /></label><label className="workflow-field">人物新增认知（可选）<textarea value={knowledge} onChange={(event) => setKnowledge(event.target.value)} placeholder="每行一项，例如：女主知道文件被调包。" /></label><label className="workflow-field">Thread / Promise 变化（可选）<textarea value={threads} onChange={(event) => setThreads(event.target.value)} placeholder="每行一项；没有变化可留空。" /></label><button className="primary-button" type="button" onClick={confirm} disabled={busy}>{busy ? "确认中" : "确认本章事实"}</button></div>;
}

function lines(value: string): string[] { return value.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length > 0); }

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

function StudioEmptyState({ icon, title, description, status, action }: { icon: ReactNode; title: string; description: string; status: string; action?: ReactNode }) {
	const navigate = useNavigate();
	return <div className="studio-empty studio-mode-empty"><div className="studio-empty-icon">{icon}</div><h2>{title}</h2><p>{description}</p><span className="status-pill neutral">{status}</span>{action}<button className="quiet-button" type="button" onClick={() => navigate("/library")}><ArrowLeft size={14} /> 返回作品库</button></div>;
}
