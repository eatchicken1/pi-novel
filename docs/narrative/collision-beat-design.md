# Collision Beat Design（Round 6）

## 从统计到质量

旧版只统计「一个事件有两个以上引擎 delta」。Round 6 区分四种碰撞：

- Type A Co-occurrence：同事件碰巧有两条线（「她调查案件，回家又跟丈夫吵了一架」）；
- Type B Causal：A 引擎的结果直接导致 B 引擎变化（「她依法调取的材料证明丈夫家族早已知情，丈夫随即要求她撤回调查」）；
- Type C Dilemma：一个选择无法同时满足两个引擎；
- Type D Identity：职业身份/婚姻身份/女性主体身份冲突。

## 判定

- 模型在 design.collisionAnalysis 中声明每个碰撞事件的类型与理由（引擎、rationale）；
- 无声明时使用确定性启发：职业观察桥接线索（observation mysteryClueId ↔ mystery refs）计为 causal；
- 大量碰撞是 co-occurrence（或大量碰撞未做分析）→ COLLISION_SHALLOW（warning）。

强碰撞示例（基准作品事件 1）：职业观察直接产出线索 C1，同时该动作触发丈夫「要求放弃调查」的关系冲突——一个动作同时推进线索、职业风险与婚姻控制。
