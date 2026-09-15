# 网站约定

遵循根 [AGENTS.md](../AGENTS.md)。本指南也适用于 `.github/workflows/web.yml`。

## 实现与验证

- 构建、检查入口以 [package.json](package.json) 为准，依赖使用 lockfile。涉及布局取舍时才读 [官网 v3 设计](../docs/design/2026-08-03-website-redesign-v3-design.md)。
- 构建和资源策略遵循 [verify.ts](scripts/verify.ts) 与 [响应头配置](public/_headers)，不绕过验证接受错误产物。风险样机保留“示例 / SAMPLE”，行动建议使用已审核模板，不替代官方预警。
- 从 `web/` 按改动选择检查，修复本次造成的失败并复验：

| 范围 | 命令 |
| --- | --- |
| 类型、组件逻辑、Worker 行为 | `npm run check`、`npm run test:unit -- <测试文件>`；完整单测 `npm run test:unit` |
| 页面、样式、翻译、资源、构建 | `npm run build`，已含产物 verify，不重复运行 |
| 交互、导航、无脚本体验 | 先生成最新 dist，再 `npm run test:e2e -- <测试文件>`；完整 E2E `npm run test:e2e` |
| 仅文档或注释 | 核对内容、引用与 diff |

E2E 使用 Chromium、Python 3 静态服务器 `127.0.0.1:8788`；非 CI 可能复用旧服务器，须确认服务的是本次 dist。静态 E2E 不覆盖 Worker API，后者用相关单测或明确的集成检查。完整 CI 顺序见 [工作流](../.github/workflows/web.yml)。

## 预览与生产

行为以工作流和 [Wrangler 配置](wrangler.jsonc) 为准：

- PR/main push 涉及 `web/**` 或 Web 工作流时触发（包括文档改动）；也支持手动运行。
- 同仓库 PR 验证成功后在 `web-preview` 执行 `wrangler versions upload`，产生外部预览；fork PR 不执行该 job。
- 符合路径条件的 main push，或 main 上手动运行，验证成功后在 `web-production` 执行 `wrangler deploy` 和线上 smoke；非 main 手动运行不部署生产。
- 发布仍取决于 GitHub environment 审批、凭据和设置；看不到设置不等于发布不会发生。

创建/更新 PR、推送 main、触发工作流或直接发布前，核对现有授权是否涵盖相应预览/生产动作。已有明确授权持续有效；没有授权时先完成本地实现与验证，再说明待发布内容和影响。改文档或本地测试不授权发布；线上 smoke、表单测试和反馈发送也须核对外部副作用。部署操作参考 [runbook](.github-notes.md)，历史平台/环境描述需现场复核。
