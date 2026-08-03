import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/render/home";
import { renderPrivacy } from "../../src/render/privacy";
import { renderEntry } from "../../src/render/entry";
import { renderNotFound } from "../../src/render/notFound";

const FORBIDDEN = /\b(waitlist|join beta|app store|download|critical alerts|prediction|guarantee)\b|预测地震|保证安全|不会漏报/i;

const RISK_ICONS = [
  "risk-earthquake.svg", "risk-rain.svg", "risk-heatwave.svg",
  "risk-flood.svg", "risk-wildfire.svg", "risk-tornado.svg"
] as const;

describe("风险图标资产", () => {
  it("六个图标统一使用 lamp-ink 填充、等比缩放且不含内联样式", () => {
    for (const icon of RISK_ICONS) {
      const svg = readFileSync(join("public/assets/home", icon), "utf8");
      expect(svg, icon).toContain('viewBox="0 0 360 260"');
      expect(svg, icon).toContain('fill="#7B5422"');
      expect(svg, icon).toContain('preserveAspectRatio="xMidYMid meet"');
      expect(svg, icon).not.toMatch(/\sstyle=/);
      expect(svg, icon).not.toMatch(/preserveAspectRatio="none"/);
    }
  });
});

describe("renderHome", () => {
  const zh = renderHome("zh");
  const en = renderHome("en");

  it("Hero 用线框警报样机替代位图，并常驻边界声明", () => {
    expect(zh).toContain('lang="zh-CN"');
    expect(en).toContain('lang="en"');
    expect(zh).toContain('<body class="page-home">');
    expect(zh).toContain('<h1 id="home-title"><span>你的安全，</span><span>时刻守护</span></h1>');
    expect(en).toContain('<h1 id="home-title"><span>Keeping watch</span><span>over your safety.</span></h1>');
    for (const html of [zh, en]) {
      expect(html).not.toContain("hero-radar");
      expect(html).toContain('class="hero-figure"');
      expect(html).toContain('class="alert-card alert-card-compact blueprint"');
      expect(html).toContain('class="hero-boundary"');
    }
    expect(zh).toContain('<span class="alert-sample mono">示例</span>');
    expect(en).toContain('<span class="alert-sample mono">SAMPLE</span>');
    expect(zh).toContain("LEVEL 2 · 注意");
    expect(zh.match(/class="hero-metrics"/g)).toHaveLength(1);
    expect(zh).toContain('<span class="metric-value">1</span>');
    expect(zh).toContain('<p class="alert-tag mono">FIRST ACTION / 首先关注</p>');
    expect(en).toContain('<p class="alert-tag mono">FIRST ACTION</p>');
  });

  it("按顺序包含六类风险、相关性、清晰度、三条原则、边界与反馈", () => {
    expect(zh.match(/class="risk-card"/g)).toHaveLength(6);
    for (const id of ['id="risks"', 'id="relevance"', 'id="clarity"', 'id="principles"', 'id="boundary"', 'id="feedback"']) {
      expect(zh, id).toContain(id);
    }
    expect(zh.indexOf('id="clarity"')).toBeLessThan(zh.indexOf('id="principles"'));
    expect(zh.indexOf('id="principles"')).toBeLessThan(zh.indexOf('id="boundary"'));
    expect(zh).toContain("龙卷风");
    expect(zh).not.toMatch(/强风|HIGH WIND/i);
  });

  it("夜纸交界用 1px 硬切，不再有渐变过渡带", () => {
    for (const html of [zh, en]) {
      expect(html).not.toContain("home-color-transition");
      const risksEnd = html.indexOf("</section>", html.indexOf('id="risks"'));
      expect(risksEnd).toBeLessThan(html.indexOf('id="relevance"'));
    }
  });

  it("判断逻辑区用线框过滤图替代位图", () => {
    for (const html of [zh, en]) {
      expect(html).not.toContain("relevance.png");
      expect(html).not.toContain("relevance.en.svg");
      expect(html).toContain('class="relevance-diagram blueprint blueprint-muted"');
      expect(html).toContain('class="factor-list"');
      expect(html.match(/class="signal-row/g)).toHaveLength(3);
      expect(html).toContain("signal-row is-pass");
      expect(html).toContain("INCOMING SIGNALS → ONE RELEVANT ALERT");
      expect(html.match(/>OUT</g)).toHaveLength(2);
      expect(html.match(/>PASS</g)).toHaveLength(1);
    }
    expect(zh).toContain(">远处事件<");
    expect(en).toContain(">Distant event<");
  });

  it("保留完整反馈表单契约", () => {
    expect(zh.match(/data-feedback-form/g)).toHaveLength(1);
    for (const attr of [
      "data-feedback-form",
      'method="post"', 'action="/api/feedback"',
      "data-sending", "data-success", "data-validation",
      "data-rate-limited", "data-unavailable", "data-uncertain",
      'name="locale"',
      'name="website"', "honeypot", 'tabindex="-1"',
      'name="message"', 'maxlength="2000"', "required",
      'name="contact"', 'maxlength="200"',
      'role="status"', "data-feedback-status",
      'src="/assets/feedback.js"'
    ]) expect(zh, attr).toContain(attr);
  });

  it("反馈区改为双栏且不再显示区块编号", () => {
    for (const html of [zh, en]) {
      expect(html).toContain('<section class="home-feedback" id="feedback"');
      expect(html).toContain('class="fb-intro"');
      expect(html).toContain('class="fb-form"');
      expect(html).not.toContain("section-code");
      expect(html).not.toContain("06 · FEEDBACK");
    }
  });

  it("导航把为何 Orbis 定位到当前首页并保持语言页面类型", () => {
    const nav = zh.match(/<nav[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? "";
    expect(nav.indexOf("为何 Orbis")).toBeLessThan(nav.indexOf("我们的原则"));
    expect(zh).toContain('href="/zh/" aria-current="page">为何 Orbis</a>');
    expect(zh).toContain('class="lang-switch" href="/en/"');
    expect(zh).not.toMatch(/\/zh\/product\//);
    expect(en).not.toMatch(/\/en\/product\//);
  });

  it("canonical 与 hreflang 指向真实首页", () => {
    expect(zh).toContain('rel="canonical" href="http://localhost:8788/zh/"');
    expect(zh).toContain('hreflang="en" href="http://localhost:8788/en/"');
    expect(en).toContain('rel="canonical" href="http://localhost:8788/en/"');
  });

  it("只引用本地首页视觉资产且没有禁词", () => {
    for (const asset of [
      "risk-earthquake.svg", "risk-rain.svg", "risk-heatwave.svg",
      "risk-flood.svg", "risk-wildfire.svg", "risk-tornado.svg"
    ]) expect(zh, asset).toContain(`/assets/home/${asset}`);
    for (const html of [zh, en]) {
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
      expect(html).not.toMatch(/<style/i);
      expect(html).not.toMatch(/(?:src|href)="https?:\/\/(?!localhost|orbis)/i);
      expect(html).not.toMatch(FORBIDDEN);
    }
  });

  it("清晰度区用完整警报卡替代位图，四项内容真实可见", () => {
    for (const html of [zh, en]) {
      expect(html).not.toContain("clarity.png");
      expect(html).not.toContain("clarity.en.svg");
      expect(html).toContain('class="clarity-grid"');
      expect(html).toContain('class="alert-card alert-card-full blueprint"');
      expect(html.match(/class="clarity-index mono"/g)).toHaveLength(4);
      expect(html).not.toContain("home-clarity-stage");
      expect(html).not.toContain("home-clarity-figure");
    }
    expect(zh).toContain("首先关注什么");
    expect(en).toContain("What to notice first");
    expect(zh.match(/class="alert-sample mono"/g)).toHaveLength(2);
    expect(zh).toContain('<p class="alert-tag mono">04 FIRST ACTION / 首先关注</p>');
    expect(en).toContain('<p class="alert-tag mono">04 FIRST ACTION</p>');
  });

  it("风险区收敛为索引网格并给出三档严重度图例", () => {
    for (const html of [zh, en]) {
      expect(html.match(/class="risk-card"/g)).toHaveLength(6);
      expect(html).toContain('<span class="risk-code mono">R-01</span>');
      expect(html).toContain('<span class="risk-term mono">EARTHQUAKE</span>');
      expect(html).toContain('class="severity-legend"');
      for (const tone of ["sev-watch", "sev-alert", "sev-urgent"]) {
        expect(html, tone).toContain(tone);
      }
      const icon = html.slice(html.indexOf('src="/assets/home/risk-earthquake.svg"') - 200,
        html.indexOf('src="/assets/home/risk-earthquake.svg"') + 200);
      expect(icon).toContain('loading="lazy"');
      expect(icon).toContain('decoding="async"');
      expect(icon).toContain('alt=""');
    }
    expect(zh).toContain('<h3 class="risk-name">地震</h3>');
    expect(en).toContain('<h3 class="risk-name">Earthquake</h3>');
  });

  it("导航无障碍名称随页面语言本地化", () => {
    expect(zh).toContain('aria-label="Orbis 首页"');
    expect(zh).toContain('aria-label="主导航"');
    expect(en).toContain('aria-label="Orbis home"');
    expect(en).toContain('aria-label="Primary navigation"');
  });

  it("原则与边界按线框风格重排且行数不变", () => {
    for (const html of [zh, en]) {
      expect(html.match(/<li><span class="l-mark"/g)).toHaveLength(3);
      expect(html).toContain('<aside class="home-boundary blueprint blueprint-ink"');
      expect(html).toContain('<span class="corner tl" aria-hidden="true"></span>');
      expect(html).not.toContain('class="day home-principles"');
      expect(html).toContain('class="home-principles"');
    }
  });
});

describe("其余页面", () => {
  it("隐私页含四个分节并从导航返回首页锚点", () => {
    const privacy = renderPrivacy("zh");
    const englishPrivacy = renderPrivacy("en");
    expect(privacy.match(/<h2/g)!.length).toBeGreaterThanOrEqual(4);
    expect(englishPrivacy).toContain("Privacy notice");
    expect(privacy).toContain("<title>隐私说明 | Orbis</title>");
    expect(privacy).toContain('name="description" content="了解 Orbis 在反馈过程中处理哪些信息、如何使用以及保留期限。"');
    expect(englishPrivacy).toContain("<title>Privacy notice | Orbis</title>");
    expect(englishPrivacy).toContain('name="description" content="Learn what information Orbis processes for feedback, how it is used, and how long it is retained."');
    expect(privacy).toContain('href="/zh/">为何 Orbis</a>');
    for (const section of ["principles", "feedback"]) {
      expect(privacy).toContain(`href="/zh/#${section}"`);
      expect(privacy).not.toContain(`href="#${section}"`);
    }
    expect(privacy).toContain('class="lang-switch" href="/en/privacy/"');
    expect(privacy).not.toMatch(/\/zh\/product\//);
  });

  it("语言入口的有脚本与无脚本路径都只指向首页", () => {
    const entry = renderEntry();
    expect(entry).toContain("<title>Orbis | Keeping watch over your safety</title>");
    expect(entry).toContain('href="/zh/"');
    expect(entry).toContain('href="/en/"');
    expect(entry).toContain('src="/assets/lang.js"');
    expect(entry).not.toMatch(/\/(?:zh|en)\/product\//);
    expect(entry).not.toMatch(/<script(?![^>]*\bsrc=)/i);
  });

  it("404 提供双语首页入口", () => {
    const nf = renderNotFound();
    expect(nf).toContain('href="/zh/"');
    expect(nf).toContain('href="/en/"');
  });

  it("页头吸顶、页脚夜底，且首页与隐私页共用同一骨架", () => {
    for (const html of [renderHome("zh"), renderPrivacy("zh")]) {
      expect(html).toContain('<header class="site-header">');
      expect(html).toContain('<div class="header-inner">');
      expect(html).toContain('<footer class="site-footer">');
      expect(html).toContain('<div class="footer-inner">');
    }
  });
});
