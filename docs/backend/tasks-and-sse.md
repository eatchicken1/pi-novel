# Tasks / AgentRun / SSE

## 原则

长 AI 调用（5s-2min）不能阻塞 HTTP route。建立 Task + AgentRun + 持久化事件。

## 模型

- Task { id, projectId?, forgeSessionId?, type, status(queued|running|awaiting-user|succeeded|failed|cancelled), progress?, resultRef?, error? }
- AgentRun { id, taskId, model, intent, status, usage?, producedArtifacts[] }（不存 hidden chain of thought）
- TaskEvent { id, taskId, sequence, type, payload?, createdAt }

## AgentRuntimePort

Application 只依赖 port（startTask/cancelTask/subscribe）；Infrastructure 提供 PiAgentRuntimeAdapter（本地 agent，测试用 faux provider）。禁止 Application import coding-agent concrete classes。

## SSE

GET /api/tasks/:taskId/events：事件持久化在 SQLite（task_events 表，sequence 有序）。
客户端断线后用 afterSequence / Last-Event-ID 恢复；不需要 Kafka/Redis。

事件类型：task.started / task.progress / agent.message / artifact.proposed / changeset.created / task.awaiting-user / task.completed / task.failed。

## 取消

POST /api/tasks/:id/cancel（合作式）。cancelled task 不得自动 commit proposal；
已生成 proposal 保留（status=proposed）。

## 幂等

POST /api/tasks 支持 x-idempotency-key：重试返回同一 task。
