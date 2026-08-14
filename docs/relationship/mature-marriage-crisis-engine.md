# Mature Marriage Crisis Engine（Round 3）

## 1. 为什么 Mature Marriage 不是年龄标签

Mature Marriage Crisis 是 relationship mechanism，不是 genre，也不是 Chase Wife 的别名。它描述长期婚姻为什么具有结构性纠缠（经济、照护、决策、社会、惯性、退出约束），以及破裂后这些结构如何被重新分配。机制值：mature-marriage-crisis；不要求结婚年限、年龄、孩子、房贷或任何人口统计套路。

## 2. Structural Entanglement

核心公式：Marriage = Relationship + Economic Unit + Care Unit + Family Unit + Decision System + Social Unit。顶层 `MatureMarriageStructure`：protagonistCharacterId、spouseCharacterId、economicItems、responsibilities、decisionRights、socialTies、inertiaFactors、exitConstraints。这是作者规划结构，不是读者看到的事实列表。

## 3. Economic Unit

`MarriageEconomicItem`：kind（housing/asset/debt/income-stream/recurring-expense/business-interest/family-transfer/benefit/other）、control、protagonistAccess/spouseAccess（full/limited/none/unknown）、liquidity、exitConsequence、ongoingBurden、legalOrOwnershipNarrative（作者故事事实，非法律推断）、relatedResponsibilityIds。不自动判断产权。

## 4. Care Unit

`MarriageResponsibility`：domain（domestic/childcare/eldercare/financial/health-care/family-administration/career-support/social-maintenance/emotional-labor/other）、expectedAllocation vs actualPrimaryBearer、backupBearer、frequency、substitutability、failureConsequence、recognizedByBoth、relatedEconomicItemIds。

## 5. Decision Rights

`MarriageDecisionRight`：domain（housing/finance/career/childcare/eldercare/family-contact/health/relocation/social/business/other）、formalExpectation、practicalController、vetoHolder、affectedResponsibilityIds、affectedEconomicItemIds、consequenceOfDisagreement。“spouse 控制账户”是 structural fact，不自动等于 abuse。

## 6. Social Entanglement

`MarriageSocialTie`：kind（family/friend/colleague/business/client/community/school-parent-network/neighborhood/other）、connection、dependenceOrLeverage、informationExposure、exitConsequence。共同朋友圈、双方父母、家族公司、家长圈、共同客户都是真实退出成本。

## 7. Marriage Inertia

`MarriageInertiaFactor`：category（shared-history/routine/identity/sunk-cost/family-expectation/economic-dependence/care-dependence/social-image/parenting-stability/career-entanglement/hope/other）、keepsRelationshipBecause、sourceRefIds（引用结构项，checker 验证）、breakingCondition。staying reason 不再是散文字符串。

## 8. Exit Constraints

`MarriageExitConstraint`：category、severity（low/medium/high/critical）、timeHorizon、reducibility、mitigationOptions、unresolvedConsequence、sourceRefIds / externalSourceDescription（必须有来源）。禁止 exitScore 总分：只统计 high/critical/unaddressed 约束数量，不伪造总分。

## 9. Restructuring Plan

`MatureMarriageRestructuringPlan`：mode（remain-with-renegotiation/trial-separation/separate-households/divorce-intent/independent-exit/unresolved）、protagonistGoal、resourceChanges、responsibilityChanges、decisionRightChanges、socialTieChanges、constraintResponses、nonNegotiableBoundaries、unresolvedDependencies。这是小说关系安排，不是法律状态判断。

## 10. Responsibility Redistribution

“离开关系”不能神奇删除责任：MarriageResponsibilityChange 必须有新 bearer 或显式 unresolved（feasibility=unresolved + remainingConsequence）；依赖照护责任（childcare/eldercare/health-care）不因分离自动消失；high/critical 约束必须有 ConstraintResponse。

## 11. Structure ≠ Harm

care work、economic dependence、shared housing 只是结构事实。只有 Chase Wife Harm Ledger 能表达 care-labor-exploitation 等关系伤害，且需要正文与关系语义进一步证明（强制、剥夺退出权、拒绝补偿、同时转移资源等）。Marriage Engine 不自动创建 harm、不自动判 abusive；CARE_LOAD_ASYMMETRY 只是 warning，桥接留到 Phase 5 Unified Narrative Integration。

## 12. 与 Chase Wife 的边界

两个 mechanism 独立：mature-marriage-crisis 与 chase-wife 可单独或同时启用；Marriage 不写 Harm Ledger，Chase Wife 不把 Marriage Structure 当已发生 harm。stayingLogic 的 material/social/family/career 理由在同时启用时应由 Marriage Structure 提供事实基础（checker 低耦合 warning，只比较结构类别，不分析字符串关键词）。

## 13. 与 Mystery 的边界

Mature Marriage 不负责 mystery truth/clue/suspect/investigation；Mystery 不负责婚姻结构。组合项目两者并行加载，read_story_context 同时提供双方 artifact，互不覆盖。

## 14. Reader Sim 隔离

canon/marriage/*、work/marriage/*、outline/marriage/* 属于作者规划（restructuring 可能泄露未来分居/离婚安排）：reader-sim 一律不读取；路径判定统一反斜杠（Windows 安全）并按 author-private roots 匹配。

## 15. Phase 5 integration boundary

本轮只做 planning structure：无正文 pipeline、无 finalized prose evidence、无法律引擎。Phase 5（Unified Narrative Event Integration）才把 Mystery Delta + Marriage Delta + Chase Wife Delta + Professional Consequence 挂到同一 narrative event，并落地正文兑现。
