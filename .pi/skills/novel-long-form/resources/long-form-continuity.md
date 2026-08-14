# Long-Form Continuity（长文连续性检查码全表）

checkLongFormContinuity 在 review_manuscript / finalize_manuscript_unified / get_novel_status 中运行，按台账类别分组：

## 知识（KnowledgeLedger）

- CHARACTER_FORGETS_CRITICAL_KNOWLEDGE：关键知识丢失后无触发重学。
- FALSE_BELIEF_DISAPPEARS_WITHOUT_TRIGGER：误信无暴露触发消失。

## 关系（RelationshipStateSnapshot）

- REPEATED_BOUNDARY_DISCOVERY：同一关系边界被"再次发现"（关系倒退重复）。
- REPAIR_FORGOT_PREVIOUS_FAILURE：修复后忘了之前的失败教训。
- RELATIONSHIP_STATE_REGRESSION_UNEXPLAINED：关系状态倒退无解释。

## 物件（NarrativeObjectLedger）

- OBJECT_REAPPEARS_AFTER_DESTRUCTION：销毁后的物件再次出现。
- OBJECT_USED_BEFORE_INTRODUCTION：使用早于引入。
- OBJECT_HOLDER_CONTRADICTION：同一物件持有者矛盾。

## 事实（CriticalFactIndex）

- FACT_VALUE_CONTRADICTION：同一事实（label）多个声明值不一致（按 label 分组比对 normalizedValue）。

## 时间线（Timeline）

- TIME_ORDER_CONTRADICTION：storyDate 相对章节顺序倒退。
- CHARACTER_IN_TWO_PLACES：同一 storyTime 同一人物出现在两个不同 scene。

## 线程（NarrativeThreadLedger）

- THREAD_RESOLVED_WITHOUT_CAUSE / THREAD_DROPPED / THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE / TOO_MANY_DORMANT_THREADS / MAIN_THREAD_DISAPPEARS。

## 伏笔（SetupPayoffLedger）

- SETUP_NEVER_USED / SETUP_FORGOTTEN_TOO_LONG。

## 专业（ProfessionalStateSnapshot）

- ACTION_IGNORES_PREVIOUS_RECUSAL：recusal 生效期间仍执行职业动作。
- PROFESSIONAL_CONSEQUENCE_DISAPPEARS：职业后果消失（引用章 ≤ 状态章且当前章更新）。

## 谜题（Mystery HypothesisState）

- DISCARDED_HYPOTHESIS_RESURRECTS_UNEXPLAINED：已丢弃的假设无解释复活。

## 弧光（CharacterArcTrajectory）

- CHARACTER_RELEARNS_SAME_LESSON / CHARACTER_GOAL_DISAPPEARS。

## 长篇 review 信号（review_manuscript）

- REPEATED_PURSUIT_PATTERN（≥3 次 wrong-pursuit 追妻戏码）、REPEATED_DISCOVERY_PATTERN（≥6 个纯发现型事件）、REPEATED_CHAPTER_ENDING（同类收尾 ≥4 章）、VOICE_DRIFT（后半程情绪标签密度 - 前半程 ≥0.4）。

## 修法总则

先修事实/时间线/知识（因果层），再修线程/伏笔（结构层），最后修重复模式与声音（风格层）。每修一处重跑 affected 检查。
