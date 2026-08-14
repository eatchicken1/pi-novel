# Design Revision

## review_story_design（PRE-DRAFT）
P0 — Logical/Authority；P1 — Causality/Architecture；P2 — Character/Relationship；P3 — Suspense/Pacing/Commercial；P4 — Distinctiveness/Theme/Voice。
不混入 prose style（prose 在 chapter diagnosis 阶段处理）。

典型发现：
- P0：关键 Clue 无合法获取路径；
- P1：Midpoint reframe 没有改变任何目标；Irreversible exit 与前面婚姻累积无因果；Climax 依赖前文从未出现的关键证据；
- P2：丈夫从第 3 movement 开始没有独立目标；女主所有重大决定都只由新证据推动；
- P3：False Model 在前 20% 失效；中段连续 7 个事件只是信息增加；
- P4：去掉保险调查职业后 70% 核心事件仍成立。

## revise_story_architecture
- 输入：selected design findings + author goals；
- 输出：ArchitectureRevisionPlan（goals: findingIds / changeType / targetRefs / strategy / expectedEffect）；
- 局部修改 movement / anchor / reframe / ending prerequisite / decision chain，不整套重生成；
- 不能静默修改 Mystery Truth / Marriage Canon / Professional Model / Chase Harm-Repair / Ending Contract → FOUNDATION_REVISION_REQUIRED；
- 版本化写入，保留 revision lineage；当前架构明确。
