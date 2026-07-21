import { mapFeedbackState, type FeedbackUiState } from "../feedback/state";

const forms = document.querySelectorAll<HTMLFormElement>("[data-feedback-form]");
for (const form of forms) {
  const startedAt = Date.now();
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const status = form.querySelector<HTMLElement>("[data-feedback-status]");
  const message = form.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
  if (!button || !status || !message) continue;
  const idleLabel = button.textContent ?? "";
  const textFor = (state: FeedbackUiState): string =>
    state === "rateLimited" ? form.dataset.rateLimited ?? "" : form.dataset[state] ?? "";
  const tones: Record<FeedbackUiState, string> = {
    success: "success", validation: "error", rateLimited: "neutral", unavailable: "error", uncertain: "neutral"
  };
  const show = (state: FeedbackUiState): void => {
    status.textContent = textFor(state);
    status.setAttribute("data-tone", tones[state]);
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!message.value.trim()) {
      show("validation");
      message.classList.add("field-error");
      message.focus();
      return;
    }
    message.classList.remove("field-error");
    button.disabled = true;
    button.textContent = form.dataset.sending ?? idleLabel;
    status.textContent = form.dataset.sending ?? "";
    status.setAttribute("data-tone", "neutral");
    try {
      const data = Object.fromEntries(new FormData(form));
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ ...data, startedAt })
      });
      const body = (await response.json()) as { code?: string };
      const state = mapFeedbackState(response.status, body.code);
      show(state);
      if (state === "success") form.reset();
    } catch {
      show("uncertain");
    } finally {
      button.disabled = false;
      button.textContent = idleLabel;
    }
  });
}
