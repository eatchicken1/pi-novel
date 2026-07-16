---
name: genre-chase-wife
description: 追妻文专属创作流程：第一人称女主、关系失衡、主动退出、男方失去便利后的错误追逐、具体认知、可验证修复和女主最终选择。
---

# 追妻文 Skill

## 加载条件

仅当项目 `genre` 为 `chase-wife` 时加载。本 Skill 不适用于悬疑、都市情感或轻幻想。

## 负责与不负责

负责追妻文的开场冲突、关系伤害、留下逻辑、退出阶梯、双轨追妻、主动权、修复证据和结局资格。不负责替作者确认正史，不负责把语言风格判断伪装成程序事实。

## 类型内核

关系链必须可追溯：

`失衡 → 伤害被识别 → 女主停止供给 → 男方失去现实便利 → 错把不适当成爱 → 错误追回 → 承担代价 → 具体认知 → 修复或尊重失败 → 女主从独立生活中选择`

男方哭泣、占有、送礼、要求见面和口头后悔不能单独证明悔悟。每次修复必须指向具体伤害，写明男方成本、女主收益、边界是否被尊重，以及女主是否接受。

## 固定流程

1. `read_story_context(task=chapter-writing)`，读取确认正史、Beat Sheet、当前章节事件和相关账本。
2. 保存双轨 Beat Sheet、opening mode、staying logic、伤害账本、修复账本和 ending contract。
3. 保存章节事件地图；每个事件填写 `beatRefs`、因果来源、伤害机制、状态差、主动权差、入口钩子和出口钩子。
4. 逐事件调用 `save_chase_wife_event_draft` → `check_chase_wife_event_draft` → `check_chase_wife_event_prose` → `save_chase_wife_event_semantic_report`。语义证据必须是当前正文的字符锚点。
5. 只有所有事件报告均为 `source=model` 且 `status=ok` 时，调用 `assemble_chase_wife_chapter`。
6. 组装后调用章节节奏、章节评分、`check_ai_artifacts`，并用带正文锚点的 `save_reader_report` 与 `save_review_report`。
7. 章节定稿前调用 `check_harm_repair_progress` 与 `check_chase_wife_ending_eligibility`（关键章节和全篇均需复核），再使用 `finalize_chapter`。全篇结束后执行 `check_chase_wife_story_pacing(scope=finalized)` 和 `finalize_manuscript`。

## 完成条件

开头在正文中尽快呈现关系冲突；女主在退出前至少有两次主动选择；相邻和跨章节同构伤害不连续重复；男方追逐包含现实损失和错误行动；认知必须落到具体伤害；修复必须有可验证成本；结局必须兑现 ending contract。任何失败都生成定向修改任务，不整章盲目重写。
