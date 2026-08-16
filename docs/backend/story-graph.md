# Story Graph

## 定位

Story Graph 是派生 read model（projection），不是第二 authority。
UI 拖动 node 不直接改变 story truth；未来的 graph edit 必须走 ChangeSet → underlying authority → projection rebuild。

## 节点 / 边

Node type: event / chapter / character / clue / claim / promise / professional-action / relationship-state。
Edge type: causes / reveals / involves / depends-on / harms / repairs / pays-off / knows。

## 数据流

Engine sources（unified event map、characters、clue ledger、truth model、promise ledger）
→ StoryGraphService.buildNodes/buildEdges
→ ProjectDatabase story_nodes/story_edges（replaceAll 整体重建）
→ GET /api/projects/:id/story-graph?chapterFrom=&chapterTo=&nodeTypes=&characterId=

每次查询重建投影（本地规模小图可接受）；engine source 变化 → 投影随下一次查询更新（stale rebuild）。
