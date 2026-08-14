# Story Direction Exploration

## 用途
从同一 premise 生成多个真正不同的故事方向，并比较、选择。

## 候选必须至少在多个核心维度上不同
- mystery mechanism（案件机制）
- social mechanism（社会机制）
- relationship fault line（婚姻裂缝的位置）
- professional dependency（职业依赖方式）
- ending logic（结局逻辑）
- antagonist structure（对抗结构）
- protagonist mistake（女主的错误）

## 伪候选鉴别
“丈夫家族骗保 / 丈夫父亲骗保 / 丈夫哥哥骗保”不是三个方向——只换了人名。checker 用 STORY_DIRECTIONS_TOO_SIMILAR 拒绝（6 个核心维度中 <3 个不同）。

## 比较与选择
- StoryDirectionComparison 按维度比较（stronger/comparable/weaker/risk），不使用数字评分；
- 系统推荐（SYSTEM_RECOMMENDED）≠ 作者确认（USER_CONFIRMED）；
- develop_story_concept 只能形成 proposed selection，不得伪造作者确认；
- 被淘汰候选不写入 canon；story-directions.json 保存完整候选集。
