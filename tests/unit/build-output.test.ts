import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/build.ts"], {
    env: { ...process.env, PUBLIC_SITE_ORIGIN: "https://orbis.example" }, stdio: "pipe"
  });
  execFileSync(process.execPath, ["--import", "tsx", "scripts/verify.ts"], { stdio: "pipe" });
}, 120_000);

describe("build output", () => {
  it("产出全部约定文件", () => {
    for (const f of [
      "dist/index.html", "dist/404.html",
      "dist/zh/index.html", "dist/en/index.html",
      "dist/zh/privacy/index.html", "dist/en/privacy/index.html",
      "dist/assets/global.css", "dist/assets/lang.js", "dist/assets/feedback.js",
      "dist/assets/home/hero-radar.en.svg", "dist/assets/home/relevance.en.svg",
      "dist/assets/home/clarity.en.svg",
      "dist/sitemap.xml", "dist/robots.txt", "dist/_headers", "dist/favicon.svg"
    ]) expect(existsSync(f), f).toBe(true);
    expect(existsSync("dist/zh/product/index.html")).toBe(false);
    expect(existsSync("dist/en/product/index.html")).toBe(false);
  });
  it("中英文首页是新的唯一能力页面", () => {
    const zh = readFileSync("dist/zh/index.html", "utf8");
    const en = readFileSync("dist/en/index.html", "utf8");
    expect(zh).toContain("<title>Orbis 产品能力｜你的安全，时刻守护</title>");
    expect(en).toContain("<title>How Orbis works | Keeping watch over your safety</title>");
    for (const html of [zh, en]) {
      expect(html.match(/class="risk-card"/g)).toHaveLength(6);
      expect(html).toContain('id="principles"');
      expect(html).toContain("data-feedback-form");
      expect(html).toContain('<div class="home-color-transition" aria-hidden="true"></div>');
    }
    const css = readFileSync("dist/assets/global.css", "utf8");
    expect(css).toContain(".home-color-transition");
    expect(css).toContain("linear-gradient");
    expect(en).toContain('/assets/home/hero-radar.en.svg');
    expect(en).toContain('/assets/home/relevance.en.svg');
    expect(en).toContain('/assets/home/clarity.en.svg');
    expect(en).not.toMatch(/\/assets\/home\/(?:hero-radar|relevance|clarity)\.png/);
  });
  it("sitemap 与 robots 使用构建 origin且不包含旧产品页", () => {
    const sitemap = readFileSync("dist/sitemap.xml", "utf8");
    expect(sitemap).toContain("https://orbis.example/zh/");
    expect(sitemap).toContain("https://orbis.example/en/");
    expect(sitemap).not.toContain("/product/");
    expect(readFileSync("dist/robots.txt", "utf8")).toContain("Sitemap: https://orbis.example/sitemap.xml");
  });
  it("_headers 含 CSP 与安全头", () => {
    const headers = readFileSync("dist/_headers", "utf8");
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("Strict-Transport-Security");
    expect(headers).toContain("Permissions-Policy");
  });
});
