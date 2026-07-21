# Task 0 spike — 运行说明

> 目的:在你的 Cloudflare 账号上实测三件事,决定 Task 5(Worker)能否按现有 Email Service 假设开工。
> 前置:已 `wrangler login`;发信域名已接入 Cloudflare;有一个可收件的项目邮箱。
> 脚手架已就绪:`worker.ts`、`wrangler.jsonc`、`site/index.html`、`site/_headers`。

## 一次性运行

在本目录(`web/spike/`)下执行:

```bash
cd web/spike

# 1) 配置两个 secret(不会进仓库)
npx wrangler secret put SPIKE_TO      # 输入:能收件的项目邮箱
npx wrangler secret put SPIKE_FROM    # 输入:已接入 Email Service 域名的发件地址

# 2) 部署
npx wrangler deploy
# 记下输出的 Worker URL,形如 https://orbis-spike.<你的子域>.workers.dev
```

把上面的 URL 存进变量,逐条验证:

```bash
BASE="https://orbis-spike.<你的子域>.workers.dev"   # ← 替换成实际 URL

# ① 静态资产直出(应返回 spike 页面 HTML,不经过 Worker 代码)
curl -s "$BASE/" | head -3

# ② _headers 生效(应看到 x-orbis-spike: yes)
curl -sI "$BASE/" | grep -i x-orbis-spike

# ③ /api/health 可达(应为 {"ok":true},且 cache-control: no-store)
curl -si "$BASE/api/health" | grep -iE "cache-control|\"ok\""

# ④ Email Service 真实送达(应为 {"ok":true,...},且项目邮箱收到邮件)
curl -s -X POST "$BASE/api/spike-mail"

# ⑤ 预览通道(应输出一个 preview URL 且可访问)
npx wrangler versions upload
```

## 判读

- 若 ①②③⑤ 通过、④ 返回 `ok:true` 且邮箱**确实收到邮件** → Email Service 可用、API 形状(`send({to,from,subject,text,html})`)符合。
  把结果填进 `../SPIKE.md`,告诉我,我从 `a8ae2fe` 接着写 Task 5 / 9 / 10。
- 若 ④ 返回 503 或部署时 `send_email` binding 报错 → Email Service 不可用或形状不符。
  查看错误:`npx wrangler tail`(另开一窗)后重发 ④,记下报错;回退方案(`send_email` binding + MIME)已在 plan 备好,修复仅限 `web/src/worker/email.ts` 发送封装。把报错填进 `../SPIKE.md`。

## 清理

```bash
npx wrangler delete --name orbis-spike
# 确认结论已写进 ../SPIKE.md 后,可删除整个脚手架:
# cd .. && rm -rf spike
```
