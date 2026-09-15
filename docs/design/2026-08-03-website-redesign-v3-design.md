# 官网改版 v3 设计（Orbis 官网 v2 设计稿落地）

- 日期：2026-08-03
- 分支：`lics0613/website-redesign-v3`
- 范围：本仓库全部；设计时尚未从 Orbis App 仓库拆分，因此原记录中的 `server/`、`ios/`、`shared/` 指旧仓库的其他目录

## 1. 来源与依据

设计稿来自 Claude Design 项目 `website`（`f7d3ba5a-4c06-475d-8d63-89b182f19b8a`），两个文件：

- `Orbis 官网 v2.dc.html` —— **本次落地的唯一视觉事实来源**。
- `Orbis 官网设计审查.dc.html` —— 针对旧稿的 14 条审查意见，v2 是按它修完的结果。本文档引用它解释「为什么这样改」。

审查文档中与实现直接相关的结论：

| 条目 | 结论 |
| --- | --- |
| 02 | 纸底上 `#8B959B`（2.8:1）不达 AA，统一换 `--muted #5D6B74`（5.1:1）；琥珀 `#E2A144` 对纸底仅 2.0:1，**不得承载任何正文** |
| 04 | 补 `--lamp-ink #7B5422`（纸底可读琥珀，6.2:1）与 `--field-bg`；`#C8C9C3`/`#BFC2BC` 并进 `--hairline`，`#34444F` 并进 `--night-line` |
| 05 | 严重度必须分三档（关注 / 注意 / 紧急），颜色 + 形状双通道 |
| 06 | 字号收敛为 9 级，标题行高 1.15–1.25 |
| 09 | 风险区压缩，把版面高度还给警报卡 |
| 10 | **去掉夜→纸的 144px 渐变带**，改 1px hairline 硬切，保留琥珀信号 |
| 11 | 通栏区块只保留 `border-top`，不要左右描边 |
| 14 | 「不替代官方预警」要在 Hero 与警报卡旁常驻 |

## 2. 工程约束（不可违反，来自现有流水线）

`scripts/verify.ts` 与 `public/_headers` 已经把下列规则固化为构建失败条件，设计稿的实现方式必须绕开：

1. **禁止内联样式**：`<style>` 元素和 `style="…"` 属性都会让 `verify` 失败。设计稿整篇是内联样式，必须全部翻译成 `src/styles/global.css` 里的类。
2. **禁止内联脚本**：`<script>` 必须带 `src`。设计稿的 `risk-icon` 自定义元素不能照搬。
3. **禁止外链资源**：`(?:src|href)="https?://…"` 会失败，CSP 也是 `default-src 'self'`。设计稿的 Google Fonts 链接必须去掉。
4. **禁止字体文件**：`.woff/.woff2/.ttf/.otf` 出现在 `dist` 即失败。
5. **资产必须被引用**：`dist/assets/**` 下任何文件没被 HTML 引用就失败。停止引用一张图 = 必须从 `public/` 删除它。
6. 所有资产指纹化；JS gzip 预算 10 KB。

## 3. 已定决策

| 议题 | 决策 | 理由 |
| --- | --- | --- |
| 字体 | 沿用现有系统字体栈 `--font-body` / `--font-display` / `--font-mono` | 约束 3、4 排除了 Google Fonts 与自托管字体；中文子集即使只覆盖站内文字也有数十 KB |
| 风险卡说明文案 | 按设计稿删除六句说明 | 审查第 09 条要求压缩风险区，把高度还给警报卡 |
| 警报样机 | 两处样机卡都加可见的「示例 / SAMPLE」等宽标签 | CLAUDE.md 硬约束「不夸大能力」；卡片写着「现在 / 刚刚 / 今晚开始」，无标记会被读成实时数据 |
| 反馈区 `FIELD STATES` 色条 | 不上线 | 设计交付物的自述规格，对访客无意义；状态由真实表单的 focus/error/success 样式表达 |

## 4. 页面结构

中英文同构，顺序如下。锚点沿用现有语义 id（`#risks` / `#relevance` / `#clarity` / `#principles` / `#boundary` / `#feedback`），区块类名同样沿用现有的 `.home-hero` / `.home-risks` / `.home-relevance` / `.home-clarity` / `.home-boundary`，都不改用设计稿的 `#s01`–`#s06`，以保持现有导航、隐私页跳转与测试契约。

### Header

夜底 `--ink`，`position: sticky; top: 0`，高 72px，`border-bottom: 1px solid var(--night-line)`。品牌标记（圆环 + 琥珀圆点）+ ORBIS，右侧 5 项导航：为何 Orbis（`aria-current="page"`）/ 我们的原则 / 反馈 / 隐私 / 语言切换。

### Hero（夜底，`border-bottom: 1px solid var(--lamp)`）

两栏（`auto-fit minmax(360px, 1fr)`）：

- 左栏：h1 两行、引导语（`max-width: 44ch`）、实心琥珀 CTA 按钮指向 `#relevance`、三格指标条（1px `--night-line` 网格，等宽数字 + 等宽标签）。
- 右栏：**警报样机卡** `.alert-card`，`--ink-2` 底 + `--night-line` 描边 + 四角琥珀描角。内容：卡头（ORBIS + 示例标签 + 「现在」）→ 3px 琥珀严重度条 → `LEVEL 2 · 注意` 芯片 → 灾种（衬线 30px）+ 关系句 → WHEN / UPDATED 两格 → `FIRST ACTION / 首先关注` 段 + 来源脚注。
- 底部：`BOUNDARY` 常驻声明条（等宽琥珀标签 + 一句不替代官方预警），落实审查第 14 条。

### 01 `#risks`（纸底）

- 区块头：h2 + 右侧范围说明（`max-width: 42ch`）。
- 六格网格：`auto-fit minmax(190px, 1fr)`，`gap: 1px` + `--hairline` 背景做出 1px 分隔线。每格：`R-0n`（等宽）→ 108px 高图标 → 中文名（衬线 24px）→ 英文术语（等宽）。
- 严重度图例三项：关注（`--muted` 描边空心方块）/ 注意（`--lamp` 实心方块）/ 紧急（`--error` 实心方块 + 3px 外环）。颜色 + 形状双通道，落实审查第 05 条。

### 02 `#relevance`（纸底，`border-top: 1px solid var(--hairline)`）

两栏：

- 左栏：h2、正文、三行因子表（地点 PLACE / 范围 RANGE / 程度 SEVERITY）。
- 右栏：线框描角盒 `INCOMING SIGNALS → ONE RELEVANT ALERT`，三行信号（远处事件 OUT / 影响范围外 OUT / 与你可能相关 PASS）。**被过滤态用虚线描边 + `OUT` 标记表达，文字颜色一律 `--muted`**，落实审查第 02 条。底部汇总行：守护地点（地点 × 范围 × 程度）→ 相关风险变化。

### 03 `#clarity`（夜底，`border-top: 1px solid var(--lamp)`）

h2 + 引导语，下方两栏：

- 左栏：01–04 四行清单（等宽序号 + 标题 + 说明），1px `--night-line` 分隔。
- 右栏：完整警报卡，同样带示例标签。四个字段用 `01 WHAT / 02 WHERE / 03 WHEN / 04 FIRST ACTION` 与左栏一一对应。卡底常驻「不替代官方预警或紧急服务」。

现有把 `.home-clarity-list` 用 clip 隐藏起来只给读屏用的做法取消——四项现在是页面上真实可见的内容。

### 04 `#principles`（纸底）

h2 + 三行分类账：琥珀方块 + 中文名（衬线 24px）/ 英文标签（等宽）+ 说明。顶边 `--text` 实线，行间 `--hairline`。

### 05 `#boundary`（纸底）

线框描角盒（`--text` 1px 描边），h2 + 正文 + 三条要点（琥珀小方块 + 文字）。

### 06 `#feedback`（纸底，仅 `border-top: 1px solid var(--hairline)`）

两栏（`auto-fit minmax(300px, 1fr)`）：左栏 h2 + 引导语；右栏表单。表单契约完全不变：`method="post" action="/api/feedback"`、蜜罐、`data-feedback-form` 与六个状态文案 data 属性、`role="status"` 状态行、`/assets/feedback.js`。

### Footer

夜底 `--ink`，左侧边界声明，右侧四个链接 + 版权。

### 移除项

`.home-color-transition` 渐变带（含 DOM 节点、CSS、相关单测与 e2e 用例）整体删除，由 Hero/03 的 1px 琥珀硬切替代。

## 5. 资产变化

**删除**（`public/assets/home/`）：`hero-radar.png`、`hero-radar.en.svg`、`relevance.png`、`relevance.en.svg`、`clarity.png`、`clarity.en.svg`。三处视觉全部改由 HTML/CSS 线框实现，英文专版素材随之失去存在理由，`renderHome` 里的 `visuals` 分支一并删除。

**替换**：六个 `risk-*.svg` 换成设计稿 `assets/risk-icon.js` 里的新路径。设计稿用 `currentColor` + `color: #7B5422` 着色；这里落成静态 SVG，`fill="#7B5422"`（`--lamp-ink`），因为六处用色一致，不需要 `currentColor` 继承，静态文件也更利于缓存与 HTML 体积。`viewBox` 保持 `0 0 360 260`。

**`scripts/verify.ts`**：`expectedAssets` 收缩为 `assets/global.css`、`assets/lang.js`、`assets/feedback.js` 与六个 `assets/home/risk-*.svg`。

## 6. 设计令牌与字号

在 `:root` 中：

- 新增 `--lamp-ink: #7B5422`（纸底文字用琥珀）、`--field-bg: #FFFFFF`、`--dash: #C8C9C3`（虚线描边）。
- `--night-line` 由 `rgba(237,234,227,.12)` 改为实色 `#2A3843`。
- 其余颜色令牌与设计稿 `audit/fig-tokens.css` 已经一致，不动。

字号（审查第 06 条的 9 级）：

| 角色 | 值 |
| --- | --- |
| Display（h1） | `clamp(40px, 5.2vw, 72px)` / 行高 1.18 |
| H1（区块大标题） | `clamp(30px, 3.6vw, 52px)` / 1.22 |
| H2（次级标题） | `clamp(28px, 3vw, 34px)` / 1.25 |
| H3 | 24px / 1.2 |
| Body | 15px / 1.8 |
| Body-S | 13px / 1.75 |
| Caption | 12px |
| Mono Label | 12px / `letter-spacing: .12em` |
| Mono Micro | 11px / `letter-spacing: .14em` |

## 7. 内容模型

`src/content/types.ts` 的改动：

```ts
// 改
hero.metrics: ReadonlyArray<{ value: string; label: string }>   // 原 readonly [string,string,string]
hero.boundary: { tag: string; note: string }                     // 新增：Hero 底部常驻声明条

// 新增
interface AlertSampleContent {
  sampleTag: string;      // 示例 / SAMPLE
  nowLabel: string;       // 现在
  levelLabel: string;     // LEVEL 2 · 注意
  hazard: string;         // 暴雨
  where: string;          // 与你在意的地点相关
  whenLabel: string; when: string;
  updatedLabel: string; updated: string;
  actionLabel: string; action: string;
  sourceNote: string;     // 来源与完整信息可查看
  boundaryNote: string;   // 不替代官方预警或紧急服务（仅 03 的卡片用）
  fieldLabels: { what: string; where: string; when: string; action: string };  // 01 WHAT…
}
```

两张样机卡共用这一份内容，差异在渲染层而非内容层：Hero 的紧凑卡显示 `levelLabel` 芯片、灾种、WHEN/UPDATED、行动段与 `sourceNote`；03 的完整卡改用 `fieldLabels` 逐字段标注（`01 WHAT` 显示为「暴雨 · 注意」的组合），并在卡底同时显示 `sourceNote` 与 `boundaryNote`。两张卡都渲染 `sampleTag`。

```ts

// 改
risks.items: ReadonlyArray<{ key: RiskKey; code: string; name: string; term: string }>  // 删 body，加 code/term
risks.severity: { label: string; levels: ReadonlyArray<{ tone: "watch"|"alert"|"urgent"; text: string }> }

// 新增
relevance.factors: ReadonlyArray<{ name: string; term: string }>   // 地点 PLACE / 范围 RANGE / 程度 SEVERITY
relevance.diagram: {
  caption: string;                                                  // INCOMING SIGNALS → ONE RELEVANT ALERT
  rows: ReadonlyArray<{ label: string; verdict: string; pass: boolean }>;
  sourceTitle: string; sourceSub: string;                           // 守护地点 / 地点 × 范围 × 程度
  resultTag: string; resultText: string;                            // RELEVANT / 与你相关的风险变化
}

// 改
clarity.items: ReadonlyArray<{ index: string; title: string; body: string }>  // tag "01 · WHAT" 拆成 index "01"
```

`principles`、`boundary`、`feedback`、`privacy`、`footer`、`nav`、`meta` 不变。中英文两份同步维护，`en.ts` 的 `term` 用英文术语（`EARTHQUAKE` 等），中文页同样显示英文术语——这是设计稿的双语并置母题。

## 8. 可访问性

- 纸底文字一律 `--text` 或 `--muted`；琥珀只做填充、描边、3px 严重度条，**不做文字**；需要琥珀色文字的地方用 `--lamp-ink`。
- 夜底：`--night-text` 与 `--night-muted`（`#8FA0AB` 对 `#0F1B24` 约 6.7:1）。
- 保留现有双层高对比度焦点环：`:focus-visible{outline:2px solid #fff;outline-offset:2px;box-shadow:0 0 0 4px var(--text)}`。
- 风险图标是装饰，`<img alt="">`，语义由相邻文字承担。
- 严重度图例与信号过滤图都不单靠颜色：图例配形状，过滤态配虚线 + `OUT` 文本。
- 警报样机卡的「示例」标签是可见文本，不是纯视觉装饰。

## 9. 响应式

主栅格用 `auto-fit minmax()`，天然折行。断点补充：

- `≤64rem`：Hero 与 03 两栏堆叠。
- `≤48rem`：导航折叠为品牌 + 语言切换（沿用现有规则）；区块内边距切到 `--pad-x`；指标条与图例换行。
- 320px 仍须无横向滚动（现有 e2e 用例保留）。

## 10. 测试改动

**保留不变的契约**：反馈表单全部属性、canonical/hreflang、双语顶层键一致、无内联脚本/样式、无外链、资产指纹与引用完整性、sitemap/robots、CSP 头、JS gzip 预算、旧产品页 404。

**需要改的**：

| 文件 | 改动 |
| --- | --- |
| `tests/unit/content.test.ts` | 风险项断言改为校验 `name` + `code` + `term`；删掉对 `body` 的隐含依赖 |
| `tests/unit/render.test.ts` | 删掉三条英文素材专项测试与 hero-radar/relevance/clarity 的资产断言、`fetchpriority` 用例；改为断言六个 `risk-*.svg`、两张样机卡的示例标签、区块顺序 |
| `tests/unit/build-output.test.ts` | 删 `.home-color-transition` 与英文素材指纹断言；改为断言 `--lamp-ink` 与新的严重度样式存在 |
| `tests/e2e/site.spec.ts` | 删「雷达图 1.1 倍」与「渐变带」两个用例；新增：Hero 样机卡可见且带示例标签、夜/纸交界是 1px 琥珀硬切 |
| `tests/e2e/no-script.spec.ts` | `.home-risks` 文案断言改为「龙卷风」仍在（新卡仍有该文字，可保留）；补 `#clarity` 四项可见 |
| `scripts/verify.ts` | `expectedAssets` 白名单收缩 |

## 11. 交付顺序

1. 令牌与字号：`global.css` 的 `:root` 与基础排版。
2. 资产：替换六个风险图标，删除六个退役素材，同步 `verify.ts` 白名单。
3. 内容模型：`types.ts` + `zh.ts` + `en.ts`，跑通 `content.test.ts`。
4. 布局骨架：`layout.ts`（sticky header、夜底 footer）。
5. 逐区块实现：Hero → 01 → 02 → 03 → 04 → 05 → 06，每区块 CSS 与 `home.ts` 同步落地。
6. 反馈区双栏改造，验证表单契约测试仍绿。
7. 隐私页与 404、语言入口页对齐新令牌。
8. 单测 → `npm run build`（含 verify）→ e2e，全绿后提交。

每步都是可独立验证的增量，按 CLAUDE.md §3.2「小步、可验证」执行。
