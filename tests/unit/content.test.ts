import { describe, expect, it } from "vitest";
import { CONTENT, getContent } from "../../src/content";

describe("双语内容", () => {
  it("中英文内容模型一致且以地点与时间为主线", () => {
    expect(Object.keys(CONTENT.zh)).toEqual(Object.keys(CONTENT.en));
    for (const locale of ["zh", "en"] as const) {
      const c = getContent(locale);
      expect(c.hero.titleLines).toHaveLength(2);
      expect(c.how.steps).toHaveLength(4);
      expect(c.plans.items).toHaveLength(2);
      expect(c.principles.items).toHaveLength(3);
      expect(c.alertSample.sampleTag.length).toBeGreaterThan(0);
      expect(c.alertSample.officialLevel.length).toBeGreaterThan(0);
      expect(c.alertSample.intensity.length).toBeGreaterThan(0);
      expect("risks" in c).toBe(false);
      expect("product" in c).toBe(false);
    }
    expect(CONTENT.zh.preview.routeNote).toContain("不监控沿途");
    expect(CONTENT.en.preview.routeNote).toContain("does not monitor the route");
    expect(JSON.stringify(CONTENT)).not.toMatch(/Critical Alerts|预测地震|保证安全|不会漏报/i);
  });

  it("自然语言仅生成待确认草稿，不暗示 AI 预测灾害", () => {
    expect(CONTENT.zh.how.steps[0]?.body).toBe("AI 自动识别地点和行程，生成待确认的关注草稿。");
    expect(CONTENT.en.how.steps[0]?.body).toBe("AI identifies places and trip details from your description, then creates a draft for you to confirm.");
  });

  it("将尚未发布的 0.2 功能标记为规划", () => {
    expect(CONTENT.zh.plans.tag).toContain("规划");
    expect(CONTENT.en.plans.tag).toContain("PLANNED");
    expect(CONTENT.zh.plans.note).toContain("当前可用功能以 App 内为准");
    expect(CONTENT.en.plans.note).toContain("See the app for what is available now");
  });

  it("行动建议示例沿用已审核固定模板", () => {
    expect(CONTENT.zh.alertSample.action).toBe("减少不必要的户外安排，并留意当地官方信息。");
    expect(CONTENT.en.alertSample.action).toBe("Limit unnecessary outdoor plans and follow local official information.");
  });
});
