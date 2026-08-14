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

- claim id 唯一；dependsOn 无环（TRUTH_CLAIM_CYCLE 是 error）；finalAnswerClaimIds 必须存在（INVALID_FINAL_ANSWER_CLAIM）；最终答案或 importance ≥ 4 必须有支撑线索（UNSUPPORTED_CRITICAL_TRUTH）；
- 揭示顺序由 plannedRevealChapter 表达但不机械锁死；依赖声明不应晚于其上层证明（CLUE_APPEARS_AFTER_CLAIM_REVEAL 为 warning）。

## 3. Red Herring 公平性

Red Herring = 真实 observable fact + 合理但错误的 interpretation + actualImplication。

- RED_HERRING_WITHOUT_FACTUAL_BASIS（error）：red-herring 缺少错误解释或实际含义（schema 已要求 observableFact 非空）；
- DEUS_EX_MACHINA_CLUE（error）：最终答案的全部支撑线索在揭示章才第一次出现（公平性要求 firstAvailableChapter < revealChapter）；结局允许 confirmation evidence，但核心推断事实不能全部最后才给。

## 4. Suspect Model

`MysterySuspect`：id、characterId?、publicRole、relationshipToCase、motive?/means?/opportunity?/access?、publicStory、privateSecret?、actualRole（culprit/accomplice/beneficiary/witness/concealer/red-herring/innocent/unknown）、knowledgeClaimIds、supportingClueIds、exculpatoryClueIds。

- motive/means/opportunity 不与 culprit 等价；culprit 必须存在证据路径（CULPRIT_WITHOUT_EVIDENTIARY_PATH，error）；
- innocent/red-herring 掌握最终答案声明是结构可疑（INNOCENT_KNOWS_FINAL_ANSWER，warning）。

## 5. Information State

`MysteryInformationCheckpoint`（按章）：heroine/reader/characterKnowledge 各自的 knows/suspects/believes + newlyAvailableClueIds。

- KNOW ≠ SUSPECT ≠ BELIEVE：checker 只对 knows 检查证据来源（M8 场景通过）；
- INFO_KNOWLEDGE_BEFORE_SOURCE（error）：在最早支撑线索可用前知道声明；
- INFO_IMPLAUSIBLE_CHRONOLOGY（error）：检查点章节回退；
- 语义合理性（解释是否合理、动机是否可信）留给后续模型语义报告，不用关键词正则伪装。

## 6. Social Core

`MysterySocialCore`：socialQuestion、institutionalContext、powerAsymmetry、beneficiaries、costBearers、stakesBeyondRelationship。

- MISSING_SOCIAL_QUESTION（error）：案件必须存在关系线之外的社会问题；
- MISSING_STAKES_BEYOND_RELATIONSHIP（warning）：利害不能全是婚恋线。

## 7. Author Secret Boundary

作者秘密 = truth model、suspect 的 actualRole/privateSecret、clue 的 actualImplication。

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

- MysteryClue.realizedChapter 已预留（线索真正落地正文的章）；
- finalized prose evidence lifecycle（正文锚点绑定、realized 检查）为 Round 3 TODO，文档明确不做，不伪造没有正文锚点的 finalized fairness。

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

## 12. Phase 3 接口

Phase 3（Mature Marriage Crisis Engine）将新增 mechanism 值 mature-marriage-crisis 及其台账/门禁，复用：

- story-profile capability resolution（hasRelationshipMechanism）——机制值注册即可，不改主题材逻辑；
- 与 mystery 相同的 proposed/confirmed 生命周期与 read_story_context 按任务加载模式；
- 与 chase-wife 相同的“机制不污染其他项目”门禁模式（ensure<Mechanism>Project + capability gate）。

本轮不实现 Phase 3 的任何功能。
