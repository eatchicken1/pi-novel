# Character State（人物状态与弧光）

## CharacterStateLedger

按人物记录跨章节状态：所处 chapter、目标（goal）、行动力（agency）、与关键他人的关系状态、情绪状态、维度变化（characterFrom/characterTo，来自 unified event 的 characterDimension 变化）。

用途：draft 前读当前状态，draft 后写状态变化；检查"人物在全书的行为轨迹一致"。

## CharacterArcTrajectory

把人物"学到什么"当作轨迹：每章记录 lesson 相关维度变化与 agency 走势。弧光 = 多次维度变化形成的方向，不是单章情绪。

## 检查码

- `CHARACTER_RELEARNS_SAME_LESSON`：同一 lesson 已学到（维度变化）后 agency 又跌回（≥2），说明人物被重置、弧光倒退。修法：要么让倒退有原因（new pressure），要么删掉重复的"学习"事件。
- `CHARACTER_GOAL_DISAPPEARS`：人物 goal 连续 ≥10 章未在事件中出现。修法：让目标重新进入场景，或明确目标已被放弃（写放弃事件）。
