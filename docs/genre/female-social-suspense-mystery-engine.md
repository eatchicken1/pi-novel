# Female Social Suspense Mystery Engine（Round 2）

## 1. Truth / Evidence / Interpretation / Knowledge / Proof 五层模型

Mystery Engine 明确区分五层，禁止压成“clue = 某个字符串”：

```text
AUTHOR TRUTH：作者知道的真相（TruthClaim DAG）
↓
OBSERVABLE FACT：正文世界里真实存在的可观察事实（MysteryClue.observableFact）
↓
INTERPRETATION：同一事实的多种合理解释（interpretationOptions；红鲱鱼必须有合理错误解释）
↓
KNOWLEDGE / BELIEF：谁在什么时刻知道/怀疑/相信什么（MysteryInformationCheckpoint：knows/suspects/believes）
↓
PROOF / REVELATION：从怀疑升级到证明与最终揭示（finalAnswerClaimIds + plannedRevealChapter）
```

## 2. Truth Claim DAG

`MysteryCase`：centralQuestion + truthSummary + truthClaims[] + finalAnswerClaimIds[] + socialCore。每条 `TruthClaim`：id、statement、category（identity/event/timeline/motive/method/access/concealment/institutional/relationship/other）、dependsOnClaimIds（允许空，不得成环）、proofRequirement、supportingClueIds、plannedRevealChapter（可选）、importance（1—5）。

- claim id 唯一；dependsOn 无环（TRUTH_CLAIM_CYCLE 是 error）；finalAnswerClaimIds 必须存在（INVALID_FINAL_ANSWER_CLAIM）；最终答案或 importance ≥ 4 必须有证明路径（UNSUPPORTED_CRITICAL_TRUTH）；
- 揭示顺序由 plannedRevealChapter 表达但不机械锁死；依赖声明不应晚于其上层证明（CLUE_APPEARS_AFTER_CLAIM_REVEAL 为 warning）。

## 3. Red Herring 公平性

Red Herring = 真实 observable fact + 合理但错误的 interpretation + actualImplication。

- RED_HERRING_WITHOUT_FACTUAL_BASIS（error）：red-herring 缺少错误解释、misleadingInterpretation 或实际含义（schema 已要求 observableFact 非空）；
- RED_HERRING_INTERPRETATION_EQUALS_ACTUAL（error）：misleadingInterpretation 与 actualImplication 完全相同（“误导解释”实际不是误导）；
- DEUS_EX_MACHINA_CLUE（error）：最终答案的全部支撑线索在揭示章才第一次出现（公平性要求 firstAvailableChapter < revealChapter）；结局允许 confirmation evidence，但核心推断事实不能全部最后才给。

## 4. Suspect Model

`MysterySuspect`：id、characterId?、publicRole、relationshipToCase、motive?/means?/opportunity?/access?、publicStory、privateSecret?、actualRole（culprit/accomplice/beneficiary/witness/concealer/red-herring/innocent/unknown）、knowledgeClaimIds、supportingClueIds、exculpatoryClueIds。

- motive/means/opportunity 不与 culprit 等价；culprit 必须存在证据路径（CULPRIT_WITHOUT_EVIDENTIARY_PATH，error）；
- innocent/red-herring 掌握最终答案声明是结构可疑（INNOCENT_KNOWS_FINAL_ANSWER，warning）。

## 5. Information State

`MysteryInformationCheckpoint`（按章）：heroine/reader/characterKnowledge 各自的 knows/suspects/believes + newlyAvailableClueIds。

- KNOW ≠ SUSPECT ≠ BELIEVE：checker 只对 knows 检查可证明性（M8 场景通过）；
- INFO_KNOWLEDGE_BEFORE_SOURCE（error）：heroine/reader 在“任何一条完整证明路径对该受众可见”之前知道声明（direct clue 不是唯一知识来源，派生声明经前置声明推导合法）；
- 角色私有知识（characterKnowledge）只验证引用与顺序，不套用 heroine/reader 的证据门禁——凶手可以因亲自实施行为而提前知道真相（P4 场景）；
- INFO_IMPLAUSIBLE_CHRONOLOGY（error）：检查点章节回退；
- 语义合理性（解释是否合理、动机是否可信）留给后续模型语义报告，不用关键词正则伪装。

## 6. Social Core

`MysterySocialCore`：socialQuestion、institutionalContext、powerAsymmetry、beneficiaries、costBearers、stakesBeyondRelationship。

- MISSING_SOCIAL_QUESTION（error）：案件必须存在关系线之外的社会问题；
- MISSING_STAKES_BEYOND_RELATIONSHIP（warning）：利害不能全是婚恋线。

## 7. Author Secret Boundary

作者秘密 = truth model（truthSummary/truthClaims/proofPaths）、suspect 的 actualRole/privateSecret、clue 的 actualImplication。

- 文件：canon/mystery/truth-model.json、canon/mystery/suspect-model.json（confirmed）；work/mystery/*-proposed.json（候选）；
- read_story_context：planning/chapter-writing/continuity-review 可读；reader-sim 默认只读 project + summaries，绝不读取 canon/mystery（M9 测试固化）；
- 不含 female-social-suspense primaryGenre 的项目不读取 mystery 内容（M10 测试固化）。

## 8. Generic clue ledger 与 Mystery ledger 的关系

架构决定：**通用 ledger 保持兼容，mystery ledger 负责悬疑特有语义，不互相覆盖。**

| 台账 | 路径 | 负责 | source of truth |
| --- | --- | --- | --- |
| 通用 clue ledger（update_clue_ledger / unresolved-clues.json） | continuity/unresolved-clues.json + work/facts/clues-candidate.json | 所有类型通用的伏笔/线索跟踪 | 通用类型项目 |
| 通用 foreshadowing | outline/foreshadowing-ledger.json | 铺垫回收 | 通用类型项目 |
| Mystery clue ledger（save_mystery_clue_ledger） | outline/mystery/clue-ledger.json | 悬疑特有：observableFact/interpretation/red-herring/truthClaimIds/firstAvailableChapter | female-social-suspense 项目 |

Mystery 项目允许两个 ledger 并存：mystery ledger 管真相支撑语义；通用 ledger 若被使用，只记录“该线索在正文中出现过”的跟踪，不重复真相语义。若同一事实两边都记，以 mystery ledger 的 truthClaimIds 为准，通用 ledger 仅作出现位置索引（后续轮次可做自动同步）。

## 9. planned vs realized

本轮只实现 **planned** 公平性：checker 检查设计图（线索可用章、揭示章、信息检查点）是否公平，不检查正文是否真的兑现。

- MysteryClue.plannedRealizationChapter 表达“计划落地正文的章”（计划语义）；
- 真正的正文兑现必须使用 MysteryClueRealizationEvidence（chapter/eventId?/draftRevision/startChar/endChar/excerpt/contentHash），属 Phase 5 Unified Narrative Event Integration；本轮不实现 finalized fairness，不伪造没有正文锚点的兑现。

## 10. 与 Chase Wife 的组合边界

- 两组工具并行可用（M12 测试）；read_story_context 同时加载双方内容且互不覆盖；
- 不建立第二套事件流水线：正文仍由 Chase Wife event-level pipeline 管理（含 chase-wife mechanism 时）；
- Chase Wife heroine/male arc 不加入 mystery 值（investigation/clue/truth 不进关系弧线）；
- Mystery 与 Relationship 本轮保持正交，Phase 5 再解决如何把 mystery delta 与 relationship delta 挂到同一 narrative event。

## 11. 当前没做什么

- 未实现正文锚点证据生命周期（realized/finalized fairness，Round 3）；
- 未实现 Mature Marriage Engine、保险职业写实库、完整 Social Reality Engine；
- 未实现双引擎事件流水线（Phase 5）；
- 未做多样性检查器（Phase 6）与基准作品（Phase 7）；
- 未修改 Chase Wife 弧线与 API 命名。


## 13. Round 2.5：Proof Path 与读者公平性硬化

### Proof Path（证明路径）

TruthClaim 的证明不再用 supportingClueIds.length > 0 近似，而是结构化 TruthProofPath：

- Claim 的证明 = 多条 Proof Path 的 OR；
- 单条 Path = 所有 clue AND 所有前置 claim 的 AND；
- 例：T5 可被 P1 = C1 AND C2 AND C3 AND T2 或 P2 = C8 AND C9 证明；
- legacy supportingClueIds（+ dependsOnClaimIds）在读取时归一化为单条路径；proofPaths 存在时是权威（兼容策略见下）。

### 可见性三态（world / heroine / reader）

- firstAvailableChapter：证据在故事世界里最早可能被取得；
- heroineDiscoveryChapter（legacy：intendedDiscoveryChapter）：女主实际获得此线索的时间；
- readerRevealChapter：读者第一次看到此线索的章节；缺失时回退到 heroine 可见章（heroine-first-person 默认，文档化）。

### 公平性算法（reader proof availability）

final claim 在揭示前公平 ⟺ 至少一条完整 Proof Path 的：

- 所有 clue 在 readerRevealChapter 维度对读者可见（visible < revealChapter）；
- 所有前置 claim 在该时间点也可证明（递归 isClaimProvable，环由 design checker 报告）。

禁止用 firstAvailableChapter 冒充 reader 时间；揭示章缺失时输出 FAIRNESS_UNVERIFIABLE（warning，verdict = needs-work），不再猜测 latestCheckpointChapter。

### 兼容策略

- proofPaths 是证明的权威来源；supportingClueIds 保留为 legacy 兼容字段；
- checker 内部统一转换为 NormalizedProofPath[]，之后只使用 Proof Path 计算；
- 双向引用一致性：claim 证明引用不在 clue.truthClaimIds 里的线索 → CLAIM_CLUE_LINK_MISMATCH（error）；clue 声称支撑但无任何 proof path 引用的 claim → 同 code warning（red-herring 豁免）。

### planned 边界

本轮仍只做 planned fairness；finalized（正文锚点兑现）属 Phase 5。
## 14. Round 2.6：Mystery correctness closure

### audience-specific knowledge validation

reveal-before-proof 检查按受众拆分：checkpoint.reader.knows 只接受 reader 可证明（isClaimProvable(..., "reader")），checkpoint.heroine.knows 只接受 heroine 可证明；reader 的越界不得被 heroine 的证明能力放行，反之亦然。REVEAL_BEFORE_PROOF 的 message 明确写出越界的是 reader 还是 heroine。

### dependency graph union

Truth dependency graph = union(dependsOnClaimIds, 所有 proofPath.prerequisiteClaimIds)。dependsOnClaimIds 是显式元数据，证明前置同样构成依赖边：环检测（TRUTH_CLAIM_CYCLE）基于合并后的图；isClaimProvable 的递归访问保护与之一致。不需要模型手工维护两份完全一致的数组。

### explicit proofPaths semantics

proofPaths !== undefined（包括显式 []）时是唯一权威：[] 表示作者明确配置"无证明路径"，不允许再回退 legacy supportingClueIds（否则 critical/final claim 报 UNSUPPORTED_CRITICAL_TRUTH）。只有 proofPaths === undefined 时才从 supportingClueIds + dependsOnClaimIds 归一化（legacy 兼容）。

### world / heroine / reader temporal constraints

- world <= heroine：firstAvailableChapter 不得晚于发现章（INVALID_REVEAL_TIMING）；
- world <= reader：readerRevealChapter 不得早于 firstAvailableChapter（READER_EXPOSURE_BEFORE_WORLD_AVAILABILITY，error）；resolveClueVisibility 同时做 max(firstAvailable, declared) 保守计算，但配置错误必须显式报告，不用 silent clamp 掩盖；
- heroine < reader 与 reader < heroine 都合法（未来允许 split POV / 文档直呈 / 其他角色场景）。

### proof coverage report

check_mystery_fairness 新增 proofCoverage：{ [claimId]: { completePaths, totalPaths, directClueIds, transitiveClueIds } }。transitiveClueIds 递归收集 truth dependency（dependsOn + proof prerequisite）的证明线索；纯派生 final claim 不再显示误导性的 0/0。legacy clueCoverage 保留为兼容字段（仅 direct 覆盖，文档说明局限）。

### planned fairness only

本轮仍只做 planned fairness：MysteryClueRealizationEvidence 只是 Phase 5 contract type，checker 不使用；plannedRealizationChapter 不是正文兑现证据。

## 12. Phase 3 接口

Phase 3（Mature Marriage Crisis Engine）将新增 mechanism 值 mature-marriage-crisis 及其台账/门禁，复用：

- story-profile capability resolution（hasRelationshipMechanism）——机制值注册即可，不改主题材逻辑；
- 与 mystery 相同的 proposed/confirmed 生命周期与 read_story_context 按任务加载模式；
- 与 chase-wife 相同的“机制不污染其他项目”门禁模式（ensure<Mechanism>Project + capability gate）。

本轮不实现 Phase 3 的任何功能。
