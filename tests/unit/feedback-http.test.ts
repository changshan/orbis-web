import { describe, expect, it } from "vitest";
import { parseFeedbackRequest } from "../../src/worker/http";

describe("parseFeedbackRequest", () => {
  it("未声明长度的请求超过 8 KB 时立即取消读取", async () => {
    let pulls = 0;
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulls += 1;
        controller.enqueue(new Uint8Array(4096));
        if (pulls === 100) controller.close();
      },
      cancel() {
        cancelled = true;
      }
    });
    const init = {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      duplex: "half" as const
    } satisfies RequestInit & { duplex: "half" };
    const request = new Request("https://orbis.example/api/feedback", init);

    await expect(parseFeedbackRequest(request)).rejects.toThrow("body_too_large");
    expect(cancelled).toBe(true);
    expect(pulls).toBeLessThan(100);
  });
});
