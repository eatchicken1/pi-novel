# Long-Form Impact Analysis（修订影响分析）

## 问题

改一章（或改一条事实）会波及下游多少状态，靠人脑估算不可靠：改 T3 真相 → 全书线索重排 → 读者知识链断裂。

## analyze_revision_impact

输入：projectId + changedChapter? / changedEventIds? / knowledgeChanges?（`{characterId, factRef, from, to}`）/ truthChanges?（truth id 列表）。

输出 RevisionImpactReport：
- severity 四档：
  - `safe-local`：仅正文/单章 prose 修订（proseOnly + changedChapter），只影响该章；
  - `downstream-review`：knowledge 变更（人物知道了/不再知道某事实），需重审受影响章节（由 knowledge ledger 反查 affectedChapters）；
  - `structural-revision`：事件增删改，波及线程/伏笔/时间线/谜题；
  - `authority-change`：truth 变更（谜题真相、canon 事实）——权威变更，必须 repair_narrative_memory 全量重建；
- affectedChapters / affectedCharacters / affectedThreads / affectedPromises / affectedClues / affectedRelationshipStates / affectedProfessionalActions / affectedPayoffs / affectedManuscriptReview / affectedSeal；
- 报告写 `work/revision-impact/<uuid>.json` + `continuity/revision-impact-current.json`（带 downstreamReviewRequired），后续 review_manuscript / finalize 会据此提示下游重审。

## 使用规则

- 任何 revise 前先跑 analyze_revision_impact，按 severity 决定重跑范围；
- authority-change 之后：repair_narrative_memory → 重跑 review_manuscript 长篇检查 → 重验 finalize 门禁；
- downstream-review 之后：只重审 affectedChapters 列出的章节，不必全书重读。
