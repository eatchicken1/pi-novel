# Ending Backward Design（Round 8）

## 解决的问题

Round 7 的 develop_story_bible / design_story_architecture 把 Ending 当作最后才填的字段。Round 8 把 Ending 提前：在完整 architecture 之前先确定故事最终必须结算什么，再反向约束前文。

## EndingArchitecture

mysteryResolution / heroineResolution / marriageResolution / chaseResolution? / professionalResolution / socialResolution? / costDistribution / unresolvedResidue[] / finalImageOrState / requiredPrerequisites[] / climaxChoice?。

- climaxChoice：protagonistChoice / options / costOfEach / informationRequired / professionalConstraint? / relationshipConsequence? / socialConsequence? / irreversibleResult。高潮需要女主选择，不能只等别人供认。

## Backward 链条

Ending ← Climax ← Required Choices ← Required Knowledge ← Required Costs ← Required Setup。

## Prerequisite 回推

每个重大 ending payoff 必须能回推“它之前需要什么”。requiredPrerequisites 每项：payoffRef / prerequisite / satisfiedByMovementId。

- 缺失 satisfiedByMovementId，或落点不在 movement 集合 → ENDING_PAYOFF_UNEARNED（error）。
- 示例：丈夫最终公开承担家族责任，需要 earlier belief → pressure → failed pursuit → real consequence → recognition → opportunity to choose。

## 存储

work/authoring/ending-architecture.json（foundation 阶段可写；design_story_architecture 也可提交/更新）。属于 design layer，不是新的 ending authority（最终 ending 结算仍由 chase-wife ending contract / ending settlement 等 authority 约束）。

## 与现有 authority 的关系

Ending Architecture 是设计层 proposal；它反向约束 architecture；但修改核心 Ending Contract 仍必须走对应 authority（revise_story_architecture 会拦截 FOUNDATION_REVISION_REQUIRED）。
