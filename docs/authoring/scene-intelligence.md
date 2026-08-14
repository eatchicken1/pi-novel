# Scene Intelligence（Round 9）

## 解决的问题

Story Architecture → Unified Event → Chapter Plan → Scene Contract → Event Draft → Assembly 已经成立，但 Scene Contract 仍偏结构描述，正文质量依赖模型自由发挥。Round 9 建立 Scene Intelligence：事件到底怎样变成真正有效的小说场景。

## Scene Design（planning artifact）

plan_chapter 内部：Chapter Plan → Scene Designs（`work/scene-designs/chapter-NNN.json`）→ Scene Contracts。SceneDesign 是 Chapter Planning 的展开层，不是 story authority。

要素：scenePurpose（kind+description）/ eventIds / povCharacterId / location / time / entryState / focalCharacterGoal / opposingForce / stakes / tactic / beatPlan（SceneBeat：actor/intent/actionType/action/response/informationChange/relationshipChange/emotionalShift/tacticChange/raisesQuestion/paysOffRef/speechIntent）/ informationPlan / professionalDetailBeats / turn / decisionOrDiscovery / stateChange / exitPressure / cannotRemoveBecause / mode / tensionSources / subtext。

## Scene 模式

full-scene / compressed-scene / summary-transition。低价值事件不撑 full scene（SCENE_OVEREXPANDED）；重大事件不得 summary（SCENE_UNDERDRAMATIZED）。

## Scene 检查

- SCENE_GOAL_TOO_ABSTRACT（目标必须具体可验证）；
- SCENE_WITHOUT_MEANINGFUL_OPPOSITION（阻力不能只是“对方不愿意说”）；
- SCENE_TACTIC_NEVER_CHANGES（持续受阻应换策略或付出代价）；
- SCENE_WITHOUT_TURN（high-value/anchor 场景必须有 turn）；
- SCENE_WITHOUT_STATE_CHANGE（场景结束不是“谈完了”；high-value 场景为 error）；
- SCENE_ENTRY_UNMOTIVATED / SCENE_EXIT_FLAT / FALSE_CLIFFHANGER；
- SCENE_SEQUENCE_CAUSALLY_WEAK（连续 3 个无 decisionOrDiscovery 的 scene）；
- ORPHAN_SCENE / RECOVERY_WITHOUT_NEW_STATE / RHYTHM_MONOTONY / TRANSITION_TRIGGER_REPETITION / SCENE_OPENING_INERT / EMOTION_WITHOUT_DECISION_EFFECT。

## Scene Semantic Report（evaluation artifact）

draft_chapter 接受 sceneSemanticReports：goalRealized / oppositionRealized / turnRealized / stateChangeRealized / exitPressureRealized / dialogueFindings / emotionalFindings / informationFindings / professionalFindings / relationshipFindings / evidence（正文锚点，保存时校验）。不创建第二 realization authority——最终事实以 chapter prose + 现有 realization system 为准。存 `work/scene-semantics/chapter-NNN.json`。

## 隐私

Scene Design 的 subtext / hidden intention 属作者私有（`work/scene-designs/`、`work/scene-semantics/` 对 reader-sim 隔离）。
