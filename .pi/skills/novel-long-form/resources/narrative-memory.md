# Narrative Memory（派生内存）

## 问题

长篇写作中"谁在哪一章知道什么、哪条线还开着、哪个伏笔还没收"必须可查询、可校验、可失效。若把模型对前文的回忆当作正史，就是第二权威：正史一变，回忆就错。

## 方案：全部台账是派生视图

- 输入（权威）：unified event map、定稿正文 + ChapterSummary V2、harm/repair 台账、mystery case/clues、professional model/plan、story architecture、story promises、realization records。
- 产物（派生）：每章 delta + 当前快照 + 11 类 ledger。每个产物带 `schemaVersion` / `derivationVersion` / `sourceHashes` / `throughChapter` / `generatedAt`。
- 源哈希不匹配 → 产物 stale。stale 的唯一出路是重建（repair_narrative_memory 全量重派生），不是修补。

## 文件布局

- `continuity/memory/chapter-NNN-delta.json`：单章状态变化（知识、线程、伏笔、物件、关系、专业、谜题、事实）。
- `continuity/memory/current-snapshot.json`：到 throughChapter 为止的聚合快照。
- `continuity/ledgers/{characters,knowledge,relationships,objects,critical-facts,timeline,threads,setups-payoffs,professional-state,mystery-hypotheses,character-arcs}.json`：按能力拆分的派生台账。

## 章节提交（finalize_chapter）

1. 定稿正文 + summary 通过章节机械检查；
2. 派生 chapter delta：summary 的 heroineLearned/readerLearned/spouseLearned → knowledge；threadsOpened/Advanced/Closed → threads；setups/payoffs → setups-payoffs；criticalFacts → critical-facts；events 的 resourceRef/resourceChange → objects；professionalDelta → professional-state；谜题相关 → hypotheses；
3. 写 delta → 聚合 snapshot → 重派生 ledgers → 清除 memoryOutOfDate；
4. 任一步失败：置 `memoryOutOfDate: true`，章节定稿不回滚（写作进度优先），下次修复走 repair。

## 修复

- `repair_narrative_memory`：读取全部章节输入，全量重派生（delta 不重建，只重派生 ledger 与 snapshot）。返回 rebuilt | no-chapters。
- 不要手动编辑 ledger JSON；任何编辑都会被下一次派生覆盖。
