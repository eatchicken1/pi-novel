# Dialogue as Action

## 对话承担人物行动
Dialogue turn 的 speaker wants something：问 / 躲 / 逼 / 试探 / 误导 / 控制 / 缓和 / 切断 / 交换 / 挑战 / 求证（SceneBeat.speechIntent）。

## 回答模式
真实对话不是 Q → 完整 Answer 循环。支持：answer / partial-answer / deflect / counter-question / silence / misdirection / emotional-answer / procedural-answer / action-response。
连续大量 question → direct answer → DIALOGUE_TOO_TRANSACTIONAL。

## 禁止
- 双方互相告诉对方两人都知道的信息（DIALOGUE_SHARED_KNOWLEDGE_EXPOSITION）：
  “我们结婚九年了，你一直是律师，我一直做反欺诈。”
- 关系冲突直接说出主题（RELATIONSHIP_DIALOGUE_TOO_EXPLICIT）：
  “我不信任你”“你不尊重我”“我们的婚姻出了问题”——应通过行为与潜台词表达；
- 沉默承担全部冲突（SILENCE_OVERUSED）；
- 对话后的解释性心理复述成模式（DIALOGUE_THEN_EXPLANATION_OVERUSED）：
  “我不知道。”他说。她知道，他的意思是他其实知道。

## 角色声音
重要角色不能换名字后对白完全成立（DIALOGUE_VOICE_INTERCHANGEABLE / CHARACTER_VOICES_CONVERGE）：
句长、直接度、职业词汇、回避方式、情绪策略、权力位置。
