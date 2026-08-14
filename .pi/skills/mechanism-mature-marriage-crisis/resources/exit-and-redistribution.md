# 退出约束与责任再分配

## Marriage Inertia

不要只写“她还爱他”。MarriageInertiaFactor：category（shared-history/routine/identity/sunk-cost/family-expectation/economic-dependence/care-dependence/social-image/parenting-stability/career-entanglement/hope/other）、keepsRelationshipBecause、sourceRefIds（引用经济项/责任/决策权/社会关系/退出约束）、breakingCondition?。

## Exit Constraint

MarriageExitConstraint：category（economic/housing/debt/childcare/eldercare/care/family/career/social/reputation/health/safety/procedural/other）、severity（low/medium/high/critical）、timeHorizon、reducibility（removable/reducible/fixed/unknown）、mitigationOptions、unresolvedConsequence。

- 每条退出约束必须有来源：sourceRefIds 或 externalSourceDescription（不允许无来源的“离婚很难”）；
- 禁止 exitScore=82 之类的总分：经济、照护、住房、子女、职业、社会关系是多维结构，只统计 high/critical/unaddressed 约束数量，不伪造总分。

## Restructuring Plan

MatureMarriageRestructuringPlan：mode（remain-with-renegotiation/trial-separation/separate-households/divorce-intent/independent-exit/unresolved）、protagonistGoal、resourceChanges、responsibilityChanges、decisionRightChanges、socialTieChanges、constraintResponses、nonNegotiableBoundaries、unresolvedDependencies。

## 责任再分配规则

1. 离开关系不能神奇删除责任：responsibilityChange 必须给出新 bearer 或显式 unresolved 说明（feasibility=unresolved + remainingConsequence）；
2. 依赖照护责任（childcare/eldercare/health-care）不因分离自动消失：分离类模式下每条都要有对应 change；
3. high/critical 退出约束在 plan 存在时必须有 constraintResponse，不能在退出计划里神奇消失；
4. resource/decision/social change 必须引用存在的结构项。
