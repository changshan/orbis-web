import { describe, expect, it } from "vitest";
import { buildFeedbackEmail } from "../../src/worker/email";

describe("buildFeedbackEmail", () => {
  it("生成规定主题与纯文本正文", () => {
    const email = buildFeedbackEmail({
      requestId: "req-123", submittedAt: "2026-07-20T12:00:00.000Z",
      feedback: { locale: "zh", message: "页面很好", contact: "微信 orbis", website: "" }
    });
    expect(email.subject).toBe("[Orbis Feedback][ZH] req-123");
    expect(email.text).toContain("页面很好");
    expect(email.text).toContain("微信 orbis");
    expect(email.text).not.toMatch(/user-agent|referer/i);
  });
  it("HTML 版转义用户内容", () => {
    const email = buildFeedbackEmail({
      requestId: "req-124", submittedAt: "2026-07-20T12:00:00.000Z",
      feedback: { locale: "en", message: "<img src=x onerror=alert(1)>", contact: "a&b", website: "" }
    });
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&lt;img");
    expect(email.html).toContain("a&amp;b");
  });
});
