import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const HASHED_FILENAME = /\.[a-f0-9]{12}\.[a-z0-9]+$/;

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
  );
}

function hashedAsset(directory: string, stem: string, extension: string): string {
  const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^${escapedStem}\\.[a-f0-9]{12}\\.${extension}$`);
  const match = readdirSync(directory).find((file) => pattern.test(file));
  expect(match, `${directory}/${stem}.<hash>.${extension}`).toBeDefined();
  return join(directory, match!);
}

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
      "dist/sitemap.xml", "dist/robots.txt", "dist/_headers", "dist/favicon.svg"
    ]) expect(existsSync(f), f).toBe(true);
    expect(existsSync("dist/assets/global.css")).toBe(false);
    expect(existsSync("dist/assets/lang.js")).toBe(false);
    expect(existsSync("dist/assets/feedback.js")).toBe(false);
    expect(existsSync(hashedAsset("dist/assets", "global", "css"))).toBe(true);
    expect(existsSync(hashedAsset("dist/assets", "lang", "js"))).toBe(true);
    expect(existsSync(hashedAsset("dist/assets", "feedback", "js"))).toBe(true);
    expect(existsSync(hashedAsset("dist/assets", "app-store-qr", "png"))).toBe(true);
    expect(existsSync(hashedAsset("dist/assets", "brand-mark-32", "svg"))).toBe(true);
    for (const asset of walk("dist/assets")) {
      expect(basename(asset), asset).toMatch(HASHED_FILENAME);
    }
    expect(existsSync("dist/zh/product/index.html")).toBe(false);
    expect(existsSync("dist/en/product/index.html")).toBe(false);
  });
  it("中英文首页是新的唯一能力页面", () => {
    const zh = readFileSync("dist/zh/index.html", "utf8");
    const en = readFileSync("dist/en/index.html", "utf8");
    expect(zh).toContain("<title>Orbis｜关注重要地点与行程的灾害预警</title>");
    expect(en).toContain("<title>Orbis | Disaster alerts for the places and trips that matter</title>");
    for (const html of [zh, en]) {
      expect(html.match(/class="plan-card"/g)).toHaveLength(2);
      expect(html).toContain('id="how-it-works"');
      expect(html).toContain("https://apps.apple.com/us/app/myorbis/id6812221807");
      expect(html).toContain('id="principles"');
      expect(html).toContain("data-feedback-form");
    }
    const css = readFileSync(hashedAsset("dist/assets", "global", "css"), "utf8");
    expect(css).toContain("--control-border:#7F8A91");
    expect(css).toContain(":focus-visible{outline:2px solid #fff;outline-offset:2px;box-shadow:0 0 0 4px var(--ink)}");
    expect(css).toContain("border:1px solid var(--control-border)");
    for (const page of walk("dist").filter((file) => file.endsWith(".html"))) {
      const html = readFileSync(page, "utf8");
      for (const reference of html.match(/\/assets\/[^"' <>)]+/g) ?? []) {
        expect(reference, page).toMatch(/\.[a-f0-9]{12}\.[a-z0-9]+$/);
        expect(existsSync(join("dist", reference))).toBe(true);
      }
    }
  });
  it("样式表使用 0.2 天空与浅色内容区的设计令牌", () => {
    const css = readFileSync(hashedAsset("dist/assets", "global", "css"), "utf8");
    expect(css).toContain("--paper:#F2F7FC");
    expect(css).toContain("--text:#16202B");
    expect(css).toContain("--brand-blue:#1C6BB0");
    expect(css).toContain("--sky-deep:#1F5E9E");
    expect(css).toContain("--official-orange:#E2701A");
    expect(css).toContain(".preview-sky");
    expect(css).toContain(".official-level{color:var(--official-orange-dark)}");
  });
  it("sitemap 与 robots 使用构建 origin且不包含旧产品页", () => {
    const sitemap = readFileSync("dist/sitemap.xml", "utf8");
    expect(sitemap).toContain("https://orbis.example/zh/");
    expect(sitemap).toContain("https://orbis.example/en/");
    expect(sitemap).not.toContain("/product/");
    expect(readFileSync("dist/robots.txt", "utf8")).toContain("Sitemap: https://orbis.example/sitemap.xml");
  });
  it("CI 构建缺少生产 origin 时在改写产物前失败", () => {
    const env: NodeJS.ProcessEnv = { ...process.env, CI: "true" };
    delete env.PUBLIC_SITE_ORIGIN;
    const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/build.ts"], {
      env, encoding: "utf8"
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("PUBLIC_SITE_ORIGIN is required for production builds.");
    expect(existsSync("dist/zh/index.html")).toBe(true);
  });
  it("_headers 含 CSP 与安全头", () => {
    const headers = readFileSync("dist/_headers", "utf8");
    expect(headers).toContain("default-src 'self'");
    expect(headers).toContain("Strict-Transport-Security");
    expect(headers).toContain("Permissions-Policy");
    expect(headers).toContain("/assets/*");
    expect(headers).toContain("Cache-Control: public, max-age=31536000, immutable");
  });
});
