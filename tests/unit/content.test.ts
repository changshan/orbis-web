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
  it("三个问题齐全", () => {
    expect(getContent("zh").why.questions).toHaveLength(3);
    expect(getContent("en").why.questions[0]).toBe("What happened?");
  });
});
