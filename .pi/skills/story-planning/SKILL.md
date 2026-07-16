---
name: story-planning
description: 将创意整理为可执行的 Story Bible、人物、世界规则、总纲、章节大纲和伏笔台账。
---

# Story Planning

## 何时加载

新项目、重建大纲、改变题材承诺、主线或结局时加载。

## 负责什么

澄清读者体验、主角欲望、阻力、失败代价、因果链和完整结局；区分作者事实、AI提案、参考信息和未决方案。

## 不负责什么

不直接写正式章节，不把 AI 提案自动写入正史，不替作者决定结局。

## 固定流程

1. 使用 `initialize_novel` 或 `read_story_context(task="planning")`。
2. 生成至少两个方向，记录 `source` 与 `status`：`author|ai|reference|inferred`、`proposed|confirmed|rejected|unresolved`。
3. 作者确认后，使用 `save_canon_document` 写入 Story Bible、风格指南、世界观和大纲；提案只能使用 `status=proposed`。
4. 追妻文必须同时加载 `genre-chase-wife`，使用 `save_chase_wife_beat_sheet` 和 `check_chase_wife_arc`，不得套用其他题材资源。
5. 使用 `get_novel_status` 确认下一章和缺失文件。

## 完成条件

主角选择能导致下一事件；冲突、代价、高潮、结局和题材承诺明确；未确认内容仍停留在提案或决策台账。
