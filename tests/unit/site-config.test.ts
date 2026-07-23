import { describe, expect, it } from "vitest";
import { SITE, localizedPath, siteOrigin } from "../../src/config/site";

describe("site config", () => {
  it("只支持已批准的 locale", () => {
    expect(SITE.locales).toEqual(["zh", "en"]);
    expect(SITE.defaultLocale).toBe("en");
  });
  it("生成稳定的本地化路径", () => {
    expect(localizedPath("zh", "home")).toBe("/zh/");
    expect(localizedPath("zh", "product")).toBe("/zh/product/");
    expect(localizedPath("en", "product")).toBe("/en/product/");
    expect(localizedPath("en", "privacy")).toBe("/en/privacy/");
  });
  it("origin 可用环境变量覆盖", () => {
    process.env.PUBLIC_SITE_ORIGIN = "https://orbis.example";
    expect(siteOrigin()).toBe("https://orbis.example");
    delete process.env.PUBLIC_SITE_ORIGIN;
    expect(siteOrigin()).toBe("http://localhost:8788");
  });
});
