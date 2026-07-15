---
name: story-memory
description: 按任务选择小说上下文，维护正史、提案、否决方案、人物状态、术语和问题台账。
---

# Story Memory

## 何时加载

所有跨章节规划、写作、审查、修改和恢复任务都加载。

## 负责什么

选择最小充分上下文，说明纳入和排除原因；把候选事实、作者确认和已否决方案分开。

## 不负责什么

不替作者确认事实，不用全文替代结构化记忆，不把模型推断写入 canon。

## 固定流程

1. 按任务调用 `read_story_context`，优先传 `task`、`chapter` 和相关对象筛选项。
2. 写作读取大纲、场景合同、人物状态、世界规则、前章结尾和少量摘要。
3. 审查读取草稿、正史、时间线、伏笔和术语；reader sim 不读取作者保密信息。
4. 将新事实先记录为候选，作者确认后再更新 `canon/`、人物、时间线或伏笔台账。
5. 中断时保存恢复点；恢复时以项目文件和清单为准，不依赖聊天记录。

## Resource

- `resources/context-selection.md`
- `resources/fact-extraction.md`
- `resources/canon-management.md`
- `resources/decision-ledger.md`

## 完成条件

每次读取都有 included/excluded manifest；正史、工作稿、建议和否决方案可区分并可恢复。
