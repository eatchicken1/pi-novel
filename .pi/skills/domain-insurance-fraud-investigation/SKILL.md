---
name: domain-insurance-fraud-investigation
description: 保险反欺诈调查专业领域（Professional Domain）：职业角色与职权边界、欺诈风险管理流程、证据来源与数据访问、利益冲突与升级、职业后果。可与 female-social-suspense、mature-marriage-crisis、chase-wife 组合。
---

# Insurance Fraud Investigation（Professional Domain）

## 加载条件

当项目 professionalDomain 为 insurance-fraud-investigation（保险欺诈调查/保险反欺诈调查）时加载。统一通过 hasProfessionalDomain(project, "insurance-fraud-investigation") 判断。

## 定位

Professional Domain 是 Story DNA 的第三种正交能力（Primary Genre + Relationship Mechanisms + Professional Domain）。它回答：主角在职业系统中是什么角色、能做什么、不能做什么、能访问什么、需要什么权限、动作经过什么流程、谁有审批权、利益冲突如何处理、何时升级、越权或坚持原则的后果。

## 负责与不负责

负责：professional role、authority boundary、workflow、evidence access、guardrail、escalation、conflict of interest、professional consequence。

不负责：Mystery 最终真相与线索公平性（female-social-suspense）；婚姻结构（mature-marriage-crisis）；Chase Wife harm/repair；法院判决、应否拒赔、刑事责任；刑事侦查；章节组装与正文 pipeline（Phase 5）。

## 极重要：保险调查员 ≠ 警察

结构上通过 authority boundary / evidence access / approval / privacy / conflict / escalation 阻止“女主想查什么就能查什么”。不能默认拥有：搜查权、强制讯问权、手机取证权、银行账户任意查询权、医疗记录任意访问权、公安数据库直接访问权、无限监控调取权、刑事立案决定权。

## 状态语义必须区分

识别到可疑 ≠ 确认欺诈 ≠ 可以直接拒赔。suspicion / investigation / verification / review / decision / escalation 语义分离；最终处理权由 Domain Model 的权限配置决定。怀疑欺诈不能在叙事中自动等价于被保险人有罪或立即拒赔。

## 官方制度边界 vs 公司 SOP vs 故事设定

三层区分（详见 resources）：

1. 官方监管边界（如《反保险欺诈工作办法》，国家金融监督管理总局 2024）：全流程欺诈风险管理、组织职责与报告路径、识别/评估/监测/处置、承保与理赔端核验、信息与数据安全、行业协作/线索串并、外部协作/升级、消费者权益保护、不得仅以无依据的欺诈怀疑拖延正常理赔——这是边界；
2. 公司内部 SOP：部门名、职级、审批层级、调查流程、系统权限由作者设定（可配置故事组织模型）；
3. 作者虚构设定：为故事服务的例外必须显式声明。

不要把实际某家公司的 SOP 当全国统一规则，也不要用术语堆积（核保/核赔/反洗钱/风控/合规）冒充专业性——专业感来自权限、流程、来源、审批、记录、冲突与后果。

## 固定流程

1. `read_story_context(task="planning")`；建 Professional Domain Model（`save_professional_domain_model`，proposed → confirmed 进 canon/professional/domain-model.json）。
2. 运行 `check_professional_domain`（workflow 入口/可达/终点、evidence access 权限、引用、重复 ID）；error 先修。
3. 建 Professional Case Plan（`save_professional_case_plan`，proposed → confirmed 进 canon/professional/case-plan.json）：每个 action 必须挂 stage + authority + evidence + guardrail，并给出 expectedInformationGain 与 decisionOrWorkflowEffect。
4. 运行 `check_professional_case`（ACTION_OUTSIDE_AUTHORITY / ACTION_EVIDENCE_INACCESSIBLE / UNMITIGATED_PROFESSIONAL_CONFLICT / ACTION_AFTER_RECUSAL 等）。
5. 写作时与 Mystery / Marriage / Chase Wife 并行：Professional Evidence Source ≠ Mystery Clue（Phase 5 才绑定 realization）。

## Author Secret 边界

Domain Model / Case Plan 是作者规划：reader-sim 不读取 canon/professional、work/professional、outline/professional（Windows 路径同样隔离）。

## 必须加载的资源

- `resources/professional-role-and-authority.md`：角色与职权边界。
- `resources/fraud-risk-workflow.md`：欺诈风险流程（可配置工作流图）。
- `resources/evidence-and-data-access.md`：证据来源与数据访问。
- `resources/conflict-and-escalation.md`：利益冲突与升级。
- `resources/prompt.md`：生成约束与工具顺序。
