---
name: novel-revision
description: 诊断与修订方法论：diagnose_chapter / revise_chapter / review_manuscript 共用。P0-P4 优先级、局部修订原则、门禁重跑与 stale 语义。
---

# Novel Revision

## 加载条件

diagnose_chapter / revise_chapter / review_manuscript 之前加载。

## Diagnosis Priority（P0-P4）

- P0 Blocking Logic：mystery reveal 无兑现证明、职业动作非法、realization 缺失、连续性矛盾——必须先修；
- P1 Structural：collision 浅、章节无状态变化、关系与案件脱节；
- P2 Character：女主无代价 / 配角工具化；
- P3 Pacing / Commercial：出口压力弱、中点停滞；
- P4 Prose：AI 节奏、重复句式、模板表达。

## 局部修订原则

- 一个问题 → 只改 affected event / scene，禁止整章重写；
- 只有章节架构本身坏掉才整章重写；
- 修改前先形成 RevisionPlan（goals 引用诊断 id 与 affectedEventIds）；
- 修订后重跑受影响门禁（事件机械检查 + 语义报告 + 装配 + 章节检查）；
- 不得伪造 realization：草稿一变，旧 semantic/realization/reader/review 按 hash 自然 stale，需在正文确认后重新保存；
- 每次 revise 是一次有界尝试，不做无界循环；超过限度返回 needs-review。

## Manuscript-level Revision

review_manuscript 针对全书结构（movements / second act / professional 连续性 / climax / ending），输出 story revision plan（如移动 false model 崩塌、合并章节、加因果碰撞），不做自动整本重写。

## 资源导航

- diagnosis-priority.md：P0-P4 优先级
- structural-revision.md：结构修订
- chapter-revision.md：章节修订
- prose-revision.md：正文修订
- scene-revision.md：场景修订（Round 9：Beat → Scene → Event → Chapter 范围）
- dialogue-revision.md：对话修订（Round 9）
- exposition-revision.md：信息投放修订（Round 9）
- voice-revision.md：声音修订（Round 9）
