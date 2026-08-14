# Unified Narrative Event Engine

## 问题

Mystery、Marriage、Chase Wife、Professional 各自有规划 artifact，但没有一个“故事事件”载体能同时表达：主角做了什么动作、哪个引擎的状态因此改变。多引擎项目里正文与各引擎计划脱节。

## 方案：一个事件 = action + consequence + 多个引擎 delta

`UnifiedEvent`（schema 见 `.pi/extensions/novel-agent/schemas.ts`）：

- `eventId` 1..64 全局唯一（跨章冲突在保存时拒绝），`chapter`、`chronology`（present/flashback/flashforward-preview）、`pov`；
- `storyGoal/conflict/action/consequence`：事件必须承载真实行动与后果；
- 可选引擎 delta：`mysteryDelta`（发现/读者曝光/claim 知识/解释/证明进度/揭示）、`marriageDelta`（经济/责任/决策/社会关系/惯性/退出约束/重组进度）、`chaseWifeDelta`（信息/关系/资源/风险/agency 前后/phase）、`professionalDelta`（动作/证据源/工作流迁移/冲突/升级/后果/观察）；
- `characterDeltas`（agency/knowledge/relationship/resource/risk/health/reputation）、`resourceDeltas`、`riskDeltas`；
- `causes[]`：因果 DAG（必须指向更早事件，禁止自指/前向）；`irreversible` + `cannotRemoveBecause`。

## 确定性检查（check_unified_event_map）

| 码 | 级别 | 含义 |
| --- | --- | --- |
| DUPLICATE_UNIFIED_EVENT_ID | error | 重复事件 id |
| UNIFIED_CAUSE_INVALID | error | 缺失/自指/前向 cause |
| EVENT_WITHOUT_STATE_CHANGE | error | 无动作/后果/真实状态 delta（标签集合不是事件） |
| IRREVERSIBLE_WITHOUT_CONSEQUENCE | error | 不可逆事件无状态变化 |
| CAPABILITY_DELTA_NOT_ALLOWED | error | 项目无对应能力却声明引擎 delta |
| UNIFIED_REFERENCE_MISSING | error | 引擎引用（clue/claim/suspect/婚姻项/职业动作/观察等）不存在 |
| MYSTERY_REVEAL_LATE | warning | 揭示章晚于 plannedRevealChapter |

另外：存在 professional model+plan 时追加 `checkProfessionalCase` 结果（`professional gate:` 前缀）——统一层不能绕过职业权限。

`collisionStats`：跨引擎碰撞统计（单事件 ≥2 个引擎 delta 计为碰撞），供 distinctiveness 使用。

## 每事件草稿流水线（唯一的统一流水线）

1. `save_unified_event_map`（按章保存，全局 id 冲突即拒）；
2. `check_unified_event_map`（全量/按章）；
3. 逐事件：`save_unified_event_draft`（work/unified-event-drafts/chapter-XXX/event-NNN-rNN.md，自动递增修订）→ `check_unified_event_draft`（60–1500 字 + 规划标签泄漏检测）→ `save_unified_event_semantic_report`（source=model，action/consequence 必须出现，delta 必须有正文锚点）；
4. `assemble_unified_chapter`：所有事件草稿校验通过且语义报告为当前修订时才能装配，产出 work/drafts 修订 + `work/unified-assemblies/chapter-XXX-rNN.json` 清单（每事件 startChar/endChar/contentHash）。

## 上下文与隔离

- 作者侧（planning/chapter-writing/continuity-review）读取 `outline/unified/event-map.json` 与当前章事件草稿，优先级 2/3（仅次 chase-wife beat-sheet）；
- reader-sim 硬隔离：`isUnifiedPrivatePath` 覆盖 canon/unified、work/unified、outline/unified（反斜杠归一化，Windows 安全）。
