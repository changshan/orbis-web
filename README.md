# Orbis Web

Orbis 官网与反馈 API，使用 TypeScript 构建静态双语页面，并通过 Cloudflare Worker 提供静态资源和反馈接口。

## 本地开发

需要 Node.js 22.x、npm 10+ 和 Python 3。首次使用先安装依赖：

```sh
npm ci
```

常用命令：

| 任务 | 命令 |
| --- | --- |
| 类型检查 | `npm run check` |
| 单元测试 | `npm run test:unit` |
| 构建并验证产物 | `npm run build` |
| E2E | `npx playwright install chromium && npm run build && npm run test:e2e` |
| Worker 本地开发 | `npm run dev` |

只查看静态页面时，先执行 `npm run build`，再运行：

```sh
python3 -m http.server 8788 --bind 127.0.0.1 --directory dist
```

打开 <http://127.0.0.1:8788/en/>。静态预览不执行 Worker API；它与 E2E 共用端口，运行测试前请停止预览，避免 Playwright 复用旧服务。

## 配置与发布

本地构建默认 origin 为 `http://localhost:8788`。需要覆盖时，为构建命令设置 `PUBLIC_SITE_ORIGIN`；构建脚本不会自动加载 `.env`。

CI 会依次执行类型检查、单元测试、构建和 E2E。同仓库 PR 可发布外部预览，main 分支 push 可部署生产，具体权限和操作边界见 [AGENTS.md](AGENTS.md) 与 [部署 runbook](docs/deployment.md)。
