# Revision Workflow（Round 9）（diagnose_chapter / revise_chapter）

## diagnose_chapter

编辑式诊断，不是 checker dump：统一事件图（本章）、事件草稿、语义报告存在性、连续性、AI 痕迹、realization 门、chase-wife 收敛门、vertical/character/fairness 全局检查全部聚合为 P0-P4 finding；同优先级同事件的多来源问题合并（保留 sourceIssues）；P0 → verdict blocked。

## revise_chapter

- 先写 RevisionPlan（goals 引用诊断 id + affectedEventIds）；
- 只改受影响事件（scoped revision），禁止发现问题就整章重写；
- 重跑受影响门禁（机械检查 + 语义报告 + 装配 + 章节检查 + AI 痕迹）；
- 不伪造 realization：草稿一变，旧记录按 hash 自然 stale，需在正文确认后重新保存；
- 每次调用是有界尝试，不做无界循环。

## Round 9：Scoped Prose Revision

默认 Beat → Scene → Event → Chapter；proseGoal 驱动（tighten-scene / increase-subtext / reduce-exposition / strengthen-opposition / restore-voice / dramatize-professional-detail / strengthen-emotional-action / fix-dialogue-specificity / improve-scene-turn）。修订稿删除关键引用 → PROSE_REVISION_CHANGED_FACT（block）。详见 prose-revision.md。
