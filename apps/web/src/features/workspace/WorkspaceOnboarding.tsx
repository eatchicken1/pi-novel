import { FolderOpen, ArrowRight, ServerOff } from "lucide-react";
import { useState, type FormEvent } from "react";

interface WorkspaceOnboardingProps {
	apiUnavailable: boolean;
	onInitialize: (path: string) => Promise<void>;
}

export function WorkspaceOnboarding({ apiUnavailable, onInitialize }: WorkspaceOnboardingProps) {
	const [path, setPath] = useState("D:\\Novel");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await onInitialize(path.trim());
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : "Workspace 初始化失败");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="onboarding-screen">
			<div className="onboarding-card">
				<div className="onboarding-mark"><FolderOpen size={23} strokeWidth={1.8} /></div>
				<p className="eyebrow">PI-NOVEL WORKSPACE</p>
				<h1>先连接一个 Workspace</h1>
				<p className="onboarding-copy">Pi-Novel 会把所有作品保存在这个目录中，每本小说对应一个独立文件夹；已有作品也会被扫描进作品库。</p>
				{apiUnavailable && <div className="inline-alert" role="alert"><ServerOff size={16} /> 本地 API 不可用或令牌无效，请先运行 <code>npm run novel:dev</code>。</div>}
				<form onSubmit={handleSubmit}>
					<label htmlFor="workspace-path">Workspace 路径</label>
					<div className="path-input"><FolderOpen size={16} /><input id="workspace-path" autoFocus value={path} onChange={(event) => setPath(event.target.value)} placeholder="D:\\Novel" aria-describedby="workspace-path-help" /></div>
					{error && <p className="form-error" role="alert">{error}</p>}
					<button className="primary-button onboarding-button" type="submit" disabled={isSubmitting || apiUnavailable || !path.trim()}>{isSubmitting ? "正在连接…" : "打开 Workspace"}<ArrowRight size={16} /></button>
				</form>
				<p className="onboarding-note" id="workspace-path-help">Pi-Novel 不会在连接工作区时自动改写已有作品文件。</p>
			</div>
		</div>
	);
}
