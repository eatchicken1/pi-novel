# 熟龄婚姻的叙事模式（MarriageInteractionPattern）

## 问题

婚姻结构（经济/责任/决策/社会关系/退出约束）已经建模，但「长期婚姻的心理与行为惯性」还没有进入剧情。

## 方案：长期互动模式

每个模式描述一个反复发生的闭环：

```jsonc
{
  "id": "p1",
  "trigger": "遇到危机",
  "protagonistDefaultResponse": "为避免争吵而事后补救",
  "spouseDefaultResponse": "替她做决定",
  "shortTermBenefit": "家庭高效率",
  "longTermCost": "她的边界不断消失",
  "hiddenAssumption": "她的职业安排属于家庭资源",
  "structuralRefs": ["E1"],
  "relationshipRefs": ["R1"],
  "breakingEventIds": [4, 16]
}
```

## 检查（check_social_suspense_design 内）

- MARRIAGE_CRISIS_WITHOUT_HISTORY：有婚姻变化事件但没有任何长期模式；
- MARRIAGE_CONFLICT_TOO_EVENT_SPECIFIC：所有模式都脱离结构/关系引用，矛盾只存在于当前案件；
- MARRIAGE_PATTERN_WITHOUT_PAYOFF：模式声明了但没有任何事件兑现；
- MARRIAGE_EXIT_WITHOUT_ACCUMULATION：不可逆退出前没有足够的模式累积。

不是规定「必须受苦多少次」——只做设计一致性检查：破裂要有历史，模式要兑现，退出要有累积。
