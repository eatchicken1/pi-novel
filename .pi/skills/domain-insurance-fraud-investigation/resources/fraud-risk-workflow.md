# 欺诈风险流程（可配置工作流图）

## ProfessionalWorkflowStage

id、name、objective、isEntry、entryConditions、allowedAuthorityIds、requiredInputs、possibleNextStageIds、terminal、reviewOrApprovalRequired、notes。

## 规则

1. 工作流是图不是线性链：允许补充调查、重新核验、升级、退回、多部门会商形成的 rework cycle——cycle 不是错误；
2. 至少一个入口 stage（isEntry=true）与至少一个可达 terminal stage；不可达 stage 是 warning，非终点无后继是 error；
3. 不要求固定阶段数量，不要求必须出现“报案→调查→拒赔”；
4. 状态语义区分：suspicion / investigation / verification / review / decision / escalation 不能混为一谈；“识别到可疑”≠“确认欺诈”≠“可以直接拒赔”。
