# Mystery Truth：Truth Claim DAG

## 结构

`MysteryCase`：centralQuestion（一个可以追问到底的核心问题）、truthSummary（作者一句话真相）、truthClaims（真相声明集合）、finalAnswerClaimIds（最终答案声明）、socialCore（社会派根基）。

每条 `TruthClaim`：id、statement（一句话事实断言）、category（identity/event/timeline/motive/method/access/concealment/institutional/relationship/other）、dependsOnClaimIds（前置声明，允许空）、proofRequirement（证明它需要什么）、supportingClueIds（支撑线索）、plannedRevealChapter（可选计划揭示章）、importance（1—5）。

## 规则

1. claim id 全篇唯一；finalAnswerClaimIds 必须引用存在的声明。
2. dependsOnClaimIds 不得成环；依赖声明不应在逻辑上晚于其上层证明（揭示顺序由 plannedRevealChapter 表达，不机械锁死）。
3. 最终答案或 importance ≥ 4 的声明必须有至少一条支撑线索；低重要性声明可以暂时没有线索，但揭示时必须由其他声明或线索承接。
4. truthSummary 是作者秘密：读者在揭示前不能直接获得，只能通过线索与解释推导。
5. 复杂真相不是一句话：把“谁、何时、如何、为什么、被谁掩盖、制度如何配合”拆成互相依赖的声明，而不是一个大字符串。
6. 计划揭示章只是规划提示，不是硬性节奏公式；checker 不要求固定 reveal order。
