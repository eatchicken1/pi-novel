# Novel Backend API

本地 HTTP API（loopback only）。统一错误结构：

```json
{ "error": { "code": "CHANGESET_BASE_STALE", "message": "...", "details": {}, "requestId": "..." } }
```

每个请求带 `requestId`（响应头 `x-request-id`）。认证：`x-pi-novel-token` 头（loopback 本地 token）。

## HTTP 语义

| 场景 | 状态码 |
| --- | --- |
| POST 创建 | 201 |
| 异步任务接受 | 202 |
| 未找到 | 404 |
| base stale / 非法状态迁移 | 409 |
| 非法 payload | 400 |
| 内部错误 | 500 |

## 路由总表

### Workspace
- POST /api/workspace/initialize（body: { path }）
- GET  /api/workspace
- POST /api/workspace/rescan

### Projects
- GET /api/projects
- GET /api/projects/:projectId（ProjectRecord）
- GET /api/projects/:projectId/detail（ProjectDetail）
- GET /api/projects/:projectId/status（ProjectStatusSnapshot）
- GET /api/projects/:projectId/chapters
- GET /api/projects/:projectId/chapters/:chapter
- GET /api/projects/:projectId/studio

### Forge
- POST /api/forge
- GET  /api/forge/:id
- POST /api/forge/:id/explore
- POST /api/forge/:id/select
- POST /api/forge/:id/materialize

### ChangeSets
- POST /api/projects/:id/changesets（body: CreateChangeSetInput，含 operations）
- GET  /api/projects/:id/changesets
- GET  /api/projects/:id/changesets/:changeSetId
- POST /api/projects/:id/changesets/:changeSetId/accept
- POST /api/projects/:id/changesets/:changeSetId/reject
- POST /api/projects/:id/changesets/:changeSetId/commit（body: { actor }；头 x-idempotency-key 可选）

### Review
- GET /api/projects/:id/review（query: severity/scope/chapter/status）
- POST /api/projects/:id/review/:issueId/acknowledge
- POST /api/projects/:id/review/:issueId/dismiss

### Graph
- GET /api/projects/:id/story-graph（query: chapterFrom/chapterTo/nodeTypes/characterId）

### History
- GET /api/projects/:id/history
- GET /api/projects/:id/history/:commitId

### Tasks
- POST /api/tasks（202；头 x-idempotency-key 可选）
- GET  /api/tasks/:taskId
- POST /api/tasks/:taskId/cancel
- GET  /api/tasks/:taskId/events（afterSequence 支持 Last-Event-ID 恢复）

## 幂等

mutating API（Forge materialize、ChangeSet commit、Task create）支持 `x-idempotency-key`：
网络重试不得重复创建资源；重复 key 返回 IDEMPOTENT_REPLAY（409）。

## 路径安全

projectId 一律从 Workspace registry resolve 到已注册项目根；
文件读写必须保证路径位于项目根内（拒绝 ../、绝对路径、symlink 逃逸）。
