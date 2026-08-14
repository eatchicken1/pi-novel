# Long-Form Narrative Memory（Round 10）

## 问题

长篇写作必须回答三个跨章节问题：谁在哪一章知道什么？哪条线还开着？哪个伏笔还没收？模型对前文的"回忆"不可校验、不可失效，若当作正史就是第二权威——正史一变，回忆就错。

## 设计：内存是派生视图，不是第二权威

- 权威输入：unified event map、定稿正文 + ChapterSummary V2、harm/repair 台账、mystery case/clues、professional model/plan、story architecture、story promises、realization records。
- 派生产物：每章 delta + 当前快照 + 11 类台账（ledgers）。每个产物带 `schemaVersion` / `derivationVersion` / `sourceHashes` / `throughChapter` / `generatedAt`。
- 源哈希不匹配 → 产物 stale。stale 的唯一出路是重建（`repair_narrative_memory` 全量重派生），禁止手改台账 JSON。

## 文件布局

```
continuity/
  memory/chapter-NNN-delta.json      # 单章状态变化（知识/线程/伏笔/物件/关系/专业/谜题/事实）
  memory/current-snapshot.json       # 到 throughChapter 为止的聚合快照
  ledgers/characters.json            # CharacterStateLedger
  ledgers/knowledge.json             # KnowledgeLedger（reader/heroine/spouse 隔离）
  ledgers/relationships.json         # RelationshipStateSnapshot
  ledgers/objects.json               # NarrativeObjectLedger
  ledgers/critical-facts.json        # CriticalFactIndex
  ledgers/timeline.json              # 派生 Timeline（storyDate/storyTime）
  ledgers/threads.json               # NarrativeThreadLedger
  ledgers/setups-payoffs.json        # SetupPayoffLedger
  ledgers/professional-state.json    # ProfessionalStateSnapshot
  ledgers/mystery-hypotheses.json    # Mystery HypothesisState
  ledgers/character-arcs.json        # CharacterArcTrajectory
```

## 章节提交（finalize_chapter）

1. 正文 + summary 通过章节机械检查后定稿；
2. 派生 chapter delta：summary 的 heroineLearned/readerLearned/spouseLearned → knowledge；threadsOpened/Advanced/Closed → threads；setups/payoffs → setups-payoffs；criticalFacts → critical-facts；事件的 resourceRef/resourceChange → objects；professionalDelta → professional-state；谜题相关 → hypotheses；
3. 写 delta → 聚合 snapshot → 重派生全部 ledgers → 清除 memoryOutOfDate；
4. 任一步失败：project.json 置 `memoryOutOfDate: true`，章节定稿不回滚（写作进度优先），修复走 repair。

## 修复与状态

- `repair_narrative_memory`：读全部章节输入，全量重派生 ledger 与 snapshot，返回 rebuilt | no-chapters。
- `get_novel_status` 的 memoryStatus：missing（无产物）| current（哈希匹配）| stale（源变化未重建）。
- 修订影响面判定见 revision-impact.md；authority-change（truth/事实变更）必须 repair。

## 为什么不是"再读一遍前文"

- 可校验：hash 失效是确定性的，不依赖模型自觉；
- 可审计：每条派生结论可回溯 sourceRefs；
- 可恢复：中断后从磁盘产物恢复，不依赖聊天记录；
- 单一事实源：任何层级都指向正史，派生层永远可以被删除重建。
