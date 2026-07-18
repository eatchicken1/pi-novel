---
name: genre-chase-wife
description: 追妻文专属创作流程：女主第一人称、关系失衡、主动退出、男方失去现实便利后的错误追逐、可验证修复与女主最终选择。
---

# 追妻文 Skill

## 加载条件

仅当项目 `genre` 为 `chase-wife` 时加载。本 Skill 不适用于悬疑、普通都市情感或轻幻想项目。

## 负责与不负责

负责开局冲突、关系伤害、女主留存逻辑、退出阶梯、双轨追妻、主动权变化、修复证据和结局资格。不替作者确认正史，不把模型建议写入正史，不用语言风格判断代替工具校验。

## 类型不变量

- 默认使用女主第一人称；只有 `split-pov` 才允许女主退出后的男方有限第三人称。
- 开篇 250 字内必须出现可见冲突，女主前 12% 内必须有主动行为。
- Beat Sheet 必须包含 `stayingLogic`：情感原因、错误信念、持续证据和突破阈值；物质、社会、家庭或职业原因按故事需要补充。
- 女主退出前至少有两次主动权升级；男方追逐必须产生现实损失、错误行动或具体认知。
- 事件正文必须逐事件生成，机械检查与模型语义报告都通过后才能组装。
- 所有语义证据必须锚定当前正文；未确认的创意、台账和修复建议不能成为正史。

## 固定流程

1. 规划阶段先调用 `read_story_context(task=planning)`，依次完成双轨 Beat Sheet、`check_chase_wife_arc(scope=planned)`、`openingMode`、`stayingLogic`、候选伤害账本、候选修复账本和 ending contract；修复方案先保持 `proposed`。
2. 进入具体章节后调用 `read_story_context(task=chapter-writing)`，只读取当前章节需要的正史、Beat、事件地图和相关台账。
3. 保存章节事件地图；每个事件填写 `beatRefs`、因果来源、伤害机制、状态差、主动权差、入口钩子和出口钩子。
4. 对每个事件依次调用 `save_chase_wife_event_draft`、`check_chase_wife_event_draft`、`check_chase_wife_event_prose` 和 `save_chase_wife_event_semantic_report`。
5. 所有事件报告必须是 `source=model` 且 `status=ok`，再调用 `assemble_chase_wife_chapter`。
6. 组装后运行章节节奏、章节评分、AI 痕迹、Reader Sim 和 Story Review；Reader 与 Story Review 两者都必须通过，报告必须带当前正文哈希和正文锚点。
7. 章节定稿前检查 `check_harm_repair_progress`（可传 `chapter`，返回 `on-track`、`warning` 或 `stalled`）、连续性和用户确认；全篇结束后才运行 `check_chase_wife_ending_eligibility`、finalized pacing、`finalize_manuscript` 和导出门。

## 必须加载的资源

- `resources/prompt.md`：生成约束与工具顺序。
- `resources/rhythm-and-pacing.md`：事件预算、主动权曲线和压缩规则。
- `resources/conflict-and-consequence.md`：伤害机制与现实后果。
- `resources/emotion-arc.md`：刺激—判断—行动—新状态链。
- `resources/beat-template.md`、`resources/reference-decomposition.md`：规划字段和参考文拆解方法。

## 完成条件

不能用“她很伤心”“他很后悔”作为状态变化或追妻证据。每个失败项都转成定向修改任务；不整章盲目重写，不跳过用户确认，不把工作区内容混入正史。
