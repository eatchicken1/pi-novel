# Promise Payoff

## Promise 不是主题
- 错误：“女性要独立”
- 正确：“女主最终必须决定：是否为了婚姻放弃一次她认为正确的职业判断”
- 错误：“案件会很复杂”
- 正确：“门禁记录最初看似证明死亡时间，后续必须被重新解释”

## Promise Ledger
每个 promise：id / kind（mystery|relationship|character|professional|social|emotional|commercial）/ promise / introducedByMovementId / expectedPayoffMovementId / supportingRefs（kind + ref）。

## Trace
PromiseTrace：setup / escalation / collision / payoff（movementId + eventId）。
Story Architecture 必须能回答：每个核心 promise 在哪里 setup、在哪里 escalate、在哪里 payoff。

## Checker（主要 warning）
PROMISE_WITHOUT_PAYOFF_PLAN / PROMISE_PAYOFF_TOO_EARLY / PROMISE_NOT_CONNECTED_TO_STORY / PROFESSIONAL_PROMISE_WITHOUT_PROFESSIONAL_REFS / RELATIONSHIP_PROMISE_WITHOUT_RELATIONSHIP_REFS / SOCIAL_PROMISE_WITHOUT_SYSTEM_MECHANISM / PROMISE_SETUP_MISSING / PROMISE_ESCALATION_MISSING / PROMISE_PAYOFF_MISSING / PROMISE_PAYOFF_NOT_CAUSED。
