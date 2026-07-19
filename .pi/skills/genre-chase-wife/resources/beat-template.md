# 追妻文 Beat 模板

## 项目级开篇合同

```text
openingMode: cold-conflict | result-first | exit-in-progress | quiet-dislocation
openingIntro: 所有 openingMode 均必填，60—140 个非空白字符的女主第一人称短引言；只填正文，不填标题
openingConflict: 250 字内可验证的具体冲突；第一章 openingConflictMarker 必须出现在短引言正文中
povMode: heroine-first-person | split-pov
stayingLogic: emotionalReason / falseBelief / sustainingEvidence / breakingThreshold / optional materialReason / optional socialReason / optional familyReason / optional careerReason
heroineArc: injury → recognition → micro-withdrawal → boundary-test → irreversible-exit → self-rebuild → final-boundary
maleArc: entitlement → loss-of-control → wrong-pursuit → real-consequence → recognition → respect-or-failure
```

每个 Beat 填写：

```text
beat / heroinePhase / malePhase / targetTrack / paywallHook / sceneCount
goal / conflict / actionOrConsequence
emotionBefore / emotionAfter / emotionStack
painPoint / rewardPoint / hook
```

前半段具体化伤害和女主退出理由，后半段展示男方错误追逐、现实后果、具体认知、修复成本和女主新秩序。不要把 `paywallHook` 当作故事阶段。

## 章节事件地图

每章 3—6 个事件，长度使用 `flash=60—180`、`bridge=100—250`、`standard=220—450`、`anchor=450—850`。

```text
eventId / role / scene / pov / targetTrack / paywallHook / beatRefs
causes / injuryMechanism
informationDelta / relationshipDelta / resourceDelta / riskDelta
heroineAgencyBefore / heroineAgencyAfter / irreversible / cannotRemoveBecause
lengthMode / minChars / maxChars
eventDescription / function / goal / conflict
actionOrConsequence / protagonistReaction / oppositionReaction
informationChange / emotionBefore / emotionAfter / physicalReaction
setupOrPayoff / readerRelease / entryHook / exitHook
```

组装结果必须按 `# 引言` → 引言正文 → `# 第一章` → 第一章事件正文输出。第一章第一个事件的角色按 openingMode 匹配：`cold-conflict` 使用 `opening-injury` 或 `preference-exposure`，`result-first` 使用 `decision` 或 `irreversible-exit`，`exit-in-progress` 使用 `irreversible-exit`，`quiet-dislocation` 使用 `opening-injury`。该事件承接引言并继续制造冲突。后续章节从上一章出口钩子或当前冲突切入，不重复引言。事件地图只用于规划和审查，正文不能输出字段名。

## 最低结构要求

- 每个事件至少改变两项信息、关系、资源、风险或主动权，或产生不可逆行动、现实后果或铺垫回收。
- 女主在 `irreversible-exit` 前至少有两次主动权升级。
- 男方 `recognition` 必须晚于 `real-consequence`。
- 每个事件必须引用有效 Beat；全篇所有 Beat 至少被一个事件兑现。
