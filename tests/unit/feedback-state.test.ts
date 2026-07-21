import { describe, expect, it } from "vitest";
import { mapFeedbackState } from "../../src/feedback/state";

describe("mapFeedbackState", () => {
  it("确定性映射公共响应", () => {
    expect(mapFeedbackState(200, undefined)).toBe("success");
    expect(mapFeedbackState(400, "validation_error")).toBe("validation");
    expect(mapFeedbackState(429, "rate_limited")).toBe("rateLimited");
    expect(mapFeedbackState(503, "delivery_unavailable")).toBe("unavailable");
  });
  it("网络失败或未知响应为 uncertain", () => {
    expect(mapFeedbackState(0, undefined)).toBe("uncertain");
    expect(mapFeedbackState(502, undefined)).toBe("uncertain");
  });
});
