# Insurance Fraud Investigation Domain（Round 4）

## 定位

insurance-fraud-investigation 是 Professional Domain Engine 首个领域：保险机构反欺诈/理赔调查职业系统的可配置结构模型。别名：保险欺诈调查、保险反欺诈调查。

## 官方制度边界（核验日期：2026-07-16）

来源：国家金融监督管理总局《反保险欺诈工作办法》（2024 年 8 月印发；国务院公报 2024 年第 26 号转载，gov.cn 链接见文末）。本领域吸收的结构原则（摘要，非法规条文）：

- 全流程欺诈风险管理：识别 / 评估 / 监测 / 处置贯穿承保、理赔各环节；
- 组织职责与报告路径：明确审核部门与审批权限；
- 承保端与理赔端风险信息核验；
- 信息系统与数据管理、个人信息与数据安全；
- 行业协作 / 线索串并与外部协作 / 升级；
- 消费者权益保护：不得仅以无依据的欺诈怀疑拖延正常理赔。

法规是边界，公司具体 SOP 是故事设定：不要把监管规则机械转换成每家公司完全相同的内部流程。

## 可配置公司 SOP（故事设定示例，非模板）

- 部门名（如反欺诈调查科/理赔调查组）、职级、审批层级：作者设定；
- 调查流程（受理→核验→现场/访谈→评估→意见→审批→处置）以 ProfessionalWorkflowStage 图表达，允许 rework cycle；
- 系统权限与数据访问：以 ProfessionalEvidenceSource.accessMode + requiredAuthorityIds 表达。

## 状态语义（必须区分）

识别到可疑 ≠ 确认欺诈 ≠ 可以直接拒赔。suspicion / investigation / verification / review / decision / escalation 分离；最终处理权由 Domain Model 权限配置决定。

## 主角权限边界示例（结构而非法律结论）

- 可以：核验理赔材料、内部系统查询、访谈当事人、现场调查、形成风险意见、建议升级；
- 不可以（除非模型显式授权）：银行账户任意查询、医疗记录任意访问、公安数据库直接访问、无限监控调取、决定刑事立案、最终拒赔终审。

## 典型利益冲突

调查线索指向主角配偶/家族企业 → ProfessionalConflictOfInterest（source=spouse/family），触发 disclose/second-review/recusal 等 mitigation；不自动判违法、不自动要求离婚、不自动创建 Chase Wife harm。

## 与其它引擎的边界

- Professional Evidence Source ≠ Mystery Clue（不自动创建）；
- Professional Conflict ≠ Marriage Harm / Chase Wife Harm（不自动创建）；
- 职业后果 relationship-pressure 不自动写入 Harm Ledger；
- Phase 5 才建立 Action → Observation → Clue realization 与统一事件。

## 来源

- [国家金融监督管理总局关于印发《反保险欺诈工作办法》的通知](https://www.nfra.gov.cn/cn/view/pages/governmentDetail.html?docId=1172486&itemId=861&generaltype=1)（NFRA 官网）
- [国务院公报 2024 年第 26 号：反保险欺诈工作办法](https://www.gov.cn/gongbao/2024/issue_11586/202409/content_6975080.html)（gov.cn）
