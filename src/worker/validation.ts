import type { FeedbackSubmission, ValidationResult } from "./types";

const codePoints = (value: string): number => Array.from(value).length;
const stringValue = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export function validateFeedback(raw: unknown, now: number): ValidationResult {
  if (!raw || typeof raw !== "object") return { ok: false, code: "validation_error", field: "message" };
  const input = raw as Record<string, unknown>;
  const locale = input.locale;
  if (locale !== "zh" && locale !== "en") return { ok: false, code: "validation_error", field: "locale" };

  const message = stringValue(input.message);
  const contact = stringValue(input.contact);
  const website = stringValue(input.website);
  if (codePoints(message) < 1 || codePoints(message) > 2000) return { ok: false, code: "validation_error", field: "message" };
  if (codePoints(contact) > 200) return { ok: false, code: "validation_error", field: "contact" };
  if (website) return { ok: false, code: "trap" };

  const startedRaw = typeof input.startedAt === "string" ? Number(input.startedAt) : input.startedAt;
  const startedAt = typeof startedRaw === "number" && Number.isFinite(startedRaw) ? startedRaw : undefined;
  if (startedAt !== undefined && now - startedAt < 2000) return { ok: false, code: "trap" };

  const value: FeedbackSubmission = { locale, message, contact, website };
  if (startedAt !== undefined) value.startedAt = startedAt;
  return { ok: true, value };
}
