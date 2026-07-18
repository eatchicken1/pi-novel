---
name: story-review
description: 按编辑层级审查小说，输出有证据、优先级和定向修改任务的结构化报告。
---

# Story Review

## 何时加载

复盘全篇、诊断章节、制定修改任务或确认定稿质量时加载。

## 审查层级

Editorial、Developmental、Scene、Continuity、Line、Copyedit 和 Proofreading 分开执行；先处理结构、因果、人物和节奏，再处理语言表面问题。

## 固定流程

1. 使用 `read_story_context` 选择与审查层级匹配的上下文。
2. 先给出文件位置和正文证据，再给影响、优先级和定向修改任务。
3. 区分事实、推断和建议，不自动把报告写入正史。
4. 使用 `save_continuity_report` 保存连续性结果；追妻文使用 `save_reader_report` 或 `save_review_report`，必须提交结构化 evidence、status 和当前 draftRevision/contentHash。
5. 追妻文优先执行 `check_chase_wife_chapter_pacing`、`check_chase_wife_event_prose`、`save_chase_wife_event_semantic_report` 和 `score_chase_wife_chapter`；全篇分别使用 `scope=working` 和 `scope=finalized`。

## 完成条件

报告能直接指导下一次局部修改；Reader/Review 报告包含问题、证据和结论，只有 `status=ok` 的报告才允许进入定稿门。
