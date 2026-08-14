---
name: novel-story-design
description: 如何把一个 premise 发展成真正有质量的完整故事：方向探索、候选比较、Promise 定义、Foundation 合成、Ending 反向设计、角色决策、Anchor Spine、因果事件图。与具体 genre 无关的通用的故事设计方法；当前垂直领域知识由 genre skill 提供。
---

# Novel Story Design

## 加载条件

explore_story_directions / develop_story_concept / develop_story_bible / design_story_architecture / review_story_design / revise_story_architecture / build_narrative_event_graph 之前加载。

## 设计管线（context-aware，可跳过已明确的步骤）

Premise → Direction Exploration → Candidate Comparison → Promise Definition → Foundation Synthesis → Ending/Truth Backward Design → Character Decision Architecture → Collision Spine → Architecture Candidates → Design Review → Architecture Revision → Anchor/Causal Spine → Full Event Graph。

原则：GENERATE → COMPARE → SELECT → CRITIQUE → REPAIR → COMMIT。不要一次性生成一个巨大的 JSON 假装完成设计。

## Invariants

- 设计质量优先于字段完整度；字段是用来承载因果的，不是用来填满的；
- 先设计核心因果，再扩展事件数量；先 Anchor Spine 后 Full Graph；
- Ending / Truth / Character Choice 必须反向约束前文（backward design）；
- Mystery / Marriage / Chase Wife / Professional / Social 必须从 Foundation 阶段建立交叉因果（Foundation Link Map），不是最后拼装；
- 模型负责创意判断；deterministic checker 负责引用、因果、覆盖、一致性、状态、证据、生命周期；
- 候选方案可以多份，最终 story authority 只有一份；
- 系统推荐 ≠ 作者确认（USER_CONFIRMED 不能被伪造）；
- 设计阶段不写正文（最多极短示意）；禁止为了“展示效果”写几千字正文。

## 资源导航

- premise-expansion.md：从一个 premise 问出“What / Why / Why now / Why this profession / Why can't she walk away”
- story-direction-exploration.md：多个真正不同的方向与“伪候选”鉴别
- ending-backward-design.md：Ending Architecture 与 prerequisite 回推
- causal-story-design.md：Anchor Spine、StoryCausalLink、filler 与巧合
- character-decision-design.md：角色是“在某种信息和压力下会做什么决定”
- architecture-comparison.md：2-3 个真正不同的架构候选与比较
- promise-payoff.md：Promise Ledger 与 setup/escalation/payoff 追踪
- question-management.md：Narrative Question 的打开、加深、部分回答、关闭
- pressure-shaping.md：多压力轨道的 rise/release/reframe/transform
- design-revision.md：review_story_design 与 revise_story_architecture（局部修订 + foundation 保护）

genre-specific 内容（女性社会派悬疑 / Chase Wife / 熟龄婚姻 / 保险反欺诈）见对应 genre skill，本 skill 不复制。
