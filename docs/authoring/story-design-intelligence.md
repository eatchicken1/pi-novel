# Story Design Intelligence（Round 8）

## 定位

Round 7 解决了“下一步该调用哪个工具”；Round 8 解决“系统到底怎样把一个普通 premise 发展成一个真正有质量的完整故事”。

问题本质：develop_story_concept / develop_story_bible / design_story_architecture 仍要求模型一次性构造完整 JSON（one-shot structured generation）。Round 8 把设计过程改为：

GENERATE → COMPARE → SELECT → CRITIQUE → REPAIR → COMMIT

## 设计管线（context-aware，可跳过已明确步骤）

Premise → Direction Exploration → Candidate Comparison → Promise Definition → Foundation Synthesis → Ending/Truth Backward Design → Character Decision Architecture → Collision Spine → Architecture Candidates → Design Review → Architecture Revision → Anchor/Causal Spine → Full Event Graph → Chapter Planning。

## 新增服务

- services/story-design.ts：方向差异 / promise ledger / foundation links / ending / character decisions / mystery proof-first / architecture candidates / draft repairability 分类；
- services/causal-planner.ts：anchor spine / causal links / promise trace / narrative questions / pressure / information-decision balance / arc sync；
- services/story-design-review.ts：P0-P4 设计评审合并与 verdict。

## 新增 / 升级工具

- 新增：explore_story_directions / review_story_design / revise_story_architecture；
- 升级：develop_story_concept（direction selection）、develop_story_bible（links/promises/ending/decisions/mystery candidates/acquisition/ladders）、design_story_architecture（candidates + comparison + ending）、build_narrative_event_graph（anchor spine 管道）、plan_chapter（占位消除）、draft_chapter（repairability）。

## 设计层产物（proposal / analysis，非 authority）

work/authoring/ 下：story-directions.json / story-promises.json / foundation-links.json / ending-architecture.json / character-decisions.json / mystery-candidates.json / mystery-acquisition.json / mystery-ladders.json / architecture-candidates.json / story-design-review.json / event-graph-analysis.json / architecture-lineage.json / architecture-revision-plans/*.json。

全部 author-private（reader-sim 隔离）。唯一 story authority 仍是：story-concept.json（概念）/ 各引擎 canon 与 proposed（foundation）/ outline/story-architecture.json（架构）/ outline/unified/event-map.json（事件图）。

## 原则

1. 设计质量优先于字段完整度；
2. 先设计核心因果，再扩展事件数量；
3. Ending/Truth/Character Choice 反向约束前文；
4. 各引擎从 Foundation 阶段建立交叉因果（Foundation Link Map）；
5. 模型负责创意判断，deterministic checker 负责引用/因果/覆盖/一致性/状态/证据/生命周期；不写“好故事得分 92”；
6. 候选可以多份，最终 authority 只有一份；
7. 系统推荐 ≠ 作者确认；
8. 设计阶段不写正文。

## 与 Round 7 的关系

Author Workflow 完全保留：无任何设计产物时，原有 next actions 与 phase 顺序不变（213 tests 回归通过）。设计智能是可选强化层：作者明确人物/结局/案件时可以跳过方向探索与评审。
