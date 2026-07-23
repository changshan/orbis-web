import { describe, expect, it, vi } from "vitest";
import worker, { type WorkerEnv } from "../../src/worker/index";

function env(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    EMAIL: { send: vi.fn().mockResolvedValue({ messageId: "m1" }) },
    FEEDBACK_RATE_LIMIT: { limit: vi.fn().mockResolvedValue({ success: true }) },
    FEEDBACK_SENDER: "feedback@orbis.example",
    FEEDBACK_DESTINATION: "project@example.com",
    ...overrides
  };
}
const jsonRequest = (body: unknown) => new Request("https://orbis.example/api/feedback", {
  method: "POST",
  headers: { "content-type": "application/json", accept: "application/json", "cf-connecting-ip": "203.0.113.8" },
  body: JSON.stringify(body)
});

describe("Feedback Worker", () => {
  it("根域名按浏览器语言直达新版为何 Orbis 能力页", async () => {
    const res = await worker.fetch(new Request("https://myorbis.xyz/", {
      headers: { "accept-language": "zh-CN,zh;q=0.9,en;q=0.8" }
    }), env());
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://myorbis.xyz/zh/product/");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("vary")).toBe("accept-language");
  });
  it("health 返回 no-store 且不发信", async () => {
    const e = env();
    const res = await worker.fetch(new Request("https://orbis.example/api/health"), e);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(e.EMAIL.send).not.toHaveBeenCalled();
  });
  it("合法提交发送一封邮件", async () => {
    const e = env();
    const res = await worker.fetch(jsonRequest({ locale: "en", message: "Useful", contact: "" }), e);
    expect(res.status).toBe(200);
    expect(e.EMAIL.send).toHaveBeenCalledTimes(1);
    expect(await res.json()).toMatchObject({ ok: true });
  });
  it("非法输入 400，限流 429", async () => {
    expect((await worker.fetch(jsonRequest({ locale: "en", message: "" }), env())).status).toBe(400);
    const limited = env({ FEEDBACK_RATE_LIMIT: { limit: vi.fn().mockResolvedValue({ success: false }) } });
    expect((await worker.fetch(jsonRequest({ locale: "en", message: "x" }), limited)).status).toBe(429);
  });
  it("trap 静默成功且不发信", async () => {
    const e = env();
    const res = await worker.fetch(jsonRequest({ locale: "en", message: "x", website: "spam" }), e);
    expect(res.status).toBe(200);
    expect(e.EMAIL.send).not.toHaveBeenCalled();
  });
  it("发信失败返回 503 且日志无隐私", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const e = env({ EMAIL: { send: vi.fn().mockRejectedValue(new Error("upstream")) } });
    const res = await worker.fetch(jsonRequest({ locale: "en", message: "secret text", contact: "private-contact" }), e);
    expect(res.status).toBe(503);
    expect(JSON.stringify(err.mock.calls)).not.toContain("secret text");
    expect(JSON.stringify(err.mock.calls)).not.toContain("private-contact");
    err.mockRestore();
  });
  it("不支持的方法返回 405", async () => {
    expect((await worker.fetch(new Request("https://orbis.example/api/feedback"), env())).status).toBe(405);
    expect((await worker.fetch(new Request("https://orbis.example/api/health", { method: "POST" }), env())).status).toBe(405);
  });
  it("无脚本 urlencoded + accept text/html 返回本地化 HTML 并发信", async () => {
    const e = env();
    const res = await worker.fetch(new Request("https://orbis.example/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "text/html" },
      body: "locale=zh&message=%E6%97%A0%E8%84%9A%E6%9C%AC"
    }), e);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("谢谢，反馈已发送。");
    expect(e.EMAIL.send).toHaveBeenCalledTimes(1);
  });
});
