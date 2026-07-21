import { describe, expect, it } from "vitest";
import { validateFeedback } from "../../src/worker/validation";

const now = 1_800_000_000_000;

describe("validateFeedback", () => {
  it("接受仅正文的反馈并去除首尾空白", () => {
    expect(validateFeedback({ locale: "zh", message: "  建议  ", contact: "  " }, now)).toEqual({
      ok: true, value: { locale: "zh", message: "建议", contact: "", website: "" }
    });
  });
  it("接受任意联系方式文本", () => {
    const r = validateFeedback({ locale: "en", message: "Simplify it", contact: "Telegram: @orbis" }, now);
    expect(r.ok && r.value.contact).toBe("Telegram: @orbis");
  });
  it.each([
    [{ locale: "fr", message: "x" }, "locale"],
    [{ locale: "en", message: "   " }, "message"],
    [{ locale: "en", message: "x".repeat(2001) }, "message"],
    [{ locale: "en", message: "x", contact: "c".repeat(201) }, "contact"]
  ])("拒绝非法输入 %j", (input, field) => {
    expect(validateFeedback(input, now)).toEqual({ ok: false, code: "validation_error", field });
  });
  it("按 Unicode 码点计数", () => {
    expect(validateFeedback({ locale: "en", message: "🙂".repeat(2000) }, now).ok).toBe(true);
  });
  it("蜜罐或 2 秒内脚本提交判为 trap", () => {
    expect(validateFeedback({ locale: "en", message: "x", website: "spam" }, now)).toEqual({ ok: false, code: "trap" });
    expect(validateFeedback({ locale: "en", message: "x", startedAt: now - 1000 }, now)).toEqual({ ok: false, code: "trap" });
  });
  it("无 startedAt 的无脚本提交放行", () => {
    expect(validateFeedback({ locale: "en", message: "x" }, now).ok).toBe(true);
  });
});
