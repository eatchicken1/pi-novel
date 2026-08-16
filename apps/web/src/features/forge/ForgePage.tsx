import { ArrowLeft, Check, GitCompareArrows, LoaderCircle, LockKeyhole, RefreshCw, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { DirectionCandidate, NarrativeDna, StoryConstraint } from "@earendil-works/pi-novel-contracts";
import {
	commitForgeSession,
	critiqueForgeCandidate,
	generateForgeDirections,
	getForgeArtifacts,
	getForgeSession,
	materializeForgeSession,
	regenerateForgeDirections,
	selectForgeDirection,
	updateForgeSession,
} from "../../api/client.ts";
import { novelQueryKeys } from "../../api/query-keys.ts";
import { useAppShellContext } from "../../app/AppShell.tsx";

const DEFAULT_DNA: NarrativeDna = { genre: "悬疑", narrativeScale: "中长篇", coreExperience: "", pacing: "持续升级", pov: "限制视角", endingTone: "余韵明确", readerPromise: "真相与关系同时推进" };

export function ForgePage() {
	const { sessionId } = useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { catalog, selectedModel } = useAppShellContext();
	const [seed, setSeed] = useState("");
	const [dna, setDna] = useState<NarrativeDna>(DEFAULT_DNA);
	const [hardText, setHardText] = useState("");
	const [preferenceText, setPreferenceText] = useState("");
	const [authorNote, setAuthorNote] = useState("这条方向符合我的创作意图，可以进入 Native Project。");
	const [title, setTitle] = useState("");
	const [folderName, setFolderName] = useState("");
	const [critiqueInstruction, setCritiqueInstruction] = useState("指出这个方向最容易变成套路的地方，并给出一个能落地的修正建议。");
	const [error, setError] = useState<string | null>(null);
	const modelId = selectedModel ? `${selectedModel.providerId}/${selectedModel.modelId}` : catalog.defaultModelId ?? "";
	const sessionQuery = useQuery({ queryKey: novelQueryKeys.forgeSession(sessionId ?? ""), queryFn: () => getForgeSession(sessionId ?? ""), enabled: Boolean(sessionId && sessionId !== "draft") });
	const session = sessionQuery.data;
	const artifactsQuery = useQuery({ queryKey: novelQueryKeys.forgeArtifacts(sessionId ?? ""), queryFn: () => getForgeArtifacts(sessionId ?? ""), enabled: Boolean(sessionId && sessionId !== "draft"), refetchInterval: session?.status === "generating" ? 800 : false });
	const artifacts = artifactsQuery.data;

	useEffect(() => {
		if (!session) return;
		setSeed(session.seed);
		setDna(session.narrativeDNA ?? { ...DEFAULT_DNA, coreExperience: session.seed });
		setHardText(session.hardConstraints.map((entry) => entry.text).join("\n"));
		setPreferenceText(session.preferences.map((entry) => entry.text).join("\n"));
		setTitle(session.titleCandidate ?? "");
		setFolderName(session.titleCandidate?.replace(/[^\p{L}\p{N}_-]+/gu, "-") ?? "new-novel");
	}, [session]);

	useEffect(() => {
		if (!artifacts?.task || !sessionId) return;
		if (artifacts.task.status === "succeeded" || artifacts.task.status === "failed") void queryClient.invalidateQueries({ queryKey: novelQueryKeys.forgeSession(sessionId) });
	}, [artifacts?.task, queryClient, sessionId]);

	const saveMutation = useMutation({ mutationFn: () => updateForgeSession(sessionId ?? "", { seed: seed.trim(), narrativeDNA: { ...dna, coreExperience: dna.coreExperience.trim() || seed.trim() }, hardConstraints: toConstraints(hardText, "hard"), preferences: toConstraints(preferenceText, "preference"), ...(title.trim() ? { titleCandidate: title.trim() } : {}) }), onSuccess: (next) => queryClient.setQueryData(novelQueryKeys.forgeSession(sessionId ?? ""), next) });
	const generateMutation = useMutation({ mutationFn: () => generateForgeDirections(sessionId ?? "", { modelId, count: 3 }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: novelQueryKeys.forgeSession(sessionId ?? "") }); await queryClient.invalidateQueries({ queryKey: novelQueryKeys.forgeArtifacts(sessionId ?? "") }); } });
	const regenerateMutation = useMutation({ mutationFn: () => regenerateForgeDirections(sessionId ?? "", { modelId, count: 3 }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: novelQueryKeys.forgeSession(sessionId ?? "") }); await queryClient.invalidateQueries({ queryKey: novelQueryKeys.forgeArtifacts(sessionId ?? "") }); } });
	const selectMutation = useMutation({ mutationFn: (candidateId: string) => selectForgeDirection(sessionId ?? "", { candidateId }), onSuccess: (next) => { queryClient.setQueryData(novelQueryKeys.forgeSession(sessionId ?? ""), next); void queryClient.invalidateQueries({ queryKey: novelQueryKeys.forgeArtifacts(sessionId ?? "") }); } });
	const critiqueMutation = useMutation({ mutationFn: (candidateId: string) => critiqueForgeCandidate(sessionId ?? "", { candidateId, instruction: critiqueInstruction, modelId }), onSuccess: (next) => queryClient.setQueryData(novelQueryKeys.forgeArtifacts(sessionId ?? ""), next) });
	const commitMutation = useMutation({ mutationFn: () => commitForgeSession(sessionId ?? "", { authorNote }), onSuccess: (next) => queryClient.setQueryData(novelQueryKeys.forgeSession(sessionId ?? ""), next) });
	const materializeMutation = useMutation({ mutationFn: () => materializeForgeSession(sessionId ?? "", { title: title.trim(), folderName: folderName.trim(), language: "zh-CN" }), onSuccess: async (next) => { queryClient.setQueryData(novelQueryKeys.forgeSession(sessionId ?? ""), next); await queryClient.invalidateQueries({ queryKey: novelQueryKeys.workspace }); await queryClient.invalidateQueries({ queryKey: novelQueryKeys.projects }); } });

	const operationError = [saveMutation.error, generateMutation.error, regenerateMutation.error, selectMutation.error, critiqueMutation.error, commitMutation.error, materializeMutation.error].find((entry) => entry !== null);
	const shownError = error ?? (operationError instanceof Error ? operationError.message : null);
	const selectedCandidate = useMemo(() => artifacts?.candidates.find((candidate) => candidate.status === "selected") ?? (session?.selectedCandidateId ? artifacts?.candidates.find((candidate) => candidate.candidateId === session.selectedCandidateId) : undefined), [artifacts?.candidates, session?.selectedCandidateId]);

	if (!sessionId || sessionId === "draft") return <ForgeMissing />;
	if (sessionQuery.isPending) return <div className="loading-screen"><LoaderCircle className="spin" size={18} /> 正在恢复 Forge Session…</div>;
	if (!session) return <ForgeMissing />;

	async function saveAndGenerate(): Promise<void> {
		setError(null);
		try { await saveMutation.mutateAsync(); await generateMutation.mutateAsync(); } catch { /* surfaced by mutation state */ }
	}

	return <div className="forge-page page-stack"><section className="page-heading"><div><p className="eyebrow">02 / FORGE SESSION</p><h1>故事方向工作台 <span>{session.status}</span></h1><p>AI 只提出候选；作者选择并提交后，才会形成 Story Commitment。</p></div><button className="quiet-button" onClick={() => navigate("/")}><ArrowLeft size={15} /> 返回工作区</button></section><div className="forge-journey"><JourneyStep active={session.status === "draft" || session.status === "ready"} done={session.status !== "draft" && session.status !== "ready"} label="Seed & DNA" /><JourneyStep active={session.status === "generating" || session.status === "awaiting_selection"} done={session.status === "committed" || session.status === "materializing" || session.status === "materialized"} label="Explore & Compare" /><JourneyStep active={session.status === "committed" || session.status === "materializing"} done={session.status === "materialized"} label="Author Commit" /><JourneyStep active={session.status === "materialized"} done={session.status === "materialized"} label="Native Project" /></div>{shownError && <div className="inline-alert"><Sparkles size={14} /> {shownError}</div>}<section className="forge-grid"><div className="forge-main"><section className="card forge-section"><div className="section-heading forge-section-heading"><div><p className="eyebrow">NARRATIVE DNA</p><h2>先固定创作意图</h2></div><span className="status-pill neutral">Proposal Layer</span></div><div className="forge-form-grid"><label>故事种子<textarea value={seed} onChange={(event) => setSeed(event.target.value)} /></label><label>核心体验<textarea value={dna.coreExperience} onChange={(event) => setDna({ ...dna, coreExperience: event.target.value })} /></label><label>读者承诺<textarea value={dna.readerPromise} onChange={(event) => setDna({ ...dna, readerPromise: event.target.value })} /></label><label>结局语气<input value={dna.endingTone} onChange={(event) => setDna({ ...dna, endingTone: event.target.value })} /></label></div><div className="constraint-grid"><label>硬约束 <span>必须满足</span><textarea value={hardText} onChange={(event) => setHardText(event.target.value)} placeholder="每行一条，例如：不使用失忆反转" /></label><label>偏好 <span>尽量满足</span><textarea value={preferenceText} onChange={(event) => setPreferenceText(event.target.value)} placeholder="每行一条，例如：保留封闭空间" /></label></div><div className="forge-section-footer"><span><LockKeyhole size={13} /> 硬约束与偏好分开存储</span><button className="primary-button" onClick={saveAndGenerate} disabled={saveMutation.isPending || generateMutation.isPending || !modelId}>{generateMutation.isPending ? "生成方向中…" : "保存并生成方向"} <Send size={14} /></button></div></section>{artifacts?.candidates.length ? <section className="card forge-section"><div className="section-heading forge-section-heading"><div><p className="eyebrow">DIRECTION CANDIDATES</p><h2>比较真正不同的故事引擎</h2></div><button className="secondary-button compact-button" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}>{regenerateMutation.isPending ? "重新生成中…" : "重新生成"} <RefreshCw size={13} /></button></div><div className="candidate-grid">{artifacts.candidates.map((candidate) => <CandidateCard key={candidate.candidateId} candidate={candidate} selected={candidate.candidateId === session.selectedCandidateId} onSelect={() => selectMutation.mutate(candidate.candidateId)} onCritique={() => critiqueMutation.mutate(candidate.candidateId)} disabled={selectMutation.isPending || critiqueMutation.isPending} />)}</div>{artifacts.comparison && <div className="comparison-card"><div className="comparison-title"><GitCompareArrows size={15} /> 比较摘要</div>{artifacts.comparison.dimensions.map((dimension) => <div className="comparison-row" key={dimension.dimension}><strong>{dimension.dimension}</strong><span>{dimension.reason}</span><em>{dimension.assessment}</em></div>)}<p>{artifacts.comparison.notes.join(" ")}</p></div>}</section> : <section className="card forge-section forge-empty-state"><Sparkles size={25} /><h2>{session.status === "generating" ? "正在让模型探索不同方向" : "等待第一次方向生成"}</h2><p>至少三条候选会经过 Legacy Story Design 的差异检查后才进入比较。</p></section>}</div><aside className="forge-rail"><section className="card commit-rail"><div className="card-kicker"><LockKeyhole size={15} /> AUTHOR COMMIT</div><h2>作者确认区</h2><p>选择只是 UI 状态；提交才会写入 Story Commitment。</p><label>批评要求<textarea value={critiqueInstruction} onChange={(event) => setCritiqueInstruction(event.target.value)} /></label><label>作者说明<textarea value={authorNote} onChange={(event) => setAuthorNote(event.target.value)} /></label><button className="primary-button" onClick={() => commitMutation.mutate()} disabled={!selectedCandidate || commitMutation.isPending || session.status !== "awaiting_selection"}>{commitMutation.isPending ? "提交中…" : "提交选中方向"} <Check size={14} /></button>{session.status === "committed" && <div className="materialize-box"><p className="eyebrow">MATERIALIZE</p><strong>Story Commitment 已建立</strong><label>项目标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>文件夹名称<input value={folderName} onChange={(event) => setFolderName(event.target.value)} /></label><button className="primary-button" onClick={() => materializeMutation.mutate()} disabled={materializeMutation.isPending || !title.trim() || !folderName.trim()}>{materializeMutation.isPending ? "建立项目中…" : "建立 Native Project"}</button></div>}{session.status === "materialized" && <button className="secondary-button" onClick={() => session.materializedProjectId && navigate(`/project/${encodeURIComponent(session.materializedProjectId)}/manuscript`)}>进入 Studio</button>}</section><section className="card forge-meta"><span>Session ID</span><code>{session.forgeSessionId}</code><span>Model</span><code>{modelId || "未选择"}</code><span>Runtime</span><code>{session.runtimeRelativePath}</code></section></aside></section></div>;
}

function JourneyStep({ active, done, label }: { active: boolean; done: boolean; label: string }) { return <div className={`journey-step ${active ? "active" : ""} ${done ? "done" : ""}`}><span>{done ? <Check size={12} /> : ""}</span><strong>{label}</strong></div>; }

function CandidateCard({ candidate, selected, onSelect, onCritique, disabled }: { candidate: DirectionCandidate; selected: boolean; onSelect: () => void; onCritique: () => void; disabled: boolean }) { return <article className={`candidate-card ${selected ? "selected" : ""}`}><div className="candidate-card-top"><span className="candidate-index">{candidate.candidateId.slice(-4)}</span>{selected && <span className="status-pill selected-pill">已选择</span>}</div><h3>{candidate.title}</h3><p className="candidate-logline">{candidate.logline}</p><div className="candidate-fields"><div><span>核心谜团</span><strong>{candidate.centralMystery}</strong></div><div><span>社会机制</span><strong>{candidate.socialMechanism}</strong></div><div><span>关系断裂</span><strong>{candidate.relationshipFaultLine}</strong></div><div><span>结局形态</span><strong>{candidate.endingShape}</strong></div></div><div className="candidate-actions"><button className="secondary-button" onClick={onCritique} disabled={disabled}>请求批评</button><button className="primary-button" onClick={onSelect} disabled={disabled || selected}>{selected ? "已选择" : "选择方向"}</button></div></article>; }

function toConstraints(value: string, kind: StoryConstraint["kind"]): StoryConstraint[] { return value.split("\n").map((text) => text.trim()).filter(Boolean).map((text) => ({ id: `${kind}-${text.slice(0, 24)}`, kind, text })); }

function ForgeMissing() { return <div className="studio-empty"><Sparkles size={24} /><h2>Forge Session 不存在</h2><p>从工作区首页创建一个新的 Forge Session。</p></div>; }
