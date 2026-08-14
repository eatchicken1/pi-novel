# 线索与红鲱鱼公平性

## 线索必须是正文世界里真实存在的事实

每条 `MysteryClue`：observableFact（可观察事实，不等于解释）、sourceType（document/physical/digital/testimony/behavior/financial/medical/timeline/institutional-record/professional-observation/other）、sourceDescription、firstAvailableChapter（世界可用章：证据在故事世界里最早可能被取得）、heroineDiscoveryChapter（女主发现章；legacy intendedDiscoveryChapter 保持可读）、readerRevealChapter（读者曝光章：读者第一次看到此事实；缺失时回退到女主发现章）、truthClaimIds（支撑的真相声明）、reliability（low/medium/high）、interpretationOptions（多种合理解释）、misleadingInterpretation（red-herring 指定的误导解释）、actualImplication（作者认定的实际含义）、clueRole、plannedRealizationChapter（计划落地正文的章；真正的正文兑现证据属 Phase 5，见 MysteryClueRealizationEvidence）。

## 解释模型

同一事实允许多个解释。例如：

```text
observableFact：死者手机凌晨 02:17 连接公司 Wi-Fi
surface interpretation：死者凌晨回过公司
alternative interpretation：手机由其他人携带
actual implication：死亡时间与手机持有人并不等价
```

不要求每条线索都有多个解释，但模型必须允许。

## 红鲱鱼公平性（硬要求）

- misleadingInterpretation 不得与 actualImplication 完全相同（RED_HERRING_INTERPRETATION_EQUALS_ACTUAL，error）；
- “解释是否真正合理”属于模型语义层判断，不用关键词正则伪装。

Red Herring = 真实 observable fact + 合理但错误的 interpretation。

- 必须有 observableFact（现实事实基础）；
- 必须有至少一个 plausible wrong interpretation；
- 必须有 actualImplication（作者知道真实含义）；
- 禁止“作者提供后来证明根本不存在的假事实”。

clueRole：fair（公平线索）、corroborating（佐证）、ambiguous（模棱两可）、red-herring、payoff（回收铺垫）、exculpatory（开脱）。

## 时序与三态可见性

1. firstAvailableChapter ≤ heroineDiscoveryChapter（legacy：intendedDiscoveryChapter）；
2. reader 公平性只看 readerRevealChapter（读者曝光），不允许用 firstAvailableChapter 冒充读者时间；线索在揭示章（visible < revealChapter）前必须已向读者展示；
3. 结局允许出现 confirmation evidence，但核心推断所需的事实不能全部到最后才第一次出现（deus ex machina 是 error）；
4. 线索的双向引用必须一致：claim 证明引用的线索必须出现在该线索的 truthClaimIds 中（CLAIM_CLUE_LINK_MISMATCH）。
