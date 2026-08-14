# Chapter Workflow（Round 9）（plan_chapter / draft_chapter）

## plan_chapter

- 校验 plan.eventIds 在本章 unified 事件图中；
- 确定当前 Story Movement；
- 构建 Chapter Context Package（事件、movement、上一章结尾、relevant refs 反向选择：clueIds/claimIds/marriageRefs/patternIds/professionalActionIds/observationIds/harmIds/repairIds/mechanismIds/dilemmaIds、未决连续性、风格约束、目标长度）；
- 一次调用保存 chapter plan + scene contracts；
- 幂等：相同 plan 重复调用不产生重复 artifact（force 才重写）。

## draft_chapter

- verify plan → 逐事件：save_unified_event_draft → check_unified_event_draft → save_unified_event_semantic_report（chaseWifeDelta 事件要求 chaseEvidence：role/conflict/relationship delta 出现/agency action/injury mechanism/wrong pursuit/repair action）→ assemble_unified_chapter → 章节完整性检查；
- 机械检查或语义报告失败即 blocker，不装配、不假装完成；
- 绝不自动 finalize；recommendedNextAction = diagnose_chapter。

## 上下文

chapter-planning / chapter-drafting / chapter-diagnosis / chapter-revision 任务优先当前章事件与上一章结尾（Local > Global），并在预算内保留 CURRENT-EVENT 内容。

## Round 9：Scene Design 展开层

plan_chapter 内部：Chapter Plan → Scene Designs（`work/scene-designs/chapter-NNN.json`）→ Scene Contracts。场景有 mode（full/compressed/summary）、beat plan、turn/state change/exit pressure；draft_chapter 接受 scene semantic reports（`work/scene-semantics/`），diagnose_chapter 聚合 scene+prose 检查。详见 scene-intelligence.md / dialogue-and-subtext.md / emotional-rendering.md / information-delivery.md / prose-intelligence.md / prose-revision.md。

## Round 10：Memory Commit 与上下文编译

- finalize_chapter 尾段：定稿 → 章节机械检查 → commitChapterMemory（派生 chapter delta → 写 continuity/memory/chapter-NNN-delta.json → 聚合 current-snapshot → 重派生 continuity/ledgers/* → 清除 memoryOutOfDate）→ 返回 memoryCommitted。任一内存步骤失败只置 memoryOutOfDate:true，定稿不回滚；后续 repair_narrative_memory 全量重建。
- ChapterSummary V2 是台账派生的声明源：heroineLearned/readerLearned/spouseLearned → 知识三隔离区；threadsOpened/Advanced/Closed → 线程；setups/payoffs → 伏笔；criticalFacts（label/value/unit）→ 事实索引；professionalChange/mysteryProgress/nextPressure → 专业/谜题/出口。
- 写作上下文改由 compileAuthoringContext 编译（任务感知 MUST/SHOULD/OPTIONAL + 预算裁剪 + sourceRefs）；CONTEXT_SOURCE_STALE 出现时先 repair 再写。见 long-form-context.md。
