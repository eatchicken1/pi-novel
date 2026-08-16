# Product Backend Architecture

> Round：Backend Productization。在 Architecture Skeleton + Hardening 基础上，后端推进到支撑完整产品流程的 Application Backend。
> 现有 Novel Engine（.pi/extensions/novel-agent → NovelProjectStore）作为成熟 Engine 保留，经 LegacyNovelEngineAdapter 供出新 read/analyze 意图。

## 分层

```
React
  │
  ▼
Novel API（apps/api，Fastify，loopback + token + origin）
  │
  ▼
Application Commands / Queries（novel-application）
  ├── Workspace
  ├── Forge
  ├── Studio
  ├── ChangeSet / Commit
  ├── Review
  ├── History
  ├── Story Graph
  └── Task / AgentRun
  │
  ▼
Ports（novel-application/ports.ts）
  ├── WorkspaceRepository
  ├── ProjectDatabaseRegistry
  ├── ChangeSetRepository
  ├── CommitRepository
  ├── ReviewRepository
  ├── StoryGraphRepository
  ├── TaskRepository
  ├── NovelEnginePort
  ├── AgentRuntimePort
  ├── FileTransactionPort
  ├── Clock / IdGenerator / Idempotency
  │
  ▼
Infrastructure（novel-infrastructure）
  ├── SQLite（workspace + per-project，有界缓存）
  ├── Filesystem（workspace files / file transaction / project scanner）
  ├── Pi Agent（AgentRuntimePort 实现，测试用 faux provider）
  └── Legacy Novel Engine（NovelProjectStore，仅经 adapter）
```

## 关键决策

- UI 不直接调用 Novel tools（POST /tool/draft_chapter 不存在）；UI 面对 Application Intent。
- AI 永远不直接改 canonical：Proposal → ChangeSet → Review → Commit。
- Story Graph / ReviewIssue / ProjectReadModel 全是 derived read model，不是第二 authority。
- Domain 不 import infra（node:fs / node:sqlite / Fastify / NovelProjectStore 不进 novel-domain）。
- Application 只依赖 ports。
- NovelProjectStore 只作为 legacy engine implementation；Workspace/Forge/HTTP/ChangeSet/SSE 不进入 project-store。
- SQLite = indexes/state/history/derived；canonical 在文件与 Novel Engine。
- 提交事务：base hash 校验 → journal → temp → 原子 replace → history → 派生失效；崩溃恢复不允许 partial commit。
