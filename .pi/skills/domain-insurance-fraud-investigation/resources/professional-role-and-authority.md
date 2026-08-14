# 职业角色与职权边界

## ProfessionalRole

title、departmentOrFunction、organizationType、coreResponsibilities、reportsTo、decisionScope、cannotDecide、collaboratesWith、professionalRisk。

- “形成调查意见”不自动等于“她本人最终决定拒赔”或“她决定刑事立案”：decisionScope 与 cannotDecide 由作者设定；
- cannotDecide 至少写清她不能拍板的事（拒赔终审、刑事移送、对外发布）。

## ProfessionalAuthorityBoundary

category（inspect-internal-record/request-record/interview/site-visit/data-query/make-risk-assessment/recommend-decision/approve-decision/share-information/escalate/external-referral/other）、scopeDescription、authorityLevel（direct/conditional/approval-required/not-authorized）、conditions、approvalRole、escalationPathIds、violationConsequence。

## 规则

1. not-authorized 必须有机械意义：action 引用它 → ACTION_OUTSIDE_AUTHORITY error；
2. conditional / approval-required 的权限，action 必须满足 conditions 或 approvalRole 才能使用（checker 以 evidence 的 requiredAuthorityIds 为主要机械约束）；
3. 每条 authority 都要写 violationConsequence（越权会怎样）。
