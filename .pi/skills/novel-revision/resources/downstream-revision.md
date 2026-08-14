# Downstream Revision（下游重审）

## 何时需要

knowledgeChanges（knowledge ledger 感知的变更）：某人物在修订后知道/不再知道某事实，下游章节的推理、对话、冲突全部受影响。

## 范围判定

- affectedChapters 来自 knowledge ledger 反查：哪些章节依赖该 factRef；
- 只重审 affectedChapters，不全书重读（save 上下文）；
- 重审重点：该章的信息投放（谁在什么时刻知道）、对话潜台词、决策依据是否仍然成立。

## 输出

- 重审结论写回 `work/revision-impact/<uuid>.json` 对应的下游状态（downstreamReviewRequired 清除）；
- 若重审发现新的知识矛盾 → FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER / CHARACTER_FORGETS_CRITICAL_KNOWLEDGE 类修复。
