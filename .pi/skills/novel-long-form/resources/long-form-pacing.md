# Long-Form Pacing（长篇节奏）

## 线程节拍

- major 线程推进间隔 ≤ expectedHorizon（一般 4-6 章）；超过即 THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE。
- 同时开着的 active 线程 ≤ 4-5 条；休眠（≥6 章无推进）线程 ≤ 5 条，否则 TOO_MANY_DORMANT_THREADS。
- 主线缺席 ≥ 半本书 = MAIN_THREAD_DISAPPEARS：主角弧光会被旁支吞掉。

## 伏笔节拍

- major setup 在 12 章内必须 payoff 或明示延后（MANUSCRIPT_DANGLING_SETUP 是定稿阻断）。
- payoff 要有因果重量：改变知识/关系/风险，否则无效兑现。

## 重复信号（repetition signals）

- wrong-pursuit 追妻戏码 ≥3 次 → REPEATED_PURSUIT_PATTERN：换进攻方式或让阻力升级。
- 纯发现型事件 ≥6 个 → REPEATED_DISCOVERY_PATTERN：调查流沦为"发现-汇报"，必须加决策与代价。
- 同类章节收尾 ≥4 章 → REPEATED_CHAPTER_ENDING：出口压力类型轮换（悬念/情感/职业/关系）。
- 后半程情绪标签密度比前半程高 ≥0.4 → VOICE_DRIFT：克制现实主义漂移成情绪化，检查风格一致性。

## 结构节奏

- 每 act 至少一次 status quo 冲击（关系、职业、调查任一层）；
- 后半程要比前半程"收"：线索归拢、线程并线、伏笔密集兑现，而不是继续开新线；
- 章节出口压力类型轮换，避免同一悬念手法连续使用。
