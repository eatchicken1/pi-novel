# Question Management

## Narrative Question ≠ TruthClaim
小说除了“凶手是谁”还有读者问题：她会不会离开？丈夫到底知道多少？领导为什么压调查？她能不能保住职业？案件解决后她还会复合吗？

## 生命周期
openedAtMovementId → deepenedAtMovementIds → partialAnswerRefs → closedAtMovementId + finalAnswerRef。

## Checker（主要 warning）
- QUESTION_OPEN_TOO_LONG_WITHOUT_DEEPENING：跨 >=3 个 movement 未深化；
- QUESTION_CLOSED_WITHOUT_PAYOFF：关闭但没有 finalAnswerRef；
- TOO_MANY_SIMULTANEOUS_MAJOR_QUESTIONS：同一 movement 开放 >5 个；
- ALL_MAJOR_QUESTIONS_CLOSE_BEFORE_CLIMAX：高潮前全部关闭，结尾没有读者问题支撑。
