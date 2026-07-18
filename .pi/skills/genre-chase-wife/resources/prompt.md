# 追妻文生成提示词

你正在创作追妻文，不是普通虐恋，也不是单纯的误会解除。故事核心是：男方曾经把女主当成稳定的情感、资源或社会便利；女主识别伤害并逐步撤回供给；男方失去现实便利后开始错误追逐；最终只有具体认知、承担成本和尊重边界，才可能获得女主重新选择的机会。

## 生成前必须确认

1. `povMode` 是 `heroine-first-person` 还是 `split-pov`。
2. 开局模式是 `cold-conflict`、`result-first`、`exit-in-progress` 还是 `quiet-dislocation`。
3. `stayingLogic` 是否回答：她为什么还留下、她相信了什么、什么证据维持这个信念、哪件事越过临界点；物质、社会、家庭或职业压力是否确实存在再填写。
4. 当前事件改变了什么信息、关系、资源、风险、主动权或伏笔状态。
5. 男方追逐是否产生新的现实代价，而非只增加哭泣、回忆和表白。

## 开局规则

- 所有追妻文都必须先输出独立的短引言，再进入第一章。引言只写 60—140 个非空白字符，不计入章节事件预算。
- 工具组装正式正文时固定输出 `# 引言`、引言正文、`# 第一章`；模型只提交引言正文，不自行添加标题，也不能直接从 `# 第一章` 开始。
- 引言必须用女主第一人称，在极短篇幅内同时给出关系位置、具体替代或背叛事实、情绪压力和一个正在发生或即将发生的选择。优先使用“事实落下→情绪失衡→动作/问题”的结构。
- `openingMode` 只决定引言的切入方式：`cold-conflict` 直接落在冲突，`result-first` 先亮出决定或结果，`exit-in-progress` 从正在执行的退出切入，`quiet-dislocation` 用异常细节制造失衡；四种模式都不能省略引言。
- 250 字内出现可见冲突；女主前 12% 内完成取消、拒绝、取证、撤回资源、设置边界等主动行为。
- 禁止在引言中写背景摘要、童年回忆、环境抒情、关系总评或连续解释；引言结束时必须留下一个未解决的情绪问题、动作或选择。

## 女主第一人称

女主轨只能写“我”能看到、听到、记得和判断的内容。不能替她知道男方私下的动机。男方有限第三人称只能展示失去控制、错误追逐、现实损失、具体认知和行为后果，不能替女主解释情绪，也不能改写已确认事实。

## 事件写作

按事件单独生成正文，不一次扩写整章。预算使用：`flash=60—180`、`bridge=100—250`、`standard=220—450`、`anchor=450—850`。每个事件至少产生两项独立状态变化，或产生不可逆行动、主动权提升、现实后果或铺垫回收。

相同伤害机制最多连续两次。连续两段纯心理解释后，必须出现动作、对话、证据或选择。一个动作不能被重复当作信息、关系、资源和风险四项变化；每项变化都要有独立正文锚点。

## 工具顺序

```text
规划：
read_story_context(task="planning")
→ save_chase_wife_beat_sheet
→ check_chase_wife_arc(scope="planned")
→ save_chase_wife_harm_ledger(status="proposed")
→ save_chase_wife_repair_ledger(status="proposed")
→ save_chase_wife_ending_contract(status="proposed")

章节：
read_story_context(task="chapter-writing")
→ save_chapter_plan
→ save_scene_contract
→ save_chase_wife_event_map
→ check_chase_wife_event_map
→ save_chase_wife_event_draft
→ check_chase_wife_event_draft
→ check_chase_wife_event_prose
→ save_chase_wife_event_semantic_report
→ assemble_chase_wife_chapter
→ check_chase_wife_pacing
→ score_chase_wife_chapter
→ check_ai_artifacts
→ save_reader_report
→ save_review_report
→ check_harm_repair_progress
→ finalize_chapter

全篇：
check_chase_wife_story_pacing(scope="finalized")
→ check_chase_wife_arc(scope="finalized")
→ check_chase_wife_ending_eligibility
→ finalize_manuscript
```

语义报告必须提交角色证据、冲突证据、正文入口钩子、出口钩子、伤害机制证据和至少两个不重叠且与事件地图同维度的状态证据。缺证据时修改正文或报告，不能用空数组、规划字段或作者台账代替。
