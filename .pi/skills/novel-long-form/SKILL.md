---
name: novel-long-form
description: 长篇连载的记忆与延续性方法论：Narrative Memory 派生视图、知识/关系/物件/线程/伏笔台账、长文连续性检查、任务感知上下文编译、修订影响分析、统一封缄定稿门禁。与 story-memory / novel-revision 分工：本 skill 负责跨章节状态如何派生、校验、失效、重建与审计。
---

# Novel Long-Form

## 加载条件

finalize_chapter（内存提交）/ repair_narrative_memory / analyze_revision_impact / continue_novel / get_novel_status（健康摘要）/ review_manuscript（长篇检查）/ finalize_manuscript_unified（定稿门禁）之前加载；跨章节写作、修订与恢复任务同时加载。

## 核心原则

1. 内存永远是派生视图，不是第二权威：全部台账由正史（unified events + 定稿正文 + ChapterSummary V2 + harm/repair/专业/谜题等台账）推导，带 schemaVersion / derivationVersion / sourceHashes / throughChapter / generatedAt；源变化 → 台账自动 stale，只能重建，禁止手改；
2. 一章一提交：finalize_chapter 把章节 delta 写入 `continuity/memory/chapter-NNN-delta.json` 并聚合当前快照、重派生台账；任一步失败只标记 memoryOutOfDate，绝不回滚章节定稿；
3. 知识分读者/女主/配偶三个隔离区："谁在什么时候知道什么"分开记录，"谁还不知道"与"谁知道"同样重要；
4. 上下文按任务编译，MUST/SHOULD/OPTIONAL + 预算；读者模拟有硬边界：作者私密工件（work/authoring、work/scene-designs、work/scene-semantics、story-architecture、chapter-diagnosis、manuscript-diagnosis、manuscript/review.json）一律不进；
5. 修订先做影响分析：analyze_revision_impact 判定 severity（safe-local / downstream-review / structural-revision / authority-change），再决定重跑范围；权威（truth、canon fact）变更必须全量 repair；
6. 定稿是全书一致性审计：Seal V2 绑定章节哈希与内存哈希；悬空线程、未兑现伏笔、事实矛盾、内存过期都是阻断项。

## 固定流程

1. **finalize_chapter**：正文+summary 定稿 → 章节机械检查 → 派生 chapter delta（summary 驱动 knowledge/threads/setups/criticalFacts 变更）→ 写 delta → 聚合 snapshot → 重派生 ledger → 清除 memoryOutOfDate。失败只置 `memoryOutOfDate: true`。
2. **跨章节写作**：compileAuthoringContext（任务感知选上下文）→ 写作 → 下一章 finalize；`continue_novel` 一步一停，遇 finalize/export 而内存不 current 时先 repair，遇确认点/P0/重大设计决策/权威变更也停下。
3. **修订**：analyze_revision_impact（changedChapter / changedEventIds / knowledgeChanges / truthChanges）→ 按 severity 决定局部重跑或 `repair_narrative_memory` 全量重建。
4. **定稿**：finalize_manuscript_unified 先验内存 current（FINALIZATION_DERIVED_STATE_STALE），再跑长文连续性审计（线程/伏笔/事实/知识/时间线），通过后写 Seal V2（含 memorySnapshotHash 等六个内存哈希）；exportManuscript 导出前统一验证封缄。

## 资源导航

- narrative-memory.md：派生架构、delta/snapshot、失效与 repair
- character-state.md：CharacterStateLedger / CharacterArcTrajectory
- knowledge-tracking.md：KnowledgeLedger 三隔离区
- thread-management.md：NarrativeThreadLedger 线程生命周期
- setup-payoff.md：SetupPayoffLedger 伏笔-兑现
- long-form-continuity.md：长文连续性检查码全表
- context-selection.md：任务感知上下文编译与隐私边界
- long-form-pacing.md：长篇节奏与线程节拍
