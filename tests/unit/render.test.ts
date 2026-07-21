import { describe, expect, it } from "vitest";
import { renderHome } from "../../src/render/home";
import { renderPrivacy } from "../../src/render/privacy";
import { renderEntry } from "../../src/render/entry";
import { renderNotFound } from "../../src/render/notFound";

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
    expect(zh).toContain("data-feedback-form");
    expect(zh).toContain('action="/api/feedback"');
    expect(zh).toContain('name="website"');
    expect(zh).toContain('name="locale"');
    expect(zh).toContain("data-feedback-status");
    expect(zh).toContain('maxlength="2000"');
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
