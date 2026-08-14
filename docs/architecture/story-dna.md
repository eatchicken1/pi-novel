# Story DNA：题材维度的解耦与能力解析

## 1. 为什么单一 genre 字符串不足

把 `chase-wife` 当作 primary genre 会把三类互不相同的语义混进一个字符串：

1. **主题材**（genre）：故事属于哪个类型市场（悬疑、都市情感、轻幻想……）；
2. **关系机制**（relationship mechanism）：故事内部如何组织一段关系的伤害、退出、追逐与修复（追妻、熟龄婚姻危机……）；
3. **职业领域**（professional domain）：故事发生在什么专业现场（保险欺诈调查、法医、金融……），决定职业写实的素材与因果。

真实项目需要组合：一部《女性社会派悬疑 × 熟龄婚姻 × 保险欺诈调查》小说，其“追妻”不是题材而是关系引擎。单一 genre 无法表达这种组合，也导致 chase-wife 的台账、门禁和上下文加载全部被 primary genre 绑定——这是本轮要解除的根本问题。

## 2. primaryGenre（主题材）

故事在类型市场上的定位。已知值：`suspense`、`urban-romance`、`light-fantasy`、`chase-wife`（legacy）、`female-social-suspense`。允许扩展：任何字符串都可保存，归一化只处理已知别名（如 `追妻文` → `chase-wife`、`女性社会派悬疑` → `female-social-suspense`）。

## 3. relationshipMechanisms（关系机制）

故事内部用于组织人物关系的机制列表，可同时存在多个。已知值：`chase-wife`、`mature-marriage-crisis`；允许扩展（未知值安全保存，但不会自动获得任何已知机制的能力）。机制决定：关系台账（harm/repair ledger）、关系弧线、主动权与修复门禁。

## 4. professionalDomain（职业领域）

故事的专业现场，例如 `insurance-fraud-investigation`。本轮只保存字段；职业写实、术语与专业因果由后续 Professional Domain Engine 负责（Phase 4）。

## 5. themes（主题）

故事要表达的主题列表，例如 `female-agency`、`marital-boundaries`。仅作创作方向输入，不参与能力解析。

## 6. storyForm（故事形态）

篇幅/连载形态，例如 `short`、`mid-length`、`serial`。仅作元数据，不参与能力解析。

## 7. legacy genre 兼容

`project.json` 保留 `version: 1` 与 `genre` 字段，永不要求旧项目迁移。解析规则：

- 无 `storyProfile`：`genre = "chase-wife"` 解析为 `primaryGenre = "chase-wife"` 且 `relationshipMechanisms = ["chase-wife"]`；其他 genre 解析为 `mechanisms = []`；
- 有 `storyProfile` 且显式提供 `relationshipMechanisms` 数组：以数组为准（空数组 = 明确不要关系机制）；
- 有 `storyProfile` 但未提供 `relationshipMechanisms`，且 legacy `genre` 是 chase-wife：继承 `["chase-wife"]`，避免旧调用意外失去能力。

## 8. capability resolution

集中实现于 `.pi/extensions/novel-agent/services/story-profile.ts`：

- `resolveStoryProfile(project)`：读取 project.json，统一解析出完整 StoryProfile；
- `hasRelationshipMechanism(project, mechanism)`：项目是否具备指定机制；
- `hasChaseWifeCapability(project)`：`hasRelationshipMechanism(project, "chase-wife")` 的别名；
- `normalizePrimaryGenre` / `normalizeRelationshipMechanism`：别名归一化。

所有 chase-wife 工具的可用性、上下文加载、章节定稿门、质量报告要求、导出封存校验都必须通过这些解析函数，禁止散落 `project.genre === "chase-wife"`。

## 9. Skill loading matrix

| 项目能力 | 加载的 Skill |
| --- | --- |
| primaryGenre = female-social-suspense | `genre-female-social-suspense`（skeleton） |
| 含 chase-wife mechanism | `genre-chase-wife`（关系机制规则） |
| 含 mature-marriage-crisis mechanism | 未来 `mechanism-mature-marriage` |
| primaryGenre = suspense / urban-romance / light-fantasy | 通用 Skill + 对应 genre resource |
| primaryGenre = chase-wife（legacy） | `genre-chase-wife` |

主题材 Skill 与关系机制 Skill 同时加载、互不替代：Chase Wife 只负责关系伤害/退出/追逐/修复/结局资格，不负责线索与调查。

## 10. 示例：female-social-suspense + chase-wife

```json
{
  "version": 1,
  "genre": "female-social-suspense",
  "storyProfile": {
    "primaryGenre": "female-social-suspense",
    "relationshipMechanisms": ["chase-wife", "mature-marriage-crisis"],
    "professionalDomain": "insurance-fraud-investigation",
    "themes": ["female-agency", "marital-boundaries"],
    "storyForm": "mid-length"
  }
}
```

chase-wife 工具可用、上下文加载关系台账与事件级草稿、章节走事件级定稿门、结局受关系结局资格约束；线索/调查能力由 female-social-suspense 主题材负责（后续轮次）。

## 11. 示例：普通 chase-wife（legacy）

```json
{ "version": 1, "genre": "chase-wife" }
```

解析结果与第 10 条中的关系机制部分等价，全部既有行为不变。

## 12. 示例：普通 suspense

```json
{ "version": 1, "genre": "suspense", "storyProfile": { "primaryGenre": "suspense", "relationshipMechanisms": [] } }
```

chase-wife 工具被拒绝；上下文不读取 chase-wife 台账；定稿不受关系门禁约束。

## 13. 后续扩展原则

1. 新机制 = 新 mechanism 值 + 专属台账/门禁 Skill，不改主题材字段；
2. 新主题材 = 新 primaryGenre + 主题材 Skill，不复制 chase-wife 工具；
3. 已知值保持枚举文档化，未知值一律安全保存、不自动获得能力；
4. API 命名（ChaseWife*、save_chase_wife_*）本轮保持不变，抽象为 RelationshipEngine 另开一轮，避免 scope explosion。
