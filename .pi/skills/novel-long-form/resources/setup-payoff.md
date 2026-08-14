# Setup & Payoff（伏笔与兑现）

## SetupPayoffLedger

setup：`{ id, importance, setupChapter, payoffStatus: pending|paid, payoffChapter?, sourceRefs }`。setup 来自 summary.setups 与事件；payoff 来自 summary.payoffs（标记 paid）。

## 检查码

- `SETUP_NEVER_USED`：全书结束时 setup 从未兑现。
- `SETUP_FORGOTTEN_TOO_LONG`：major setup 闲置过久（作者遗忘信号）。
- 定稿阻断：`MANUSCRIPT_DANGLING_SETUP`：major setup 超过 12 章未 payoff（finalize_manuscript_unified 阻断项）。

## 写作规则

- setup 必须能指回"当时为什么值得记住"：高 importance 的 setup 要有因果重量，不是随意细节。
- payoff 章在 summary.payoffs 声明，并让 payoff 反过来改变状态（知识/关系/风险），否则是无效兑现。
- 双章审计：finalize 时查 pending 数量，过长未收的在后续章节排 payoff 或明示放弃。
