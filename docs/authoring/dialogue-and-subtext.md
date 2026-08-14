# Dialogue and Subtext（Round 9）

## Dialogue as Action

对话承担人物行动：问 / 躲 / 逼 / 试探 / 误导 / 控制 / 缓和 / 切断 / 交换 / 挑战 / 求证（SceneBeat.speechIntent）。回答模式支持 answer / partial-answer / deflect / counter-question / silence / misdirection / emotional-answer / procedural-answer / action-response。

## 检查（正文确定性 + 模型语义）

- DIALOGUE_SHARED_KNOWLEDGE_EXPOSITION：双方互相告诉对方两人都知道的信息；
- DIALOGUE_TOO_TRANSACTIONAL：连续 Q→完整 Answer；
- RELATIONSHIP_DIALOGUE_TOO_EXPLICIT：关系冲突直接说出主题；
- SILENCE_OVERUSED：沉默承担全部冲突；
- DIALOGUE_THEN_EXPLANATION_OVERUSED：对话后的解释性心理复述成模式；
- DIALOGUE_VOICE_INTERCHANGEABLE（模型）：换名字后对白完全成立；
- CHARACTER_VOICES_CONVERGE（模型）：主要角色句长/语气/词汇/回避方式同质。

## Subtext

SceneDesign.subtext = { surfaceMeaning, underlyingIntent }，只用于重要关系场景（“今天几点回来？”→ 确认你是不是又去了公司）。声明无行为证据 → SUBTEXT_WITHOUT_BEHAVIOR（对照 scene semantic report 的 evidence）。不每句强制 subtext；不为“有潜台词”故意答非所问。
