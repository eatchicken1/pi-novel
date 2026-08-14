# Thread Management（叙事线程）

## NarrativeThreadLedger

线程 = 跨章节的承诺（调查线、关系线、职业线、追妻线）。每条 thread：id、kind、importance（major/minor）、openedChapter、lastAdvancedChapter、expectedHorizon、status（open/advanced/closed/abandoned-intentionally）、sourceRefs。

生命周期：opened（summary.threadsOpened / 事件）→ advanced（threadsAdvanced）→ closed（threadsClosed 或 harm 修复）。harm 线程用 repair 台账关闭：`harm-<repairRef>`（repairHarmMap 映射 repairId→harmId）。

## 检查码

- `THREAD_RESOLVED_WITHOUT_CAUSE`：线程关闭但没有任何推进/原因事件。
- `THREAD_DROPPED`：major 线程连续 ≥8 章无推进。
- `THREAD_OPEN_TOO_LONG_WITHOUT_ADVANCE`：超过 expectedHorizon 未推进。
- `TOO_MANY_DORMANT_THREADS`：同时 >5 条休眠（≥6 章）线程，读者会丢线。
- `MAIN_THREAD_DISAPPEARS`：主线缺席 ≥ 半本书。

## 写作规则

- 每章 threadsOpened/Advanced/Closed 必须如实声明；major 线程要排推进节拍（见 long-form-pacing.md）。
- 主动放弃的线程写 `abandoned-intentionally` 并给读者一个交代（换线或明示）。
