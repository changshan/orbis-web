/**
 * Task 0 spike — 最小 Worker,用来实测 Cloudflare 三件事:
 *   1. 静态资产直出 + `_headers` 生效(assets 层,不进 Worker)
 *   2. `/api/health` 可达
 *   3. Email Service `EMAIL.send(...)` 能真实送达项目邮箱
 *
 * send() 的入参形状与生产一致(to/from/subject/text/html),
 * 这样 spike 验证的就是 Task 4/5 假设的那个 API 形状。
 * 若这里报错或形状不符,回退方案见 web/SPIKE.md。
 */
interface Env {
  EMAIL: {
    send(m: {
      to: string;
      from: string;
      subject: string;
      text: string;
      html: string;
    }): Promise<unknown>;
  };
  SPIKE_TO: string;
  SPIKE_FROM: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json(
        { ok: true },
        { headers: { "cache-control": "no-store" } },
      );
    }

    if (url.pathname === "/api/spike-mail" && request.method === "POST") {
      const requestId = crypto.randomUUID();
      try {
        await env.EMAIL.send({
          to: env.SPIKE_TO,
          from: env.SPIKE_FROM,
          subject: `[Orbis Spike] email service ${requestId}`,
          text: `spike ok — ${requestId}`,
          html: `<p>spike ok — ${requestId}</p>`,
        });
        return Response.json({ ok: true, requestId });
      } catch (error) {
        // 打印错误类别,便于判断 Email Service 是否可用 / 形状是否符合
        console.error(
          JSON.stringify({
            requestId,
            outcome: "send_failed",
            message: error instanceof Error ? error.message : String(error),
          }),
        );
        return Response.json(
          { ok: false, requestId, error: "send_failed" },
          { status: 503 },
        );
      }
    }

    return new Response("not found", { status: 404 });
  },
};
