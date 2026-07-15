# 小说项目目录

每部小说位于 `novels/<project-id>/`。`project-id` 只允许小写字母、数字和连字符。所有正式读写都通过 Novel Extension 工具完成。

```text
<project-id>/
├─ project.json
├─ canon/                 # 已确认正史、决策、事实和术语
├─ story-bible.md
├─ style-guide.md
├─ characters/
├─ world/
├─ outline/
├─ work/                  # 计划、场景合同、草稿、候选事实、恢复点
├─ chapters/              # 已定稿正文
├─ summaries/
├─ timeline/
├─ continuity/            # 完整性和语义报告
└─ transactions/          # 定稿事务日志
```

`work/` 中的提案、草稿和报告不会自动成为正史。章节定稿必须经过计划、场景合同、最新草稿、完整性报告、语义报告和 `USER_CONFIRMED` 校验。
