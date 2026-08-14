# Final Story Engine（多引擎约束驱动的小说生成系统）

## 架构总览

系统由四类正交能力（capability）+ 一个统一事件层构成。能力由 Story Profile 声明，统一层只引用并验证，不改写任何引擎 authority。

```
Story Profile (primaryGenre / relationshipMechanisms[] / professionalDomain / themes / storyForm / audience / setting)
  ├─ female-social-suspense      → Mystery Engine（Truth Claim DAG + Clue Ledger + Fairness）
  ├─ mature-marriage-crisis      → Marriage Engine（Structure + Restructuring）
  ├─ chase-wife                  → Chase Wife Engine（24-beat + harm/repair + ending contract）
  └─ insurance-fraud-investigation → Professional Engine（Authority + Workflow + Evidence）

Unified Narrative Event Layer（唯一事件整合层）
  └─ 一个事件 = action/consequence + 4 个可选引擎 delta + character/resource/risk delta
      └─ 草稿 → 校验 → 语义报告 → 装配 → 正文兑现记录（realization）→ finalize 门禁
      └─ 差异性评审（distinctiveness）+ 确定性交叉验证
```

## 各引擎的冻结边界

- Mystery：planning 冻结（Round 2.6）。check_mystery_design / check_mystery_fairness 不再扩展；finalized 线索兑现由 realization 层承接（本轮实现）。
- Marriage：结构/重组检查不变；不自动创建 harm；现实化（正文兑现）由 realization 层承接。
- Chase Wife：事件级草稿流水线（intro → event map → draft → mechanical check → model semantic report → assemble → gates → finalize）保留为向后兼容包装；Unified 层是其推广，不创建第二套每引擎流水线。
- Professional：authority 闭包（条件/审批权限满足、guardrail、recusal/reassignment、case id 命名空间）不变；观察（observation）可经 mysteryClueId 显式桥接线索，不自动创建。

## 门禁栈（finalize_chapter 按 capability 叠加）

1. 基础：chapter plan + scene contracts + 最新草稿修订 + integrity + model semantic report；
2. Chase Wife（仅 chase-wife capability）：event map 报告、每事件 budget/semantic 报告（含 eventSpecHash/eventMapHash）、assembly manifest、pacing、score、AI-artifact、reader/review、harm-repair progress；
3. Narrative Realization（仅当本章存在计划项）：unified event、mystery clue/reveal、marriage transition、professional observation 的正文锚点 + contentHash 绑定；
4. 无计划项时 realization 门自动通过（capability-aware）。

## 工具清单（novel-agent 扩展）

引擎层：save/check_mystery_*、save/check_mature_marriage_*、save/check_professional_*、chase-wife 全套（save/check/assemble/score）。
统一层：save/check_unified_event_map、save/check_unified_event_draft、save_unified_event_semantic_report、assemble_unified_chapter、save/check_narrative_realization、save/check_story_distinctiveness。

## 测试分组（packages/coding-agent/test/）

| 组 | 文件 | 覆盖 |
| --- | --- | --- |
| A | story-profile.test.ts | DNA/capability 解析与组合 |
| B | mystery-engine / mystery-proof-fairness | Truth DAG、proof path、reader fairness（frozen） |
| C | mature-marriage-crisis | 婚姻结构/重组检查 |
| D | professional-domain / professional-authority-closure | 职业 authority 闭包 |
| E | chase-wife-fixtures / chase-wife-format-regressions / genre-chase-wife | 24-beat 流水线与格式门禁 |
| F | unified-event / realization | 统一事件层 + 正文兑现门 |
| G | distinctiveness | 差异性评审交叉验证 |
| H | benchmark-divorce-policy | 《离婚前，我替丈夫查最后一份保单》端到端 |
| I | novel-project-store / novel-short-story-benchmark | 基础存储与 MVP 流水线 |

## 关键不变量

- 计划 ≠ 正文兑现：realization 记录必须锚定最终正文并绑定 contentHash；草稿一改即失效；
- 无静默同步：professional observation 不自动建线索、marriage change 不自动建 harm；统一层只引用 + 验证；
- 作者秘密隔离：canon/work/outline 下的 mystery/marriage/professional/unified 路径对 reader-sim 硬隔离（Windows 路径安全）；
- 确定性 checker 不输出伪造分数：distinctiveness 评审由模型撰写，checker 只算统计并交叉验证模型声称。
