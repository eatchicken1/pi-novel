import { Check, ChevronRight, Copy, Cpu, ExternalLink, KeyRound, LogIn, Search, ShieldCheck, Terminal, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { ConfigureModelApiKeyInput, ModelCatalogEntry, ModelCatalog, ProviderCatalogEntry } from "@earendil-works/pi-novel-contracts";

export type RuntimePanelMode = "auth" | "models";

interface AuthModelPanelProps {
	mode: RuntimePanelMode;
	catalog: ModelCatalog;
	selectedModel: ModelCatalogEntry | null;
	onModeChange: (mode: RuntimePanelMode) => void;
	onSelectModel: (model: ModelCatalogEntry) => void;
	onConfigureApiKey: (input: ConfigureModelApiKeyInput) => Promise<void>;
	onClearApiKey: (providerId: string) => Promise<void>;
	onClose: () => void;
}

export function AuthModelPanel({ mode, catalog, selectedModel, onModeChange, onSelectModel, onConfigureApiKey, onClearApiKey, onClose }: AuthModelPanelProps) {
	const [providerId, setProviderId] = useState(selectedModel?.providerId ?? "openai-codex");
	const [query, setQuery] = useState("");

	return <div className="panel-backdrop" onClick={onClose}><section className="runtime-panel" onClick={(event) => event.stopPropagation()}><header className="runtime-panel-header"><div className="runtime-panel-title"><div className="runtime-panel-icon"><Cpu size={18} /></div><div><p className="eyebrow">PI-NOVEL RUNTIME</p><h2>运行时设置</h2><span>供应商与模型统一管理，凭证目录与 CLI 保持一致</span></div></div><button className="icon-button" aria-label="关闭运行时设置" onClick={onClose}><X size={18} /></button></header><div className="runtime-tabs"><button className={mode === "auth" ? "active" : ""} onClick={() => onModeChange("auth")}><LogIn size={15} /> 供应商登录</button><button className={mode === "models" ? "active" : ""} onClick={() => onModeChange("models")}><Cpu size={15} /> 选择模型</button></div>{mode === "auth" ? <AuthView providers={catalog.providers} providerId={providerId} onProviderChange={setProviderId} onConfigureApiKey={onConfigureApiKey} onClearApiKey={onClearApiKey} /> : <ModelView catalog={catalog} providerId={providerId} query={query} selectedModel={selectedModel} onProviderChange={setProviderId} onQueryChange={setQuery} onSelectModel={onSelectModel} />}</section></div>;
}

function AuthView({ providers, providerId, onProviderChange, onConfigureApiKey, onClearApiKey }: { providers: ProviderCatalogEntry[]; providerId: string; onProviderChange: (providerId: string) => void; onConfigureApiKey: (input: ConfigureModelApiKeyInput) => Promise<void>; onClearApiKey: (providerId: string) => Promise<void> }) {
	const provider = providers.find((entry) => entry.providerId === providerId) ?? providers[0];
	const [copied, setCopied] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function copyCommand(): Promise<void> {
		if (!provider) return;
		if (!provider.cliLoginCommand) return;
		await navigator.clipboard?.writeText(provider.cliLoginCommand);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1600);
	}

	if (!provider) return <div className="runtime-empty"><LogIn size={22} /><strong>暂无可用供应商</strong></div>;
	async function saveApiKey(): Promise<void> {
		if (!apiKey.trim()) return;
		setSaving(true); setError(null);
		try { await onConfigureApiKey({ providerId: provider.providerId, apiKey: apiKey.trim(), ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}) }); setApiKey(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "保存失败"); } finally { setSaving(false); }
	}
	async function clearApiKey(): Promise<void> { setSaving(true); setError(null); try { await onClearApiKey(provider.providerId); } catch (cause) { setError(cause instanceof Error ? cause.message : "清除失败"); } finally { setSaving(false); } }
	return <div className="runtime-layout"><div className="provider-list">{providers.map((entry) => <button className={`provider-row ${entry.providerId === provider.providerId ? "selected" : ""}`} key={entry.providerId} onClick={() => { onProviderChange(entry.providerId); setBaseUrl(entry.baseUrl ?? ""); setError(null); }}><span className="provider-logo">{entry.name.slice(0, 1)}</span><span className="provider-row-copy"><strong>{entry.name}</strong><small>{entry.authLabel}</small></span><span className={`connection-status ${entry.status}`}>{entry.status === "connected" ? "已连接" : "未连接"}</span><ChevronRight size={14} /></button>)}</div><div className="provider-detail"><div className="detail-eyebrow"><span className="provider-logo large">{provider.name.slice(0, 1)}</span><div><p className="eyebrow">供应商连接</p><h3>{provider.name}</h3></div></div><div className="auth-status-card"><div className="auth-status-icon"><ShieldCheck size={18} /></div><div><strong>{provider.status === "connected" ? "已连接" : "尚未连接"}</strong><span>{provider.apiKeyConfigured ? "API Key 已安全保存到当前工作区。" : "选择 API Key 或 CLI OAuth 作为当前供应商的凭证。"}</span></div><span className="status-pill neutral">{provider.authMethods.includes("api_key") && provider.authMethods.includes("oauth") ? "API Key + OAuth" : provider.authMethods.includes("api_key") ? "API Key" : "OAuth"}</span></div>{provider.authMethods.includes("api_key") && <div className="api-key-card"><div className="cli-card-title"><KeyRound size={15} /><strong>前端配置 API Key</strong><span>{provider.apiKeyLabel ?? "Provider API key"}</span></div><p>密钥只提交给本机 Pi-Novel API，并以工作区本地凭证文件保存，前端不会回显。</p><label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={provider.apiKeyConfigured ? "已配置，输入新 key 可替换" : "粘贴 API Key"} autoComplete="off" /></label><label>Base URL <span className="muted">可选</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="默认供应商地址" /></label><div className="button-row"><button className="primary-button" onClick={saveApiKey} disabled={saving || !apiKey.trim()}>{saving ? "保存中" : provider.apiKeyConfigured ? "替换 API Key" : "保存 API Key"}</button>{provider.apiKeyConfigured && <button className="secondary-button" onClick={clearApiKey} disabled={saving}>清除</button>}</div></div>}{provider.cliLoginCommand && <div className="cli-login-card"><div className="cli-card-title"><Terminal size={15} /><strong>与命令行保持一致</strong><span>CLI OAuth</span></div><p>OAuth 继续复用 CLI 凭证，不在 Web 层保存 token。</p><code>{provider.cliLoginCommand}</code><button className="secondary-button" onClick={copyCommand}>{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "命令已复制" : "复制登录命令"}</button></div>}{error && <p className="form-error">{error}</p>}<div className="auth-footnote"><ExternalLink size={14} /> API Key 配置与模型选择都作用于当前 Workspace。</div></div></div>;
}

function ModelView({ catalog, providerId, query, selectedModel, onProviderChange, onQueryChange, onSelectModel }: { catalog: ModelCatalog; providerId: string; query: string; selectedModel: ModelCatalogEntry | null; onProviderChange: (providerId: string) => void; onQueryChange: (query: string) => void; onSelectModel: (model: ModelCatalogEntry) => void }) {
	const provider = catalog.providers.find((entry) => entry.providerId === providerId) ?? catalog.providers[0];
	const models = useMemo(() => (provider?.models ?? []).filter((model) => `${model.name} ${model.modelId}`.toLowerCase().includes(query.toLowerCase())), [provider, query]);
	return <div className="model-layout"><div className="model-sidebar"><div className="model-search"><Search size={15} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索模型" /></div><div className="model-provider-list">{catalog.providers.map((entry) => <button key={entry.providerId} className={entry.providerId === provider?.providerId ? "active" : ""} onClick={() => { onProviderChange(entry.providerId); onQueryChange(""); }}><span>{entry.name}</span><small>{entry.models.length}</small></button>)}</div></div><div className="model-results"><div className="model-results-header"><div><p className="eyebrow">MODEL CATALOG</p><h3>{provider?.name ?? "模型"}</h3></div><span>{models.length} 个模型</span></div>{models.length === 0 ? <div className="runtime-empty compact"><Cpu size={20} /><strong>该供应商暂无静态模型</strong><span>登录后可从动态目录刷新。</span></div> : <div className="model-list">{models.map((model) => <button key={`${model.providerId}/${model.modelId}`} className={`model-row ${selectedModel?.modelId === model.modelId && selectedModel.providerId === model.providerId ? "selected" : ""}`} onClick={() => onSelectModel(model)}><span className="model-row-main"><strong>{model.name}</strong><small>{model.modelId}</small></span><span className="model-badges">{model.reasoning && <em>Reasoning</em>}{model.input.includes("image") && <em>Vision</em>}</span><span className="model-row-meta">{formatContext(model.contextWindow)}<ChevronRight size={14} /></span></button>)}</div>}</div></div>;
}

function formatContext(value: number): string { return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M ctx` : `${Math.round(value / 1000)}K ctx`; }
