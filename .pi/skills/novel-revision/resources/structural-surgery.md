# Structural Surgery（结构手术）

## 适用范围

diagnose/review 判定为 structural（P1）时的章节级手术，与局部修订（chapter-revision.md）互斥：一个问题只改 affected event/scene；只有章节架构本身坏掉才整章重写。

## 手术流程

1. analyze_revision_impact 确认 severity ≥ structural-revision，并拿到 affectedThreads/affectedPayoffs；
2. 动事件：增/删/改 unified event → 改场景合同（sceneDesigns.eventIds 引用必须同步）→ 受影响章节的 realization 按 hash stale，需在正文确认后重存；
3. 动线程/伏笔：删事件 = 删承诺，必须同步处理 thread 台账（close 或改 sourceRefs），否则 MANUSCRIPT_DANGLING_* 会在定稿时拦下；
4. 动时间线：storyDate/storyTime 修改后重跑 TIME_ORDER_CONTRADICTION 与 CHARACTER_IN_TWO_PLACES；
5. 重跑 affected 门禁：事件机械检查 + 语义报告 + 装配 + 章节检查 + checkLongFormContinuity。

## 纪律

- 手术是"最小切割"：能并线不重写，能改时间不挪 scene；
- 每步手术记录 affectedThreads/affectedPayoffs 变化，写入 revision-impact-current.json 供下游审计。
