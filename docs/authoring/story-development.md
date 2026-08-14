# Story Development（develop_story_concept / develop_story_bible）

## develop_story_concept

输入模糊创意（如「35 岁保险调查员发现丈夫家族企业可能涉及骗保」），输出可评审的 StoryConcept（premise / protagonistHook+Goal / 五类冲突 / centralDilemma / centralMystery / promises / stakes / contradictions / risks / potential / genericRisks）。概念审查以模型语义推理为主：只有题材没有故事、女主无主动目标、悬疑与婚姻无连接、职业无剧情潜力、落入普通出轨/万能调查员/霸总追妻/单一坏人等 generic risk 时给出 blockers/warnings。

## develop_story_bible

把 concept 发展成 proposed foundation：根据 capability 自动准备 Mystery design、Marriage structure、Professional domain/case、Female Social Suspense design、Character contradiction profiles、Chase Wife beat sheet、主题与重要配角。

- 只写 proposed，绝不自动 USER_CONFIRMED；
- Story Bible 是索引/摘要层（premise / corePromises / main characters / major questions / ending direction / artifactRefs），不复制引擎事实；
- 自动跑适用检查（social design / character complexity），P0 blockers + warnings 返回；
- foundation 就绪度按 Story DNA 动态判断（无对应 capability 不要求对应 artifact）。
