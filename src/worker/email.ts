import type { FeedbackSubmission } from "./types";

interface EmailInput { requestId: string; submittedAt: string; feedback: FeedbackSubmission; }
export interface RenderedEmail { subject: string; text: string; html: string; }

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export function buildFeedbackEmail(input: EmailInput): RenderedEmail {
  const language = input.feedback.locale.toUpperCase();
  const contact = input.feedback.contact || "Not provided";
  const text = [
    `Request ID: ${input.requestId}`,
    `Submitted at: ${input.submittedAt}`,
    `Language: ${language}`,
    "", "Feedback:", input.feedback.message,
    "", "Contact:", contact
  ].join("\n");
  const html =
    `<p><strong>Request ID:</strong> ${escapeHtml(input.requestId)}</p>` +
    `<p><strong>Submitted at:</strong> ${escapeHtml(input.submittedAt)}</p>` +
    `<p><strong>Language:</strong> ${language}</p>` +
    `<h2>Feedback</h2><p>${escapeHtml(input.feedback.message).replaceAll("\n", "<br>")}</p>` +
    `<h2>Contact</h2><p>${escapeHtml(contact)}</p>`;
  return { subject: `[Orbis Feedback][${language}] ${input.requestId}`, text, html };
}
