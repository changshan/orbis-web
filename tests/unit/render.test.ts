import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/render/home";
import { renderPrivacy } from "../../src/render/privacy";
import { renderEntry } from "../../src/render/entry";
import { renderNotFound } from "../../src/render/notFound";
import { renderProduct } from "../../src/render/product";

const FORBIDDEN = /\b(waitlist|join beta|app store|download|critical alerts|prediction|guarantee)\b|预测地震|保证安全|不会漏报/i;

describe("renderHome", () => {
  const zh = renderHome("zh");
  const en = renderHome("en");
  it("语言与定稿标题正确", () => {
    expect(zh).toContain('lang="zh-CN"');
    expect(en).toContain('lang="en"');
    expect(zh).toContain("任何时候，");
    expect(zh).toContain("为你守护");
    expect(en).toContain("Keeping watch,");
    expect(en).toContain("whenever it matters");
  });
  it("六段结构与表单契约齐全", () => {
    for (const id of ['id="why"', 'id="principles"', 'id="boundary"', 'id="feedback"']) expect(zh).toContain(id);
    // Full form DOM contract — Task 6 (client) and Task 8 (e2e) depend on every one of these byte-for-byte.
    for (const attr of [
      "data-feedback-form",
      'method="post"', 'action="/api/feedback"',
      "data-sending", "data-success", "data-validation",
      "data-rate-limited", "data-unavailable", "data-uncertain",
      'name="locale"',
      'name="website"', "honeypot", 'tabindex="-1"',
      'name="message"', 'maxlength="2000"', "required",
      'name="contact"', 'maxlength="200"',
      'role="status"', "data-feedback-status"
    ]) expect(zh, attr).toContain(attr);
  });
  it("canonical 与 hreflang 成对", () => {
    expect(zh).toContain('rel="canonical" href="http://localhost:8788/zh/"');
    expect(zh).toContain('hreflang="en" href="http://localhost:8788/en/"');
  });
  it("零内联脚本/样式、无第三方资源、无禁词", () => {
    for (const html of [zh, en]) {
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
      expect(html).not.toMatch(/<style/i);
      expect(html).not.toMatch(/(?:src|href)="https?:\/\/(?!localhost|orbis)/i);
      expect(html).not.toMatch(FORBIDDEN);
    }
  });
});

describe("其余页面", () => {
  it("隐私页含四个分节", () => {
    expect(renderPrivacy("zh").match(/<h2/g)!.length).toBeGreaterThanOrEqual(4);
    expect(renderPrivacy("en")).toContain("Privacy notice");
  });
  it("隐私页导航返回本语言首页锚点且语言切换保留当前页面", () => {
    const privacy = renderPrivacy("zh");
    for (const section of ["why", "principles", "feedback"]) {
      expect(privacy).toContain(`href="/zh/#${section}"`);
      expect(privacy).not.toContain(`href="#${section}"`);
    }
    expect(privacy).toContain('class="lang-switch" href="/en/privacy/"');
  });
  it("语言入口含双语链接与外链脚本", () => {
    const entry = renderEntry();
    expect(entry).toContain('href="/zh/"');
    expect(entry).toContain('href="/en/"');
    expect(entry).toContain('src="/assets/lang.js"');
    expect(entry).not.toMatch(/<script(?![^>]*\bsrc=)/i);
  });
  it("404 提供双语首页入口", () => {
    const nf = renderNotFound();
    expect(nf).toContain('href="/zh/"');
    expect(nf).toContain('href="/en/"');
  });
});

describe("renderProduct", () => {
  const zh = renderProduct("zh");
  const en = renderProduct("en");

  it("导航顺序、当前项与语言切换正确", () => {
    const navMatch = zh.match(/<nav[^>]*>([\s\S]*?)<\/nav>/);
    expect(navMatch).not.toBeNull();
    const nav = navMatch?.[1] ?? "";
    expect(nav.indexOf("为何 Orbis")).toBeLessThan(nav.indexOf("产品"));
    expect(nav.indexOf("产品")).toBeLessThan(nav.indexOf("我们的原则"));
    expect(zh).toContain('href="/zh/product/" aria-current="page"');
    expect(zh).toContain('class="lang-switch" href="/en/product/"');
    expect(zh).toContain('<body class="page-product">');
  });

  it("Hero 保留设计稿的两行标题结构", () => {
    expect(zh).toContain("<span>你的安全，</span><span>时刻守护。</span>");
    expect(en).toContain("<span>Keeping watch over</span><span>your safety.</span>");
  });

  it("首页与产品页各复用一次完整反馈表单", () => {
    expect(renderHome("zh").match(/data-feedback-form/g)).toHaveLength(1);
    expect(zh.match(/data-feedback-form/g)).toHaveLength(1);
    for (const html of [zh, en]) {
      expect(html).toContain('action="/api/feedback"');
      expect(html).toContain('src="/assets/feedback.js"');
      expect(html).toContain("data-feedback-status");
    }
  });

  it("按设计稿呈现六类风险、判断框架和本地视觉资产", () => {
    for (const id of ['id="risks"', 'id="relevance"', 'id="clarity"', 'id="product-boundary"']) {
      expect(zh).toContain(id);
    }
    expect(zh.match(/class="risk-card"/g)).toHaveLength(6);
    for (const asset of [
      "hero-radar.png", "risk-earthquake.svg", "risk-rain.svg", "risk-heatwave.svg",
      "risk-flood.svg", "risk-wildfire.svg", "risk-tornado.svg", "relevance.png", "clarity.png"
    ]) expect(zh, asset).toContain(`/assets/product/${asset}`);
    expect(zh).toContain("实际可用类型取决于当地信息源与服务范围");
    expect(zh).toContain("重要信息，优先呈现。");
    expect(en).toContain("Availability depends on local information sources and service coverage");
    for (const html of [zh, en]) {
      expect(html).not.toMatch(/强风|HIGH WIND/i);
      const withoutMeta = html.replace(/rel="(?:canonical|alternate)"[^>]*/gi, "");
      expect(withoutMeta).not.toMatch(/(?:src|href)="https?:\/\//i);
    }
  });
});
