import type { Locale } from "../config/site";
import type { WebsiteContent } from "../content/types";
import { escapeHtml as esc } from "./html";

export function renderFeedbackSection(locale: Locale, content: WebsiteContent): string {
  const c = content.feedback;
  return `<section class="day" id="feedback" aria-labelledby="feedback-title">
<div class="fb-intro">
<p class="section-code mono">04 · FEEDBACK</p>
<h2 class="day-title" id="feedback-title">${esc(c.title)}</h2>
<p class="fb-body">${esc(c.body)}</p>
</div>
<form method="post" action="/api/feedback" novalidate data-feedback-form
 data-sending="${esc(c.sending)}" data-success="${esc(c.success)}" data-validation="${esc(c.validation)}"
 data-rate-limited="${esc(c.rateLimited)}" data-unavailable="${esc(c.unavailable)}" data-uncertain="${esc(c.uncertain)}">
<input type="hidden" name="locale" value="${locale}" />
<div class="honeypot" aria-hidden="true"><label for="website-${locale}">Website</label><input id="website-${locale}" type="text" name="website" tabindex="-1" autocomplete="off" /></div>
<label for="message-${locale}">${esc(c.messageLabel)}</label>
<textarea id="message-${locale}" name="message" maxlength="2000" required placeholder="${esc(c.messagePlaceholder)}" aria-describedby="fb-hint-${locale} fb-status-${locale}"></textarea>
<label for="contact-${locale}">${esc(c.contactLabel)}</label>
<input id="contact-${locale}" type="text" name="contact" maxlength="200" autocomplete="off" placeholder="${esc(c.contactPlaceholder)}" />
<p class="field-hint" id="fb-hint-${locale}">${esc(c.hint)}</p>
<button class="submit" type="submit">${esc(c.submit)}</button>
<p class="status-line" id="fb-status-${locale}" role="status" aria-live="polite" data-feedback-status></p>
</form>
</section>`;
}
