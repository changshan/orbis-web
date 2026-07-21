export type FeedbackLocale = "zh" | "en";

export interface FeedbackSubmission {
  locale: FeedbackLocale;
  message: string;
  contact: string;
  website: string;
  startedAt?: number;
}

export type ValidationResult =
  | { ok: true; value: FeedbackSubmission }
  | { ok: false; code: "validation_error"; field: "locale" | "message" | "contact" }
  | { ok: false; code: "trap" };

export type PublicErrorCode = "validation_error" | "rate_limited" | "delivery_unavailable" | "method_not_allowed";
