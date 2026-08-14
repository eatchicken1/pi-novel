# Revision Impact Analysis（Round 10）

## 问题

修订的影响面是发散的：改一章正文可能只影响该章，改一条 truth 会波及全书线索、知识链、线程与伏笔。人脑估算不可靠，必须确定性判定。

## analyze_revision_impact

输入：projectId + changedChapter? / changedEventIds? / knowledgeChanges?（`{characterId, factRef, from, to}`）/ truthChanges?（truth id 列表）。

输出 RevisionImpactReport：

| severity | 触发 | 处理 |
| --- | --- | --- |
| safe-local | proseOnly + changedChapter | 只重跑该章门禁 |
| downstream-review | knowledgeChanges | 修订 + 重审 affectedChapters（由 knowledge ledger 反查） |
| structural-revision | 事件增删改 | 结构手术 + 重跑线程/伏笔/时间线/谜题检查 |
| authority-change | truthChanges（真相、canon 事实） | 修订后 repair_narrative_memory 全量重建 |

报告含 affectedChapters / affectedCharacters / affectedThreads / affectedPromises / affectedClues / affectedRelationshipStates / affectedProfessionalActions / affectedPayoffs / affectedManuscriptReview / affectedSeal + dependencies + summary。

## 落盘

- `work/revision-impact/<uuid>.json`：完整报告（作者私有分析）；
- `continuity/revision-impact-current.json`：当前待处理影响（含 downstreamReviewRequired），review_manuscript / finalize 会读取并提示下游重审。

## 使用规则

- 任何 revise 前先跑 analyze_revision_impact；
- authority-change 之后：repair_narrative_memory → 重跑 review_manuscript 长篇检查 → 重验 finalize 门禁；
- downstream-review 只重审 affectedChapters，不全书重读。
