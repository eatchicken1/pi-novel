---
name: novel-scene-writing
description: 如何把 Unified Event 变成真正有效的小说场景和正文：Scene Design（目标/阻力/策略/转折/状态变化/出口）、对话即行动、潜台词、情绪兑现、信息投放、职业细节、场景节奏、POV 控制、正文具体性。与具体 genre 无关的通用场景方法论；垂直领域场景知识由对应 genre skill 提供。
---

# Novel Scene Writing

## 加载条件

plan_chapter（sceneDesigns）/ draft_chapter / diagnose_chapter（scene+prose findings）/ revise_chapter（scoped prose revision）之前加载。

## 核心原则

1. Event ≠ Scene：一个 Event 可由一个 Scene 完成，也可跨多个 Scene；不创建第二 Event authority；
2. Scene 的价值来自目标、阻力、选择、变化——地点和人物不是 Scene Function；
3. Dialogue ≠ Information Delivery；对话首先是人物行动；
4. Emotion ≠ Emotion Label；情绪通过行为/选择兑现；
5. Subtext 不能机械要求每句都有；
6. Profession Detail 必须改变 decision/access/conflict/evidence/consequence；
7. Prose checker 不能把小说写成模板：deterministic 只查可确定的结构问题，文学判断交给 semantic review（diagnose_chapter 的 modelFindings）。

## Scene 结构

SceneDesign：scenePurpose（kind+description）/ eventIds / povCharacterId / location / time / entryState / focalCharacterGoal / opposingForce / stakes / tactic / beatPlan / informationPlan / professionalDetailBeats / turn / decisionOrDiscovery / stateChange / exitPressure / cannotRemoveBecause / mode（full-scene | compressed-scene | summary-transition）/ tensionSources / subtext（重要关系场景才用）。

- 目标必须具体：“调查案件”错；“逼丈夫明确回答他什么时候知道保单被改过”对；
- 阻力不能只是“对方不愿意说”；
- 重要场景必须有 turn（她想确认 A 却发现 B）；
- 场景结束必须改变 knowledge/belief/decision/relationship/risk/resource/authority/goal/strategy/emotion/question 之一；
- 低价值事件用 compressed/summary，重大事件不得 summary（SCENE_UNDERDRAMATIZED）。

## 长篇上下文（Round 10）

draft 前读当前知识/关系/物件状态（KnowledgeLedger / RelationshipStateSnapshot / NarrativeObjectLedger，经 compileAuthoringContext 编译）：场景内"谁知道什么"必须与台账一致，物件持有者不得与 OBJECT_HOLDER_CONTRADICTION 冲突；场景内状态变化（knowledge/belief/relationship/resource/object）要在 chapter summary 中如实声明，否则台账派生会漏。

## 资源导航

- scene-construction.md：目标/阻力/策略/beat
- scene-turns.md：turn / reversal / 状态变化 / entry-exit
- dialogue-as-action.md：speechIntent、问答模式、避免事务性对话
- subtext.md：surface vs underlying、行为证据、reader privacy
- emotional-rendering.md：felt emotion → shown behavior → decision effect
- information-delivery.md：投放方式、exposition 诊断、信息差
- professional-detail.md：职业细节进入行动与冲突
- scene-rhythm.md：场景模式、节奏、recovery、触发器重复
- pov-control.md：Observation ≠ Interpretation ≠ Truth、知识泄漏
- prose-specificity.md：具体细节、比喻、反模板（anti-purple / anti-minimalist）

垂直内容（女性社会派悬疑 / Chase Wife / 熟龄婚姻 / 保险反欺诈）见对应 genre skill，本 skill 不复制。
