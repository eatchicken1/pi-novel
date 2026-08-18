import { Check, ChevronRight, Cpu, ExternalLink, KeyRound, LogIn, ShieldCheck, Terminal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ConfigureModelApiKeyInput, ModelCatalog } from "@earendil-works/pi-novel-contracts";

interface AuthModelPanelProps {
	catalog: ModelCatalog;
	initialProviderId?: string;
	onConfigureApiKey: (input: ConfigureModelApiKeyInput) => Promise<void>;
	onClearApiKey: (providerId: string) => Promise<void>;
	onClose: () => void;
}

// 供应商设置：只管理 Provider / Credential / API Key / OAuth / Base URL /
// Connection Status。不在这里选择 Runtime Model（模型由 Agent Runtime Profile 管理）。
export function AuthModelPanel({ catalog, initialProviderId, onConfigureApiKey, onClearApiKey, onClose }: AuthModelPanelProps) {
	const firstProvider = catalog.providers.find((entry) => entry.status === "connected") ?? catalog.providers[0];
	const [providerId, setProviderId] = useState(initialProviderId ?? firstProvider?.providerId ?? "openai-codex");
	const provider = catalog.providers.find((entry) => entry.providerId === providerId) ?? firstProvider;
	const [copied, setCopied] = useState(false);
	const [apiKey, setApiKey] = useState("");
	const [baseUrl, setBaseUrl] = useState(provider?.baseUrl ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [providerSearch, setProviderSearch] = useState("");
	const [providerFilter, setProviderFilter] = useState<"all" | "connected">("all");
	const visibleProviders = useMemo(() => {
		const query = providerSearch.trim().toLowerCase();
		return catalog.providers.filter((entry) => {
			if (providerFilter === "connected" && entry.status !== "connected") return false;
			return `${entry.name} ${entry.providerId} ${entry.authLabel}`.toLowerCase().includes(query);
		});
	}, [catalog.providers, providerFilter, providerSearch]);
	useEffect(() => {
		setApiKey("");
		setCopied(false);
		setError(null);
	}, [providerId]);
	useEffect(() => {
		const nextProviderId = initialProviderId && catalog.providers.some((entry) => entry.providerId === initialProviderId) ? initialProviderId : catalog.providers.some((entry) => entry.providerId === providerId) ? providerId : firstProvider?.providerId;
		if (!nextProviderId) return;
		setProviderId(nextProviderId);
		setBaseUrl(catalog.providers.find((entry) => entry.providerId === nextProviderId)?.baseUrl ?? "");
	}, [catalog, firstProvider?.providerId, initialProviderId, providerId]);

	async function copyCommand(): Promise<void> {
		if (!provider?.cliLoginCommand) return;
		try {
			if (!navigator.clipboard) throw new Error("当前浏览器不支持复制");
			await navigator.clipboard.writeText(provider.cliLoginCommand);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1600);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "复制失败");
		}
	}

	async function saveApiKey(): Promise<void> {
		if (!provider || !apiKey.trim()) return;
		setSaving(true); setError(null);
		try {
			await onConfigureApiKey({ providerId: provider.providerId, apiKey: apiKey.trim(), ...(baseUrl.trim() ? { baseUrl: baseUrl.trim() } : {}) });
			setApiKey("");
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : "保存失败");
		} finally { setSaving(false); }
	}

	async function clearApiKey(): Promise<void> {
		if (!provider) return;
		setSaving(true); setError(null);
		try { await onClearApiKey(provider.providerId); } catch (cause) { setError(cause instanceof Error ? cause.message : "清除失败"); } finally { setSaving(false); }
	}

	return (<div className="panel-backdrop" role="presentation" onClick={onClose}><section className="runtime-panel" role="dialog" aria-modal="true" aria-labelledby="provider-panel-title" onClick={(event) => event.stopPropagation()}>
		<header className="runtime-panel-header">
			<div className="runtime-panel-title"><div className="runtime-panel-icon"><KeyRound size={18} /></div><div><p className="eyebrow">PI-NOVEL PROVIDERS</p><h2 id="provider-panel-title">供应商设置</h2><span>Provider、凭证与连接状态；运行模型由右上角 Runtime 为每个 Agent 单独配置</span></div></div>
			<button className="icon-button" type="button" aria-label="关闭供应商设置" onClick={onClose}><X size={18} /></button>
		</header>
		<div className="runtime-layout">
			<div className="provider-list"><div className="provider-search"><SearchIcon /><input value={providerSearch} onChange={(event) => setProviderSearch(event.target.value)} placeholder="搜索供应商" /></div><div className="provider-filter"><button className={providerFilter === "all" ? "active" : ""} type="button" onClick={() => setProviderFilter("all")}>全部</button><button className={providerFilter === "connected" ? "active" : ""} type="button" onClick={() => setProviderFilter("connected")}>已连接</button></div>{visibleProviders.map((entry) => (<button className={`provider-row ${entry.providerId === provider?.providerId ? "selected" : ""}`} type="button" key={entry.providerId} onClick={() => { setProviderId(entry.providerId); setBaseUrl(entry.baseUrl ?? ""); setError(null); }}><span className="provider-logo">{entry.name.slice(0, 1)}</span><span className="provider-row-copy"><strong>{entry.name}</strong><small>{entry.authLabel}</small></span><span className={`connection-status ${entry.status}`}>{entry.status === "connected" ? "已连接" : "未连接"}</span><ChevronRight size={14} /></button>))}{visibleProviders.length === 0 && <p className="provider-list-empty">没有匹配的供应商。</p>}</div>
			{!provider ? <div className="runtime-empty"><LogIn size={22} /><strong>暂无可用供应商</strong></div> : (<div className="provider-detail">
				<div className="detail-eyebrow"><span className="provider-logo large">{provider.name.slice(0, 1)}</span><div><p className="eyebrow">供应商连接</p><h3>{provider.name}</h3></div></div>
				<div className="auth-status-card"><div className="auth-status-icon"><ShieldCheck size={18} /></div><div><strong>{provider.status === "connected" ? "已连接" : "尚未连接"}</strong><span>{provider.apiKeyConfigured ? "已为当前工作区配置 API Key。" : "配置 API Key 或使用 CLI OAuth 作为该供应商的凭证。"}</span></div><span className="status-pill neutral">{provider.authMethods.includes("api_key") && provider.authMethods.includes("oauth") ? "API Key + OAuth" : provider.authMethods.includes("api_key") ? "API Key" : "OAuth"}</span></div>
				<div className="model-count-note"><Cpu size={14} /><span>该供应商包含 <strong>{provider.models.length}</strong> 个模型；模型选择在右上角 Runtime 中按 Agent 配置。</span></div>
				{provider.authMethods.includes("api_key") && (<div className="api-key-card">
					<div className="cli-card-title"><KeyRound size={15} /><strong>配置 API Key</strong><span>{provider.apiKeyLabel ?? "Provider API key"}</span></div>
					<p>凭证保存在当前本地工作区（.pi-novel/model-credentials.json），不会在前端回显。</p>
					<label>API Key<input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={provider.apiKeyConfigured ? "已配置，输入新 key 可替换" : "粘贴 API Key"} autoComplete="off" /></label>
					<label>Base URL <span className="muted">可选</span><input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="默认供应商地址" /></label>
					<div className="api-key-actions"><button className="primary-button" onClick={saveApiKey} disabled={saving || !apiKey.trim()}>{saving ? "保存中…" : "保存 API Key"}</button>{provider.apiKeyConfigured && <button className="quiet-button" onClick={clearApiKey} disabled={saving}>清除本地 Key</button>}</div>
				</div>)}
				{provider.authMethods.includes("oauth") && (<div className="api-key-card">
					<div className="cli-card-title"><Terminal size={15} /><strong>CLI OAuth</strong><span>{provider.cliLoginCommand ? "与 pi-ai 登录状态一致" : "OAuth"}</span></div>
					<p>在终端执行 CLI 登录后，Pi-Novel 会读取同一份 AuthStorage 并显示已连接。</p>
					{provider.cliLoginCommand && <div className="cli-command"><code>{provider.cliLoginCommand}</code><button className="icon-button" title="复制命令" onClick={copyCommand}>{copied ? <Check size={15} /> : <ExternalLink size={15} />}</button></div>}
				</div>)}
				{error && <div className="inline-alert" role="alert"><ShieldCheck size={13} /> {error}</div>}
			</div>)}
		</div>
	</section></div>);
}

function SearchIcon() { return <svg aria-hidden="true" className="provider-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>; }
