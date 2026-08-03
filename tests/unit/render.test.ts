import { existsSync, readFileSync } from "node:fs";
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
    expect(en).toContain('<h1 id="home-title"><span>Keeping watch over</span><span>your safety.</span></h1>');
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

  it("在风险与相关性之间渲染纯装饰背景过渡", () => {
    for (const html of [zh, en]) {
      expect(html).toContain('<div class="home-color-transition" aria-hidden="true"></div>');
      const risksEnd = html.indexOf("</section>", html.indexOf('id="risks"'));
      const transition = html.indexOf('class="home-color-transition"');
      const relevance = html.indexOf('id="relevance"');
      expect(risksEnd).toBeLessThan(transition);
      expect(transition).toBeLessThan(relevance);
    }
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
      "risk-flood.svg", "risk-wildfire.svg", "risk-tornado.svg", "relevance.png", "clarity.png"
    ]) expect(zh, asset).toContain(`/assets/home/${asset}`);
    for (const html of [zh, en]) {
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
      expect(html).not.toMatch(/<style/i);
      expect(html).not.toMatch(/(?:src|href)="https?:\/\/(?!localhost|orbis)/i);
      expect(html).not.toMatch(FORBIDDEN);
    }
  });

  it("英文首页使用独立的英文视觉素材", () => {
    const englishAssets = ["relevance.en.svg", "clarity.en.svg"];
    for (const asset of englishAssets) {
      expect(en, asset).toContain(`/assets/home/${asset}`);
      expect(existsSync(join("public/assets/home", asset)), asset).toBe(true);
    }
    expect(en).not.toContain('/assets/home/relevance.png');
    expect(en).not.toContain('/assets/home/clarity.png');
  });

  it("英文视觉素材不包含中文文字", () => {
    for (const asset of ["relevance.en.svg", "clarity.en.svg"]) {
      const path = join("public/assets/home", asset);
      expect(existsSync(path), asset).toBe(true);
      if (existsSync(path)) expect(readFileSync(path, "utf8"), asset).not.toMatch(/\p{Script=Han}/u);
    }
  });

  it("英文视觉素材中的长文案使用显式换行", () => {
    const relevance = readFileSync(join("public/assets/home", "relevance.en.svg"), "utf8");
    const clarity = readFileSync(join("public/assets/home", "clarity.en.svg"), "utf8");
    expect(relevance).not.toContain(">PLACE YOU PROTECT</text>");
    expect(relevance).not.toContain(">MATTERS TO YOU</text>");
    expect(clarity).not.toContain(">Limit unnecessary travel and follow local official information.</text>");
    expect(relevance.match(/<tspan/g)).toHaveLength(6);
    expect(clarity.match(/<tspan/g)).toHaveLength(2);
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
