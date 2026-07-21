# Task 0 — Cloudflare / Email Service spike 实测记录

> 状态:**已运行 2026-07-21**。脚手架在 `web/spike/`。
> 结论:托管架构与 Email Service API 形状均验证通过;真实送达受阻于"发件域名未接入",属操作配置项(非架构问题)。

## 环境

- 运行日期:2026-07-21
- Cloudflare 账号:lics0613@gmail.com(Account ID 5e6bec21538f95afe4750a93670deee3)
- workers.dev 子域:`lics0613`
- 部署 URL:https://orbis-spike.lics0613.workers.dev
- SPIKE_FROM(本次):gmail.com 地址 ← **问题根源:gmail.com 不是账号内的可发信域名**

## 实测结果

| # | 项 | 期望 | 实际 | 通过? |
|---|---|---|---|---|
| ① | 静态资产直出 | spike 页面 HTML | 返回 `<!doctype html>…` spike 页 | ✅ |
| ② | `_headers` 生效 | `x-orbis-spike: yes` | `x-orbis-spike: yes`(HTTP/2 200) | ✅ |
| ③ | `/api/health` | `{"ok":true}` + `cache-control: no-store` | 完全一致,`content-type: application/json` | ✅ |
| ④ | Email 送达 | `{"ok":true}` 且邮箱收到 | **503 `send_failed`**;日志:`email from gmail.com not allowed because domain was not found` | ❌(配置,非架构) |
| ⑤ | 预览通道 | 可访问的 preview URL | `https://f446421a-orbis-spike.lics0613.workers.dev` | ✅ |

## 结论(2026-07-21 决定性验证发送后 — 已闭环)

- [x] **托管架构成立**:①②③⑤ 通过(真实边缘)。
- [x] **✅ API 入参形状经真实成功发送证实**:前置就位后(`myorbis.xyz` **active** + Email Routing **ready** + `lics0613@gmail.com` 已验证 + `SPIKE_FROM=spike@myorbis.xyz`),`POST /api/spike-mail` **连续 4 次返回 `{"ok":true}` HTTP 200**(requestId 各不同)。
  - `send({to,from,subject,text,html})` 对象形状**可用,无需 MIME 回退**;Task 5 代码保持现状,`index.ts` 注释已更新为 VERIFIED。
  - 此前 ④ 的 503 均为发件域名未接入 / secret 刚设的传播延迟,非形状问题。
  - 剩余确认:请在 `lics0613@gmail.com` 收件箱肉眼确认收到测试邮件(`ok:true` = Cloudflare 已受理投递到已验证目标,收件箱可见是最终地面真值)。

## 唯一遗留:发件域名接入(操作项,非代码)

Cloudflare `send_email` binding 要求 **FROM 地址所在域名是你账号内的一个 zone,并开启 Email Routing/Sending**;`gmail.com` 不行。真实送达前需要:

1. 把你拥有的一个域名加入 Cloudflare(建 zone);
2. 在该域名上开启 Email Routing 并完成 SPF/DKIM/DMARC 验证;
3. 把收件箱(如 gmail)验证为 Email Routing 的 destination address;
4. `SPIKE_FROM=xxx@你的域名`、`SPIKE_TO=已验证收件箱`,重跑 ④ 应 `ok:true` 且收到邮件。

这本就是 Task 9 runbook 第 3 步的内容(生产也需要自定义域名)。**它不阻塞 Task 5 的代码编写与单测**(Task 5 用 mock binding),只阻塞端到端真实送达。

## 备注

- 托管架构(单 Worker + static assets + `run_worker_first: ["/api/*"]` + `_headers` + versioned preview)已在真实边缘验证通过 → Task 5/7/9 的托管方案成立。
- spike Worker 仍在线(生产版本为初次 deploy;⑤ 另上传了一个未投产的 preview version)。接入域名后可复跑 ④;确认完可 `cd web/spike && npx wrangler delete --name orbis-spike` 清理。

## 2026-07-21 复跑 ④ 仍失败 — 账号邮件配置实况

查 Cloudflare API 得到具体阻塞状态(需你在面板/registrar 侧完成):
- 域名 `myorbis.xyz`:status = **pending**(NS 未激活)→ 需变 active
- `myorbis.xyz` Email Routing:enabled=false / unconfigured → 需开启
- 已验证收件地址:**0 个** → 需加并验证 ≥1 个
- `SPIKE_FROM`:仍为 gmail 地址 → 需改为 `xxx@myorbis.xyz`

四项就位后重设 SPIKE_FROM/SPIKE_TO secret,重跑 `POST /api/spike-mail` 应 ok:true。
API 形状结论不变(已确认),此为纯操作项,不影响代码。
