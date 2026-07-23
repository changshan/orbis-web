import { afterEach, describe, expect, it } from "vitest";
import { SITE, localizedPath, siteOrigin } from "../../src/config/site";

describe("site config", () => {
  afterEach(() => {
    delete process.env.PUBLIC_SITE_ORIGIN;
  });

  it("只支持已批准的 locale", () => {
    expect(SITE.locales).toEqual(["zh", "en"]);
    expect(SITE.defaultLocale).toBe("en");
  });
  it("生成稳定的本地化路径", () => {
    expect(localizedPath("zh", "home")).toBe("/zh/");
    expect(localizedPath("en", "home")).toBe("/en/");
    expect(localizedPath("zh", "privacy")).toBe("/zh/privacy/");
    expect(localizedPath("en", "privacy")).toBe("/en/privacy/");
  });
  it("origin 可用环境变量覆盖并规范化", () => {
    process.env.PUBLIC_SITE_ORIGIN = "https://orbis.example/path?source=test";
    expect(siteOrigin()).toBe("https://orbis.example");
  });
  it("本地构建允许使用默认 origin", () => {
    expect(siteOrigin()).toBe("http://localhost:8788");
  });
  it("拒绝无效或非 HTTP(S) origin", () => {
    process.env.PUBLIC_SITE_ORIGIN = "not-a-url";
    expect(() => siteOrigin()).toThrow(/PUBLIC_SITE_ORIGIN/);
    process.env.PUBLIC_SITE_ORIGIN = "ftp://orbis.example";
    expect(() => siteOrigin()).toThrow(/HTTP/);
  });
  it("生产构建要求显式 HTTPS origin", () => {
    expect(() => siteOrigin({ requireExplicit: true })).toThrow(/required/);
    process.env.PUBLIC_SITE_ORIGIN = "http://orbis.example";
    expect(() => siteOrigin({ requireExplicit: true })).toThrow(/HTTPS/);
  });
});
