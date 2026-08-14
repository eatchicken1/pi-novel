# Long-Form Context（任务感知上下文编译，Round 10）

## 问题

长篇跨章节写作的上下文选择有两个失败模式：选少了遗忘关键状态（知识/关系/物件/线程），选多了泄漏作者私密意图（尤其 reader-sim）。

## compileAuthoringContext

- 每个任务声明 MUST / SHOULD / OPTIONAL 键集合（plan_chapter、draft_chapter、diagnose_chapter、revise_chapter、review_manuscript、finalize_chapter、reader-sim 等各有 TASK_MUST / TASK_SHOULD）。
- PreparedContextSection：`{ key, content, sourceRefs, priorityHint, sourceHash, recency, relatedTo? }`——每段可解释来源与优先级。
- 预算裁剪：MUST 永远保留；超出预算按 priorityHint 从 SHOULD 开始裁剪；结果含 included/excluded manifest。
- 陈旧检测：section 的 sourceHash 与当前正史哈希不符 → staleSources → `CONTEXT_SOURCE_STALE`，提示先 repair_narrative_memory 再写。

## 读者模拟硬边界

reader-sim 只收 project 元数据与 summaries 键（MUST/SHOULD 白名单内）；以下一律不进：

```
work/authoring/（directions/promises/links/ending/decisions/candidates/reviews/analysis）
work/scene-designs/   work/scene-semantics/
story-architecture-*   chapter-diagnosis/   manuscript-diagnosis/   manuscript/review.json
underlyingIntent / 隐藏暗示 / 未来计划
```

漏一条 = 读者模拟变成作者复盘，整条读者反馈作废。

## 写作规则

- 写前自检"本任务真正需要的最小键集合"；
- 任何 context 输出都能回答"这段从哪来"（sourceRefs）与"为什么进"（priorityHint）；
- 看到 CONTEXT_SOURCE_STALE 先修复再写，不要带着陈旧状态开工。
