import { handleVision } from "./vision/runtime";
import type { VisionEnvironment } from "./vision/config";
import { buildFeedbackEmail } from "./email";
import { parseFeedbackRequest, publicResponse } from "./http";
import type { FeedbackLocale } from "./types";
import { validateFeedback } from "./validation";

// VERIFIED (Task 0 spike, 2026-07-21): the send_email binding accepts this
// object shape { to, from, subject, text, html } — confirmed by real successful
// sends (ok:true) from spike@myorbis.xyz to the verified destination once the
// domain was active. No MIME fallback needed. See docs/deployment.md for current operating guidance.
export interface EmailBinding { send(message: { to: string; from: string; subject: string; text: string; html: string }): Promise<unknown>; }
export interface RateBinding { limit(input: { key: string }): Promise<{ success: boolean }>; }
export interface WorkerEnv {
  EMAIL: EmailBinding;
  FEEDBACK_RATE_LIMIT: RateBinding;
  FEEDBACK_SENDER: string;
  FEEDBACK_DESTINATION: string;
}

type FeedbackOutcome="validation_error"|"rate_limited"|"admission_unavailable"|"ignored"|"sent"|"delivery_unavailable";
function observeFeedback(requestId:string,status:number,outcome:FeedbackOutcome):void {
  // Fixed fields only: never emit the request, IP, submitted text or upstream exception.
  try{
    const message=JSON.stringify({area:"feedback",requestId,status,outcome});
    if(status>=500)console.error(message);else console.log(message);
  }catch{ /* Observability failure cannot change the result of an email send. */ }
}

export default {
  async fetch(request: Request, env: WorkerEnv & VisionEnvironment): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/vision" || url.pathname.startsWith("/api/vision/")) return handleVision(request, env);
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
    try {
      if (!(await env.FEEDBACK_RATE_LIMIT.limit({ key: ip })).success) {
        observeFeedback(id,429,"rate_limited");
        return publicResponse(request, 429, { ok: false, code: "rate_limited", requestId: id });
      }
    } catch {
      observeFeedback(id,503,"admission_unavailable");
      return publicResponse(request,503,{ok:false,code:"delivery_unavailable",requestId:id});
    }

    let raw: unknown;
    try { raw = await parseFeedbackRequest(request); }
    catch { observeFeedback(id,400,"validation_error");return publicResponse(request, 400, { ok: false, code: "validation_error", requestId: id }); }

    const locale: FeedbackLocale = (raw as { locale?: unknown })?.locale === "zh" ? "zh" : "en";
    const validated = validateFeedback(raw, Date.now());
    if (!validated.ok && validated.code === "trap") {observeFeedback(id,200,"ignored");return publicResponse(request, 200, { ok: true, requestId: id }, locale);}
    if (!validated.ok) {observeFeedback(id,400,"validation_error");return publicResponse(request, 400, { ok: false, code: "validation_error", requestId: id }, locale);}

    try {
      const rendered = buildFeedbackEmail({ requestId: id, submittedAt: new Date().toISOString(), feedback: validated.value });
      await env.EMAIL.send({ to: env.FEEDBACK_DESTINATION, from: env.FEEDBACK_SENDER, ...rendered });
      observeFeedback(id,200,"sent");
      return publicResponse(request, 200, { ok: true, requestId: id }, locale);
    } catch {
      observeFeedback(id,503,"delivery_unavailable");
      return publicResponse(request, 503, { ok: false, code: "delivery_unavailable", requestId: id }, locale);
    }
  }
};
