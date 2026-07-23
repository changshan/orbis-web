import { describe, expect, it } from "vitest";
import { smokeSite } from "../../scripts/smoke";

const currentHome = '<!doctype html><body class="page-home"><section id="principles"></section></body>';

function fakeFetcher(overrides: Record<string, Response> = {}): typeof fetch {
  const responses: Record<string, Response> = {
    "/zh/": new Response(currentHome, { status: 200 }),
    "/en/": new Response(currentHome, { status: 200 }),
    "/zh/product/": new Response("Not found", { status: 404 }),
    "/en/product/": new Response("Not found", { status: 404 }),
    "/api/health": Response.json({ ok: true }),
    ...overrides
  };
  return (async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    return responses[url.pathname] ?? new Response("Not found", { status: 404 });
  }) as typeof fetch;
}

describe("deployed-site smoke test", () => {
  it("验证中英文新首页、已移除产品页与健康检查", async () => {
    await expect(smokeSite("https://myorbis.xyz", fakeFetcher())).resolves.toBeUndefined();
  });

  it("首页仍是旧内容时失败", async () => {
    await expect(smokeSite("https://myorbis.xyz", fakeFetcher({
      "/zh/": new Response("<!doctype html><body>旧首页</body>", { status: 200 })
    }))).rejects.toThrow(/current homepage markers/);
  });
});
