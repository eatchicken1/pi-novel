# Story Design Review（Round 8）

## 解决的问题

design_story_architecture 之后、build_narrative_event_graph 之前，需要一个 PRE-DRAFT 设计评审：检查 Story Concept / Foundation / Ending / Character Decisions / Architecture / Anchor Spine 的结构问题。不混入 prose style（prose 由 diagnose_chapter 处理）。

## review_story_design

输入：模型 findings（DesignFinding：priority / category / problem / targetRefs / recommendedStrategy / code?）。
服务合并 deterministic checks 与模型 findings（同 code 去重，deterministic 优先），写 work/authoring/story-design-review.json（verdict: clean | needs-revision | major-revision；P0 存在 → major-revision）。

## 确定性检查清单（按领域）

- Direction：STORY_DIRECTIONS_TOO_SIMILAR（P0）；
- Promise：PROMISE_WITHOUT_PAYOFF_PLAN / PROMISE_PAYOFF_TOO_EARLY / PROMISE_NOT_CONNECTED_TO_STORY / PROFESSIONAL_PROMISE_WITHOUT_PROFESSIONAL_REFS / RELATIONSHIP_PROMISE_WITHOUT_RELATIONSHIP_REFS / SOCIAL_PROMISE_WITHOUT_SYSTEM_MECHANISM；
- Foundation：FOUNDATION_ENGINES_ISOLATED / FOUNDATION_PROFESSIONAL_MYSTERY_DETACHED / FOUNDATION_MARRIAGE_CASE_DETACHED / FOUNDATION_SOCIAL_SYSTEM_DETACHED / FOUNDATION_CHASE_HARM_UNGROUNDED；
- Mystery：CLUE_WITHOUT_LEGAL_ACQUISITION（P0）/ FALSE_MODEL_EXPLAINS_NOTHING / FALSE_MODEL_ONLY_EXISTS_FOR_TWIST / TRUE_MODEL_TOO_EARLY_OBVIOUS / CORE_CLUE_WITHOUT_REINTERPRETATION；
- Character：TURNING_POINT_WITHOUT_DECISION_CAUSE / SPOUSE_PLOT_COLLAPSES_TO_PURSUIT / HEROINE_KNOWLEDGE_OUTRUNS_AGENCY；
- Ending：ENDING_PAYOFF_UNEARNED / CLIMAX_CHOICE_WITHOUT_COST / CLIMAX_CHOICE_COST_MISMATCH；
- Causality：ANCHOR_* / EVENT_* / BRIDGE_* / CLIMAX_DECONVERGES / CASE_TRUTH_WITHOUT_PERSONAL_TRUTH / INFORMATION_WITHOUT_DECISION_RUN；
- Pressure/Question：PRESSURE_* / QUESTION_* / ALL_MAJOR_QUESTIONS_CLOSE_BEFORE_CLIMAX；
- Candidates：ARCHITECTURE_CANDIDATES_TOO_SIMILAR。

## revise_story_architecture

输入：ArchitectureRevisionPlan（revisionId / goals: findingIds / changeType / targetRefs / strategy / expectedEffect）+ 更新后的 StoryArchitecture。

- 只做局部修改（movement / anchor / reframe / ending-prerequisite / decision-chain / character-goal / pressure / question / promise / false-model / candidate-structure）；
- changeType 涉及 change-mystery-truth / change-marriage-canon / change-professional-model / change-chase-harm-repair / change-ending-contract → FOUNDATION_REVISION_REQUIRED（blocked，先 develop_story_bible 显式修订 foundation）；
- 版本化写入：旧架构归档为 outline/story-architecture-vN.json，当前文件版本号 +1；
- lineage：work/authoring/architecture-lineage.json（revisionId / previousVersion / newVersion / changeTypes / targetRefs / savedAt）；
- 修订后重新同步 movements 进 social suspense design 并重跑垂直 gate；recommended next action = review_story_design。

## Workflow 集成

hasDesignReview / hasDesignBlockers 进入 WorkflowFacts：
- 有 architecture 无事件图且有评审 → phase = design-review；
- 评审 major-revision → next action = revise_story_architecture；
- 无评审 → 保持原有 next action（build_narrative_event_graph），评审是可选强化步骤，不强制（Round 7 流程完全兼容）。
