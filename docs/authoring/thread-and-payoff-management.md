# Thread & Payoff Management（Round 10）

## NarrativeThreadLedger（叙事线程）

线程 = 跨章节承诺（调查线、关系线、职业线、追妻线）。`{ id, kind, importance: major|minor, openedChapter, lastAdvancedChapter, expectedHorizon, status: open|advanced|closed|abandoned-intentionally, sourceRefs }`。

生命周期：opened（summary.threadsOpened / 事件）→ advanced（threadsAdvanced）→ closed（threadsClosed 或 harm 修复）。harm 线程经 repair 台账关闭：repairHarmMap 把 repairId 映射回 harmId，关闭 `harm-<harmId>`。

## SetupPayoffLedger（伏笔-兑现）

`{ id, importance, setupChapter, payoffStatus: pending|paid, payoffChapter?, sourceRefs }`。setup 来自 summary.setups 与事件；payoff 在 summary.payoffs 声明（标记 paid）。

## 检查码

线程：
- THREAD_RESOLVED_WITHOUT_CAUSE：关闭无原因事件；
- THREAD_DROPPED：major 线程 ≥8 章无推进；
- THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE：超过 expectedHorizon 未推进；
- TOO_MANY_DORMANT_THREADS：同时 >5 条休眠（≥6 章）线程；
- MAIN_THREAD_DISAPPEARS：主线缺席 ≥ 半本书。

伏笔：
- SETUP_NEVER_USED：全书结束未兑现；
- SETUP_FORGOTTEN_TOO_LONG：major setup 闲置过久（作者遗忘信号）；
- 定稿阻断 MANUSCRIPT_DANGLING_SETUP：major setup 超过 12 章未 payoff。

## 写作规则

- 每章 summary 如实声明 threadsOpened/Advanced/Closed 与 setups/payoffs——它们是台账派生的声明源；
- 主动放弃的线程写 `abandoned-intentionally` 并给读者交代（换线或明示）；
- payoff 必须改变状态（知识/关系/风险），否则无效兑现；
- 节拍建议见 novel-long-form 技能 long-form-pacing.md。
