---
name: chapter-writing
description: 按章节计划、场景合同、版本化草稿、完整性检查和用户确认完成章节写作。
---

# Chapter Writing

## 何时加载

Story Bible 和当前章节方向已确认，准备规划或写作时加载。

## 负责什么

把章节目标拆成有状态变化的场景，再生成可审查的草稿。

## 不负责什么

不跳过检查直接定稿，不用正文临时发明正史，不自行决定关键文件名。

## 固定流程

1. 使用 `read_story_context(task="chapter-writing", chapter=N, includePreviousChapterEnding=true)`。
2. 形成章节计划，调用 `save_chapter_plan`。
3. 追妻文先调用 `save_chase_wife_event_map` 和 `check_chase_wife_event_map`；每个事件单独调用 `save_chase_wife_event_draft`、`check_chase_wife_event_draft`、`check_chase_wife_event_semantics`，通过后调用 `assemble_chase_wife_chapter`，禁止一次性自由扩写整章。
4. 为每个事件和场景填写目标、阻力、风险、知识变化、情绪转折、铺垫、回收和出口钩子，调用 `save_scene_contract`。
5. 组装稿调用 `check_chase_wife_chapter_pacing`、`score_chase_wife_chapter` 和 `check_project_integrity`，再调用 `save_continuity_report` 保存语义审查结果；全篇结束后调用 `check_chase_wife_story_pacing`。
6. 用户确认后以匹配的 `draftRevision` 和 `confirmation="USER_CONFIRMED"` 调用 `finalize_chapter`。
7. 定稿后调用 `extract_chapter_facts`，候选事实经作者确认后再调用人物、伏笔和时间线更新工具。

## Resource

- `resources/scene-contract.md`
- `resources/information-release.md`
- `resources/rhythm-and-pacing.md`
- `resources/chapter-ending.md`

## 完成条件

计划、场景合同、草稿和两类报告均持久化；每个场景至少改变目标、关系、知识、风险、方向或伏笔状态中的一项。
