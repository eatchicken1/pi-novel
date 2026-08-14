# Prose Intelligence（Round 9）

## Voice

- Project Voice Profile（`work/authoring/voice-profile.json`，foundation 阶段保存）：distance / sentenceRhythm / observationBias / emotionalExplicitness / professionalDensity / metaphorDensity / humorLevel / preferredTensionMode / avoidPatterns / characterVoiceNotes。设计目标，不模仿在世作者；
- Voice Fingerprint（`continuity/reports/chapter-NNN-voice.json`）：从当前 prose 分析（sentenceRhythm / interiority / dialogueCompression / professionalVocabulary / emotionLabeling / detectedAvoidPatterns），不用“文学性 87”数值；
- VOICE_DRIFT：连续章节显著偏离 profile（如女主突然变成爽文金句）。

## 反模板

- PROSE_DECORATIVE_WITHOUT_FUNCTION：装饰性比喻/环境抒情无功能；
- MINIMALIST_FRAGMENT_OVERUSE：AI 式“一句。又一句。”极端短句（不 hard fail）；
- DETAIL_WITHOUT_NARRATIVE_FUNCTION / MIXED_METAPHOR / REPEATED_METAPHOR_DOMAIN / CLICHE_METAPHOR（semantic）。

## POV

Observation ≠ Interpretation ≠ Truth。POV_KNOWLEDGE_LEAK：第一人称 narrator 说出自己无法知道的信息。

## 聚合

diagnose_chapter 将 Scene Construction / Dialogue / Subtext / Emotion / Information Delivery / Voice / Professional Detail / Rhythm 聚合进 P1-P4（P0 仍保留给逻辑/authority/realization；文风问题不会产生 P0）。模型语义发现通过 diagnose_chapter 的 modelFindings 通道合并。
