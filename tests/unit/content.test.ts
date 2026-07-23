import { describe, expect, it } from "vitest";
import { CONTENT, getContent } from "../../src/content";

describe("双语内容", () => {
  it("中英文顶层键完全一致", () => {
    expect(Object.keys(CONTENT.zh)).toEqual(Object.keys(CONTENT.en));
  });
  it("首页双语内容和六类风险齐全，不再存在产品页模型", () => {
    type NewHome = {
      hero: { title: string };
      risks: { title: string; note: string; items: ReadonlyArray<{ name: string }> };
      relevance: { title: string };
      clarity: { title: string };
      principles: { items: readonly unknown[] };
      boundary: { body: string };
    };
    const zh = getContent("zh") as unknown as NewHome;
    const en = getContent("en") as unknown as NewHome;

    expect(zh.hero.title).toBe("你的安全，时刻守护");
    expect(en.hero.title).toBe("Keeping watch over your safety.");
    expect(zh.risks.title).toBe("各种风险，全面感知");
    expect(zh.relevance.title).toBe("保留真正必要的提醒");
    expect(zh.clarity.title).toBe("重要信息，永不遗漏");
    expect(zh.risks.items.map((item) => item.name)).toEqual([
      "地震", "暴雨", "热浪", "洪水", "山火", "龙卷风"
    ]);
    expect(en.risks.items.map((item) => item.name)).toEqual([
      "Earthquake", "Heavy rain", "Heatwave", "Flood", "Wildfire", "Tornado"
    ]);
    expect(zh.risks.note).toContain("实际可用类型取决于当地信息源与服务范围");
    expect(en.risks.note).toContain("Availability depends on local information sources and service coverage");
    expect(zh.principles.items).toHaveLength(3);
    expect(zh.boundary.body).toContain("Orbis 不替代");
    expect("product" in getContent("zh")).toBe(false);
    expect("product" in getContent("en")).toBe(false);
    expect(JSON.stringify(CONTENT)).not.toMatch(/强风|HIGH WIND/i);
  });
});
