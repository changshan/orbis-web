# Orbis Web 部署 runbook（v2 单 Worker）

1. 在团队密钥管理中记录：正式 HTTPS 域名、Cloudflare Account ID、Worker 名 `orbis-web`、Email Service 发件地址、唯一项目收件邮箱。
2. Cloudflare DNS 绑定自定义域名到 Worker `orbis-web`；`workers.dev` 不作为正式入口。公开且固定的 canonical origin `https://myorbis.xyz` 在工作流中维护，预览构建也使用该正式 origin，避免搜索引擎把临时预览地址当成 canonical。
3. Email Service：完成发件域名接入（SPF/DKIM/DMARC 通过），验证唯一收件邮箱；在 Cloudflare 控制台把 `EMAIL` binding 的 destination 限制为该邮箱。
4. Worker secrets：`npx wrangler secret put FEEDBACK_SENDER`、`npx wrangler secret put FEEDBACK_DESTINATION`。
5. GitHub secrets `CLOUDFLARE_API_TOKEN`（限 Workers Scripts:Edit + Workers Routes:Edit）与 `CLOUDFLARE_ACCOUNT_ID`：设为 repo 级即两个环境（`web-preview` / `web-production`）共用;若要按环境隔离权限,则在两个环境下各自配置一份。`web-production` 环境按需开启审批保护(私有仓库需付费套餐或改为公开仓库;免费私有仓库无此规则,即为 main 合并自动部署)。
6. 首次部署后验证：`curl $ORIGIN/api/health` 返回 `{"ok":true}`；`/zh/`、`/en/`、两个隐私页、404 可访问且响应头含 CSP。
7. 真实验收：提交一条中文仅正文反馈 + 一条英文带联系方式反馈，核对邮箱中主题、转义、无 IP/UA/Referer，随后删除测试邮件；触发校验失败、蜜罐、第 4 次限流、投递失败路径，确认 Worker 日志无隐私字段。
8. CloudMonitor：每 5 分钟探测 `/zh/`（北京/上海/广州 × 移动/联通/电信）、`/en/`（欧洲一节点）、`/api/health`；连续两次失败或完整响应 > 5 秒告警；每次发布前跑一次三运营商即时探测。
9. 连续 14 天任一大陆运营商可用率 < 99% → 评估大陆镜像，不在当前版本自动扩架构。
10. 项目邮箱设置 90 天自动删除 Orbis 反馈邮件，指定季度核查负责人。
11. 回滚：`npx wrangler rollback`（回上一版本），回滚后重复第 6 步验证。
12. 发布前手动质检（结果记录在发布 PR）：桌面 Safari + iPhone Safari 冒烟（键盘/触控、断点、200% 缩放、语言切换）；DevTools Lighthouse 四项 ≥ 90。


## 不经 CI 的独立预览

用户明确授权后，先在本地完成受影响检查，再上传固定的独立 Worker；不要用默认配置部署来代替预览。

```sh
npm run check
npm run test:unit
PUBLIC_SITE_ORIGIN=https://myorbis.xyz npm run build
WRANGLER_SEND_METRICS=false npx wrangler deploy --config wrangler.preview.jsonc --dry-run --outdir /private/tmp/orbis-web-preview-bundle
npm run test:vision-runtime -- /private/tmp/orbis-web-preview-bundle/entry.js /private/tmp/orbis-web-preview-runtime.json assume-role
WRANGLER_SEND_METRICS=false npx wrangler deploy --config wrangler.preview.jsonc
```

`wrangler.preview.jsonc` 固定使用 `orbis-web-preview-vision`、独立的两个 DO 命名空间、空自定义路由、无 EMAIL/限流/secret 绑定；`ORBIS_PREVIEW=true` 在访问反馈绑定之前返回 503，`VISION_ENABLED=false`。首次创建带 DO 迁移的 Worker 使用 deploy；此命令只发布独立预览，不替换生产 `orbis-web`。

上传后通过官方 [非版本化设置 API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/settings/methods/get/)（`/script-settings`）及控制台核对日志/追踪关闭、没有生产路由或邮件绑定，并比较生产部署及设置未变。2026-11-03 该账号在关闭采集时返回 `observability:null`，控制台明确显示 Workers Logs、Workers Traces 已禁用；CI 预检仍保守拒绝缺少明确布尔值的设置，不因此放宽共享生产版本预览条件。只读检查预览页面、CSP、健康及 Vision 关闭态；真实反馈发送另需明确授权。

当前预览：https://orbis-web-preview-vision.lics0613.workers.dev/zh/ 。生产未发布，真实 CN/Turnstile 接入与平台日志 canary 仍待验收。
