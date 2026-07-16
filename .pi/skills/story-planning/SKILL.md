---
name: story-planning
description: 将创意澄清为可执行的 Story Bible、人物、世界规则、总纲、章节大纲和伏笔台账。
---

# Story Planning

## 何时加载

新项目、重建大纲、改变题材承诺、主线或结局时加载。

## 负责什么

把作者输入拆成提案、确认事实和未决问题，建立因果链，并在作者确认后写入正史。

## 不负责什么

不写正式章节，不把 AI 提案自动写入 Story Bible，不替作者决定结局。

## 固定流程

1. 澄清读者体验、主角欲望、阻力、失败代价、视角和完整结局。
2. 使用 `initialize_novel` 或 `read_story_context(task="planning")`。
   如果项目类型是 `chase-wife`，同时加载 `genre-chase-wife`，不得套用其他类型的专属资源。
3. 生成至少两个方向，标注 `source` 和 `status`：`author|ai|reference|inferred`、`proposed|confirmed|rejected|unresolved`。
4. 作者确认后使用 `save_story_document` 保存 Story Bible、人物、世界规则、大纲和伏笔。
   追妻文另用 `save_chase_wife_beat_sheet` 保存第一人称、开篇引言、第一冲突和专属节拍，并调用 `check_chase_wife_arc`。
5. 使用 `get_novel_status` 确认下一步章节和缺失文件。

## 需要加载的 Resource

- `resources/creative-direction.md`
- `resources/causality-check.md`
- `resources/ending-design.md`

## 完成条件

主角选择能导致下一事件；冲突、代价、高潮、结局和题材承诺明确；未确认内容仍留在提案或决策台账。
