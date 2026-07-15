---
name: continuity-review
description: 对草稿执行语义连续性审查，覆盖人物知识、时间线、位置、道具、规则、动机和伏笔。
---

# Continuity Review

## 何时加载

章节草稿生成后、修改后或定稿前加载。

## 负责什么

区分程序完整性错误和需要模型判断的语义冲突，输出绑定草稿版本的报告。

## 不负责什么

不静默修改正史，不把建议当成事实，不替作者接受冲突解决方案。

## 固定流程

1. 使用 `read_story_context(task="continuity-review", chapter=N, includeCurrentDraft=true)`。
2. 先调用 `check_project_integrity` 检查文件、JSON、编号、摘要和状态。
3. 检查知识边界、位置、时间、情绪原因、动机、道具、世界规则、伏笔和称谓。
4. 每个问题给出证据、影响、修复方案和 `error|warning|suggestion`。
5. 用 `save_continuity_report` 绑定当前 `draftRevision`；存在 error 时不得定稿。

## 完成条件

报告可从项目文件复现，且明确列出所有 error、warning 和待作者决定的建议。
