# Story Direction Exploration（Round 8）

## 解决的问题

用户只有一个 premise / seed / hook 时，模型不再需要“一次性构造完整 StoryConcept”。先探索多个真正不同的故事方向，再比较、选择、构建概念。

## 候选结构

StoryDirectionCandidate：id / logline / centralMystery / socialMechanism / protagonistGoal / protagonistBlindSpot / relationshipFaultLine / spouseCoreBelief / professionalDependency / centralDilemma / majorCost / climaxIdea / endingShape / distinctiveMechanism / majorRisks[]。

候选必须在多个核心维度上真正不同：mystery mechanism、social mechanism、relationship fault line、professional dependency、ending logic、antagonist structure、protagonist mistake。

## 伪候选拒绝

“丈夫家族骗保 / 丈夫父亲骗保 / 丈夫哥哥骗保”只换人名不是三个方向。checker 对 6 个核心维度（centralMystery / socialMechanism / relationshipFaultLine / professionalDependency / endingShape / centralDilemma）统计差异维度；少于 3 个 → STORY_DIRECTIONS_TOO_SIMILAR（blocker）。语义相似度由模型在 comparison 的 reason 中说明（semantic review + 结构字段差异共同判断）。

## 比较

StoryDirectionComparison：按维度（genrePromise / mysteryPotential / socialDepth / relationshipDepth / professionalNecessity / heroineAgency / collisionPotential / midLengthSuitability / endingPotential / genericRisk）输出 stronger / comparable / weaker / risk + reason；recommendedCandidateIds 给出系统推荐。不使用伪精确分数。

## 选择语义

- 作者明确选择：develop_story_concept 传 selectedDirectionId + selectionConfirmation: USER_CONFIRMED → story-directions.json 记录 selection（selectedCandidateId / authorNote / selectedAt / confirmation）；
- 系统推荐：SYSTEM_RECOMMENDED → 只形成 proposed selection + warning；绝不伪造作者确认；
- 被淘汰候选不写入 canon；StoryConcept 引用 selectedDirectionId。

## 生命周期

work/authoring/story-directions.json 保存 candidate set + comparison + selection（作者私有，reader-sim 不读取）。无 concept 且存在 directions 时 workflowPhase 为 direction。

## 工具

explore_story_directions（新）：seed + candidates(min 3) + comparison?。后续仍用 develop_story_concept 构建概念。
