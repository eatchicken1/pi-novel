# Novel MVP benchmark

该基准验证两个非模型依赖的题材流程：`suspense` 和 `urban-romance`。

每个案例执行：

```text
初始化 → 章节计划 → 场景合同 → 草稿 → 完整性检查
→ 语义报告 → 用户确认定稿 → 下一章读取 → 稿件导出
```

验收指标：

- 2 个章节均能按顺序定稿；
- `nextChapter`、`status.json` 和定稿章节一致；
- 上一章摘要能进入下一章任务上下文；
- 导出稿只包含已定稿章节；
- 重复定稿和缺失报告必须被拒绝。

运行：

```text
cd packages/coding-agent
node node_modules/vitest/dist/cli.js --config vitest.config.ts --run test/novel-short-story-benchmark.test.ts
```

普通 Prompt 与完整流程的人工对照应使用相同创意、篇幅、题材和模型，至少比较因果、人物一致性、伏笔、章节推动力、连续性和可修改性。模型输出不作为仓库测试的固定快照。
