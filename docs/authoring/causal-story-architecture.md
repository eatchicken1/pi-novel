# Causal Story Architecture（Round 8）

## 解决的问题

Round 7 的 build_narrative_event_graph 允许从 Architecture 直接跳到 30-60 个 Unified Event——仍接近 one-shot 生成。Round 8 内部推荐步骤：Architecture → Anchor Spine → Causal Check → Promise Trace Check → Question/Pressure Check → Bridge Events → Full Unified Event Graph → Vertical Check。对外仍是 build_narrative_event_graph 一个工具。

## Anchor Spine

NarrativeAnchor：id / movementId / eventId? / anchorKind / purpose / triggeringState / protagonistAction / opposition / irreversibleChange / irreversible / engineRefs / collisionType / downstreamConsequences / requiredSetup。

核心类型覆盖（不硬编码数量）：opening disturbance / first investigation commitment / first cross-domain collision / false model reinforcement / major contradiction / professional-personal dilemma / relationship boundary recognition / midpoint reframe / cost escalation / irreversible exit / truth compression / climax choice / aftermath settlement。

Anchor 不是第二 event authority：eventId 引用 Unified Event；requiredSetup 支持数字事件 id。

## Causal Link

StoryCausalLink：fromEventId / toEventId / relation（causes | enables | blocks | reveals | escalates | forces-choice | pays-off | reinterprets；coincidence 为自报风险）。分析层，不是第二事件图。

## Checker

- ANCHOR_WITHOUT_CAUSE（error）：anchor 无 incoming link 且无 requiredSetup；
- ANCHOR_WITHOUT_DOWNSTREAM_EFFECT（warning）：无 downstreamConsequences 且无 outgoing；
- ANCHOR_ONLY_INFORMATIONAL（warning）：collisionType=information 且不可逆；
- MIDPOINT_NOT_IRREVERSIBLE（warning）：midpoint reframe 不可逆为 false；
- CLIMAX_NOT_PREPARED（error）：climax anchor 无 setup；
- ENDING_NOT_CAUSED_BY_STORY（warning）：aftermath anchor 无 incoming；
- EVENT_CAUSALLY_WEAK：非首个事件无 incoming link（irreversible 事件升级为 error）；
- EVENT_DEPENDS_ON_COINCIDENCE（warning）：coincidence link；
- EVENT_FILLER_RISK（warning）：无任何 causal/anchor/bridge/trace 参与——移除后因果图、信息、决策、成本都不变；
- BRIDGE_REFERENCE_INVALID（error）：bridge 引用不存在的事件；
- CLUE_WITHOUT_STRATEGIC_EFFECT（warning）：发现线索但无 outgoing（发现没有改变假设/策略/风险）。

## 事件图构建结果

build_narrative_event_graph 额外返回：anchorEvents / bridgeEvents / causalIssues / promiseCoverage（traced/total）/ questionCoverage（open/closed）/ pressureWarnings / fillerRisks。分析存 work/authoring/event-graph-analysis.json（作者私有）。

## Promise Trace

PromiseTrace：promiseId / setup / escalation / collision / payoff。checker：PROMISE_SETUP_MISSING / PROMISE_ESCALATION_MISSING / PROMISE_PAYOFF_MISSING / PROMISE_PAYOFF_NOT_CAUSED / PROMISE_TRACE_UNKNOWN / PROMISE_TRACE_EVENT_UNKNOWN。

## Narrative Questions 与 Pressure

NarrativeQuestion：openedAtMovementId → deepenedAtMovementIds → partialAnswerRefs → closedAtMovementId + finalAnswerRef。PressureChange：movementId / dominantPressure / change（rising|stable|falling|released|transformed）。诊断见 story-design-review 文档。

## Information vs Decision 平衡

连续 >=5 个事件只有 discover/inspect/learn 而没有 choose/refuse/expose/conceal/leave/sacrifice → INFORMATION_WITHOUT_DECISION_RUN（女性社会派悬疑最典型的第二幕病）。
