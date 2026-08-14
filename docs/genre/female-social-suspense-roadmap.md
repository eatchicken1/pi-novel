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
- 本轮为 planned 公平性。

## Round 2.5 完成（Proof & Fairness Hardening）

- Proof Path：TruthClaim 证明 = 多条路径 OR，单条路径 = clue AND 前置 claim；supportingClueIds 降为 legacy 兼容字段，checker 统一按 NormalizedProofPath 计算；
- 可见性三态：firstAvailableChapter（世界）/ heroineDiscoveryChapter（女主发现，legacy intendedDiscoveryChapter）/ readerRevealChapter（读者曝光）；fairness 只认读者曝光；
- 派生声明：仅依赖前置 claim 的证明路径合法，direct clue 不是唯一知识来源；
- 角色私有知识：characterKnowledge 不再套用 heroine/reader 证据门禁（凶手可因参与而提前知道）；
- 双向引用一致性：CLAIM_REFERENCES_MISSING_CLUE / CLAIM_CLUE_LINK_MISMATCH；
- RED_HERRING_INTERPRETATION_EQUALS_ACTUAL；FAIRNESS_UNVERIFIABLE 真实实现（揭示章不可确定 → needs-work，不再猜测）；
- reader-sim 硬隔离：addFile 层过滤 canon/work/outline 的 mystery 路径；
- plannedRealizationChapter 仅表计划；真正正文兑现证据（MysteryClueRealizationEvidence）属 Phase 5。

## Round 2.6 完成（Mystery correctness closure）

- audience 拆分：reveal-before-proof 按 reader/heroine 分别验证，互不替代；
- 环检测基于 union(dependsOnClaimIds, proof prerequisiteClaimIds)；DUPLICATE_PROOF_PATH_ID；
- proofPaths 显式 [] 是权威（无证明路径），undefined 才回退 legacy supportingClueIds；
- READER_EXPOSURE_BEFORE_WORLD_AVAILABILITY（world <= reader 硬约束）；reader < heroine 合法；
- proofCoverage 报告（completePaths/directClueIds/transitiveClueIds），派生 final claim 不再显示 0/0；
- reader-sim 私有路径判定统一反斜杠并按 author-private roots 匹配（Windows 路径同样生效）。

## Mystery planning 冻结

不再继续扩展 Mystery planning schema，除非后续测试发现 bug。finalized clue realization 属 Phase 5（Unified Narrative Event Integration）。

## Round 3 完成（Mature Marriage Crisis Structural Entanglement Engine）

- 机制值 mature-marriage-crisis + hasMatureMarriageCapability（hasRelationshipMechanism 统一入口）；
- Marriage Structure（economicItems/responsibilities/decisionRights/socialTies/inertiaFactors/exitConstraints）+ Restructuring Plan（resource/responsibility/decisionRight/socialTie changes + constraintResponses）；
- check_mature_marriage_structure / check_mature_marriage_restructuring（结构/引用/来源/厚度/照护不对称/责任不消失/约束响应/stayingLogic 对齐）；
- Structure ≠ Harm 硬边界：不自动创建 Chase Wife harm；CARE_LOAD_ASYMMETRY 仅 warning；
- reader-sim 隔离扩展 marriage author-private roots（Windows 路径安全）；
- Skill：mechanism-mature-marriage-crisis + 4 resources；文档：docs/relationship/mature-marriage-crisis-engine.md；
- 本轮为 planning structure，无正文 pipeline、无法律引擎。

## Round 4：Professional Domain Engine

首个 domain：insurance-fraud-investigation。规划项：professional role、authority boundary、workflow、evidence source、professional action、professional constraint、conflict of interest、ethics、escalation、professional consequence。

## 当前状态

- female-social-suspense + chase-wife 组合可用：mystery 与关系机制两组工具并行，正文仍走 Chase Wife event-level pipeline；
- 尚未实现：realized/finalized fairness、Mature Marriage Engine、职业写实库、双引擎事件流水线、多样性检查器、基准作品。

## Phase 2（主体 + Round 2.5 硬化完成）

Mystery Engine 的 planned 层已完整（truth/proof/clue/red-herring/suspect/information/fairness）。剩余：

- 模型语义层：解释合理性、动机可信度的语义报告；
- 调查因果工具：调查动作 → 信息/风险变化（并入 Phase 5 双引擎事件）。

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

## Phase 5：Unified Narrative Event Integration

目标：主题材引擎（mystery）与关系机制引擎（chase-wife / mature-marriage）在同一事件地图上的编排，并落地 finalized 线索兑现。

- 事件同时携带 mystery delta 与 relationship delta；
- 双引擎门禁组合：真相揭示顺序与关系结局资格互不绕过；
- planned clue → event → prose evidence → finalized clue realization（MysteryClueRealizationEvidence 正文锚点绑定）→ finalized fairness；
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
