# 决策权与实际权力

长期婚姻形成实际决策权，这与年轻恋爱不同。MarriageDecisionRight：domain（housing/finance/career/childcare/eldercare/family-contact/health/relocation/social/business/other）、decisionDescription、formalExpectation、practicalController（protagonist/spouse/shared/third-party/unknown）、vetoHolder、affectedResponsibilityIds、affectedEconomicItemIds、consequenceOfDisagreement。

## 规则

- “spouse 控制账户”不自动等于 abuse，只是 structural fact；权力是否成为控制，取决于权利、选择、约定、后果与关系伤害的语义判断；
- 每条决策权都必须写出 consequenceOfDisagreement（意见不合时实际发生什么）；
- 决策权与责任、经济项的双向引用必须一致（checker 校验）。
