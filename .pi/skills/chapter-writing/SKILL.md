---
name: chapter-writing
description: 按章节计划、场景合同和版本化草稿完成可审查的章节写作。
---

# Chapter Writing

## 何时加载

Story Bible、当前章节方向和必要上下文已经确认，准备规划、写作或修改章节时加载。

## 固定流程

1. 使用 `read_story_context(task="chapter-writing", chapter=N, includePreviousChapterEnding=true)`。
2. 保存 `save_chapter_plan` 和 `save_scene_contract`；每个场景必须改变目标、关系、知识、风险、方向或伏笔状态之一。
3. 普通题材按计划保存章节草稿；追妻文必须先保存并检查事件地图，再逐事件调用 `save_chase_wife_event_draft`、`check_chase_wife_event_draft`、`check_chase_wife_event_prose` 和 `save_chase_wife_event_semantic_report`。
4. 只有所有事件语义报告为当前版本且 `status=ok`，才能 `assemble_chase_wife_chapter`；组装后执行章节节奏、评分、AI 痕迹和结构化 Reader/Review 检查。
5. 连续性报告必须绑定当前 draft revision/contentHash；用户确认后才调用 `finalize_chapter`。

## 写作原则

先解决因果、人物动机、场景功能和信息释放，再润色句子。不要一次性自由扩写整章，不把工作稿或 AI 建议写成正史，不自行决定关键文件名。

## 完成条件

计划、场景合同、草稿、检查报告和修改依据都能从文件恢复；每一场有状态变化；定稿门拥有当前版本的全部证据。
