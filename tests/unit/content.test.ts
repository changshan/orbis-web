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
      expect(c.alertSample.officialLevel.length).toBeGreaterThan(0);
      expect(c.alertSample.intensity.length).toBeGreaterThan(0);
      expect("risks" in c).toBe(false);
      expect("product" in c).toBe(false);
    }
    expect(CONTENT.zh.preview.routeNote).toBe("关注确认的地点和时间段，掌握全部行程。");
    expect(CONTENT.en.preview.routeNote).toBe("Follow confirmed places and time periods across your entire trip.");
    expect(JSON.stringify(CONTENT)).not.toMatch(/Critical Alerts|预测地震|保证安全|不会漏报/i);
  });

  it("自然语言仅生成待确认草稿，不暗示 AI 预测灾害", () => {
    expect(CONTENT.zh.how.steps[0]?.body).toBe("AI 自动识别地点和行程，生成待确认的关注草稿。");
    expect(CONTENT.en.how.steps[0]?.body).toBe("AI identifies places and trip details from your description, then creates a draft for you to confirm.");
  });

  it("使用更新后的首页文案并移除旧版规划与示例标签", () => {
    expect(CONTENT.zh.hero.titleLines.join("")).toBe("关注重要地点和行程，掌握相关预警。");
    expect(CONTENT.zh.hero.body).toContain("支持长期关注与按时间安排的行程提醒。");
    expect(CONTENT.zh.hero.boundary).toBe("Orbis提供更全面、更及时的预警，不替代官方紧急服务。");
    expect(CONTENT.zh.preview.tag).toBe("AI 生成行程");
    expect(CONTENT.zh.how.title).toBe("智能生成提醒， 让你更安心");
    expect(CONTENT.zh.how.intro).toBe("大模型驱动流程创建，提醒清晰明了");
    expect(CONTENT.zh.plans.title).toBe("两种安排，一种关注方式");
    expect(CONTENT.zh.alertSample.body).toBe("提醒强度来源于风险的等级定义，参考官方的等级定义");
    expect(CONTENT.zh.alertSample.foot).toBe("仅为示例，以实际信息效果为准。");
    expect(CONTENT.zh.boundary.body).toBe("Orbis 数据来源于官方和权威机构，提供全面的风险事件覆盖和预警通知。来源不可用或过期时如实显示，并提供清晰说明。");
    for (const c of [CONTENT.zh, CONTENT.en]) {
      expect("tag" in c.plans).toBe(false);
      expect("note" in c.plans).toBe(false);
      expect("sampleTag" in c.alertSample).toBe(false);
      expect("boundary" in c.footer).toBe(false);
    }
  });

  it("行动建议示例沿用已审核固定模板", () => {
    expect(CONTENT.zh.alertSample.action).toBe("减少不必要的户外安排，并留意当地官方信息。");
    expect(CONTENT.en.alertSample.action).toBe("Limit unnecessary outdoor plans and follow local official information.");
  });
});
