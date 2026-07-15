# 小说项目目录

每部小说位于 `novels/<project-id>/`，`project-id` 使用小写字母、数字和连字符。

```text
<project-id>/
├─ project.json
├─ style-guide.md
├─ story-bible.md
├─ world/
├─ characters/
├─ outline/
├─ timeline/
├─ drafts/
├─ chapters/
├─ summaries/
└─ continuity/
```

请通过小说 Extension 工具写入这些目录。章节原文放在 `chapters/`，结构化事实和摘要单独保存，避免把全部正文长期注入模型上下文。
