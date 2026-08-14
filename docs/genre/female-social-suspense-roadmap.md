# Female Social Suspense 路线图

## Round 1 完成（架构阶段）

Story DNA / Capability 解耦：primaryGenre = female-social-suspense 可保存并与 chase-wife mechanism 组合；capability resolution 集中实现；legacy genre 兼容。

## Round 2 完成（Mystery Truth & Information Engine）

Mystery Engine 已落地，见 `docs/genre/female-social-suspense-mystery-engine.md`：

- Truth Claim DAG（truth model，proposed/confirmed 生命周期，canon/mystery/truth-model.json）；
- Observable Evidence / Clue ledger（outline/mystery/clue-ledger.json，observableFact ≠ interpretation，red-herring 公平性硬门）；
- Suspect model（motive/means/opportunity/access 与 actualRole/privateSecret 分离）；
- Information state（按章 checkpoint：knows/suspects/believes，KNOW ≠ SUSPECT）；
- Social Core（socialQuestion / institutionalContext / beneficiaries / costBearers / stakesBeyondRelationship）；
- 确定性 checker：`check_mystery_design`（引用/环/时序/红鲱鱼/信息边界/社会派根基）与 `check_mystery_fairness`（supported/unsupported final claims、clue coverage、DEUS_EX_MACHINA_CLUE、REVEAL_BEFORE_PROOF）；
- author-secret 隔离：reader-sim 不读取 canon/mystery（测试固化）；
- 本轮为 planned 公平性；realized（正文锚点）证据生命周期留待 Round 3。

## 当前状态

- female-social-suspense + chase-wife 组合可用：mystery 与关系机制两组工具并行，正文仍走 Chase Wife event-level pipeline；
- 尚未实现：realized/finalized fairness、Mature Marriage Engine、职业写实库、双引擎事件流水线、多样性检查器、基准作品。

## Phase 2（主体完成，剩余 realized 证据）

Mystery Engine 主体已实现（见上）。剩余：

- realized 证据生命周期：clue 正文锚点绑定、`realizedChapter` 落地检查、finalized fairness（正文是否真正兑现 planned 线索）；
- 调查因果工具：调查动作 → 信息/风险变化（可并入 Phase 5 双引擎事件）；
- 模型语义层：解释合理性、动机可信度的语义报告。

## Phase 3：Mature Marriage Engine

目标：熟龄婚姻危机作为独立 relationship mechanism（`mature-marriage-crisis`）。

- 婚姻台账：长期责任、经济共同体、子女/父母压力、情感债与信任账；
- 与 chase-wife 的差异：不是“撤回供给—追逐—修复”的线，而是“共同债务—破裂—责任重分配”；
- 与 chase-wife 机制可共存于同一项目的组合规则与优先级。

## Phase 4：Professional Domain Engine

目标：职业写实与专业因果。

- professionalDomain 注册表（首期：insurance-fraud-investigation：核保、理赔调查、反欺诈流程、证据链）；
- 职业动作 → 信息/风险变化工具；
- 专业术语与行业事实的可验证性检查。

## Phase 5：Dual-engine Story Structure

目标：主题材引擎（mystery）与关系机制引擎（chase-wife / mature-marriage）在同一事件地图上的编排。

- 事件同时携带 mystery delta 与 relationship delta；
- 双引擎门禁组合：真相揭示顺序与关系结局资格互不绕过；
- 章节/全篇 pacing 扩展为双维度。

## Phase 6：Distinctiveness Checker

目标：避免“换皮”同质化。

- 参考文机制去重：触发器组合、职业现场、关系路径的相似度检查；
- 与既有 anti-slop / AI-artifact 门禁合并为题材层差异化门。

## Phase 7：Benchmark Novel

目标：用组合架构完成一部基准作品（不复制参考文）。

- 女性社会派悬疑 × 熟龄婚姻 × 保险欺诈调查；
- 全流程走通：story profile → planning → event pipeline → finalize → manuscript；
- 与既有 chase-wife 基准对照，验证组合不降门禁。
