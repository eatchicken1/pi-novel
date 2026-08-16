# Source of Truth

| 存储 | 职责 |
| --- | --- |
| novel.yaml | human-editable project metadata |
| manuscript/*.md | manuscript prose authority |
| Novel Engine canonical artifacts（legacy：chapters/、outline/unified/、continuity/ledgers/ 等） | narrative/canon authority |
| SQLite（project/workspace） | indexes、relationships、task status、ChangeSet state、history、derived read models |

## 禁止

同一个业务字段 JSON 与 SQLite 都可独立修改。

SQLite 是索引/状态/派生层：删除 SQLite index 必须能从 authoritative files/engine 重建
（rebuildProjectReadModels）；SQLite 不能重建正文 → 正文 authority 仍在文件。
