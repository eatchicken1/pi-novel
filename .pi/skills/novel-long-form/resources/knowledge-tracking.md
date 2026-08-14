# Knowledge Tracking（知识台账）

## 问题

悬疑与婚姻题材的根基是信息差："读者知道但女主不知道"、"女主以为他知道其实不知道"。信息差一乱，推理链就断。

## KnowledgeLedger：三个隔离区

- key：factRef（声明/线索 id 或 summary 声明）；value：`{ knower: reader|heroine|spouse, status: knows|believes|unknown, sinceChapter, sourceEventId?, confidence?, supersededBy? }`。
- 驱动：whatReaderLearned / whatHeroineLearned / whatSpouseLearned（ChapterSummary V2）、claimKnowledgeChanges、mystery clue 的 discoveredClueIds / readerRevealedClueIds / revealClaimIds。
- 状态翻转用 supersededBy 留痕：`believes@N` 表示第 N 章还是错误认知；`knows@N` 表示第 N 章起确知。查询"某人当前信什么"必须读最新条目。

## 检查码

- `CHARACTER_FORGETS_CRITICAL_KNOWLEDGE`：关键知识丢失后无新线索又"重新学到"（re-learn）。修法：删除重复学习，或写一次新的触发（新证据）。
- `FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER`：`believes@N` 的误信在第 N 章没有暴露触发（无 discoveredClueIds/readerRevealedClueIds/revealClaimIds）就变 knows。修法：给误信崩塌补一个证据暴露事件；claimKnowledgeChanges 不算触发。

## 写作规则

- 每章 summary 必须如实声明各隔离区学到了什么；"没学"也是信息（留作信息差）。
- 人物误信是资产，不是 bug：只在有触发时崩塌。
