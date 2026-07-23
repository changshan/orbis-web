import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  execFileSync("npx", ["tsx", "scripts/build.ts"], {
    env: { ...process.env, PUBLIC_SITE_ORIGIN: "https://orbis.example" }, stdio: "pipe"
  });
  execFileSync("npx", ["tsx", "scripts/verify.ts"], { stdio: "pipe" });
}, 120_000);

describe("build output", () => {
  it("产出全部约定文件", () => {
    for (const f of [
      "dist/index.html", "dist/404.html",
      "dist/zh/index.html", "dist/en/index.html",
      "dist/zh/product/index.html", "dist/en/product/index.html",
      "dist/zh/privacy/index.html", "dist/en/privacy/index.html",
      "dist/assets/global.css", "dist/assets/lang.js", "dist/assets/feedback.js",
      "dist/sitemap.xml", "dist/robots.txt", "dist/_headers", "dist/favicon.svg"
    ]) expect(existsSync(f), f).toBe(true);
  });
  it("sitemap 与 robots 使用构建 origin", () => {
    const sitemap = readFileSync("dist/sitemap.xml", "utf8");
    expect(sitemap).toContain("https://orbis.example/zh/");
    expect(sitemap).toContain("https://orbis.example/zh/product/");
    expect(sitemap).toContain("https://orbis.example/en/product/");
    expect(readFileSync("dist/robots.txt", "utf8")).toContain("Sitemap: https://orbis.example/sitemap.xml");
  });
  it("_headers 含 CSP 与安全头", () => {
    const headers = readFileSync("dist/_headers", "utf8");
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("Strict-Transport-Security");
    expect(headers).toContain("Permissions-Policy");
  });
});
