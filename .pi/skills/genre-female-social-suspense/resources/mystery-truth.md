# Mystery Truth：Truth Claim DAG

## 结构

`MysteryCase`：centralQuestion（一个可以追问到底的核心问题）、truthSummary（作者一句话真相）、truthClaims（真相声明集合）、finalAnswerClaimIds（最终答案声明）、socialCore（社会派根基）。

每条 `TruthClaim`：id、statement（一句话事实断言）、category（identity/event/timeline/motive/method/access/concealment/institutional/relationship/other）、dependsOnClaimIds（前置声明，允许空）、proofRequirement（人类可读描述，不参与机械证明）、supportingClueIds（legacy 兼容字段）、proofPaths（权威证明路径，见下）、plannedRevealChapter（可选计划揭示章）、importance（1—5）。

## 规则

1. claim id 全篇唯一；finalAnswerClaimIds 必须引用存在的声明。
2. dependsOnClaimIds 不得成环；依赖声明不应在逻辑上晚于其上层证明（揭示顺序由 plannedRevealChapter 表达，不机械锁死）。
3. 证明使用结构化 `proofPaths`：Claim 的证明 = 多条路径 OR；单条路径 = 全部 clue AND 全部前置 claim。例：`P1 = C1 AND C2 AND T2` 或 `P2 = C8 AND C9` 均可证明 T5。最终答案或 importance ≥ 4 的声明必须有至少一条非空证明路径。
4. `supportingClueIds` 是 legacy 兼容字段（与 dependsOnClaimIds 一起归一化为单条路径）；`proofPaths` 存在时是唯一权威——包括显式 `proofPaths: []`（作者明确配置"无证明路径"，不得回退 legacy）。
5. 派生声明允许只依赖前置 claim（clueIds 为空但 prerequisiteClaimIds 非空），前提是前置声明可证明。
6. Truth dependency graph = union(dependsOnClaimIds, proofPaths.prerequisiteClaimIds)：dependsOnClaimIds 是显式元数据，环检测与传递线索收集都基于合并图，不要手工维护两份一致数组。
6. truthSummary / proofPaths 是作者秘密：读者在揭示前不能直接获得，只能通过线索与解释推导。
7. 复杂真相不是一句话：把“谁、何时、如何、为什么、被谁掩盖、制度如何配合”拆成互相依赖的声明，而不是一个大字符串。
8. 计划揭示章只是规划提示，不是硬性节奏公式；checker 不要求固定 reveal order。
