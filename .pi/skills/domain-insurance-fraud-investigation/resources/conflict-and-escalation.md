# 利益冲突与升级

## ProfessionalConflictOfInterest

description、source（spouse/family/financial/organizational/prior-relationship/personal-interest/other）、affectedActionIds、affectedStageIds、severity、disclosureRequired、mitigation（disclose/second-review/recusal/reassignment/information-firewall/supervisor-approval/unresolved）、mitigationDescription、remainingRisk。

## 规则

1. high/critical conflict + mitigation=unresolved + 受影响 action 仍在计划 → UNMITIGATED_PROFESSIONAL_CONFLICT error；
2. mitigation=recusal 后仍执行受影响 action → ACTION_AFTER_RECUSAL error；second-review/reassignment 等有效 mitigation 不报错；
3. “丈夫家企业涉案”只产生职业利益冲突，不自动判违法、不自动要求离婚、不自动创建 Chase Wife harm。

## ProfessionalEscalationPath

trigger、fromRoleOrFunction、toRoleOrOrganization、purpose、requiredInformation、possibleOutcomes、limitations。

- 可表达：investigator → internal anti-fraud lead；internal team → industry collaboration；organization → regulator/law-enforcement interface；
- 主角不天然拥有所有外部移送权限：industry-platform/industry-association/other-insurer/external-provider/regulator/law-enforcement 是协作节点，访问通过 accessMode 与 escalation path 表达，不自动授权。

## ProfessionalConsequence

triggerRefIds、category（case-integrity/career/employment/compliance/consumer-impact/financial/organizational/relationship-pressure/other）、reversibility、affectedParties。

- 不是法律量刑模型；
- category=relationship-pressure（如坚持升级调查与丈夫家族利益冲突）不自动创建 Chase Wife harm；
- 职业后果的伤害语义继续由关系层 + 正文证据判断。
