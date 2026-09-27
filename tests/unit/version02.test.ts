import { describe, expect, it } from "vitest";
import { APP_STORE_URL } from "../../src/config/site";
import { renderHome } from "../../src/render/home";

const url = "https://apps.apple.com/us/app/myorbis/id6812221807";

describe("0.2 website story", () => {
  it("uses the verified MyOrbis listing for hero, QR code, and footer links", () => {
    expect(APP_STORE_URL).toBe(url);
    for (const locale of ["zh", "en"] as const) {
      const html = renderHome(locale);
      expect(html.match(new RegExp(`href="${url}"`, "g"))).toHaveLength(3);
      expect(html).not.toContain('class="nav-download"');
      expect(html).toContain('class="hero-cta"');
      expect(html).toContain('class="footer-download"');
      expect(html).toContain('id="download"');
      expect(html.indexOf('id="download"')).toBeGreaterThan(html.indexOf('id="feedback"'));
      expect(html).toContain('src="/assets/app-store-qr.png"');
      expect(html).toContain('rel="noopener noreferrer"');
    }
  });

  it("explains confirmed places and times across the trip", () => {
    const zh = renderHome("zh");
    const en = renderHome("en");
    for (const html of [zh, en]) {
      expect(html).toContain('id="how-it-works"');
      expect(html).toContain('id="plans"');
      expect(html).toContain('id="alert-example"');
      expect(html).not.toContain('id="risks"');
      expect(html).not.toContain('class="hero-metrics"');
      expect(html).not.toContain('class="risk-card"');
    }
    expect(zh).toContain("关注确认的地点和时间段，掌握全部行程。");
    expect(en).toContain("Follow confirmed places and time periods across your entire trip.");
  });

  it("keeps the example disclaimer without an empty sample header", () => {
    for (const locale of ["zh", "en"] as const) {
      const html = renderHome(locale);
      expect(html).not.toContain('class="example-head"');
      expect(html).toContain(locale === "zh" ? "仅为示例，以实际信息效果为准。" : "For illustration only; actual information may differ.");
      expect(html).toContain('class="official-level"');
      expect(html).toContain('class="orbis-intensity"');
      expect(html).toContain('id="boundary"');
    }
  });
});
