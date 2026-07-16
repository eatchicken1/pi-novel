---
name: genre-chase-wife
description: 追妻文专属创作分支：围绕偏爱排序、关系失衡、女主退出、男方追悔和现实后果建立独立情节与情绪曲线。
---

# 追妻文专属 Skill

## 何时加载

仅当项目 `project.json.genre` 为 `chase-wife` 或用户明确选择“追妻文”时加载。其他类型不得加载本 Skill 的专属规则。

## 负责什么

设计具体伤口、累积虐点、付费卡点、女主退出、男方追悔、公共后果和新生活；把参考材料抽象成机制，不复刻原文。判断事件是否推动故事，而不是只检查字段是否填写。

## 不负责什么

不强制复合，不复制参考文章的事件组合，不用第三者替代女主完成全部复仇，不把“下跪哭泣”当成有效追妻。

## 固定流程

1. 读取本 Skill 的 `resources/reference-decomposition.md`、`resources/prompt.md`、`resources/rhythm-and-pacing.md`、`resources/conflict-and-consequence.md`、`resources/emotion-arc.md` 和项目根的 `docs/genre/chase-wife-reference-analysis.md`；若项目提供了额外批注拆解，只提取机制，不复制正文。
2. 明确女主被排序或被透支的核心资源，以及她最终要重新获得的选择权。
3. 默认选择 `povMode=split-pov`；若作者明确要求单一视角才选择 `heroine-first-person`。分别设计 `heroineArc` 与 `maleArc`；在节拍表声明 80—180 字开篇引言和第一冲突，再使用 `save_chase_wife_beat_sheet` 保存 12—24 个节拍，并调用 `check_chase_wife_arc`。
4. 每章先使用 `save_chase_wife_event_map` 拆成 3—6 个事件；每个事件必须声明角色、轨道、因果来源、至少两项状态差、主动权变化、不可逆性和可变长度预算。
5. 检查通过后，逐事件调用 `save_chase_wife_event_draft`、`check_chase_wife_event_draft` 和 `check_chase_wife_event_semantics`，全部通过后调用 `assemble_chase_wife_chapter`。
6. 对组装稿调用 `check_chase_wife_chapter_pacing` 和 `score_chase_wife_chapter`，再进行完整性审查、语义审查、定向修改和用户确认定稿；全篇完成后调用 `check_chase_wife_story_pacing`。
7. 定稿后先保存候选事实；只有 `USER_CONFIRMED` 才能更新人物、伏笔和时间线正史。

## 完成条件

正文符合已选择的 POV 模式；第一章标题后有 80—180 字引言，250 字内出现可验证冲突；每章有 3—6 个事件且每个事件有实际字数预算、动作、冲突和至少两项状态变化；女主在不可逆退出前至少完成两次主动权升级；前半完成伤口累积和退出，后半交叉完成追悔、现实后果和女主新生活；结局不依赖男方是否被原谅。
