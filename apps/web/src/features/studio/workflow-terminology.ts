export type WorkflowAction = "draft" | "reconcile" | "diagnose" | "revise" | "settle" | "finalize" | "finished";

export const workflowLabel: Record<WorkflowAction, string> = {
	draft: "写作",
	reconcile: "检查",
	diagnose: "检查本章质量",
	revise: "修订",
	settle: "确认本章状态",
	finalize: "完成本章",
	finished: "已完成",
};

export function reviewCategoryLabel(category: "current" | "future" | "structural" | "suggestions"): string {
	return ({ current: "现在需要处理", future: "以后需要处理", structural: "结构风险", suggestions: "可选建议" })[category];
}
