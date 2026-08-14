---
name: genre-female-social-suspense
description: 女性社会派悬疑主题材：Mystery Truth 五层模型（作者真相/可观察事实/解释/知识/证明）、Truth Claim DAG、线索与红鲱鱼公平性、嫌疑模型、信息状态与社会派根基；可与 chase-wife 等 relationship mechanism 组合。
---

# 女性社会派悬疑（Female Social Suspense）

## 加载条件

当项目 primaryGenre 为 female-social-suspense（女性社会派悬疑）时加载，可与 chase-wife 等 relationship mechanism 组合。工具可用性由统一 capability 判断（hasPrimaryGenre / hasRelationshipMechanism），不散落字符串比较。

## 负责与不负责

负责：truth model（真相声明 DAG）、observable evidence / clue ledger、red herring 公平性、suspect model、information state（know / suspect / believe 分层）、social suspense 根基、mystery fairness（读者能否在揭示前推出真相）。

不负责：Chase Wife 的 harm/repair/结局资格（由 genre-chase-wife mechanism Skill 负责）；熟龄婚姻义务建模（后续 Mature Marriage Engine）；保险等职业写实库（后续 Professional Domain Engine）；章节组装与事件流水线（正文仍由 Chase Wife event-level pipeline 或其他既有路径管理）。

## 五层真相模型

```text
AUTHOR TRUTH（作者真相：TruthClaim DAG）
↓
OBSERVABLE FACT（正文世界里真实存在的线索）
↓
INTERPRETATION（同一事实的多种合理解释）
↓
KNOWLEDGE / BELIEF（谁在什么时刻知道/怀疑/相信什么）
↓
PROOF / REVELATION（从怀疑升级到证明与揭示）
```

禁止把五层压成一个 clue 字符串：observableFact 不等于 interpretation，knowledge 不等于 suspicion。

## 固定流程

1. `read_story_context(task="planning")` 读取 mystery 规划上下文；先建立 truth claim DAG（`save_mystery_case`，先 proposed，作者确认后 confirmed 进 canon/mystery/truth-model.json）。
2. 建 clue ledger（`save_mystery_clue_ledger`，outline/mystery/clue-ledger.json）：每条线索必须是可观察事实，标注可用章/发现章/支撑的 claim；red herring 必须有真实事实基础 + 合理错误解释 + 实际含义。
3. 建 suspect model（`save_mystery_suspect_model`，proposed → confirmed 进 canon/mystery/suspect-model.json）：motive/means/opportunity/access 与 publicStory/privateSecret/actualRole 分开；motive 不等于 culprit。
4. 建信息检查点（`save_mystery_information_state`，outline/mystery/information-state.json）：按章记录 heroine/reader/角色 know/suspect/believe 与新增可用线索。
5. 运行 `check_mystery_design`（引用/环/时序/红鲱鱼/信息边界/社会派根基）与 `check_mystery_fairness`（支持的最终真相/线索覆盖/deus ex machina/揭示先于证明）；有 error 先修，warning 按优先级处理。
6. 写作正文时 mystery 与关系机制并行：本章事件要兑现 clue 的 intendedDiscoveryChapter，并把信息状态推进到对应 checkpoint。

## Author Secret 边界

Truth Model、actualRole、privateSecret、actualImplication 是作者秘密。

- planning / chapter-writing / continuity-review 可以读取；
- reader-sim 一律不得读取（默认只读 project + summaries）；
- 不含 female-social-suspense primaryGenre 的项目不得读取 mystery 私有内容。

## 完成条件

最终揭示的每个核心真相都有可回溯的前文证据；没有无事实基础的红鲱鱼；没有任何读者在揭示前不可能得到的知识；案件去掉婚恋线后仍存在独立的社会问题与代价承担者。

## 必须加载的资源

- `resources/mystery-truth.md`：Truth Claim DAG 规则。
- `resources/clue-and-red-herring.md`：线索与红鲱鱼公平性。
- `resources/information-state.md`：信息状态与作者秘密边界。
- `resources/social-suspense.md`：社会派根基。
- `resources/prompt.md`：生成约束与工具顺序。
