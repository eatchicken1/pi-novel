# Realization（planned ≠ realized）与 Finalization 门禁

## 问题

引擎 artifact 里写着“计划第 N 章出现线索 C1 / 揭示 T1 / 观察 OBS-1 / 婚姻项 E1 变化”，但正文可能根本没写。计划的公平性（planned fairness）不等于兑现的公平性（realized fairness）。

## 方案：Narrative Realization 记录

每个计划项在本章最终正文中必须有散文锚点证据：

```jsonc
// continuity/realizations/chapter-001.json
{
  "version": 1, "projectId": "...", "chapter": 1,
  "draftRevision": 1,          // 绑定草稿修订
  "contentHash": "sha256...", // 绑定最终正文哈希
  "records": [{
    "recordId": "clue-c1",
    "contentType": "mystery-clue",   // unified-event | mystery-clue | mystery-reveal | marriage-transition | professional-observation
    "engineRef": "C1",
    "anchor": { "startChar": 0, "endChar": 8, "excerpt": "我翻开理赔档案" }  // 归一化文本定位，逐字符校验
  }]
}
```

## 计划集（什么需要兑现）

- `unified-event:<eventId>`：本章每个统一事件；
- `marriage-transition:<ref>`：本章事件的 marriageDelta 引用的每个婚姻项；
- `mystery-clue:<clueId>`：`plannedRealizationChapter === 本章` 的线索；
- `mystery-reveal:<claimId>`：`plannedRevealChapter === 本章` 的真相声明；
- `professional-observation:<obsId>`：`intendedChapter === 本章` 的职业观察。

## 确定性检查（check_narrative_realization）

| 码 | 含义 |
| --- | --- |
| REALIZATION_MISSING | 有计划项但无兑现记录文件 |
| REALIZATION_CONTENT_HASH_STALE | 记录绑定正文与最新草稿哈希不一致（草稿已改） |
| REALIZATION_DRAFT_STALE | 修订不匹配 |
| REALIZATION_ANCHOR_INVALID | 锚点越界或摘录与正文不符（防编造证据） |
| REALIZATION_DUPLICATE | 同一 contentType+engineRef 重复记录 |
| REALIZATION_PLANNED_BUT_MISSING | 计划项未兑现 |
| REALIZATION_UNPLANNED | 兑现了未计划项（疑似事后贴标签） |

保存时只校验锚点与重复；计划完整性由 check/finalize 门决定。

## finalize_chapter 集成（capability-aware）

finalize 在既有基础门禁（plan/contracts/draft/integrity/semantic）与 chase-wife 门禁之后追加 realization 门：

- 仅当本章存在计划项时强制（无计划项自动通过，旧项目不破）；
- 门内以 finalize 传入的最终正文重新计算 contentHash 与 latestDraftRevision，任何 stale/缺失/越界/未计划都会拒绝提交；
- 因此“计划在第 1 章出现的线索”只有真的写进第 1 章正文并锚定后，第 1 章才能 finalize。

## 示例流水线（测试固化）

```
unified map(6 events) → drafts → semantic reports → assemble(r1) → realization records(r1, contentHash) → check ok → finalize ok
                                        └─ 改草稿 r2 → check: REALIZATION_CONTENT_HASH_STALE → 重新保存记录(r2) → finalize ok
```
