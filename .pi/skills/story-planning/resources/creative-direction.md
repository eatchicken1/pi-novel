# 创作方向记录

每条提案记录 `id`、`content`、`source`、`status`、`visibility` 和 `reason`。

- `source`: `author`、`ai`、`reference`、`inferred`
- `status`: `proposed`、`confirmed`、`rejected`、`unresolved`
- `visibility`: `public`、`character-limited`、`author-only`

只有 `confirmed` 且不属于 `author-only` 的内容，才可以作为正文创作上下文。
