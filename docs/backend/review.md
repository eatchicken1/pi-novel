# Review

## 定位

Review 页面不重跑所有 checker；ReviewIssue 是持久化 projection，
来源是已生成的报告（diagnose_chapter / review_story_design / review_manuscript / continuity / fairness / professional）。

## ReviewIssue

{ id, projectId, sourceCode, severity(error|warning|info), priority(P0-P4), scope(scene|chapter|future-chapter|movement|story-design|manuscript), repairScope(prose|scene-plan|chapter-plan|event-graph|architecture|foundation|manuscript), blockingForCurrentAction, chapter?, scene?, landingChapter?, message, evidence?, status(open|acknowledged|resolved|dismissed), firstSeenAt, lastSeenAt }

## severity ≠ blocking

issueSeverity 与 blockingForCurrentAction 分离：
future-chapter 的 P0（例如第 5 章的 realized-fairness 错误）不阻塞当前 Chapter 1。
landingChapter 给出修复落点章。

## 生命周期

- refresh(projectId)：重读 engine 报告 → upsert（dedup by source identity：code+scope+chapter+landingChapter；相同 issue 只更新 lastSeen，不创建 50 张卡片）
- 本次投影中消失的来源 → 自动 resolved（不允许用户假装 resolved）
- 用户只能 acknowledge / dismiss
- resolved 只能由重新投影自动更新

## 与 Commit 联动

commit 完成后重新投影 → 被修复的 issue 从 open → resolved；
CommitRecord.resolvedIssueCount 记录本次 commit 解决的 issue 数（History 页展示）。
