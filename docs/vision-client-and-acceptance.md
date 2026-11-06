# Vision 会话组件、本地恢复与只读云验收

当前公开地图已改为按需 map/feed/固定水位城市读取；见[2026-11-06 生产交付](vision-production-acceptance.md)。下文前半部分保留 2026-11-03 阶段工具交付的历史边界。

2026-11-03。依据最新[开发方案](https://my.feishu.cn/wiki/CwNzwK6OniVwYgksUDbc2fqKnbh) rev 12 和[技术方案](https://my.feishu.cn/wiki/ULPIw8U0ziYE4ckZiwacHynGnff) rev 21 的相关章节。这里交付访问组件和联调工具；地图/列表的正式挂载仍随 W12/W13 复用定稿页面，不另设计地图。生产 Vision 保持关闭。

## 会话与挑战组件

`src/vision/client.ts` 提供可复用的 `VisionClient`，`src/vision/access.ts` 提供中英文 `mountVisionAccess`。浏览器联调页入口在 `tests/browser/vision-access-entry.ts`，由 E2E 在 loopback 挂载真实组件，所有 API 与挑战脚本均拦截为合成响应，不提供伪造的线上安全校验。

```ts
import { mountVisionAccess } from "../vision/access";
const access = mountVisionAccess(container, {
  locale: "zh",
  siteKey: publicSiteKey,
  onData: (data) => updateApprovedView(data),
  onReset: () => discardExpiredSyncCheckpoint()
});
// 移除页面时调用；现有同步器可复用 access.client，不为每次轮询重建它。
access.dispose();
```

客户端只请求同源三个读路径及 session；凭据用 HttpOnly Cookie 自动发送，过期时间仅在实例内存保存，无 localStorage/sessionStorage、可读会话 Cookie 或私钥。并发创建合并，接近到期按需续期；读请求 401 最多续期并重试一次，旧请求迟到的 401 不会作废新会话。429/503 尊重等待时间，组件仅解锁人工重试，不偷偷循环；重置与陈旧状态明确呈现，不将空 events 解释为“没有预警”。组件只交付连接状态和数据回调，完整分页/增量模型校验属于既有契约消费者的后续接入。

正常会话不加载 Turnstile；session 明确返回 403 FORBIDDEN 才动态加载官方 api.js，使用显式 render、`action=vision_session`、中英文上下文、关闭自动 retry/refresh 和隐藏表单字段。token 只用于一次 session POST，不缓存；完成/过期/失败/销毁均清理 widget，加载与交互有截止时间。挑战服务或 CSP 不可用时保留失败/重试状态。真实 sitekey/widget/Siteverify 仍须云端联验。

正式挂载页面需按[官方 CSP 指引](https://developers.cloudflare.com/turnstile/reference/content-security-policy/)仅向该页面允许 `script-src https://challenges.cloudflare.com` 与 `frame-src https://challenges.cloudflare.com`，保留同源 connect 与其余限制。当前没有放宽全站 `public/_headers`，首页不引入挑战脚本或额外脚本资产；组件尚未挂到生产页面。参考[官方显式生命周期](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)。

```sh
npm run test:unit -- tests/unit/vision-client.test.ts
PLAYWRIGHT_BROWSERS_PATH=/private/tmp/orbis-web-playwright-browsers npm run test:e2e -- tests/e2e/vision-access.spec.ts
```

浏览器发现并修复了 Node 替身未暴露的原生 fetch 调用上下文问题；并发 401 竞态先确认两次必要签发错误变成三次，再加世代判断修复。

## 本地负载与恢复

```sh
npm run test:vision-recovery -- /private/tmp/vision-recovery.json > /private/tmp/vision-recovery.log 2>&1
```

脚本调用官方 Wrangler dry-run 构建仅用于测试的入口，再启动真实 workerd + 持久 SQLite。所有出站固定合成 CN 域名，由本地回调截获，不接受真实目标或密钥参数。测试入口和私有计数路由不在官网 Worker 导出或构建入口内；临时目录由本次运行创建并在结束清理。

8 个场景：32 个同键冷读只回源一次；至少 3 秒持续热缓存负载；同分片 LRU 淘汰；完全销毁并重建 workerd 后缓存和配额仍在；不同冷键突发遵守全局并发预算；尾页更短 TTL；持久熔断跨重启与单次半开探针恢复；真实请求超时失败关闭且重启后保留不确定租约。既有确定性测试另验证 60 秒租约过期，不通过长时间等待冒充云端故障恢复。

本机一次结果：16 并发、3,008ms、4,369 请求全部 200，约 1,452 次/秒，P50 10.27ms / P95 14.09ms / P99 17.22ms，热缓存新增回源 0；全场景共 4,460 请求、14 次合成回源，观察到最大并发 2。它是合成小样本和单机基线，不代表公网、真实数据规模、128MiB 内存峰值或生产容量；没有据此填写生产阈值。

## 云端脚本：默认只生成计划

```sh
npm run vision:acceptance -- plan scripts/vision/acceptance.example.json /private/tmp/vision-access-plan.json
```

示例仅用于无网络计划，含 synthetic 占位地址；live 会拒绝占位地址。实际运行前，操作人员须从真实 FC 清单列出 default / alias / version / custom / preview 全部读入口，逐项填 URL；没有配置的类型同时保留空数组并写入 absentKinds，不能省略类型来跳过验收。清单完整性仍须与平台独立核对，脚本不会把人工 manifest 当作平台发现结果。

另指定两个已确认仅 GET 读取的拒绝目标（其他函数、其他地域）；其中“其他函数”必须是专用合成快照读函数，并作为错误角色凭据的正向对照：该角色可读它，正式网关角色不可读它，防止用无效凭据的一律拒绝冒充角色隔离。还须列出每个私有 bucket 中已核实存在的合成 `vision-verify/` 对象。禁止使用写接口或 App 路由。OSS 测试为匿名拒绝；签名角色的 OSS 权限、ACL/桶策略、永久保留和其他前缀仍须结合原生产交接另验，不将本工具声称为全部 IAM 审核。

`live` 需要显式 `ORBIS_VISION_ACCESS_ACCEPTANCE=read-only`，以及三个完整的临时凭据组：`VISION_VERIFY_ALLOWED_*`、`VISION_VERIFY_WRONG_ROLE_*`、`VISION_VERIFY_EXPIRED_*`，每组后缀为 `ID`、`SECRET`、`TOKEN`、`EXPIRES_AT`（毫秒）。正确和错误角色凭据需至少剩余 30 秒且相互不同；过期组必须已经过期。通过受限进程环境传入，禁止把值写入命令行、manifest、报告或仓库。

```sh
# 资源和身份就绪且已获得该批只读验收授权后再执行；不要在准备阶段运行。
ORBIS_VISION_ACCESS_ACCEPTANCE=read-only npm run vision:acceptance -- live /private/tmp/vision-access-manifest.json /private/tmp/vision-access-results.json
```

对每个列出的 CN 入口分别检查匿名拒绝、允许角色 200 且符合公开快照 schema、错误角色拒绝、过期 STS 拒绝、缺 token 的签名请求拒绝；再验证允许角色无权访问其他函数/地域及私有 OSS 匿名拒绝。全部仅 GET，不跟随重定向、不重试，不记录响应正文、URL、签名或凭据。拒绝须同时有 401/403 和认证拒绝码（包含 FC 的 `RamCheckFail`）。FC 匿名请求仍携带 ACS3 日期/nonce 协议头；仅精确的 HTTP 400、`Code=InvalidArgument`、`Message=invalid authorization ''` 也计为匿名鉴权拒绝。缺少协议头、其他 400、404、一般 WAF 错误页、意外 200、私有字段或敏感回显不能算通过；单响应最多 4MiB。

## 合成日志 canary

```sh
ORBIS_VISION_ACCESS_ACCEPTANCE=read-only npm run vision:acceptance -- canary /private/tmp/vision-access-manifest.json /private/tmp/vision-canary.json
npm run vision:acceptance -- logs /private/tmp/vision-complete-log-export.json /private/tmp/vision-canary.json /private/tmp/vision-log-results.json
```

canary 仅对网关发出一次含随机合成 query/Cookie/Authorization 标记的无效读请求，要求 400 INVALID_ARGUMENT 且不回显标记；不会提交反馈。当前入口关闭会 503，此时 canary 明确失败，不能改测试接受关闭态来称日志验收通过。

日志命令不自动开启采集或查询平台。输入必须包含本次 runId、exportComplete=true、覆盖本次请求且最多 5 分钟的 from/through/collectedAt 毫秒时间、完整未删字段的 platformRecords，以及从同一导出解码出的 records。两部分均需包含本次窗口的阳性对照 `area=vision,status=400,outcome=gateway`；应用字段严格限于 area/status/outcome，coalesced 允许无 status。整个输入扫描全部标记、URL 查询串和敏感字段名，空导出、旧窗口、未知应用字段均失败。不得通过删掉可疑字段让导出通过；保留完整导出在受限临时位置，若出现真实敏感字段只留脱敏失败结果并按既有流程清理原文件。

未执行真实 live/canary，也没有把空日志视为平台隐私通过。生产日志当前状态、真实身份/网络与请求窗口归属仍需现场核验；自动脚本通过不能替代这三项证据。

完整浏览器回归曾因默认 Python 静态服务器监听队列仅 5，对并发 JS 资源连接重置而失败；轨迹确认 ERR_CONNECTION_RESET 后，使用仅绑定 loopback、监听队列 128 的 `scripts/serve-tests.py`，27 项完整浏览器回归通过。产品轮播代码未改。

正式地图已挂载访问组件的同一客户端与公开协议消费者；当前生产状态及真实验收边界见 [发布验收](vision-production-acceptance.md)。
