---
name: story-review
description: 按编辑层级审查小说，输出结构、场景、连续性、语言和校对问题的优先级清单。
---

# Story Review

## 何时加载

需要复盘全篇、诊断章节、制定修改任务或确认定稿质量时加载。

## 审查层级

1. Editorial：当前最值得修改的少数问题。
2. Developmental：结构、因果、人物弧、节奏和结局。
3. Scene：场景目标、阻力、状态变化和出口。
4. Continuity：事实、知识、时间、地点、道具、规则和伏笔。
5. Line：声音、句式、节奏和意象。
6. Copyedit/Proofreading：语法、标点、称谓和错字。

## 固定流程

1. 使用 `read_story_context` 选择与审查层级匹配的上下文。
2. 先给证据，再给影响、优先级和定向修改任务。
3. 区分事实、推断和建议；不自动把报告写入正史。
4. 使用 `save_continuity_report` 或 `save_story_document` 保存报告，并绑定草稿 revision。
5. 普通类型可使用 `score_chapter`；追妻文必须优先使用 `check_chase_wife_chapter_pacing`、`check_chase_wife_event_semantics` 和 `score_chase_wife_chapter`，语义报告要记录 `roleSatisfied`、`conflictShown`、`agencyActionEvidence` 和状态差证据；草稿期使用 `check_chase_wife_story_pacing(scope=working)`，全篇复盘使用 `scope=finalized`，模型自报分数只能作为补充。
6. 追妻文还要检查女主退出是否不可逆、退出前是否有两次主动权升级、追悔是否有行动证据、现实后果是否兑现，以及结局是否把选择权交还给女主。
7. 追妻文还要检查 POV 模式、第一章冲突位置、事件实际字数、同类伤害连续次数、纯心理段落、回忆占比、退出位置和追妻启动位置。

## Resource

- `resources/editorial-review.md`
- `resources/developmental-edit.md`
- `resources/scene-review.md`
- `resources/line-edit.md`
- `resources/copyedit.md`

## 完成条件

报告能指导下一次局部修改；不使用整章盲目重写替代问题定位。
