# Chapter Workflow（plan_chapter / draft_chapter）

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
