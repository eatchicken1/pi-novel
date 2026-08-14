# Tool Surface（Round 7）

## DEFAULT AUTHOR TOOLS

PROJECT: initialize_novel, get_novel_status
DEVELOP: develop_story_concept, develop_story_bible
ARCHITECT: design_story_architecture, build_narrative_event_graph
WRITE: plan_chapter, draft_chapter
REVISE: diagnose_chapter, revise_chapter, review_manuscript
FINALIZE: finalize_chapter, finalize_manuscript, export_manuscript
UTILITY: read_story_context

## ADVANCED CAPABILITY TOOLS

save/check_mystery_case|clue_ledger|suspect_model|information_state|design|fairness|realized_fairness；save/check_mature_marriage_structure|restructuring；save/check_professional_domain|case；chase-wife validators（event map/draft/semantics/pacing/score/harm/repair/ending）；save/check_social_suspense_design；save_character_contradiction_profile / check_character_complexity；check_vertical_story_quality；save/check_unified_event_map|draft；save_unified_event_semantic_report；assemble_unified_chapter；save/check_narrative_realization；save/check_story_distinctiveness。

## LOW-LEVEL / RECOVERY TOOLS

save_story_document / save_canon_document / save_chapter_plan / save_scene_contract / save_chapter_draft / save_continuity_report / update_character_state / update_clue_ledger / update_timeline / save_workflow_checkpoint / repair_novel_project 等。

## 使用原则

- 默认流程只使用 Author Tools；
- 需要调试 / 手动覆盖 / 专家规划 / workflow repair 时才直接调用 capability tools；
- 上层 tool 是 orchestrator，不是 bypass：不得绕过 Professional authority / Mystery fairness / Unified validation / USER_CONFIRMED；
- 用户说「帮我把这个创意发展一下」→ develop_story_concept；「规划第 8 章」→ plan_chapter；「这章有问题吗」→ diagnose_chapter；「把这些问题修掉」→ revise_chapter；「全书结构怎么样」→ review_manuscript。
