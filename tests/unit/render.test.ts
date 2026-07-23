import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/render/home";
import { renderPrivacy } from "../../src/render/privacy";
import { renderEntry } from "../../src/render/entry";
import { renderNotFound } from "../../src/render/notFound";

const FORBIDDEN = /\b(waitlist|join beta|app store|download|critical alerts|prediction|guarantee)\b|预测地震|保证安全|不会漏报/i;

describe("renderHome", () => {
  const zh = renderHome("zh");
  const en = renderHome("en");

  it("直接在中英文首页呈现定稿 Hero", () => {
    expect(zh).toContain('lang="zh-CN"');
    expect(en).toContain('lang="en"');
    expect(zh).toContain('<body class="page-home">');
    expect(zh).toContain('<h1 id="home-title"><span>你的安全，</span><span>时刻守护</span></h1>');
    expect(en).toContain('<h1 id="home-title"><span>Keeping watch over</span><span>your safety.</span></h1>');
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
      "hero-radar.png", "risk-earthquake.svg", "risk-rain.svg", "risk-heatwave.svg",
      "risk-flood.svg", "risk-wildfire.svg", "risk-tornado.svg", "relevance.png", "clarity.png"
    ]) expect(zh, asset).toContain(`/assets/home/${asset}`);
    for (const html of [zh, en]) {
      expect(html).not.toMatch(/<script(?![^>]*\bsrc=)/i);
      expect(html).not.toMatch(/<style/i);
      expect(html).not.toMatch(/(?:src|href)="https?:\/\/(?!localhost|orbis)/i);
      expect(html).not.toMatch(FORBIDDEN);
    }
  });
});

describe("其余页面", () => {
  it("隐私页含四个分节并从导航返回首页锚点", () => {
    const privacy = renderPrivacy("zh");
    expect(privacy.match(/<h2/g)!.length).toBeGreaterThanOrEqual(4);
    expect(renderPrivacy("en")).toContain("Privacy notice");
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
});
