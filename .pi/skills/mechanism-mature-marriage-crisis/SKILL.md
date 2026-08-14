---
name: mechanism-mature-marriage-crisis
description: Mature Marriage Crisis 关系机制：长期婚姻的结构性纠缠（经济单元、照护责任、决策权、社会纠缠、婚姻惯性、退出约束）与关系破裂后的责任/资源重新分配。可与 female-social-suspense、chase-wife 等组合。
---

# Mature Marriage Crisis（Structural Relationship Mechanism）

## 加载条件

当项目具有 mature-marriage-crisis relationship mechanism 时加载（legacy 无；必须显式声明于 storyProfile.relationshipMechanisms）。可用性由统一 capability 判断（hasMatureMarriageCapability）。

## 核心公式

```text
Marriage = Relationship + Economic Unit + Care Unit + Family Unit + Decision System + Social Unit
```

Mature Marriage 不是年龄标签，不是 genre，也不是 Chase Wife 的别名：它描述长期婚姻为什么具有结构性纠缠，以及破裂后这些结构如何被重新分配。

## 负责与不负责

负责：structural entanglement（经济/照护/决策/社会/惯性/退出约束）、restructuring plan（资源/责任/决策权/社会关系再分配、约束响应）。

不负责：pursuit/remorse/repair/结局资格（Chase Wife mechanism）；mystery truth/clue/suspect（female-social-suspense 主题材）；职业写实与法律判断（Professional Domain，Phase 4）；章节组装与事件流水线（Phase 5）；不提供法律建议。

## 结构 ≠ 伤害

Marriage Structure 只记录谁做什么、为什么必须做、谁依赖这项劳动、如果停止会发生什么。以下都不是机械结论：单收入家庭、婆媳同住、丈夫管理投资账户、女主承担照护、共同经营公司。

- care work / economic dependence / shared housing 不自动等于 Chase Wife harm；
- 只有 Chase Wife Harm Ledger 能表达 care-labor-exploitation 等关系伤害，且需要正文与关系语义进一步证明；
- Marriage Engine 不自动创建 harm、不自动判 abusive、不自动判 relationship-breaking；
- 结构现实性检查与道德判断分离，语义判断留给后续 model review。

## 固定流程

1. `read_story_context(task="planning")`；先建 Marriage Structure（`save_mature_marriage_structure`，proposed → 作者确认后 confirmed 进 canon/marriage/structure.json）。
2. 运行 `check_mature_marriage_structure`（同角色、ID 唯一、引用、退出约束来源、结构厚度、照护负载不对称、stayingLogic 对齐）；error 先修。
3. 需要重构时建 Restructuring Plan（`save_mature_marriage_restructuring`，proposed → confirmed 进 canon/marriage/restructuring.json）；运行 `check_mature_marriage_restructuring`（high/critical 约束必须有响应；责任不能凭空消失；依赖照护责任不因分离消失）。
4. 写作时与 Chase Wife / Mystery 并行：结构是作者规划，正文兑现属于 Phase 5。

## Author Secret 边界

Marriage Structure / Restructuring Plan 是作者规划（restructuring 可能泄露未来分居/离婚安排）：

- planning / chapter-writing / continuity-review 可读取；
- reader-sim 一律不读取 canon/marriage、work/marriage、outline/marriage；
- 不含 mature-marriage-crisis mechanism 的项目不读取 marriage 内容。

## 禁止的套路公式

不要求结婚年限、年龄、孩子、房贷、婆媳矛盾、女主做家务、男主挣钱或出轨；结构只记录故事真正需要的纠缠，不把婚姻变成苦难收集器。

## 必须加载的资源

- `resources/economic-and-care.md`：经济单元与照护责任。
- `resources/decision-and-power.md`：决策权与实际权力。
- `resources/exit-and-redistribution.md`：退出约束与责任再分配。
- `resources/prompt.md`：生成约束与工具顺序。
