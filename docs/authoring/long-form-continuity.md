# Long-Form Continuity（长文连续性检查，Round 10）

## 定位

checkLongFormContinuity 运行在 review_manuscript / finalize_manuscript_unified / get_novel_status 中，直接消费派生台账，是"台账有用"的验证层：台账之间的矛盾就是故事的问题。

## 检查码全表（按台账分组）

| 组 | 码 | 触发 |
| --- | --- | --- |
| 知识 | CHARACTER_FORGETS_CRITICAL_KNOWLEDGE | 关键知识无触发重学 |
| 知识 | FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER | 误信无暴露触发消失 |
| 关系 | REPEATED_BOUNDARY_DISCOVERY | 同一关系边界再次被发现 |
| 关系 | REPAIR_FORGOT_PREVIOUS_FAILURE | 修复后遗忘之前的失败 |
| 关系 | RELATIONSHIP_STATE_REGRESSION_UNEXPLAINED | 关系倒退无解释 |
| 物件 | OBJECT_REAPPEARS_AFTER_DESTRUCTION | 销毁物件再次出现 |
| 物件 | OBJECT_USED_BEFORE_INTRODUCTION | 使用早于引入 |
| 物件 | OBJECT_HOLDER_CONTRADICTION | 持有者矛盾 |
| 事实 | FACT_VALUE_CONTRADICTION | 同一 label 多声明值不一致（normalizedValue 比对） |
| 时间线 | TIME_ORDER_CONTRADICTION | storyDate 相对章节倒退 |
| 时间线 | CHARACTER_IN_TWO_PLACES | 同 storyTime 同人物两个 scene |
| 线程 | THREAD_RESOLVED_WITHOUT_CAUSE | 无原因关闭 |
| 线程 | THREAD_DROPPED | major ≥8 章无推进 |
| 线程 | THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE | 超 expectedHorizon |
| 线程 | TOO_MANY_DORMANT_THREADS | >5 条休眠 |
| 线程 | MAIN_THREAD_DISAPPEARS | 主线缺席 ≥ 半本 |
| 伏笔 | SETUP_NEVER_USED / SETUP_FORGOTTEN_TOO_LONG | 未兑现 / 闲置过久 |
| 专业 | ACTION_IGNORES_PREVIOUS_RECUSAL | recusal 期间执行职业动作 |
| 专业 | PROFESSIONAL_CONSEQUENCE_DISAPPEARS | 职业后果消失 |
| 谜题 | DISCARDED_HYPOTHESIS_RESURRECTS_UNEXPLAINED | 已弃假设无解释复活 |
| 弧光 | CHARACTER_RELEARNS_SAME_LESSON | 学到又重学（agency 跌 ≥2） |
| 弧光 | CHARACTER_GOAL_DISAPPEARS | goal ≥10 章未出现 |

## 长篇 review 信号（review_manuscript 确定性诊断）

- REPEATED_PURSUIT_PATTERN：≥3 次 wrong-pursuit 追妻戏码；
- REPEATED_DISCOVERY_PATTERN：≥6 个纯发现型事件（调查流沦为"发现-汇报"）；
- REPEATED_CHAPTER_ENDING：同类收尾 ≥4 章；
- VOICE_DRIFT：后半程情绪标签密度 − 前半程 ≥0.4（克制现实主义漂移）。

## 修法顺序

先事实/时间线/知识（因果层），再线程/伏笔（结构层），最后重复模式与声音（风格层）；每修一处重跑 affected 检查，修订入口见 revision-impact.md。
