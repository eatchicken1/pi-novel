# Scene-Level Guidance（Round 9）

## Wrong Pursuit 场景
不是模型标签。正文应看到：男方具体做了什么、为什么错、女主如何回应、造成什么新后果。
- 只有道歉/承诺 → PURSUIT_WITHOUT_SPECIFIC_ACTION；
- 没有女主回应 → PURSUIT_WITHOUT_HEROINE_RESPONSE；
- 没有新后果 → PURSUIT_WITHOUT_NEW_CONSEQUENCE。
- “他追了她很久”禁止。

## Repair 场景
真实行动 + 成本 + 尊重边界。长篇道歉 → REPAIR_ONLY_VERBAL；象征性代价 → REPAIR_COST_ONLY_SYMBOLIC。
好的 repair：改账户、办过户、按月转抚养费、只在固定时间联系孩子。

## Recognition 场景
“直到这一刻，他终于明白……”禁止。belief changed 必须通过行为变化证明（RECOGNITION_ONLY_INTERIOR）：
选择、放弃、交还、签字、公开、离开。

## 边界对峙
不把道歉独白、强吻、堵门、醉酒、霸总命令写成默认选项。
