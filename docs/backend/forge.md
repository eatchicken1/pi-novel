# Forge（Workspace 级创作会话）

## 流程

Seed → Explore → Compare → Select → Materialize。

Forge 属于 Workspace（在 Select 前不创建正式 Project）。

## 状态机

draft → ready → generating → awaiting_selection → committed → materializing → materialized；失败 → failed；放弃 → abandoned。

## 领域不变量

- AUTHOR_SELECT_REQUIRED：selectedCandidateId 只有作者明确选择才进入 materialize；SYSTEM_RECOMMENDED 可保存 recommendation，不得伪造 selection。
- completed 不可修改 seed；cancelled/abandoned 不可 materialize。
- 同一 ForgeSession materialize 重试不产生两个项目（幂等）。
- 候选带 constraintValidation（hard-constraint gate 结果），FAIL 候选不进入普通提案。
