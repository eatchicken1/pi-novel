# ChangeSet / Commit

## 原则

AI 永远不直接修改 canonical。AI 产出 Proposal → ChangeSet → Review（Accept/Reject）→ Commit。

## 模型

ChangeSet { id, projectId, source(user|agent|system), intent, status, baseRevision, operations[], impact?, review?, committedAt? }

status: proposed → reviewing → accepted → rejected / committing → committed / conflict / failed。

## ChangeOperation

replace-text / insert-text / delete-text / replace-document / structured-artifact-update（JSON pointer）/ metadata-update。

## baseRevision / contentHash

每个 ChangeSet 绑定 baseRevision 或 operation.baseHash。commit 前对目标文件做 current hash 校验：
外部修改（VS Code 直接编辑）→ CHANGESET_BASE_STALE（409），ChangeSet 状态 conflict。不允许覆盖用户外部编辑。

## Commit 事务

1. 校验 base hash
2. 写 journal（pending）
3. FileTransaction.applyOperations（temp 文件）
4. journal applied
5. 原子 replace（finalize）
6. 写 CommitRecord（before/after hashes、affectedFiles、resolvedIssueCount）
7. changeset → committed
8. journal committed
9. 派生失效：engine.invalidateDerived（memory/ledgers 重建）

任一步失败 → rollback temp + journal rolled-back + changeset failed。不允许 silent partial commit。

## 崩溃恢复

启动/提交前 recoverPendingCommits：state=applied 的 journal（文件已落盘）→ 完成；
state=pending（temp 未落盘）→ 回滚 temp。检测不完整 journal 时不产生部分 canonical 状态。

## Review

第一版支持 whole ChangeSet accept/reject（不做假 partial accept）：
partial accept 需要重新验证 operation dependencies，未实现前不暴露。

## 幂等

commit 支持 x-idempotency-key；重试返回 IDEMPOTENT_REPLAY，不产生第二个 commit。
