import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { NovelProjectStore } from "./services/project-store.ts";
import { registerNovelTools } from "./tools.ts";

export default function novelAgentExtension(pi: ExtensionAPI): void {
	const stores = new Map<string, NovelProjectStore>();
	const getStore = (cwd: string): NovelProjectStore => {
		const existing = stores.get(cwd);
		if (existing) return existing;
		const store = new NovelProjectStore(cwd);
		stores.set(cwd, store);
		return store;
	};

	registerNovelTools(pi, getStore);
}
