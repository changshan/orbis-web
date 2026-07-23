import { pathToFileURL } from "node:url";
import { siteOrigin } from "../src/config/site";

async function get(fetcher: typeof fetch, url: URL): Promise<Response> {
  return fetcher(url, {
    headers: { accept: "text/html,application/json" },
    redirect: "manual"
  });
}

function assertStatus(response: Response, path: string, expected: number): void {
  if (response.status !== expected) {
    throw new Error(`${path} returned ${response.status}; expected ${expected}.`);
  }
}

export async function smokeSite(origin: string, fetcher: typeof fetch = fetch): Promise<void> {
  const base = new URL(origin).origin;

  for (const locale of ["zh", "en"] as const) {
    const path = `/${locale}/`;
    const response = await get(fetcher, new URL(path, base));
    assertStatus(response, path, 200);
    const html = await response.text();
    if (!html.includes('<body class="page-home">') || !html.includes('id="principles"')) {
      throw new Error(`${path} does not contain the current homepage markers.`);
    }
    if (html.includes(`/${locale}/product/`)) {
      throw new Error(`${path} still references the removed product page.`);
    }
  }

  for (const path of ["/zh/product/", "/en/product/"]) {
    const response = await get(fetcher, new URL(path, base));
    assertStatus(response, path, 404);
  }

  const healthPath = "/api/health";
  const health = await get(fetcher, new URL(healthPath, base));
  assertStatus(health, healthPath, 200);
  const payload: unknown = await health.json();
  if (typeof payload !== "object" || payload === null || !("ok" in payload) || payload.ok !== true) {
    throw new Error(`${healthPath} did not return {"ok":true}.`);
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const origin = siteOrigin({ requireExplicit: true });
  await smokeSite(origin);
  console.log(JSON.stringify({ smoke: true, origin }));
}
