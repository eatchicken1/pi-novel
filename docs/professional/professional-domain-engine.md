# Professional Domain Engine（Round 4）

## 1. Professional Domain 在 Story DNA 中的位置

Professional Domain 是 Story DNA 的第三种正交能力：Primary Genre + Relationship Mechanisms + Professional Domain。它回答：主角在职业系统中是什么角色、能做什么、不能做什么、能访问什么、需要什么权限、调查动作经过什么流程、谁有审批权、利益冲突如何处理、何时升级、越权或坚持原则的后果。它不是 Genre，不是 Relationship Mechanism；首轮实现 insurance-fraud-investigation，未来可扩展 forensic-accounting / medical-examiner / auction-appraiser / customs-broker / compliance-investigator 等（底层数据结构使用 Professional* 通用语义，不把核心服务命名成 Insurance*）。

## 2. Role

`ProfessionalRole`：title、departmentOrFunction、organizationType、coreResponsibilities、reportsTo、decisionScope、cannotDecide、collaboratesWith、professionalRisk。“形成调查意见”不自动等于“最终决定拒赔”或“决定刑事立案”——由 authority model 决定。

## 3. Authority

`ProfessionalAuthorityBoundary`：category（inspect-internal-record/request-record/interview/site-visit/data-query/make-risk-assessment/recommend-decision/approve-decision/share-information/escalate/external-referral/other）、scopeDescription、authorityLevel（direct/conditional/approval-required/not-authorized）、conditions、approvalRole、escalationPathIds、violationConsequence。not-authorized 有机械意义：action 引用即 ACTION_OUTSIDE_AUTHORITY。

## 4. Workflow

`ProfessionalWorkflowStage`：objective、isEntry、entryConditions、allowedAuthorityIds、requiredInputs、possibleNextStageIds、terminal、reviewOrApprovalRequired。工作流是图不是线性链：允许补充调查/重新核验/升级/退回/多部门会商形成的 rework cycle（cycle 不是错误）。checker 要求入口存在、next 引用有效、至少一个可达 terminal；不可达 stage 是 warning，非终点无后继是 error。不要求固定阶段数量，不要求“报案→调查→拒赔”模板。

## 5. Evidence Access

`ProfessionalEvidenceSource`：category（internal-claim-file/underwriting-record/policy-record/internal-system-log/medical-record/financial-record/digital-record/physical-inspection/interview/public-record/industry-platform/third-party-service/regulator-or-law-enforcement-return/other）、holder、accessMode（direct-role-access/internal-approval/consent-based/contractual-request/collaboration-request/public/regulator-or-law-enforcement-only/unavailable）、requiredAuthorityIds、privacyOrSensitivity、verificationLimitations、chainOrProvenanceNote。“存在某数据不等于主角可以访问”；restricted accessMode 必须声明 requiredAuthorityIds；action 使用 unavailable 或权限不满足的数据 → ACTION_EVIDENCE_INACCESSIBLE。

## 6. Guardrail

`ProfessionalGuardrail`：category（authority/privacy/data-security/evidence-integrity/consumer-protection/timeliness/conflict-of-interest/approval/collaboration/other）、appliesToStageIds、requiredAuthorityIds、violationConsequence、sourceBasis（作者/Skill 提供的专业依据说明，系统不声称是法律条文）。

## 7. Escalation

`ProfessionalEscalationPath`：trigger、fromRoleOrFunction、toRoleOrOrganization、purpose、requiredInformation、possibleOutcomes、limitations。可表达 investigator → internal anti-fraud lead → industry collaboration → regulator/law-enforcement interface；主角不天然拥有所有外部移送权限。

## 8. Case Plan

`ProfessionalCasePlan`：mandate、startingStageId、actions、conflictsOfInterest、escalations、professionalConsequences、unresolvedQuestions。每个 `ProfessionalAction` 必须挂 stageId + authorityIds + evidenceSourceIds + guardrailIds，并写清 expectedInformationGain 与 decisionOrWorkflowEffect（调查动作必须改变信息/流程/风险/决策/升级状态），ifBlocked 与 professionalRisk。

## 9. Authority enforcement（确定性行为）

- ACTION_OUTSIDE_AUTHORITY：action 引用 not-authorized 权限；
- ACTION_EVIDENCE_INACCESSIBLE：使用 unavailable 数据，或使用 restricted 数据但 action 权限不满足 requiredAuthorityIds；
- EVIDENCE_ACCESS_WITHOUT_AUTHORITY：restricted 数据源未声明任何 required authority；
- ACTION_STAGE_MISSING / ACTION_AUTHORITY_MISSING / ACTION_EVIDENCE_MISSING：动作缺少流程位置/权限/证据来源，不得被视为合法调查；
- UNMITIGATED_PROFESSIONAL_CONFLICT：high/critical 冲突 unresolved 且受影响 action 仍在；ACTION_AFTER_RECUSAL：recusal 后仍执行受影响 action。

## 10. Insurance anti-fraud domain（边界三层）

官方制度边界：如国家金融监督管理总局《反保险欺诈工作办法》（2024 年 8 月发布，见国务院公报 2024 年第 26 号）——全流程欺诈风险管理、组织职责与报告路径、识别/评估/监测/处置、承保与理赔端核验、信息与数据管理、个人信息与数据安全、行业协作/线索串并、外部协作/升级、消费者权益保护、不得仅以无依据的欺诈怀疑拖延正常理赔（核验日期：2026-07-16，网络检索）。

公司内部 SOP（部门名、职级、审批层级、调查流程、系统权限）是故事设定，可配置，不代表全国统一；作者虚构设定需显式声明。不要把实际公司 SOP 当统一规则，不用术语堆积冒充专业性。

## 11. Professional Evidence ≠ Mystery Clue

ProfessionalEvidenceSource 描述“职业上可以从哪里取得信息”；MysteryClue 描述“故事里真正出现并参与推理的可观察事实”。两者不自动等同（公司门禁系统 ≠ 02:17 门禁凭证被使用）。Round 4 不自动创建 MysteryClue；Phase 5 建立 Professional Action → Professional Observation → Mystery Clue realization。

## 12. Professional Conflict ≠ Marriage Harm

职业利益冲突（如调查线索指向丈夫家族企业）只产生 ProfessionalConflictOfInterest 与可能的 relationship-pressure 后果；不自动创建 Chase Wife harm（deception/future-betrayal/boundary-violation）或 Marriage restructuring。伤害语义继续由关系层 + 正文证据判断。

## 13. Regulatory boundary ≠ universal company SOP

法规是边界，公司具体 SOP 是故事设定：checker 只验证项目自己声明的职业规则是否自洽，不硬编码某家公司的部门/职级/审批层级。

## 14. Reader Sim boundary

canon/professional、work/professional、outline/professional 属于作者规划：reader-sim 一律不读取；路径判定统一反斜杠（Windows 安全）并按 author-private roots 匹配。

## 15. Phase 5 integration boundary

本轮只做 planning structure：无 professional event pipeline、无正文证据锚点、无 mystery/profession 事件绑定。Phase 5（Unified Narrative Event Integration）才把 Mystery Delta + Marriage Delta + Chase Wife Delta + Professional Delta 挂到同一 narrative event，并落地 planned → prose evidence → finalized realization。
