# Vision 官网发布与验收

当前真实页面：<https://myorbis.xyz/zh/vision/>、<https://myorbis.xyz/en/vision/>。

本次按用户授权直接发布，未触发 CI。需求与界面范围以[技术方案](https://my.feishu.cn/wiki/ULPIw8U0ziYE4ckZiwacHynGnff)和[开发方案](https://my.feishu.cn/wiki/CwNzwK6OniVwYgksUDbc2fqKnbh)为准。

## 实现

- 在共用导航中接入 Vision 和本语言路由，复用定稿地图布局；地图资源仅由地图页加载。MapLibre 固定 6.16.0，底图为 OpenFreeMap 的 Liberty、Positron、Fiord，保留底图与数据来源署名。
- `src/vision/sync.mjs` 验证共享公开契约，串行读取一致快照及增量分页，按提交组和水位提交；城市详情不更新全局摘要或同步游标。数据只驻留内存。
- 会话由现有签名网关签发，HttpOnly / Secure / SameSite=Strict，按需加载托管 Turnstile；不在浏览器交付阿里云凭据。
- 首页/隐私页维持 10 KiB JavaScript gzip 总预算；地图页的主程序及独立 worker 合计限 1 MiB。CSP 仅为地图页增加必要的地图和挑战来源。
- 官网配置固定正式账户与域名，禁用生产 workers.dev 和版本预览。生产配额及开关在 `wrangler.jsonc`，回退时保留现有 secrets，仅关闭 `VISION_ENABLED` 后部署；无需重建 RAM 用户或轮换 AccessKey。

## 边缘防护（2026-11-05 实查 Free 套餐）

- 原有 SSL/TLS、网络层及 HTTP DDoS 防护有效。
- `Vision method guard`：仅对 `myorbis.xyz/api/vision/*`，会话只允许 POST，其余接口只允许 GET；其他方法阻止。
- `Vision session rate limit`：仅会话路径，按 IP 超过 10 次 / 10 秒，阻止 10 秒。13 次有限探测中实际得到 3 次 429。此边缘规则不能替代 Durable Object 的硬配额。
- Turnstile 组件 `orbis-vision`，域名仅配置 `myorbis.xyz`，Managed，不启用预清除。保持既有服务端 action `vision_session`，密钥已直接写入 Worker 加密 secret。

## 平台日志隐私 canary

2026-11-05 在关闭调用日志和跟踪、启用查询串脱敏的配置下，发送一次含合成 query / Cookie / Authorization 标记的非法参数请求，得到 400 `INVALID_ARGUMENT`，响应无标记回显。随后立即关闭全部平台日志/跟踪采集。

Cloudflare 控制台对北京时间 11:25–11:27 的完整窗口显示 1 条记录；以 JSON 导出原始完整对象，未选择字段或裁剪包络。现有 `checkLogCanary` 校验通过：含实际 `area=vision,status=400,outcome=gateway` 正向对照；完整平台对象和应用记录均不含标记、敏感字段或带查询串的 URL。

- 原始导出 SHA-256：`e39687e6c3657b861cd924b00b59353b435c5f338a46af4aeff884071990e126`。
- 原始记录仅保留本机受限证据目录，不进入仓库。仓库不保存 Cookie、游标、请求标识或完整导出。
- 该验收覆盖 Workers 日志，不声称 Cloudflare 的全部基础设施分析均不处理请求元数据；隐私页明确告知基础设施与地图服务处理网络请求。
- 当前持久平台采集关闭。排查时使用短时实时 tail，只在内存解析并输出固定枚举分类，禁止输出原始异常、请求包络或凭据。

## 当前验收边界

已完成本地类型、111 项单测、33 项官网浏览器验收、14 项真实 workerd 会话/STS 场景，以及 8 项持久缓存与恢复测试（云端能力用本地合成服务验证，不能替代真实容量）。真实域名已验证安全会话、匿名 401、原生入口拒绝匿名和单页签名快照 200。线上浏览器已完成完整快照并展示真实列表、城市详情及官方链接，三套 OpenFreeMap 底图均可加载且保留城市选择。真实 Turnstile 成功流程已通过：临时严格模式下无 token 返回 403，无效合成 token 返回 403；用户完成实际托管挑战后，会话返回 200。随后恢复默认策略，未保留临时严格模式。

验收期间观察到间歇性 503，包括传输与上游响应契约拒绝；页面保留明确失败/延迟状态并自动重试，之后已完成完整读取。这不构成长期可用性或容量通过结论。网关只记录固定错误分类，未放宽公开字段白名单。

未调整 CN/SG 资源规格；后端接收积压和吞吐验收仍独立待办，不据此把整个 Vision 项目标为生产容量验收通过。多地区长期网络可用性也不由一次浏览器加载证明。

## 本次修复

- 按当前官方显式渲染方式在异步脚本 `load` 后直接使用 SDK，移除与异步加载冲突的 `turnstile.ready()`；已先复现真实 SDK 限制，再补浏览器回归。
- 修复移动端地图零高度、移动首页隐藏 Vision 入口、主题切换重置视角，以及更新主题时错误修改筛选图标的问题。
- `challengeAfter=0` 可用于短时严格验证/防护，只有免挑战次数允许为零，所有硬配额仍必须为正；本次验收后默认值恢复为 3。

参考：[Cloudflare 显式渲染文档](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)。

Cloudflare 在全部采集关闭时，`GET /settings` 省略 `observability`，`GET /script-settings` 返回 `observability: null`。本次发布后通过官方 `PATCH /settings` 显式关闭日志、调用日志、持久采集和跟踪，并保持 `redact_query_string=true`；成功响应完整确认这些设置，随后独立核对 GET 未启用采集、绑定和实际开关。未来发布须保留显式设置的成功响应及独立配置核对，不能仅凭缺字段判为通过。


## 2026-11-05 界面细化

- 共用标题增加 `ORBIS | Vision` 分隔符，移除地图样式对品牌字距、字重和尺寸的覆盖；首页与地图页在桌面、手机宽度保持一致。
- 仅去除可选的 MapLibre 引擎署名；OpenFreeMap、OpenMapTiles 和 OpenStreetMap 底图/数据署名由原生控件继续展示，并随底图切换更新。[MapLibre 说明](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)、[OSM 署名要求](https://www.openstreetmap.org/copyright)。
- 按用户要求移除地图上方高亮提示条，地图紧接导航，桌面与手机高度重新匹配导航尺寸；连接、延迟及失败状态仍由原有状态控件展示。
- 本轮类型检查、构建与资源验证、10 项渲染单测、8 项地图浏览器测试通过；新增检查已先在旧实现复现字距差异、可选引擎署名和顶部提示条问题。继续使用已授权的直接发布及 `[skip ci]` 流程。


## 2026-11-05 图层与署名修复

- `ORBIS | Vision` 分隔符两侧统一收紧为 10 px，保持首页与地图页字距一致。
- 按用户确认格式，仅显示带来源链接的 `© OpenMapTiles © OpenStreetMap`，去掉可选供应商文字和署名展开按钮。固定三款 OpenFreeMap 底图保持不变。[OpenFreeMap 署名说明](https://openfreemap.org/#attribution)、[OpenMapTiles 署名要求](https://openmaptiles.org/docs/terminology/attribution/)。
- 图层空白根因：专用地图 worker 脚本使用站点全局 `connect-src 'self'` 响应头，阻止后台线程访问向量瓦片；标准底图的栅格地形仍能显示，掩盖了该问题。本地原测试只约束页面 CSP，未复现 worker 自己的响应策略。
- 仅为 `/assets/vision-worker.*` 设置专用 CSP，允许固定 `tiles.openfreemap.org` 域名；其他页面和资源保持原策略。worker 内容加入响应策略摘要，使一年不可变缓存的地址随策略改变，避免旧浏览器沿用旧 CSP。
- 浏览器测试按构建产物的实际 worker 响应头运行，并使用合成 MVT 多边形检查渲染像素；旧策略下先失败，放行后在连续三款图层切换中通过。该测试不把背景色变化当成底图成功。
- 本轮完整类型检查、构建与资源验证、113 项单测、36 项浏览器测试通过。仍按已授权方案直接部署并 `[skip ci]`，云端积压与容量边界不变。

发布后已在正式域名核对：新的 worker 地址与专用 CSP 完全匹配；线上浏览器连续验证深色、简洁和标准底图均绘出实际地理图形。标题和两项无按钮署名已现场确认。日志、调用日志和跟踪继续关闭；此次不扩大后端容量验收结论。
