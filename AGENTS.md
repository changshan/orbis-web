# Orbis Web Agent 约定

本仓库维护 Orbis 官网及其 Cloudflare Worker。根 `CLAUDE.md` 仅导入本文件；不要在其他文件复制规则。

## 实现与验证

- 构建、检查入口以 [package.json](package.json) 为准，依赖使用 lockfile。涉及布局取舍时才读 [官网 v3 设计](docs/design/2026-08-03-website-redesign-v3-design.md)。
- 行为变更采用 TDD：先写并运行因预期原因失败的测试，再做最小实现使其通过，最后重构并复验。
- 构建和资源策略遵循 [verify.ts](scripts/verify.ts) 与 [响应头配置](public/_headers)，不绕过验证接受错误产物。风险样机保留“示例 / SAMPLE”，行动建议只使用已审核模板，不替代官方预警。
- 按改动选择检查，修复本次造成的失败并复验：

| 范围 | 命令 |
| --- | --- |
| 类型、组件逻辑、Worker 行为 | `npm run check`、`npm run test:unit -- <测试文件>`；完整单测 `npm run test:unit` |
| 页面、样式、翻译、资源、构建 | `npm run build`，已含产物 verify，不重复运行 |
| 交互、导航、无脚本体验 | 先生成最新 dist，再 `npm run test:e2e -- <测试文件>`；完整 E2E `npm run test:e2e` |
| 仅文档或注释 | 核对内容、引用与 diff |

E2E 使用 Chromium、Python 3 静态服务器 `127.0.0.1:8788`；非 CI 可能复用旧服务器，须确认服务的是本次 dist。静态 E2E 不覆盖 Worker API，后者用相关单测或明确的集成检查。完整 CI 顺序见 [工作流](.github/workflows/web.yml)。

## 产品、隐私与发布

- 不承诺 Critical Alerts、地震预测或替代官方预警；来源过期显示 `isStale` 降级，不表达为“暂无预警”。
- 密钥、个人权限和会话状态不入库。日志和报告不含完整 token、通知正文、私钥或设备/签名标识。
- PR 验证成功后，同仓库 PR 会在 `web-preview` 环境执行 `wrangler versions upload`；fork PR 不发布预览。
- main push 或 main 上手动运行工作流，验证成功后会在 `web-production` 环境执行 `wrangler deploy` 和线上 smoke。
- 创建或更新 PR、推送 main、触发工作流或直接发布前，必须核对授权是否涵盖预览或生产副作用。修改和本地测试不自动授权发布；线上 smoke、表单测试和反馈发送也需要明确授权。
- 部署操作参考 [runbook](docs/deployment.md)，其中平台权限和套餐描述需现场复核。

## Git

- 保持与 Orbis App 仓库的需求链接一致，但不要在本仓库复制飞书需求或规划正文。
- 推送走已配置 SSH remote。发布相关操作须遵循上一节的授权边界。
