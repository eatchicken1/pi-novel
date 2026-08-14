# Manuscript Review（review_manuscript）

与 chapter diagnosis 不同：它看全书级结构，不是逐章之和。

确定性诊断：外部情节停滞（连续关系章）、关系脱节（连续案件章）、职业线消失（前段强中后段消失）、出口压力弱、单引擎高潮、movement 覆盖；叠加模型评审（verdict：ready-for-final-revision / structural-revision-needed / major-rebuild-needed + findings + story revision plan）。

输出不包含 0-100 分。

## Round 10：长文连续性审计

- 检查前确保派生内存存在（缺失时先 repair_narrative_memory），把 memoryStatus 写入 review 文档；
- 叠加 checkLongFormContinuity 确定性诊断（23 个码，按台账分组：知识/关系/物件/事实/时间线/线程/伏笔/专业/谜题/弧光，全表见 long-form-continuity.md）；
- 新增 repetition 与 voice 信号：REPEATED_PURSUIT_PATTERN（>=3）、REPEATED_DISCOVERY_PATTERN（>=6）、REPEATED_CHAPTER_ENDING（>=4）、VOICE_DRIFT（>=0.4）；
- 模型评审 verdict 不变（ready-for-final-revision / structural-revision-needed / major-rebuild-needed），输出不包含 0-100 分；
- 存在连续性 error 时 finalize_manuscript_unified 直接阻断（见 manuscript-finalization.md）。
