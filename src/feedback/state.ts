export type FeedbackUiState = "success" | "validation" | "rateLimited" | "unavailable" | "uncertain";

export function mapFeedbackState(status: number, code?: string): FeedbackUiState {
  if (status >= 200 && status < 300) return "success";
  if (status === 400 && code === "validation_error") return "validation";
  if (status === 429 && code === "rate_limited") return "rateLimited";
  if (status === 503 && code === "delivery_unavailable") return "unavailable";
  return "uncertain";
}
