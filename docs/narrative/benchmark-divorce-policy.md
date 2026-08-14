# 基准作品：《离婚前，我替丈夫查最后一份保单》

## Story DNA

- primaryGenre：female-social-suspense；
- relationshipMechanisms：[mature-marriage-crisis]（chase-wife 机制流水线由 genre-chase-wife.test.ts 单独覆盖，避免在基准中复制第二套流水线）；
- professionalDomain：insurance-fraud-investigation；
- storyForm：mid-length；audience：female；setting：contemporary-china。

## 10 种事件类型（unified event map，两章 10 事件）

| # | 章 | 类型 |
| --- | --- | --- |
| 1 | 1 | mystery 发现 + professional 动作/观察（碰撞） |
| 2 | 1 | marriage 经济项 + 角色 agency + 资源 delta |
| 3 | 1 | professional 工作流迁移 S1→S2 |
| 4 | 1 | mystery 证明进度 + 解释变化 |
| 5 | 1 | marriage 责任 + 决策权变化 |
| 6 | 1 | 不可逆事件 + 风险 delta |
| 7 | 2 | 倒叙 + 读者曝光线索 C2 |
| 8 | 2 | mystery 发现 C2 + professional 观察 OBS-2（碰撞） |
| 9 | 2 | marriage 社会关系 + 重组进度 |
| 10 | 2 | 角色声誉 + 风险 + 资源 delta |

## 端到端流水线（test/benchmark-divorce-policy.test.ts）

1. initializeNovel（DNA 校验）；
2. 引擎 artifact：mystery case（T1 plannedRevealChapter=1）+ clue ledger（C1 兑现章 1、C2 兑现章 2）+ marriage structure + professional model/plan（OBS-1 章 1、OBS-2 章 2）；
3. 确定性门：check_mystery_design（ok）、check_mature_marriage_structure（非 error）、check_professional_domain/case（ok）；
4. unified map（10 事件）→ check_unified_event_map（ok，totalEvents=10，collisionEvents=2，professional gate 通过）；
5. 每章事件草稿 → 校验 → 语义报告 → assemble（r1）；
6. realization 记录（第 1 章 12 条：6 事件 + E1/R1/D1 + C1 + T1 + OBS-1；第 2 章 7 条：4 事件 + S1 + C2 + OBS-2）→ check ok；
7. finalize 两章（realization 门 + 引擎门全部通过，事务提交）；
8. distinctiveness 评审（verdict=distinctive，blend 证据与 collisionEvents=2 吻合）→ check ok（repeatEvents=0，无未用引擎）；
9. 上下文：chapter-writing 读到 unified map；reader-sim 排除 unified 作者规划；
10. exportManuscript → 2 章。

## 该基准验证的不变量

- 计划 ≠ 兑现：所有计划项（含线索、揭示、职业观察、婚姻项）在 finalize 前必须锚定正文；
- 无静默同步：OBS-1/OBS-2 经 mysteryClueId 显式桥接 C1/C2，不自动复制；
- 单一统一流水线：事件级草稿只有 unified 一条路径；
- 交叉验证诚实：评审的引擎交织声称由碰撞统计背书。
