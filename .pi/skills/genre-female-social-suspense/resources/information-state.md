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

1. KNOW ≠ SUSPECT ≠ BELIEVE：怀疑一个声明不是知道它；checker 只对 knows 检查证据来源。
2. 知识不能凭空出现：角色 knows 一个声明时，其最早支撑线索必须已可用（或由其他已成立声明推导）。
3. 读者不因 Truth Model 存在而自动获得作者秘密：reader 的 knows 必须来自可观察线索。
4. heroine 可以比 reader 多知道，也可以反过来，但必须在信息状态里说明设计依据。
5. 检查点按章单调递增；同一声明在“可用前知道”是 error，在“怀疑但未知道”是合法状态。

## Author Secret 边界

Truth Model（truthSummary/truthClaims）、suspect 的 actualRole/privateSecret、clue 的 actualImplication 属于作者侧信息：

- read_story_context：planning / chapter-writing / continuity-review 可读取；
- reader-sim 默认只读 project + summaries，绝不读取 canon/mystery 与 outline/mystery 的作者秘密字段；
- 项目不含 female-social-suspense primaryGenre 时，不读取任何 mystery 内容。

## 语义层与机械层

机械层（本轮实现）：引用存在、时序（线索可用前不得知道）、chronology 单调、红鲱鱼事实基础。
语义层（模型语义报告）：解释是否真的合理、社会问题是否真实存在、角色动机是否可信——这些由模型在后续轮次以语义报告承载，不用关键词正则伪装深度。
