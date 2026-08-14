# Manuscript Finalization（统一封缄，Round 10）

## 目标

finalize_manuscript_unified 把"故事讲完了"变成可验证的：内存一致、线程收束、伏笔兑现、事实无矛盾、封缄可复验。

## 门禁（Gate 1-6）

1. 故事设计 foundation 完整（concept/architecture/ending contract 等）；
2. 全部章节 finalize 且 realization 完整；
3. review_manuscript 通过（verdict ready-for-final-revision 或结构修订已闭环）；
4. 长文连续性审计：checkLongFormContinuity 的 error 全部为 blocker；
5. 悬空审计：
   - MANUSCRIPT_DANGLING_MAJOR_THREAD：major 线程未结算也未标记 abandoned-intentionally，且不在 ending settlement 的 unresolvedResidue / ending contract open modes / thread.sourceRefs 白名单；
   - MANUSCRIPT_DANGLING_SETUP：major setup 超过 12 章未 payoff；
6. 派生状态新鲜：memory 非 current → FINALIZATION_DERIVED_STATE_STALE（先 repair_narrative_memory）。

## Seal V2

封缄绑定章节层与内存层哈希：chapterHashes / summaryHashes / memorySnapshotHash / criticalFactsHash / timelineHash / threadLedgerHash / setupPayoffHash / knowledgeLedgerHash / relationshipStateHash。任何一层变化 → 封缄失效 → 需要重新 finalize 或走修订流程。

## exportManuscript 统一验证

导出前对任意项目（不限 chase-wife）先做统一封缄验证：章节哈希 + summary 哈希 + Seal V2 内存哈希不匹配 → 拒绝导出（"stale"）。防止"封缄通过但导出的是旧物"。

## 失败语义

- 门禁失败 → blockers + 建议动作（repair_narrative_memory / 结构修订 / 补 payoff），不产出封缄；
- 内存提交失败只标记 memoryOutOfDate，章节定稿不回滚；
- 全部通过 → Seal V2 落盘，之后正文/事件/truth 任何变更都会使封缄 stale，进入修订影响分析流程。
