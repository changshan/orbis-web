import type { FeedbackLocale, PublicErrorCode } from "./types";

const MAX_BODY_BYTES = 8 * 1024;

export async function parseFeedbackRequest(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new Error("body_too_large");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("body_too_large");
  const type = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (type === "application/json") return JSON.parse(text);
  if (type === "application/x-www-form-urlencoded") return Object.fromEntries(new URLSearchParams(text));
  throw new Error("unsupported_content_type");
}

export function publicResponse(
  request: Request, status: number,
  body: { ok: boolean; requestId: string; code?: PublicErrorCode },
  locale: FeedbackLocale = "en"
): Response {
  const headers = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (request.headers.get("accept")?.includes("text/html")) {
    const success = locale === "zh" ? "谢谢，反馈已发送。" : "Thank you. Your feedback was sent.";
    const failure = locale === "zh" ? "暂时无法完成提交，请返回后重试。" : "The submission could not be completed. Go back and try again.";
    const html = `<!doctype html><html lang="${locale === "zh" ? "zh-CN" : "en"}"><meta charset="utf-8"><title>Orbis</title><main><h1>${body.ok ? success : failure}</h1><p><a href="/${locale}/">Orbis</a></p></main></html>`;
    return new Response(html, { status, headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
  }
  return Response.json(body, { status, headers });
}
