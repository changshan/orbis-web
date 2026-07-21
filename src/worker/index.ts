import { buildFeedbackEmail } from "./email";
import { parseFeedbackRequest, publicResponse } from "./http";
import type { FeedbackLocale } from "./types";
import { validateFeedback } from "./validation";

// UNVERIFIED: this object shape { to, from, subject, text, html } for the
// send_email binding has NOT been proven by a successful delivery — the Task 0
// spike only reached the sender-domain check (blocked on an unactivated domain),
// which does not confirm the payload shape. The documented send_email API is
// `new EmailMessage(from, to, rawMime)` from "cloudflare:email". Before trusting
// feedback in production, run web/spike once the domain is active to a real
// ok:true + received email; if it fails on shape, switch this send site and
// email.ts to the EmailMessage + MIME form (plan's pre-authorized fallback).
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
    if (url.pathname === "/api/health") {
      return request.method === "GET"
        ? Response.json({ ok: true }, { headers: { "cache-control": "no-store" } })
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

    const rendered = buildFeedbackEmail({ requestId: id, submittedAt: new Date().toISOString(), feedback: validated.value });
    try {
      await env.EMAIL.send({ to: env.FEEDBACK_DESTINATION, from: env.FEEDBACK_SENDER, ...rendered });
      console.log(JSON.stringify({ requestId: id, status: 200, outcome: "sent" }));
      return publicResponse(request, 200, { ok: true, requestId: id }, locale);
    } catch {
      console.error(JSON.stringify({ requestId: id, status: 503, outcome: "delivery_unavailable" }));
      return publicResponse(request, 503, { ok: false, code: "delivery_unavailable", requestId: id }, locale);
    }
  }
};
