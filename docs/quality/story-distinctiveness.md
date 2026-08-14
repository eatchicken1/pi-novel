# Story Distinctiveness（差异性评审 + 确定性交叉验证）

## 问题

多引擎系统容易产出“每个引擎都对，但整体平庸”的故事：四引擎各自跑满，事件却互相独立、动作重复。需要一种既尊重模型判断、又不伪造分数的评审机制。

## 方案

评审（profile）由模型撰写，存入 `evaluations/distinctiveness/story.json`（或按章）：

- `verdict`：distinctive | needs-work | generic-risk；
- `premises[]`：差异性前提（至少 1 条）；
- `engineBlendEvidence[]`：引擎交织证据（模型声称）；
- `risks[]`、`strongestMoves[]`：风险与最强动作（附 evidence）；
- `notes?`。

check_story_distinctiveness 不做评分，只输出确定性统计并交叉验证模型声称：

| 统计/检查 | 含义 |
| --- | --- |
| totalEvents / collisionEvents / byChapter | 复用 unified map 的跨引擎碰撞统计 |
| repeatEvents | 相同 action/consequence/delta 指纹的重复事件数 |
| engineCoverage | 各引擎 delta 覆盖的事件数 |
| DISTINCTIVENESS_MAP_MISSING | 无统一事件地图，统计无法支撑评审（warning） |
| DISTINCTIVENESS_BLEND_CLAIM_UNSUPPORTED | 声称引擎交织但零碰撞（warning） |
| DISTINCTIVE_EVENT_REPEAT | 存在重复事件指纹（warning） |
| DISTINCTIVENESS_VERDICT_OVERSTATED | verdict=distinctive 但 ≥2 个重复指纹（warning） |
| DISTINCTIVENESS_ENGINE_UNUSED | 项目有能力但任何事件都没用到（warning） |
| DISTINCTIVENESS_PROFILE_MISSING | 无评审档案（warning） |

评审不是 finalize 门禁：它是一份可被事实驳斥的模型意见，checker 负责把“声称”与“事实”对齐。
