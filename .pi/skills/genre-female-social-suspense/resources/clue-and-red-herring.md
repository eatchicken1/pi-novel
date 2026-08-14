# 线索与红鲱鱼公平性

## 线索必须是正文世界里真实存在的事实

每条 `MysteryClue`：observableFact（可观察事实，不等于解释）、sourceType（document/physical/digital/testimony/behavior/financial/medical/timeline/institutional-record/professional-observation/other）、sourceDescription、firstAvailableChapter（事实最早可在正文出现的章）、intendedDiscoveryChapter（计划被角色发现的章）、truthClaimIds（支撑的真相声明）、reliability（low/medium/high）、interpretationOptions（多种合理解释）、actualImplication（作者认定的实际含义）、clueRole、realizedChapter（线索真正落地正文的章，Round 3 证据生命周期使用）。

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

Red Herring = 真实 observable fact + 合理但错误的 interpretation。

- 必须有 observableFact（现实事实基础）；
- 必须有至少一个 plausible wrong interpretation；
- 必须有 actualImplication（作者知道真实含义）；
- 禁止“作者提供后来证明根本不存在的假事实”。

clueRole：fair（公平线索）、corroborating（佐证）、ambiguous（模棱两可）、red-herring、payoff（回收铺垫）、exculpatory（开脱）。

## 时序

1. firstAvailableChapter ≤ intendedDiscoveryChapter；
2. 线索的可用章应早于其支撑声明的计划揭示章（否则该线索无法参与揭示前的推断）；
3. 结局允许出现 confirmation evidence，但核心推断所需的事实不能全部到最后才第一次出现（deus ex machina 是 error）。
