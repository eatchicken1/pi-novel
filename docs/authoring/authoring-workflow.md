# Authoring Workflow（Round 8）

## 定位

系统从 Engine-Oriented Tool Surface 转为 Author-Oriented Workflow Surface：底层能力（Mystery/Marriage/Chase Wife/Professional/Social Suspense/Unified Event/Realization/Distinctiveness）继续存在，成为上层 workflow tool 自动调用的 Capability Layer。

核心原则：系统内部可以复杂，作者体验必须简单。

## 三层 Tool Architecture

- Layer A — Author Workflow Tools（默认）：initialize_novel / get_novel_status / explore_story_directions / develop_story_concept / develop_story_bible / design_story_architecture / review_story_design / revise_story_architecture / build_narrative_event_graph / plan_chapter / draft_chapter / diagnose_chapter / revise_chapter / review_manuscript / finalize_chapter / finalize_manuscript / export_manuscript / read_story_context。
- Layer B — Capability / Expert Tools（全部保留）：save/check_mystery_*、save/check_mature_marriage_*、save/check_professional_*、chase-wife validators、save/check_social_suspense_design、check_character_complexity、check_vertical_story_quality、save/check_unified_*、save/check_narrative_realization、check_mystery_realized_fairness 等。
- Layer C — Primitive / Artifact Operations：write/read、revision、hash、assembly、context、canon、transaction。

## 生命周期（Round 8）

IDEA → DIRECTION EXPLORATION → CONCEPT → FOUNDATION SYNTHESIS → ENDING/TRUTH BACKWARD DESIGN → CHARACTER DECISION DESIGN → COLLISION SPINE → ARCHITECTURE CANDIDATES → DESIGN REVIEW → ARCHITECTURE REVISION → CAUSAL EVENT SPINE → FULL EVENT GRAPH → CHAPTER PLANNING → DRAFTING → LOCAL REVISION → STRUCTURAL REVIEW → MANUSCRIPT REVISION → FINALIZATION → EXPORT。

工作流是 context-aware：作者已明确人物/结局/案件时跳过相应探索步骤。workflowPhase 新增 direction 与 design-review（有 directions 无 concept → direction；有 architecture 有评审无事件图 → design-review；评审是可选强化，无评审时保持 Round 7 顺序）。允许 Architecture ↔ Event Design ↔ Chapter Planning 往返与 Draft → Revision → Architecture Repair；系统通过 get_novel_status 动态计算当前阶段与 recommended next actions。

## Workflow State 不是第二事实源

Authoring Workflow State 从实际 artifact + reports + project state 动态计算（services/authoring-workflow.ts 的 computeAuthoringPhase / computeFoundationReadiness / computeRecommendedNextActions）；不复制 Mystery/Marriage/Chapter/Event 状态。

## 统一 Workflow Result

上层工具返回统一结构：projectId / workflowPhase / status（ready|completed|blocked|needs-review）/ createdArtifacts / updatedArtifacts / reports / blockers / warnings / confirmationRequired / recommendedNextActions。

## 确认安全

develop_story_bible 只写 proposed，返回 confirmationRequired + awaitingConfirmation；workflow 自动化不得内部传 USER_CONFIRMED；canon foundation / ending contract / 重大结构重写 / finalization 继续显式确认。
