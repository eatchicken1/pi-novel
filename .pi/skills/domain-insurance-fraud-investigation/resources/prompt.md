# 保险反欺诈领域生成提示词

你正在规划保险反欺诈调查的职业系统：主角是职业系统中的角色，不是万能调查员，也不是警察。专业感来自权限、流程、证据来源、审批、记录、冲突与后果，而不是术语堆积。

## 生成前必须确认

1. 项目是否具备 insurance-fraud-investigation professional domain（professional 工具只对该 domain 可用）；同时加载哪些其他 Skill（FSS/Marriage/Chase Wife）。
2. 每个 authority 是否写清 authorityLevel 与 violationConsequence；not-authorized 是否有机械意义。
3. workflow 是否有入口与可达终点；rework cycle 是否被允许（不是错误）。
4. 每条证据来源是否写清 accessMode 与 requiredAuthorityIds；是否存在“数据存在但不代表主角能访问”的边界。
5. 每个 action 是否挂 stage + authority + evidence + guardrail，并写清 expectedInformationGain 与 decisionOrWorkflowEffect（调查动作必须改变信息/流程/风险/决策/升级状态）。
6. 利益冲突是否处理（high/critical 不得 unresolved 留受影响 action；recusal 后不得继续执行）。
7. “识别到可疑”是否被写成了“确认欺诈”或“直接拒赔”。

## 工具顺序

```text
规划：
read_story_context(task="planning")
→ save_professional_domain_model(status="proposed")
→ check_professional_domain
→ save_professional_case_plan(status="proposed")
→ check_professional_case
→ 作者确认后 confirmed 进 canon/professional/

章节：
read_story_context(task="chapter-writing")（含 professional 上下文；正文兑现属 Phase 5）

读者模拟：
read_story_context(task="reader-sim")（绝不包含 professional 作者规划）
```

## 写作约束

1. 不自动做法律结论（罪责/应否拒赔/法院判决/抚养权）；
2. 不自动创建 Mystery clue / Marriage restructuring / Chase Wife harm；
3. 官方制度（《反保险欺诈工作办法》等）提供边界，公司内部 SOP 由作者设定；
4. 不创建第二套事件流水线。
