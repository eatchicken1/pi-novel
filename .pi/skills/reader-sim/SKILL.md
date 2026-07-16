---
name: reader-sim
description: 用明确读者画像模拟阅读投入、走神、预测、困惑、可信度和阅读承诺兑现情况。
---

# Reader Simulation

## 何时加载

章节或短篇已有可读草稿，需要验证阅读体验和题材承诺时加载。

## 规则

只读取正文、必要前文和读者画像，不读取 `author-only` 信息，不替作者做最终文学判断。

## 固定流程

1. 使用 `read_story_context(task="reader-sim", chapter=N)`，确认上下文没有泄露作者保密信息。
2. 按阅读顺序记录投入点、走神点、预测点、困惑点、失去兴趣的位置、人物可信度破裂和最强时刻。
3. 检查问题是否回答过早或拖得过久，结局是否兑现读者承诺。
4. 使用 `save_reader_report` 提交结构化 `engagementDrops`、`predictions`、`confusionPoints`、`credibilityBreaks`、`strongestMoments` 和 `status`；每条意见包含位置、正文证据和问题。
5. 使用 `compare_draft_versions` 验证修改是否只解决目标问题，不自动修改正史。

## 完成条件

报告是阅读轨迹而非泛泛文学评论，能转换为局部修改任务；只有证据充分且 `status=ok` 才能作为定稿门的 Reader 报告。
