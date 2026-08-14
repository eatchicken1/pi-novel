# Female Social Suspense 路线图（Round 1 为架构阶段）

本轮（Round 1）只完成 Story DNA / Capability 解耦，不实现神秘引擎。以下阶段为后续轮次规划，本文只写架构路线，不写小说正文。

## 当前状态

- primaryGenre = female-social-suspense 已可保存并与 chase-wife mechanism 组合；
- `.pi/skills/genre-female-social-suspense/SKILL.md` 为最小占位 skeleton；
- 线索、真相、嫌疑、信息状态与调查因果尚未实现（属于 Phase 2+）。

## Phase 2：Mystery Engine

目标：mystery truth 与信息状态的确定性建模。

- schemas：truth model（唯一真相的事实集合与揭示顺序）、suspect model（动机/机会/信息权限）、information state（读者/视角人物/作者三方信息差）；
- clue ledger：公平线索、误导（red herring）、铺垫回收，替代当前通用的 `continuity/unresolved-clues.json` 演进为按真相绑定；
- 调查因果：调查动作必须改变信息或风险，避免“线索堆积但剧情不动”；
- 测试：线索公平性、误导有据、真相可回溯。

## Phase 3：Mature Marriage Engine

目标：熟龄婚姻危机作为独立 relationship mechanism（`mature-marriage-crisis`）。

- 婚姻台账：长期责任、经济共同体、子女/父母压力、情感债与信任账；
- 与 chase-wife 的差异：不是“撤回供给—追逐—修复”的线，而是“共同债务—破裂—责任重分配”；
- 与 chase-wife 机制可共存于同一项目的组合规则与优先级。

## Phase 4：Professional Domain Engine

目标：职业写实与专业因果。

- professionalDomain 注册表（首期：insurance-fraud-investigation：核保、理赔调查、反欺诈流程、证据链）；
- 职业动作 → 信息/风险变化工具；
- 专业术语与行业事实的可验证性检查。

## Phase 5：Dual-engine Story Structure

目标：主题材引擎（mystery）与关系机制引擎（chase-wife / mature-marriage）在同一事件地图上的编排。

- 事件同时携带 mystery delta 与 relationship delta；
- 双引擎门禁组合：真相揭示顺序与关系结局资格互不绕过；
- 章节/全篇 pacing 扩展为双维度。

## Phase 6：Distinctiveness Checker

目标：避免“换皮”同质化。

- 参考文机制去重：触发器组合、职业现场、关系路径的相似度检查；
- 与既有 anti-slop / AI-artifact 门禁合并为题材层差异化门。

## Phase 7：Benchmark Novel

目标：用组合架构完成一部基准作品（不复制参考文）。

- 女性社会派悬疑 × 熟龄婚姻 × 保险欺诈调查；
- 全流程走通：story profile → planning → event pipeline → finalize → manuscript；
- 与既有 chase-wife 基准对照，验证组合不降门禁。
