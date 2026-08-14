// Context Compiler：task-aware 上下文选择（MUST / SHOULD / OPTIONAL + budget + freshness + privacy）。
// 所有 task（planning / drafting / diagnosis / revision / manuscript review）共用同一选择基础设施，不同 selection profile。
// 不引入 Vector DB：先用 Graph + Ref + State + Recency 证明足够；不足才记录 Future Risk。
import type { DesignCheckFinding } from "./story-design.ts";

export type ContextPriority = "MUST" | "SHOULD" | "OPTIONAL";
export type AuthoringTask = "chapter-planning" | "chapter-drafting" | "chapter-diagnosis" | "chapter-revision" | "manuscript-review" | "story-design-review" | "reader-sim" | "generic";

export interface PreparedContextSection {
	key: string;
	content: string;
	sourceRefs: string[];
	priorityHint: ContextPriority;
	sourceHash: string;
	recency: number; // 越大越新
	relatedTo?: string[]; // 关联 refs（thread/setup/character/relationship/professional）
}

export interface ContextSectionEntry {
	key: string;
	priority: ContextPriority;
	content: string;
	sourceRefs: string[];
	reason: string;
	sourceHash: string;
	recency?: number;
}

export interface CompiledContext {
	projectId: string;
	task: string;
	chapter?: number;
	entries: ContextSectionEntry[];
	totalChars: number;
	budget: number;
	truncated: boolean;
	selectedSources: Array<{ source: string; reason: string; priority: ContextPriority }>;
	staleSources: string[];
}

// task → 哪些 key 是 MUST / SHOULD
const TASK_MUST: Record<AuthoringTask, string[]> = {
	"chapter-planning": ["scene-design", "events", "character-states", "knowledge", "previous-exit", "required-state", "critical-facts", "relevant-refs", "voice"],
	"chapter-drafting": ["scene-design", "events", "character-states", "knowledge", "previous-exit", "required-state", "critical-facts", "relevant-refs", "voice"],
	"chapter-diagnosis": ["scene-design", "events", "draft", "character-states", "knowledge"],
	"chapter-revision": ["scene-design", "events", "draft", "diagnosis", "character-states"],
	"manuscript-review": ["summary", "threads", "setups", "promises", "events"],
	"story-design-review": ["concept", "foundation", "architecture", "promises", "ending"],
	"reader-sim": ["project", "summaries"],
	"generic": [],
};

const TASK_SHOULD: Record<AuthoringTask, string[]> = {
	"chapter-planning": ["summaries", "threads", "setups", "promises", "relationship-history", "professional-history", "mystery-state"],
	"chapter-drafting": ["summaries", "threads", "setups", "relationship-history", "professional-history"],
	"chapter-diagnosis": ["threads", "summaries", "voice"],
	"chapter-revision": ["threads", "summaries", "relationship-history"],
	"manuscript-review": ["voice", "character-states", "relationships", "objects"],
	"story-design-review": ["directions", "candidates", "links"],
	"reader-sim": [],
	"generic": [],
};

export function compileAuthoringContext(params: {
	projectId: string;
	task: AuthoringTask;
	chapter?: number;
	sections: PreparedContextSection[];
	budget?: number;
	currentHashes?: Record<string, string>;
}): CompiledContext {
	const { projectId, task, chapter, sections, currentHashes } = params;
	const budget = params.budget ?? 50_000;
	const taskMust = new Set(TASK_MUST[task]);
	const taskShould = new Set(TASK_SHOULD[task]);
	const staleSources: string[] = [];
	const entries: ContextSectionEntry[] = [];
	for (const section of sections) {
		const stale = currentHashes !== undefined && currentHashes[section.key] !== undefined && currentHashes[section.key] !== section.sourceHash;
		if (stale) {
			staleSources.push(section.key);
			continue;
		}
		// reader-sim 硬边界：只允许 project/summaries（作者秘密绝不进入 reader context）
		if (task === "reader-sim" && !taskMust.has(section.key) && !taskShould.has(section.key)) continue;
		const priority: ContextPriority = taskMust.has(section.key) ? "MUST" : taskShould.has(section.key) ? "SHOULD" : section.priorityHint;
		const reason = priority === "MUST" ? `${task} 必需：${section.key}` : priority === "SHOULD" ? `${task} 建议：${section.key}` : `可选：${section.key}`;
		entries.push({ key: section.key, priority, content: section.content, sourceRefs: section.sourceRefs, reason, sourceHash: section.sourceHash, recency: section.recency });
	}
	const order: Record<ContextPriority, number> = { MUST: 0, SHOULD: 1, OPTIONAL: 2 };
	entries.sort((left, right) => order[left.priority] - order[right.priority] || (right.recency ?? 0) - (left.recency ?? 0));
	let totalChars = 0;
	let truncated = false;
	const kept: ContextSectionEntry[] = [];
	const selectedSources: CompiledContext["selectedSources"] = [];
	for (const entry of entries) {
		const next = totalChars + entry.content.length;
		if (next > budget) {
			if (entry.priority === "MUST") {
				// MUST 永远保留：按预算截断内容而非丢弃
				const slice = entry.content.slice(0, Math.max(0, budget - totalChars));
				if (slice.length > 0) {
					kept.push({ ...entry, content: slice + "\n[context truncated] " });
					selectedSources.push({ source: entry.key, reason: entry.reason, priority: entry.priority });
				}
				truncated = true;
				break;
			}
			truncated = true;
			continue;
		}
		kept.push(entry);
		selectedSources.push({ source: entry.key, reason: entry.reason, priority: entry.priority });
		totalChars = next;
	}
	return { projectId, task, chapter, entries: kept, totalChars, budget, truncated, selectedSources, staleSources };
}

export function contextStaleFindings(compiled: CompiledContext): DesignCheckFinding[] {
	return compiled.staleSources.map((source) => ({ code: "CONTEXT_SOURCE_STALE", severity: "warning" as const, message: `context source ${source} 已过期（source hash 变化）；stale 内容不得继续使用`, targetRefs: [source] }));
}
