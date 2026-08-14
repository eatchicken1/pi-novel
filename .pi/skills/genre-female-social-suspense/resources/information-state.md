# 信息状态与作者秘密边界

## 五层模型的落地

信息检查点（`MysteryInformationCheckpoint`）按章记录：

```text
afterChapter: 第几章之后
heroine / reader / characterKnowledge:
  knowsClaimIds（已知）
  suspectsClaimIds（怀疑，不等于已知）
  believesClaimIds（相信，介于两者之间）
newlyAvailableClueIds（本章新增可用的线索）
```

## 规则

1. KNOW ≠ SUSPECT ≠ BELIEVE：怀疑一个声明不是知道它；checker 只对 knows 检查可证明性。
2. 知识必须可证明：heroine/reader knows 一个声明时，必须存在一条完整 Proof Path 对该受众可见（direct clue 不是唯一来源——派生声明经前置声明推导合法）。
3. 读者不因 Truth Model 存在而自动获得作者秘密：reader 的 knows 必须来自已向读者曝光的可观察线索。
4. 角色私有知识（characterKnowledge）只验证引用与顺序，不套用 heroine/reader 的证据门禁：凶手可以因亲自实施行为而提前知道真相。
5. heroine 可以比 reader 多知道，也可以反过来，但必须在信息状态里说明设计依据。
6. 检查点按章单调递增；同一声明在“可用前知道”是 error，在“怀疑但未知道”是合法状态。

## Author Secret 边界

Truth Model（truthSummary/truthClaims）、suspect 的 actualRole/privateSecret、clue 的 actualImplication 属于作者侧信息：

- read_story_context：planning / chapter-writing / continuity-review 可读取；
- reader-sim 默认只读 project + summaries，绝不读取 canon/mystery 与 outline/mystery 的作者秘密字段；
- 项目不含 female-social-suspense primaryGenre 时，不读取任何 mystery 内容。

## 语义层与机械层

机械层（本轮实现）：引用存在、时序（线索可用前不得知道）、chronology 单调、红鲱鱼事实基础。
语义层（模型语义报告）：解释是否真的合理、社会问题是否真实存在、角色动机是否可信——这些由模型在后续轮次以语义报告承载，不用关键词正则伪装深度。
