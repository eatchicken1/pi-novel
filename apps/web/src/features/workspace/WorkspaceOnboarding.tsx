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
			await onInitialize(path);
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
				<p className="onboarding-copy">Workspace 是作品、结构索引和审校记录的边界。选择一个本地目录，Pi-Novel 会在其中创建自己的控制目录，并扫描已有作品。</p>
				{apiUnavailable && <div className="inline-alert"><ServerOff size={16} /> API 未连接，请先运行 <code>npm run novel:dev</code></div>}
				<form onSubmit={handleSubmit}>
					<label htmlFor="workspace-path">Workspace 路径</label>
					<div className="path-input"><FolderOpen size={16} /><input id="workspace-path" value={path} onChange={(event) => setPath(event.target.value)} placeholder="D:\\Novel" /></div>
					{error && <p className="form-error">{error}</p>}
					<button className="primary-button onboarding-button" type="submit" disabled={isSubmitting || apiUnavailable || !path.trim()}>{isSubmitting ? "正在连接…" : "打开 Workspace"}<ArrowRight size={16} /></button>
				</form>
				<p className="onboarding-note">Round 2 只负责建立边界和读取索引；不会自动改写 Legacy 项目文件。</p>
			</div>
		</div>
	);
}
