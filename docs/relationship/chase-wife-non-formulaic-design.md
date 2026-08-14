# Chase Wife 去模板化（Non-Formulaic Design）

## 已有防线

无成本追妻、无后果修复、边界侵犯、要求奖励、结局自动复合——这些 gate 保持不变。

## Round 6 新防线

### Wrong Pursuit 必须源于核心缺陷

送花/求原谅/喝酒/发疯/堵门不是 wrong pursuit；wrong pursuit 是「他认为问题是误会，于是不停解释，而真正的问题是边界」。

- WRONG_PURSUIT_NOT_ROOTED_IN_FLAW：early pursuit 与男方的核心错误认知无关（warning）。

### Repair 必须反转伤害机制

真正 repair 不是成本越大越好，而是针对原伤害机制：把女主职业原则当婚姻资源 → 公开承认她的独立职业判断、放弃对她职业选择的干预、承担家族施压的代价、尊重她不复合。

- REPAIR_DOES_NOT_ADDRESS_HARM_MECHANISM（warning）。

### Regret ≠ Growth

痛苦、失眠、崩溃、嫉妒不等于成长。成长要体现 old belief → contradiction → recognition → behavioral change。

- REGRET_WITHOUT_BELIEF_CHANGE（warning）。

## 实现方式

这三条是模型评审（chaseArcReview 字段），checker 在 chase 事件存在时强制要求评审并转成 warning；harm/repair ledger 的机制绑定由既有 gate 持续校验。
