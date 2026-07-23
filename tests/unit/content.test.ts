import { describe, expect, it } from "vitest";
import { CONTENT, getContent } from "../../src/content";

describe("双语内容", () => {
  it("中英文顶层键完全一致", () => {
    expect(Object.keys(CONTENT.zh)).toEqual(Object.keys(CONTENT.en));
  });
  it("包含定稿 Hero 与边界文案", () => {
    expect(getContent("zh").hero.titleLead).toBe("任何时候，");
    expect(getContent("zh").hero.titleMain).toBe("为你守护");
    expect(getContent("en").hero.titleLead).toBe("Keeping watch,");
    expect(getContent("en").hero.titleMain).toBe("whenever it matters");
    expect(getContent("zh").boundary.body).toContain("不替代当地官方预警");
    expect(getContent("en").boundary.body).toContain("does not replace official local alerts");
  });
  it("旧为何 Orbis 内容模型已移除", () => {
    expect("why" in getContent("zh")).toBe(false);
    expect("why" in getContent("en")).toBe(false);
  });
  it("产品页双语内容和六类风险齐全", () => {
    expect(getContent("zh").nav.why).toBe("为何 Orbis");
    expect(getContent("en").nav.why).toBe("Why Orbis");
    expect("product" in getContent("zh").nav).toBe(false);
    expect("product" in getContent("en").nav).toBe(false);
    expect(getContent("zh").product.hero.title).toBe("你的安全，时刻守护");
    expect(getContent("en").product.hero.title).toBe("Keeping watch over your safety.");
    expect(getContent("zh").product.risks.title).toBe("各种风险，全面感知");
    expect(getContent("zh").product.relevance.title).toBe("保留真正必要的提醒");
    expect(getContent("zh").product.clarity.title).toBe("重要信息，永不遗漏");
    expect(getContent("zh").product.risks.items.map((item) => item.name)).toEqual([
      "地震", "暴雨", "热浪", "洪水", "山火", "龙卷风"
    ]);
    expect(getContent("en").product.risks.items.map((item) => item.name)).toEqual([
      "Earthquake", "Heavy rain", "Heatwave", "Flood", "Wildfire", "Tornado"
    ]);
    expect(getContent("zh").product.risks.note).toContain("实际可用类型取决于当地信息源与服务范围");
    expect(getContent("en").product.risks.note).toContain("Availability depends on local information sources and service coverage");
    expect(JSON.stringify(CONTENT)).not.toMatch(/强风|HIGH WIND/i);
  });
});
