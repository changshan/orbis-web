# Vision 服务端网关（本地实现，默认关闭）

范围依据：[开发方案 W11](https://my.feishu.cn/wiki/CwNzwK6OniVwYgksUDbc2fqKnbh)、[技术方案 §1.7](https://my.feishu.cn/wiki/ULPIw8U0ziYE4ckZiwacHynGnff)。本文件记录代码、验证与部署边界，不复制权威规划正文。

## 入口与数据边界

`src/worker/entry.ts` 导出原官网 Worker 及两个 Durable Object 类；原反馈逻辑保持独立。`/api/vision/*` 只在 `VISION_ENABLED=true` 且配置完整时工作。当前提交中的配置为 `false`、源站/预算为空，访问返回 503；不会因构建或发布普通官网内容自动开始回源。

三个 GET 入口沿用 shared 的快照、增量和城市详情契约；新增 `POST /api/vision/session` 签发短期会话。参数须经过严格 URL 解码与白名单校验；重复参数（含解码后重复）、非法 UTF-8、额外参数、非法城市键和超长游标在访问缓存/源站之前拒绝。公开入口仅接受规范官网 origin，预览/默认 workers.dev 域名不能借此调用 Vision；这只是入口约束，不能替代会话鉴权或 FC 原生签名。

读请求验证 `__Host-vision` 的 HMAC、绝对期限和世代，并先检查 IP/会话/接口配额，随后才允许公共缓存返回。Cookie 带 Secure、HttpOnly、SameSite=Strict。世代变更吊销全部旧会话；旧网关游标返回 409/EPOCH_CHANGED 并要求重建。网关还为源站游标签发独立的、绑定类型/语言/世代/绝对期限的封装，伪造随机游标无法制造回源或缓存键；不会把网站会话当成 CN 读取凭据。

正常短期会话可复用，不每 10 秒挑战。创建频率达到配置的异常阈值后，需提交 `{token}`；服务端 Siteverify 核对 success、hostname、`action=vision_session` 与挑战时间，使用 Cloudflare 的一次性 token 语义。错误输入、创建硬配额及全局创建预算在 Siteverify 前检查。会话响应和错误始终 no-store。前端挂载挑战组件属于后续官网页面接入，当前没有新增 Vision 页面。

## 协调、缓存与回源

- `VisionQuota` 按 IP 哈希与会话哈希分别落到固定 16 个分片；原 IP 只用于当次 HMAC，不入库/日志。计数带期限、key 数上限并由 alarm 清理。
- 同一个 `origin-and-mint-budget` 协调原子只处理会话创建/回源预算及并发租约，不传输全部访问数据。分钟/日预算、并发与半开熔断状态持久化；不依赖每个 Worker 实例各自的内存计数。网络结果不明时保留 60 秒租约，部署前须确认 CN 函数超时仍低于此安全窗口。
- `VisionCacheShard` 使用固定 32 分片，同一规范请求合并冷回源。SQLite 缓存只保存通过公开白名单校验的响应，限制条目、编码字节、绝对 TTL；尾部增量使用更短 TTL。超出单行安全大小的有效响应直接服务、不入缓存。没有跨过期时间继续伪装为实时的旧数据兜底。
- 缓存键包含固定源站、规范路径/城市/语言/原始游标及生成契约哈希，原始游标内部已绑定 epoch/水位/目录。缓存不含个人 Cookie；返回时重新封装游标。身份/配额校验发生在共享缓存之前。
- 源站固定为 CN FC HTTPS 地址，只发 GET，使用官方 `@alicloud/openapi-util` 的 ACS3 签名及完整临时 STS。SDK 的 CommonJS 导出经显式 shim 统一，已用真实 workerd 测出并修复 Node 单测未暴露的差异。拒绝重定向，不转发浏览器 Cookie/Authorization；凭据过期或配置漂移失败关闭。
- 响应按实际流字节限制，使用固定上限缓冲；JSON 必须通过从 canonical shared 契约生成的校验器，内部字段或非法链接协议会被拒绝。源站错误只接受公开错误 schema，不回显异常与内部配置。

Vision 应用日志只包含 area/status/outcome，不记录 IP、城市、完整游标、会话、通知正文或凭据。反馈日志保留随机 requestId，并增加验证拒绝、限流和绑定不可用的有限分类；日志故障不会改变已经完成的发信结果，上游错误对象不会进入日志。新版 Wrangler 4.156.2 支持 `observability.redact_query_string=true`，本地配置已启用此原生选项；logs / invocation_logs / traces 的采集仍关闭，真实平台合成 canary 验收通过后再启用。

**版本预览不会应用本地日志设置。** 已用 Wrangler 4.156.2 向本地模拟 API 实际上传并截获 metadata：`versions upload` 不包含 observability，也不修改非版本化设置。因此 CI 在上传前执行 `npm run check:vision-preview`，只 GET 当前 `orbis-web` 的脚本设置：仅接受明确关闭 logs/traces，或已启用查询脱敏且关闭 invocation logs/traces 的自定义日志；缺配置、鉴权失败、超时和超限响应均停止上传。该检查不修改共享生产设置，也不能替代真实平台日志 canary。参考 [Cloudflare 版本化限制](https://developers.cloudflare.com/workers/versions-and-deployments/gradual-deployments/) 与 [脚本设置 API](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/settings/methods/get/)。


## 配置与本地检查

非密钥配置在 `wrangler.jsonc`：`VISION_PUBLIC_ORIGIN`、`VISION_CN_ORIGIN`、`VISION_SESSION_EPOCH`、`VISION_LIMITS`、`VISION_CREDENTIAL_MODE`、`VISION_FC_ROLE_ARN`。会话 key、Turnstile secret 和专用 STS 签发身份的 AK/secret 使用受限 Worker secrets，不能写入公开 vars、客户端构建、仓库或日志。生产默认 `VISION_CREDENTIAL_MODE=assume-role`，非密钥 `VISION_FC_ROLE_ARN` 只接受固定账号中的 `orbis-vision-gateway` 角色；bootstrap RAM 用户只允许 AssumeRole 此角色，角色只允许调用独立 CN 读函数。凭据只在全局预算 DO 的实例内存中保存，不进 SQLite、浏览器响应或日志。每次源站预算许可后按需签发 900 秒 STS，提前 120 秒续期，并发合并签发，失败退避 30 秒；旧凭据剩余不足 30 秒即失败关闭。固定 STS 模式仅保留作兼容和测试，不能作为生产续期方案。切换源站或密钥时同步撤销旧世代。

`VISION_LIMITS` 必须显式给出全部字段：requestPerMinute、sessionTotal、ipPerMinute、mintPerMinute、mintPerDay、mintIpPerMinute、challengeAfter、sessionMs、originPerMinute、originPerDay、originConcurrent、originTimeoutMs、breakerFailures、breakerCooldownMs、cacheTtlMs、tailTtlMs、cacheEntries、cacheBytes、maxResponseBytes、maxQuotaKeys。代码上限是失败关闭约束，测试脚本中的数值完全是合成验收配置，**没有生产默认阈值或压测结论**。编码预算也不等于 JavaScript 堆占用，实际规格需压测。

```sh
npm run check
npm run test:unit
npm run build
WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run --outdir /private/tmp/orbis-vision-web-bundle
npm run test:vision-runtime -- /private/tmp/orbis-vision-web-bundle/entry.js /private/tmp/orbis-vision-web-runtime-results.json
```

最后一步在本地 workerd + SQLite 中运行，所有 CN/Siteverify 出站都由替身接收，未配置真实凭据也不会访问真实服务。当前 76 个单测及 assume-role 模式 14 个运行时场景通过，包含 12 个同键并发冷请求只回源一次、缓存前鉴权/限流、游标封装、挑战上下文与单次使用、预览路径关闭、字段隔离及持久熔断。真实 FC 网关校验、真实 Turnstile、跨地域恢复与线上入口旁路未验证。页面/导航未改，未运行静态浏览器 E2E。

共享契约的唯一维护位置仍在 Orbis 的 `shared/vision/openapi.yaml`。更新时用 canonical 文件生成校验代码，禁止手改 generated 文件：

```sh
npm run generate:vision-contract -- /path/to/orbis/shared/vision/openapi.yaml
npx wrangler types src/worker/vision/bindings.generated.d.ts --env-interface VisionBindings --include-runtime false
```

生成器只收集公开接口引用闭包，拒绝包含 EventPayload/SourceRecord；生成文件记录输入 SHA-256，测试样例来自共享人工 fixture。此仓库不复制需求/版本规划正文。

## 仍需真实环境验收

已上传隔离预览并创建其独立 DO 命名空间；尚未创建 Turnstile widget、设置真实源站或临时凭据，也未改线上 WAF。Cloudflare 域名 DDoS/WAF/规则额度和费用需按实际账号套餐核验。CN 的签名 trigger、默认/别名/自定义/预览所有地址的匿名旁路、最小 RAM 调用范围及 真实 STS 角色与续期，都必须与 W10 实际读端联合验证后才允许公共访问；当前官方 API 文档对细粒度调用资源的描述需现场核对，不以宽泛 `*` 权限代替最小授权。

Orbis 仓库的真实 NWS 全目录映射已构建/打包；生产采集 provider/CN 的本地装配已实现，真实云端接入和容量/成本/SLS 联合验收仍未完成。官网挑战 UI 与正式页面不在本轮实现范围。

2026-11-03 已修复此前完整审计的 9 项通告（含 2 critical）：Vitest 4.1.12、Wrangler 4.156.2、匹配的 Miniflare 5.20261102.0-beta / workerd 1.20261102.1 和 types 5.20261103.1 已锁定；完整及运行依赖审计均为 0。升级后的类型检查、74 项单测、build/verify、14 项本地 workerd 和 20 项 Chromium/无脚本回归通过。

参考：[Workers 最佳实践](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)、[Durable Objects 协调规则](https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/)、[Turnstile 服务端验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)、[FC 原生签名](https://www.alibabacloud.com/help/en/functioncompute/configure-signature-authentication-for-http-triggers)。


2026-11-03 实施补充：官方 `@alicloud/sts20150401@1.2.0` 已接入，显式 CommonJS shim 同时支持 Node 与 workerd。新增内存续期、并发合并、失败退避与到期关闭单测；本地 workerd/SQLite 14 项通过，所有出站由合成夹具截获，验证首次签发及近过期续期共 2 次，不代表真实云端权限通过。最初续期批次 66 项单测通过；后续工具链与隐私收尾为 74 项单测通过，完整及运行依赖 audit 均为 0。

真实接入阻塞：Orbis `.env` 和 Serverless `default` 两套现有身份均在创建 `orbis-vision-worker` 时返回 RAM `403 NoPermission`。尚未创建真实专用角色、签发用户或设置 Worker secrets；没有发布生产网站。资源权限材料见 Orbis `server/deploy/vision/README.md`；生产匿名旁路、错误角色/过期 STS 与私有 OSS 拒绝测试仍待云端资源就绪后验收。

签发前后均核对持久回源租约。全局 DO 只传递短期凭据和预算结果，源站请求及响应继续由缓存分片处理，避免把响应正文集中到单一协调器。


2026-11-03 后续：用户完成 Cloudflare OAuth，并授权绕过 CI 直接上传独立预览。已创建 `orbis-web-preview-vision` 及两个独立 DO 命名空间，未配置生产路由或真实发信绑定；反馈在访问外部绑定前关闭，Vision 保持关闭。真实 API 关闭态回读 `observability:null`，控制台明确显示 Workers Logs / Traces 已禁用；生产部署及设置摘要未变。预检改为读取官方非版本化 `/script-settings`，不放宽 CI 的失败关闭策略。新增隔离配置/反馈回归及真实接口路径断言，76 单测、类型、构建、dry-run 和 14 本地 workerd 场景通过。预览地址与复现步骤见 [部署 runbook](deployment.md#不经-ci-的独立预览)。两套阿里云身份创建专用角色仍均 403；公开联验、日志 canary、压测/费用/告警和 CDN/WAF 套餐仍待验收。


2026-11-03 组件与验收工具补充：已完成可挂载的中英文会话/挑战组件、8 项真实本地 workerd/SQLite 负载恢复场景，以及默认只生成计划的只读云端验收脚本。正式地图页面挂载与真实云验收仍待后续接入，未修改生产入口或放宽全站 CSP。当前 95 单测、27 浏览器用例通过；详见 [会话组件、本地恢复与只读云验收](vision-client-and-acceptance.md)。
