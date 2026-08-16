# History

每次 canonical mutation 都有 ChangeSet + CommitRecord。

CommitRecord { id, projectId, changeSetId?, actor(user|agent|system), summary, affectedFiles[], beforeHashes, afterHashes, resolvedIssueCount, createdAt }

API：
- GET /api/projects/:id/history（HistoryEntry 列表，不含完整 hash 以保持轻量）
- GET /api/projects/:id/history/:commitId（完整 CommitRecord）

用户可回答：what changed / why / by whom / when。

Checkpoint（轻量）：ProjectCheckpoint { id, projectId, label?, manifestHashes, createdAt }——大型 AI 重构前 manual checkpoint / autosave checkpoint；不实现 Git-like branches。
