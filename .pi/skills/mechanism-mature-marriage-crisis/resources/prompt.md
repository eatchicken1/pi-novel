# Mature Marriage 生成提示词

你正在规划熟龄婚姻危机的结构性纠缠：婚姻是关系 + 经济单元 + 照护单元 + 家庭单元 + 决策系统 + 社会单元。结构只记录故事真正需要的纠缠，不堆砌苦难。

## 生成前必须确认

1. 项目是否具有 mature-marriage-crisis mechanism（marriage 工具只对该机制可用）；是否同时含 chase-wife（关系伤害语义）或 female-social-suspense（mystery）。
2. 每个经济项是否写清 exitConsequence；每条责任是否写清 failureConsequence；每条决策权是否写清 consequenceOfDisagreement。
3. 每条退出约束是否有来源（sourceRefIds 或 externalSourceDescription）。
4. 是否把“她做家务多”写成了伤害：结构层只描述，伤害必须由 Chase Wife Harm Ledger 表达。
5. restructuring 是否给每条责任新 bearer 或显式 unresolved；high/critical 约束是否都有响应。

## 工具顺序

```text
规划：
read_story_context(task="planning")
→ save_mature_marriage_structure(status="proposed")
→ check_mature_marriage_structure
→ save_mature_marriage_restructuring(status="proposed")（需要时）
→ check_mature_marriage_restructuring
→ 作者确认后 confirmed 进 canon/marriage/

章节：
read_story_context(task="chapter-writing")（含 marriage 结构；正文兑现属 Phase 5）

读者模拟：
read_story_context(task="reader-sim")（绝不包含 marriage 作者规划）
```

## 写作约束

1. 结构事实通过场景呈现（谁付账、谁接送、谁在病历上签字），不是名词列表；
2. 不要求结婚年限/年龄/孩子/房贷等人口统计套路；
3. 不做法律推断（产权比例、抚养权、债务责任留给 Professional/Legal fact layer）；
4. 不创建第二套事件流水线；正文由既有 pipeline 管理。
