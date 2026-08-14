# Fact Preservation（事实保全）

## 问题

prose 修订最容易悄悄改掉关键事实（数字、时间、人物关系、职业细节），机械检查查不出语义变化。

## 规则

- 修订前后对关键事实做 diff：金额、日期、名字、证据编号、职业动作、承诺措辞；
- summary.criticalFacts 是声明式事实源：改正文必须同步改声明，否则 FACT_VALUE_CONTRADICTION 会在连续性检查里拦下；
- 数字归一化：中文数字（"两千三"= 2003、万/千单位换算）由 normalizeFactValue 处理，修订时保持同一格式体系；
- PROSE_REVISION_CHANGED_FACT 门禁：revise_chapter 若检测到事实变化而 knowledgeChanges 未声明，直接拒绝。

## 检查

- 修订后跑 checkCriticalFacts（FACT_VALUE_CONTRADICTION）；
- 涉及 truth/线索的事实变更 → severity = authority-change，走 repair_narrative_memory。
