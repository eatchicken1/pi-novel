---
name: novel-chapter-planning
description: 如何设计一章：Goal / Obstacle / Change / Exit Pressure / Information Control / Scene Rhythm。与具体 genre 无关的方法论；genre-specific 内容由对应 genre Skill 提供。
---

# Novel Chapter Planning

## 加载条件

plan_chapter / draft_chapter 之前加载（所有类型通用）。

## 一章的六个要素

1. Goal：本章要改变什么（信息 / 关系 / 资源 / 风险 / 角色状态）；
2. Obstacle：阻力来自人、制度、时间还是证据缺口；
3. Change：至少一项可验证的状态变化（不是情绪的堆叠）；
4. Exit Pressure：章尾向前的压力（问题 / 决定 / 新证据 / 威胁 / 成本 / 矛盾 / 不可逆动作）；
5. Information Control：本章释放什么、扣下什么、谁在什么时刻知道；
6. Scene Rhythm：场景功能不重复（推进 / 反证 / 转折 / 代价）。

## Invariants

- 事件引用必须来自 unified 事件图（plan_chapter 校验 eventIds）；
- 每个场景合同必须包含 stateChanges；
- 不可逆内容必须写 cannotRemoveBecause；
- 章尾压力避免连续 weak（FORWARD_PRESSURE_WEAK）。

## 长篇上下文（Round 10）

plan_chapter 前用 compileAuthoringContext(task: plan_chapter) 取上下文：MUST 含当前知识/关系/物件状态与线程台账；预算超限按 priorityHint 裁剪。看到 CONTEXT_SOURCE_STALE 先 repair_narrative_memory 再规划；chapter summary 的 threadsOpened/Advanced/Closed、setups、payoffs、criticalFacts 是台账派生的声明源，规划时必须如实预估。

## 资源导航

无独立 resources（本章方法论即全部）；genre-specific 节奏约束见对应 genre Skill。
