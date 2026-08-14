# Context Selection（任务感知上下文编译）

## 问题

长篇跨章节写作，上下文窗口有限；选错上下文 = 遗忘关键状态或泄漏作者私密意图。

## compileAuthoringContext：按任务编译

- 每个任务声明 MUST / SHOULD / OPTIONAL 上下文键（TASK_MUST / TASK_SHOULD），如 plan_chapter、draft_chapter、diagnose_chapter、revise_chapter、review_manuscript、finalize_chapter、reader-sim 等。
- PreparedContextSection：`{ key, content, sourceRefs, priorityHint, sourceHash, recency, relatedTo? }`。
- 预算裁剪：MUST 永远保留；超出预算时按 priorityHint 从 SHOULD 开始裁剪；每个 section 带 sourceRefs 可解释（为什么这段上下文进来）。
- 陈旧检测：section 的 sourceHash 与当前正史哈希不符 → 标记 staleSources → `CONTEXT_SOURCE_STALE` 提示，提醒先 repair_narrative_memory 再写。

## 读者模拟硬边界

reader-sim 任务只收 project 元数据与 summaries 键（MUST/SHOULD 白名单）；work/authoring、work/scene-designs、work/scene-semantics、story-architecture、chapter-diagnosis、manuscript-diagnosis、manuscript/review.json、underlyingIntent、隐藏暗示、未来计划一律不进。漏一条 = 读者模拟变成作者复盘，整条读者反馈作废。

## 写作规则

- 写前自检：本任务真正需要的最小键集合是什么；能少给就少给。
- 任何 context 输出都要能回答"这段从哪来"（sourceRefs）与"为什么是 MUST/SHOULD"。
