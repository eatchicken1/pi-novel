import { expect, test, type Page, type Route } from "@playwright/test";

const projectId = "fixture-story";
const chapterPath = `/api/projects/${projectId}/chapters/1`;
const chapterText = "# 潮汐\n\n她察觉门外有人。\n";
const replacementText = "# 潮汐\n\n她立刻察觉门外有人，指尖停在门锁上。\n";
const selectedText = "她察觉门外有人。";
const replacementSelection = "她立刻察觉门外有人，指尖停在门锁上。";

test("completes the selection to narrative patch authoring slice", async ({ page }) => {
	let committed = false;
	await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
		await fulfillFixtureApi(route, committed, (value) => {
			committed = value;
		});
	});

	const runtimeProfilesResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/runtime/profiles");
	await page.goto(`/project/${projectId}/manuscript/1`);
	await runtimeProfilesResponse;
	await expect(page.locator("body")).toContainText("雾港");
	const editor = page.getByLabel("文稿正文");
	await expect(editor).toHaveValue(chapterText);

	await editor.click();
	await editor.press("Control+A");
	await page.getByRole("button", { name: "AI", exact: true }).click();
	await page.getByLabel("目标").fill("加强人物戒备感");
	await page.getByRole("button", { name: "生成修改建议" }).click();

	await expect(page.getByText("修改建议", { exact: true })).toBeVisible();
	const candidate = page.locator(".patch-candidate");
	await expect(candidate.locator("pre").nth(0)).toHaveText(selectedText);
	await expect(candidate.locator("pre").nth(1)).toHaveText(replacementSelection);
	await expect(page.getByText("部分因果覆盖")).toBeVisible();

	await page.getByRole("button", { name: "接受这个候选" }).click();
	await expect(page.getByText("已接受，待提交")).toBeVisible();
	await page.getByRole("button", { name: "应用修改" }).click();
	await expect(page.getByText("正文已修改，需要重新检查本章。")).toBeVisible();

	await page.reload();
	await expect(page.getByLabel("文稿正文")).toHaveValue(replacementText);
	await page.getByRole("link", { name: "历史" }).click();
	await expect(page.getByText("AI Patch · 第 1 章 · 加强人物戒备感")).toBeVisible();
});

async function fulfillFixtureApi(route: Route, committed: boolean, setCommitted: (value: boolean) => void): Promise<void> {
	const request = route.request();
	const url = new URL(request.url());
	const path = url.pathname;
	if (path === "/api/health") return json(route, { status: "ok", service: "pi-novel-api" });
	if (path === "/api/bootstrap") return json(route, { api: "ready", workspace: { status: "ready", summary: workspace() }, runtime: { configured: false } });
	if (path === "/api/workspace") return json(route, { workspace: workspace() });
	if (path === "/api/projects") return json(route, { projects: [project()] });
	if (path === "/api/models/catalog") return json(route, { providers: [] });
	if (path === "/api/runtime/profiles") return json(route, { profiles: [{ agentId: "chapter.reviser", modelId: "fixture/model", thinkingLevel: "off", updatedAt: "2026-08-19T00:00:00.000Z" }] });
	if (path === `/api/projects/${projectId}/capabilities`) return json(route, capabilities());
	if (path === `/api/projects/${projectId}/chapters`) return json(route, { chapters: [{ chapter: 1, title: "潮汐", wordCount: committed ? 25 : 14, contentHash: committed ? "hash-committed" : "hash-draft", revision: committed ? 2 : 1, finalized: false, updatedAt: "2026-08-19T00:00:00.000Z" }] });
	if (path === chapterPath && request.method() === "GET") return json(route, { chapter: chapter(committed) });
	if (path === `/api/projects/${projectId}/chapters/1/patches` && request.method() === "POST") return json(route, { task: task() }, 202);
	if (path === "/api/tasks/task-patch-1/events/stream") return route.fulfill({ status: 200, contentType: "text/event-stream", body: `event: task\ndata: ${JSON.stringify({ ...task(), status: "succeeded", resultRef: "cs-patch-1" })}\n\n` });
	if (path === `/api/projects/${projectId}/changesets/cs-patch-1` && request.method() === "GET") return json(route, { changeSet: changeSet(committed ? "committed" : "proposed") });
	if (path === `/api/projects/${projectId}/changesets/cs-patch-1/accept`) return json(route, { changeSet: changeSet("accepted", true) });
	if (path === `/api/projects/${projectId}/changesets/cs-patch-1/commit`) {
		setCommitted(true);
		return json(route, { changeSet: changeSet("committed", true), commit: { commitId: "commit-patch-1" } }, 201);
	}
	if (path === `/api/projects/${projectId}/history`) return json(route, { entries: committed ? [historyEntry()] : [] });
	return json(route, {});
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
	return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

function project() {
	return { projectId, title: "雾港", rootPath: "C:/fixture-story", kind: "native", status: "ready", wordCount: 14, lastModifiedAt: "2026-08-19T00:00:00.000Z", manifest: null };
}

function workspace() {
	return { manifest: { schemaVersion: 1, workspaceId: "fixture-workspace", rootPath: "C:/fixture", createdAt: "2026-08-19T00:00:00.000Z", updatedAt: "2026-08-19T00:00:00.000Z" }, projects: [project()], summary: { projectCount: 1, nativeProjectCount: 1, legacyProjectCount: 0, wordCount: 14, lastScanAt: "2026-08-19T00:00:00.000Z" }, warnings: [] };
}

function capabilities() {
	return { manuscriptRead: "supported", manuscriptWrite: "supported", chapterWorkflow: "supported", chapterReview: "supported", manuscriptReview: "unsupported", storyGraph: "unsupported", revisionImpact: "supported", narrativePatch: "supported", canon: "unsupported", history: "supported" };
}

function chapter(isCommitted: boolean) {
	const content = isCommitted ? replacementText : chapterText;
	const hash = isCommitted ? "hash-committed" : "hash-draft";
	return { metadata: { chapter: 1, title: "潮汐", wordCount: [...content].length, contentHash: hash, revision: isCommitted ? 2 : 1, finalized: false, updatedAt: "2026-08-19T00:00:00.000Z" }, content, workflow: { projectId, chapter: 1, phase: "draft", draft: { projectId, chapter: 1, draftRevision: isCommitted ? 2 : 1, contentHash: hash, content, updatedAt: "2026-08-19T00:00:00.000Z" }, reconcile: null, settlement: null, canSettle: false, canFinalize: false, settlementStale: isCommitted, nextAction: "请重新检查正文与当前故事状态。", blockingReasons: [{ code: "RECONCILIATION_REQUIRED", message: "请先检查正文与当前故事状态。" }], recommendation: "reconcile", updatedAt: "2026-08-19T00:00:00.000Z" } };
}

function task() {
	return { taskId: "task-patch-1", projectId, forgeSessionId: null, type: "narrative-patch", status: "queued", resultRef: null, errorMessage: null, createdAt: "2026-08-19T00:00:00.000Z", startedAt: null, completedAt: null, updatedAt: "2026-08-19T00:00:00.000Z" };
}

function changeSet(status: "proposed" | "accepted" | "committed", selected = false) {
	return { changeSetId: "cs-patch-1", projectId, title: "第 1 章：加强人物戒备感", status, kind: "MANUSCRIPT_PATCH", source: "agent", intent: "加强人物戒备感", baseRevision: "1", operations: [{ operationId: "patch-1", kind: "replace-text", target: "manuscript/chapter-001.md", baseHash: "hash-draft", startChar: 5, endChar: 14, text: replacementSelection, anchor: { chapterId: "1", baseContentHash: "hash-draft", startOffset: 5, endOffset: 14, selectedTextHash: "selected-hash", prefixContext: "# 潮汐\\n\\n", suffixContext: "\\n" } }], createdAt: "2026-08-19T00:00:00.000Z", updatedAt: "2026-08-19T00:00:00.000Z", ...(status === "committed" ? { committedAt: "2026-08-19T00:00:01.000Z" } : {}), ...(selected ? { selectedCandidateId: "candidate-1" } : {}), patch: { goal: "加强人物戒备感", target: "manuscript/chapter-001.md", constraints: ["不改变确认事实", "不新增人物", "不改变时间线", "保持 POV", "保持人物声音"], operations: [], impact: { severity: "safe-local", causalCoverage: "partial", items: [{ category: "CURRENT_CHAPTER", certainty: "KNOWN", description: "修改目标位于当前章节。", evidence: { sourceType: "chapter", sourceId: "1", chapterId: "1", description: "当前章节正文片段。" } }, { category: "FUTURE_CHAPTER", certainty: "UNKNOWN", description: "Story Graph 尚未建立，无法确认完整的因果传播。" }], affectedChapters: [1], affectedCharacters: [], affectedThreads: [], affectedClues: [], affectedPromises: [], summary: "当前影响分析基于已确认故事状态；完整因果传播将在 Story Graph 建立后增强。", analyzedAt: "2026-08-19T00:00:00.000Z" }, provenance: { agentId: "chapter.reviser", runtimeModelId: "fixture/model", thinkingLevel: "off" }, baseRevision: 1, baseContentHash: "hash-draft", anchor: { chapterId: "1", baseContentHash: "hash-draft", startOffset: 5, endOffset: 14, selectedTextHash: "selected-hash", prefixContext: "# 潮汐\\n\\n", suffixContext: "\\n" }, candidates: [{ candidateId: "candidate-1", original: selectedText, replacement: replacementSelection, explanation: "加强人物戒备感" }] } };
}

function historyEntry() {
	return { commitId: "commit-patch-1", projectId, changeSetId: "cs-patch-1", actor: "user", summary: "第 1 章：加强人物戒备感", affectedFiles: ["manuscript/chapter-001.md"], resolvedIssueCount: 0, createdAt: "2026-08-19T00:00:01.000Z", patch: { chapter: 1, goal: "加强人物戒备感", original: selectedText, replacement: replacementSelection, agentId: "chapter.reviser", runtimeModelId: "fixture/model", impact: changeSet("committed").patch.impact } };
}
