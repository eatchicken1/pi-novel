# 女性社会派悬疑 Vertical Engine（Round 6）

## 什么是女性社会派悬疑

不是「普通推理案 + 旁边附一个社会议题」，也不是「爽文式独立女性宣言」。它的 genre promise 是：

- 悬疑的真相由社会结构生成：事件真相（发生了什么）→ 行动者真相（谁做了什么）→ 系统真相（为什么能长期发生）→ 个人真相（女主原先误解了什么）；
- 社会问题必须进入因果链：机制 → 事件 → 阻力 → 信息受限 → 人物选择 → 代价；
- 女主是结构中的行动者：职业身份给她调查的通道，也给她被问责的代价；
- 婚姻不是附属情感线：长期互动模式放大当前冲突，婚姻破裂与案件真相互为因果；
- 结局允许「案件解决、制度未变」——甚至更真实。

## Artifact：FemaleSocialSuspenseDesign（outline/genre/female-social-suspense-design.json）

一个聚合 JSON，避免 10 个零碎文件：

- `socialArchitecture`：社会问题 + 具体 system mechanisms（受益方/成本承担方/事件兑现）；
- `truthLayerMap`：claim → event | actor | system | personal（不修改冻结的 Mystery schema）；
- `suspense.falseModel`：中篇需要可被推翻的中间解释；
- `marriagePatterns`：长期互动模式（触发→默认反应→短期收益→长期成本→隐藏假设）；
- `professionalDilemmas`：职业规范 vs 私人关系（不是「要不要做坏事」）；
- `professionalPlotDependency`：职业生成情节的通道；
- `chaseArcReview`：wrong pursuit 是否源于核心缺陷、repair 是否针对伤害机制、regret 是否伴随信念改变；
- `collisionAnalysis`：跨引擎碰撞的类型（co-occurrence / causal / dilemma / identity）；
- `antagonisticForces`：个人/制度/家庭系统/职业激励/社会规范/自我欺骗/时间资源约束；
- `socialResolution`：个人结局/案件结局/制度变化/制度抵抗/未消解残留/代价分布；
- `themeArchitecture`：主题必须通过选择、后果、反复对照、资源分配、边界、制度回应体现；
- `storyMovements`：乐章（不固定命名），每个乐章必须有不可逆变化或退出条件；
- `commercialForm`：开篇异常章、中点重释章、晚曝光章、结局余震、章节出口压力；
- `supportingCharacters`：配角独立目标/信息位置/忠诚/杠杆/冲突/独立代价。

人物矛盾画像单独放 character layer（save_character_contradiction_profile）。

## 工具

- `save_social_suspense_design` / `check_social_suspense_design`（确定性交叉验证，无评分）；
- `save_character_contradiction_profile` / `check_character_complexity`；
- `check_vertical_story_quality`（模型评审，findings 必须引用真实结构证据，无虚假分数）。

## 与 reader-sim 的关系

design 与 contradiction profiles 是作者秘密：作者侧（planning/chapter-writing/continuity-review）读取（vertical-design 优先级 9），reader-sim 一律不读。
