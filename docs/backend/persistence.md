# Persistence

## SQLite 布局

Workspace SQLite（app lifetime）：
- workspace_metadata / projects
- forge_sessions / forge_candidates / forge_selections / forge_artifacts
- tasks / task_events / agent_runs

Project SQLite（per-project，lazy open，有界缓存 ≤8 个句柄）：
- project_metadata / story_commitments / forge_provenance
- changesets / review_issues / commits / checkpoints / commit_journals
- story_nodes / story_edges / artifacts

## 迁移

每个 migration：versioned（schema_migrations 表）+ transactional（BEGIN IMMEDIATE...COMMIT）+ tested。
新表通过 SQL 文件加载（project-migrations.ts / workspace-migrations.ts）。

## 生命周期

Project Database：per-project lazy open，LRU 关闭最久未用（不超过 8 个打开句柄）——
Library 打开 100 个项目不会持有 100 个 sqlite handles。

## 崩溃一致性

文件 + SQLite 不共享事务 → Commit Journal（commit_journals 表）：
{ journalId, changeSetId, state(pending|applied|committed|rolled-back), files[], dbActions[], startedAt }
启动/提交前检测不完整 journal：applied → 完成；pending → 回滚 temp。不允许 silent partial commit。
