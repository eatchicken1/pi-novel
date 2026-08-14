# Knowledge Tracking（Round 10）

## 问题

女性社会派悬疑 × 熟龄婚姻的根基是信息差：读者知道但女主不知道、女主以为他知道其实不知道、配偶隐瞒什么。信息差一乱，推理链就断，人物动机就假。

## KnowledgeLedger：三个隔离区

```
{ factRef, knower: reader|heroine|spouse, status: knows|believes|unknown,
  sinceChapter, sourceEventId?, confidence?, supersededBy? }
```

- 驱动：ChapterSummary V2 的 whatReaderLearned / whatHeroineLearned / whatSpouseLearned、claimKnowledgeChanges、mystery clue 的 discoveredClueIds / readerRevealedClueIds / revealClaimIds。
- 状态翻转留痕：`believes@N` = 第 N 章仍持误信；`knows@N` = 第 N 章起确知。查询"某人当前信什么"必须取最新条目。
- "没学"也是信息：隔离区之间保持信息差是作者资产，台账如实记录即可。

## 检查码

- `CHARACTER_FORGETS_CRITICAL_KNOWLEDGE`：关键知识丢失后无新线索又"重新学到"（re-learn）。修法：删除重复学习，或补一次新的触发。
- `FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER`：误信条目（supersededBy = `believes@N`）在第 N 章无暴露触发就变 knows。触发 = 该章存在 discoveredClueIds / readerRevealedClueIds / revealClaimIds；claimKnowledgeChanges 不算触发。修法：给误信崩塌补证据暴露事件。

## 写作规则

- 每章 summary 如实声明三个隔离区的学习；写"谁不知道"和写"谁知道"同等重要；
- 误信崩塌必须由证据/场景触发，不能由作者意志直接改状态；
- 修订涉及知识变更（knowledgeChanges）时，severity 至少是 downstream-review（见 revision-impact.md）。
