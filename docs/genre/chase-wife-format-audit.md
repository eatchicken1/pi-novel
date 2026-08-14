# 追妻文格式审计与优化方案

审计时间：2026-07-16（分支 `codex/genre-chase-wife`，相对 `origin/main` 共 20 个提交）

审计范围：`.pi/skills/genre-chase-wife/**`（Skill + 6 个资源）、`docs/genre/chase-wife-market-research.md`、`docs/genre/chase-wife-reference-analysis.md`、`.pi/extensions/novel-agent/**`（schemas.ts / tools.ts / services/project-store.ts）、`packages/coding-agent/test/genre-chase-wife.test.ts`（24 个用例）、`chase-wife-fixtures.test.ts`（4 个真实感夹具）。

结论先行：**追妻文格式总体正确、门禁严格、与市场研究一致**；风格在 Skill 体系内自洽。但存在三类问题需要处理：

1. 文档（Skill/资源）与实现（schema/工具）**漂移**：若干必填字段和门禁在文档中不存在；
2. 实现**比文档更严**的未文档化门禁，会让模型产生困惑性失败；
3. 两个**真实逻辑缺口**：全篇节奏检查（working 范围）找不到引言中的冲突标记；schema 的引言长度上限与“非空白字符”规则冲突。

---

## 一、格式正确性审计

### 1.1 引言（开篇入口）—— 正确

规格（SKILL.md 类型不变量、prompt.md 开局规则、beat-template.md）：60—140 非空白字符、女主第一人称、包含 openingConflictMarker、不含标题；组装时由工具加 `# 引言` / `# 第一章`。

实现（`validateChaseWifeOpeningIntro`，project-store.ts:152-168；`chaseWifeChapterOnePrefix`，170-172；组装 2548-2558）：

- 60—140 非空白字符：✓ 用 `countChineseCharacters`（去空白后计数）。
- 第一人称：✓ 含汉字时必须出现 `我|我的|我把|我看见|我看見|I|I'm|me`（宽松：对话中的“我”也算，机械门可接受）。
- 标记必须出现在引言中：✓（仅对含汉字文本生效；纯英文引言跳过该检查，测试依赖此行为）。
- 不含标题、组装输出顺序：✓ 有测试断言（`# 引言` 在 `# 第一章` 之前，引言在两者之间）。

**偏差 1（schema 层）**：`SaveChaseWifeBeatSheetSchema.openingIntro` 与 `SaveChaseWifeEventMapSchema.openingIntro` 用 `maxLength: 140` 限制**原始字符串长度**（含空白），而规则是 140 个**非空白**字符。引言含换行/空格且非空白字符在 130—140 区间时，会在 schema 校验阶段被拒，永远到不了 store 的正确检查。中文引言通常无空格，实际影响小，但规则自相矛盾。

**偏差 2（working 范围全篇节奏）**：`checkChaseWifeChapterPacing` 在**组装稿**（含引言）上搜 `openingConflictMarker`（2593），正确；但 `checkChaseWifeStoryPacing(scope="working")` 只在**事件 1 草稿**里搜（2697-2702）。由于标记被规则强制放在引言里，符合规格的章节在 working 范围必然得到 `firstConflictPosition=-1` → 假阳性警告 "first visible conflict is not verified within 250 characters"（warning 级）。现有测试全部靠“在事件 1 正文里重复一遍标记”规避（fixtureEventProse 前缀“交出位置。”“撕掉名额”等），该重复要求**文档从未写明**。finalized 范围在整章上搜（2759），没有此问题。修复后需补回归测试：标记只在引言中时，working 范围也必须通过。

### 1.2 事件地图与预算 —— 正确

- 3—6 事件/章、事件 ID 连续、cause 只能指向更早事件：✓（1978-2006、2063-2070）。
- 长度预算 flash=60—180 / bridge=100—250 / standard=220—450 / anchor=450—850：✓ 与 rhythm-and-pacing.md 逐字一致（130-135）。
- 相邻事件伤害机制最多连续两次：✓ 章节内（2130-2137、2610-2615）与跨章（2803-2806）都查。
- 相邻事件不可互换：✓ `normalizedEventSignature`（626-628）+ 草稿 trigram 相似度 ≥0.78（2616-2618）。
- 章节内事件 `eventId` 上限 8 而事件数上限 6：无害，但字段与数组约束不一致，可顺手收紧为 6。

**偏差 3（事件最低要求）**：prompt.md 写“每事件至少产生两项独立状态变化，或产生不可逆行动、主动权提升、现实后果或铺垫回收”；实现（2004）只认“两项状态变化（信息/关系/资源/风险四个数组）或不可逆或主动权提升”，**“现实后果或铺垫回收”不成立**。`real-consequence` 角色事件若只声明 1 个 delta 且无主动权提升，会被拒。

**偏差 4（角色与弧线位置不绑定）**：六章回归测试中第 3 章第 1 个事件是 `self-rebuild`，而不可逆退出在第 3 章第 2 个事件（测试 1214-1279）——重建发生在退出之前，没有任何门禁拦截。文档说“女主退出后重建”，事件级没有角色↔弧线位置校验（只有 male POV 必须在退出后、开篇角色匹配 openingMode 两条）。

### 1.3 主动权（agency）—— 实现比文档严

**偏差 5（未文档化的 5 维状态）**：`ChaseWifeEventSchema` 强制要求 `heroineAgencyStateBefore/After`（epistemic/relational/material/social/future，各 0—4），而 beat-template.md / prompt.md / emotion-arc.md 只字未提这 5 个维度；同时事件还保留 0—100 的 `heroineAgencyBefore/After`。**两套表示并存**：升级次数用 0—100（2801），维度数用 5 维（2796-2798，`narrow-agency-track` 要求退出前至少 2 个维度变化，2826）。模型不看 schema 根本不知道要填什么、维度怎么算。

**偏差 6（连续性规则比文档严）**：文档（rhythm-and-pacing.md）写“退出后主动权不能无理由回退”；实现（2787、2791-2794）要求事件间 **0—100 与 5 维都严格相等**（`heroineAgencyBefore !== previousHeroineAgency` 即报 `agency-discontinuity`，上跳也报错）。时间跳跃里的离屏成长（如新生活阶段跨月重建工作室）必须靠额外“带升幅的事件”显式承载，否则报错。文档未说明。

### 1.4 台账与证据绑定 —— 正确且强

- 证据锚点（startChar/endChar/excerpt + contentHash）绑定当前正史：✓（1485-1527、1509-1510）。
- 证据必须落在被引用事件的事件区间内（manifest 提供区间）：✓（2301-2367），测试断言 "stay inside its referenced event prose range"（1331）。
- confirmed 写入必须 USER_CONFIRMED + 当前正文证据：✓（1736-1794、2006 测试）。
- 组装/定稿要求所有事件预算报告 + 模型语义报告 + 当前 hash 匹配：✓（2541-2544、2962-2980）。

**偏差 7（harmRefs/repairRefs 未文档化但实际必需）**：confirmed 台账的绑定依赖事件地图里的 `harmRefs`/`repairRefs`（2294-2295、2339-2363），但 beat-template.md 的事件模板与 SKILL.md 固定流程只列了 `beatRefs`。模型不知道要填，填错又无法确认台账。

### 1.5 结局契约 —— 正确，但分型映射不完整

- 三模式（earned-reunion / no-reunion / open-ending）+ 结构化 `eligibilityRules` + 自由文本 `reunionEligibilityRules` 只作说明：✓（1906-1927、1908-1910）。
- 三种模式都要求女主独立未来证据 + finalized 的 final-boundary 事件；earned-reunion 还要求可接受的可信修复、识别与赔偿：✓（1928-1952）。
- “追妻不等于必须复合”、结局回到女主选择：✓ 与 market-research.md 一致。

**偏差 8（四种市场分型 → 三种模式）**：market-research.md 给出四种结局分型（复合型/破镜不重圆型/换伴侣型/独立收束型）；schema 只有三种模式，**“换伴侣型”无法显式表达**（没有新伴侣事件角色，只能当 no-reunion 写）。映射关系未文档化。

### 1.6 组装与定稿 —— 正确

- 组装输出 `# 引言 → 引言正文 → # 第一章 → 事件正文`：✓（2550-2551），有测试断言。
- 定稿门：事件预算报告 + 模型语义报告 + 组装 manifest + 章节节奏 ok + 评分 passed + AI 痕迹 passed + Reader/Review 结构化报告 ok + harm-repair 非 stalled + 连续性 + USER_CONFIRMED：✓（2941-2996），`finalizeChapter` 拒绝任何缺失。
- 全篇门：finalized 节奏 + 结局资格 + finalized 弧线 + 封存 + 导出：✓（1388-1422）。

---

## 二、风格一致性审计

### 2.1 Skill 文档风格 —— 基本一致

- 其他 Skill（chapter-writing / story-review / story-memory / continuity-review / writing-principles）统一用 `何时加载 / 负责什么 / 不负责什么 / 固定流程 / Resource / 完成条件`；chase-wife SKILL.md 用 `加载条件 / 负责与不负责 / 类型不变量 / 固定流程 / 必须加载的资源 / 完成条件`。结构与语气一致，仅小节名有轻微漂移（加载条件 vs 何时加载、必须加载的资源 vs Resource）。
- 题材处理模型不对称：suspense / urban-romance / light-fantasy 是通用 Skill 下的**一段话资源**（chapter-writing/resources/genre/*.md 各 3 行）；chase-wife 是**一级题材**（独立 Skill + 6 资源 + 15 个专属工具 + 专属门禁）。这是刻意的试点设计，但意味着“追妻文格式”的刚性远高于其他题材，跨题材复用公共流程时容易踩类型隔离（SYSTEM.md 已声明隔离规则）。

### 2.2 散文风格门 —— 一致

- AI 痕迹门（1424-1477）覆盖：模板表达（仿佛/似乎/不禁/总之/这意味着 ≥3）、重复句式开头、破折号 ≥4、心理结论/道歉重复、连续纯心理段、动作后解释、段落长度均匀。与 writing-principles/SKILL.md（解释过度、句式同质化、模板化表达）一致。
- 事件散文门（2429-2478）：重复整句、规划字段泄漏（“事件 1：”“情绪分析”等）、纯心理段 >2、第一人称标记、行动证据。与 fixture 的四个真实感夹具语义一致（tight-pass 通过、dragging-fail 因“回到门口”无进展、fake-remorse-fail 因只有道歉、overexplained-fail 因“这意味着”）。
- 注意：tight-pass 夹具在 AI 痕迹门得到 **warning**（约 1 个发现，多半是段落长度均匀），说明“通过”不等于“零发现”；门禁允许 ≤1 发现。

### 2.3 锚点坐标系 —— 风险点

事件语义报告锚点相对**事件草稿**（2514），台账锚点相对**组装/定稿章**（含引言，1500-1527、1509）。两套坐标系都以“去空白字符”计位，夹具用 manifest 的 startChar 换算。模型在实际写作时容易混用（同一种 startChar/endChar 结构，基准不同），prompt.md 未说明。属可用性风险，不是正确性错误。

### 2.4 代码质量杂项

- `checkChaseWifeEventProse` 存在两段重复的 `missing-first-person-evidence` 修补逻辑（2450-2457，死代码）。
- `checkAiArtifacts` 的模板模式表里混入乱码变体（“浠夸經”“鈥斺€”等，1444-1457），是 UTF-8 被按 GBK 读取后的乱码形态——防编码损坏的补丁，但混在风格门里语义不纯，且破折号计数把乱码形态与正常形态相加，存在双重计数风险。
- `checkChaseWifeStoryPacing` 对 causalExitMarker 有两段重叠扫描（2704-2718），可合并。

---

## 三、市场调研对照

分支自带调研（market-research.md，2026-07-16，来源：晋江《一篇追妻火葬场文》《他开始追妻之后》、番茄《追妻火葬场？不，我选择给绿茶男开死亡证明》、Save the Cat!、Story Grid）与 9 篇参考文本拆解（reference-analysis.md）结论与实现一致：

| 市场要点 | 实现 | 判定 |
| --- | --- | --- |
| 开篇用可见偏爱证据而非背景交代 | 引言 60—140 字 + 250 字内冲突标记 | ✓ |
| 中段卡点是“女主停止索取”（3—4k 字，30—40%） | paywallHook ≤ 前半段（≤50%）；不可逆退出 45—55%（standard） | ⚠ 见偏差 9 |
| 追悔 = 失控 + 理解两阶段，须有现实代价 | pursuit 事件须 ≤55/65% 起、real-consequence 角色、修复须有 costToMale + 证据 | ✓ |
| 新生活与边界是结局线（≥15%） | self-rebuild + final-boundary 字数 ≥15% | ✓ |
| 结局分型先定，追悔强度后定 | ending contract 在规划期以 proposed 写入 | ✓ |
| 不复制参考文触发器 | 事件按机制抽象，禁止复用人物/事件/句子 | ✓（文档层面） |

补充调研（2026-07-16 web 检索，均为二手写作指南，仅作市场信号，不作文本依据）：[追妻火葬场框架思路总结](https://www.xiaohongshu.com/discovery/item/68761491000000002400f667)、[短篇追妻火葬场万能写法](https://www.xiaohongshu.com/discovery/item/69dfac6c0000000023014305)、[追妻火葬场怎么写（写文套路）](https://www.xiaohongshu.com/discovery/item/66e035d00000000027007022)、[为什么新人的追妻火葬场总是写得很套路](https://www.xiaohongshu.com/discovery/item/68513b3500000000220040ef)。其共识（前段伤害累积、中段女主停止付出、后段男主追悔承担代价、结局不必须复合）与分支设计一致。

**偏差 9（付费卡点位置）**：market-research.md 自己写卡点约在 3,000—4,000 字（30—40%），而实现把 paywallHook 限在前半段（≤50%）并把不可逆退出放在 45—55%（standard）。两者可自洽（卡点附着在退出/证据/公开后果上），但 30—40% 与 45—55% 之间有 5—15 个百分点的空隙，fast-burn 模式（35—45%）更接近市场位置。建议明确：要么把 paywallHook 带宽收紧到 ≤45%，要么在文档中说明“卡点可以早于正式退出”。

---

## 四、问题清单（按优先级）

### P0 真实缺陷（先修）

1. **working 范围全篇节奏找不到引言中的冲突标记**（project-store.ts:2697-2702）：符合规格的章节产生假阳性 warning；“标记必须同时出现在事件 1 正文”是未文档化的隐性要求。修法：working 范围改为在组装稿（或引言+事件 1）上搜标记；补回归测试（标记仅在引言中）。
2. **schema `openingIntro` 的 `maxLength: 140` 与“60—140 非空白字符”规则冲突**（schemas.ts）：含空白的合法引言会被 schema 提前拒绝。修法：去掉 maxLength（store 已有正确校验），或改为按去空白长度校验。

### P1 文档-实现漂移（对齐）

3. **事件必填 5 维 agency 状态未文档化**（schemas.ts + narrow-agency-track 门）：在 beat-template.md / prompt.md 补充 5 维定义与 0—4 量级说明，并说明 0—100 与 5 维的关系；或把 5 维改为可选并让窄轨门降级。
4. **agency 连续性规则比文档严**（2787、2791-2794）：文档写“不能无理由回退”，实现要求严格相等（上跳也报错）。修法：允许带证据的上跳（如 self-rebuild 事件），仅禁止无 setback 的回退；或改文档并把门写明。
5. **伤害机制分类法三处不一致**（docs 9 种 vs 事件级 7 种 vs 台账 9 种且命名不同）：`deception`（欺骗）、`boundary-violation`（边界侵犯）在事件级缺失；`substitution` vs `deprioritization`、`betrayal-evidence` vs `future-betrayal` 命名分裂。修法：统一为单一枚举（事件级补两种机制），台账分类用别名映射，夹具同步。
6. **harmRefs/repairRefs 实际必需但未文档化**：在 beat-template.md 事件模板与 prompt.md 工具说明中补充。
7. **事件最低要求少了“现实后果/铺垫回收”分支**（2004 vs prompt.md）：补进实现或改文档。
8. **回忆比例基准不一致**（文档“退出前正文 15%” vs 实现“每章 15%”），“每段回忆 300 字内重新解释”未实现：明确基准并写进 rhythm-and-pacing.md，或实现退出前基准。

### P2 规格细化

9. **结局分型映射**：文档写明 4 种市场分型 → 3 种模式（换伴侣型 = no-reunion + 独立未来），或增加新伴侣事件角色。
10. **beat sheet schema 最小值不可达**（heroineArc minItems 4 / maleArc 3，而 checkChaseWifeArc 要求 5/5 个相位）：把 schema 最小值对齐到 5/5。
11. **付费卡点带宽**：明确 paywallHook 与退出位置的带宽关系（见偏差 9）。
12. **锚点坐标系说明**：prompt.md 写明事件锚点相对事件草稿、台账锚点相对组装章（含引言）。

### P3 代码卫生（可选）

13. 删除 `checkChaseWifeEventProse` 重复修补块（2450-2457）。
14. 乱码模式从 AI 痕迹门拆出为独立的编码完整性检查（或至少加注释说明用途）。
15. 合并 `checkChaseWifeStoryPacing` 的 causalExitMarker 两段扫描（2704-2718）。
16. 事件 `eventId` 上限从 8 收紧到 6，与 3—6 事件约束一致。
17. 实操建议：本工作区未安装 node_modules，测试无法本地运行；改动后先 `npm install --ignore-scripts`，再跑 `node ../../node_modules/vitest/dist/cli.js --run test/genre-chase-wife.test.ts test/chase-wife-fixtures.test.ts` 与 `npm run check`。

---

## 五、优化方案（分阶段）

### 阶段一：修真实缺陷（P0，1 个会话）

- 改 `checkChaseWifeStoryPacing` working 分支：`firstConflictPosition` 先在引言（`mapValue.openingIntro`）里找，找不到再在事件 1 草稿里找，位置按 introChars 偏移；与 finalized 行为对齐。
- 新增回归测试：引言含标记、事件 1 不含标记 → working 范围 status 不得含 `opening-conflict-late`；同时保留现有“标记缺失 → 必须报错”的测试（1020）。
- 改 schemas.ts：`openingIntro` 去掉 `maxLength: 140`（store 层校验更准）；补一个含空白引言的测试。

### 阶段二：统一术语与文档（P1）

- schemas.ts 与 project-store.ts：`ChaseWifeInjuryMechanismSchema` 增加 `deception`、`boundary-violation`；台账 `category` 用 alias 映射到同一枚举（deprioritization→substitution、future-betrayal→betrayal-evidence 等），或反过来统一命名。
- beat-template.md / prompt.md：补充 5 维 agency 状态、harmRefs/repairRefs、事件锚点 vs 台账锚点坐标系。
- 决定 agency 连续性策略（允许带证据上跳）并同步 rhythm-and-pacing.md。
- 决定回忆比例基准（每章 vs 退出前）并同步文档与实现。

### 阶段三：规格细化（P2）

- 结局分型映射文档化（4→3）。
- schema 最小值 5/5；paywallHook 带宽决策；eventId 上限 6。

### 阶段四：代码卫生（P3）

- 删死代码、拆乱码检查、合并重复扫描。

建议按“阶段一 → 阶段二”推进并各配一个提交；每个阶段跑相关测试 + `npm run check` 后合并。
