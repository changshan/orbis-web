import { buildFeedbackEmail } from "./email";
import { parseFeedbackRequest, publicResponse } from "./http";
import type { FeedbackLocale } from "./types";
import { validateFeedback } from "./validation";

// VERIFIED (Task 0 spike, 2026-07-21): the send_email binding accepts this
// object shape { to, from, subject, text, html } — confirmed by real successful
// sends (ok:true) from spike@myorbis.xyz to the verified destination once the
// domain was active. No MIME fallback needed. See web/SPIKE.md.
export interface EmailBinding { send(message: { to: string; from: string; subject: string; text: string; html: string }): Promise<unknown>; }
export interface RateBinding { limit(input: { key: string }): Promise<{ success: boolean }>; }
export interface WorkerEnv {
  EMAIL: EmailBinding;
  FEEDBACK_RATE_LIMIT: RateBinding;
  FEEDBACK_SENDER: string;
  FEEDBACK_DESTINATION: string;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      const locale = request.headers.get("accept-language")?.toLowerCase().startsWith("zh") ? "zh" : "en";
      return new Response(null, {
        status: 302,
        headers: {
          location: new URL(`/${locale}/product/`, url).toString(),
          "cache-control": "no-store",
          vary: "accept-language"
        }
      });
    }
    if (url.pathname === "/api/health") {
      return request.method === "GET"
        ? Response.json({ ok: true }, { headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } })
        : publicResponse(request, 405, { ok: false, code: "method_not_allowed", requestId: crypto.randomUUID() });
    }
    if (url.pathname !== "/api/feedback" || request.method !== "POST") {
      return publicResponse(request, 405, { ok: false, code: "method_not_allowed", requestId: crypto.randomUUID() });
    }

    const id = crypto.randomUUID();
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    if (!(await env.FEEDBACK_RATE_LIMIT.limit({ key: ip })).success) {
      return publicResponse(request, 429, { ok: false, code: "rate_limited", requestId: id });
    }

    let raw: unknown;
    try { raw = await parseFeedbackRequest(request); }
    catch { return publicResponse(request, 400, { ok: false, code: "validation_error", requestId: id }); }

    const locale: FeedbackLocale = (raw as { locale?: unknown })?.locale === "zh" ? "zh" : "en";
    const validated = validateFeedback(raw, Date.now());
    if (!validated.ok && validated.code === "trap") return publicResponse(request, 200, { ok: true, requestId: id }, locale);
    if (!validated.ok) return publicResponse(request, 400, { ok: false, code: "validation_error", requestId: id }, locale);

    try {
      const rendered = buildFeedbackEmail({ requestId: id, submittedAt: new Date().toISOString(), feedback: validated.value });
      await env.EMAIL.send({ to: env.FEEDBACK_DESTINATION, from: env.FEEDBACK_SENDER, ...rendered });
      console.log(JSON.stringify({ requestId: id, status: 200, outcome: "sent" }));
      return publicResponse(request, 200, { ok: true, requestId: id }, locale);
    } catch {
      console.error(JSON.stringify({ requestId: id, status: 503, outcome: "delivery_unavailable" }));
      return publicResponse(request, 503, { ok: false, code: "delivery_unavailable", requestId: id }, locale);
    }
  }
};
