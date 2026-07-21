# Task 0 — Cloudflare / Email Service spike 实测记录

> 状态:**待运行**。脚手架在 `web/spike/`,运行说明见 `web/spike/run.md`。
> 结论决定 Task 5(Worker)能否按现有 Email Service 假设开工。

## 环境

- 运行日期:_(填)_
- Cloudflare 账号 / 子域:_(填)_
- 发信域名接入状态(SPF/DKIM/DMARC):_(填)_
- 项目收件邮箱:_(填,勿写完整敏感地址亦可只记"已验证")_

## 实测结果

| # | 项 | 命令 | 期望 | 实际 | 通过? |
|---|---|---|---|---|---|
| ① | 静态资产直出 | `curl "$BASE/"` | spike 页面 HTML | | ☐ |
| ② | `_headers` 生效 | `curl -sI "$BASE/" \| grep x-orbis-spike` | `x-orbis-spike: yes` | | ☐ |
| ③ | `/api/health` | `curl -si "$BASE/api/health"` | `{"ok":true}` + `cache-control: no-store` | | ☐ |
| ④ | Email 送达 | `curl -X POST "$BASE/api/spike-mail"` | `{"ok":true}` 且邮箱收到 | | ☐ |
| ⑤ | 预览通道 | `npx wrangler versions upload` | 输出可访问的 preview URL | | ☐ |

## 结论

- [ ] **Email Service 可用,API 形状符合** `send({to,from,subject,text,html})` → Task 5 按现有假设开工,无需改动。
- [ ] **Email Service 不可用 / 形状不符** → 回退:`send_email` binding + 手工 MIME;修复限定在 `web/src/worker/email.ts` 发送封装 + `web/src/worker/index.ts` 的 binding 类型。记下实际报错:

```
(粘贴 wrangler deploy / wrangler tail 的报错)
```

## 备注

_(部署地域延迟、`versions upload` 预览行为是否符合预期、或任何影响 Task 5/9 的观察)_
