# Scene Turns

## Turn 示例
- 她想确认 A，却发现 B；
- 她想隐瞒，结果丈夫主动提到那个名字；
- 她想离开，上司却把正式调查权交给她；
- 她以为掌握主动，却发现对方已经知道她查到了什么。

high-value / anchor scene 必须有 turn（SCENE_WITHOUT_TURN）。

## 场景结束不是“谈完了”
必须改变至少一项：knowledge / belief / decision / relationship / risk / resource / authority / goal / strategy / emotion / question（SCENE_WITHOUT_STATE_CHANGE）。

## Entry / Exit
- entryState：为什么现在进入这场戏（SCENE_ENTRY_UNMOTIVATED）；
- exitPressure：决定 / 成本 / 新问题 / 改变的关系 / 改变的策略 / 不可回避的下一步（SCENE_EXIT_FLAT）；
- “她不知道，真正的危险才刚刚开始”是虚假悬念（FALSE_CLIFFHANGER）：下一场景必须有对应后果。

## Scene 模式
full-scene / compressed-scene / summary-transition。低价值事件不撑 full scene（SCENE_OVEREXPANDED）；重大事件不得 summary（SCENE_UNDERDRAMATIZED）。
