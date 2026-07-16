---
name: genre-chase-wife
description: 追妻文专属创作约束：开篇引言、前置冲突、女主主动退出、男方有限追悔和女主最终边界。
---

# Chase Wife

## 何时加载

项目 genre 为 `chase-wife` 时始终加载。本 Skill 不适用于悬疑、都市情感或轻幻想。

## 不可违反的格式

- `povMode` 必须明确为 `heroine-first-person` 或 `split-pov`；单一第一人称时全文只能来自女主“我”。
- 第一章标题后先写 80—180 字引言，随后 250 字内出现可见冲突；不得用环境介绍拖延冲突。
- 女主主动行为必须在全文前 12% 内；退出前至少经历两次主动权升级；结局回到女主的选择。
- 男方有限第三人称只能展示失控、错误追回、现实代价和认知改变，不得替女主解释内心或改写已确认事实。
- 事件长度按 `flash|bridge|standard|anchor` 变化，不能把所有事件扩成同样长度。

## 固定流程

1. 读取追妻文专属上下文，保存带 `pacingMode` 的 Beat Sheet 和双轨事件地图。
2. 每个事件依次调用 `save_chase_wife_event_draft`、`check_chase_wife_event_draft`、`check_chase_wife_event_semantics`。
3. 将模型的角色、冲突、两个独立状态差、主动行为、出口钩子和伤害机制证据提交给 `save_chase_wife_event_semantic_report`；只有 `status=ok` 才能组装。
4. 调用 `assemble_chase_wife_chapter`，再调用章节节奏、章节评分、AI 痕迹检查和结构化 `save_reader_report` 或 `save_review_report`。
5. 草稿期使用 `check_chase_wife_story_pacing(scope=working)`；全部章节定稿后使用 `scope=finalized`，导出前必须 `finalize_manuscript`。

## 事件设计门

相邻同类伤害最多两次；每个事件至少有两个独立状态变化，或不可逆行动、主动权提升、现实后果、铺垫回收之一。女主退出、男方追妻、新生活和最终边界必须在故事级节奏报告中可定位。
