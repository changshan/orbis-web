const root = document.querySelector<HTMLElement>("[data-carousel]");
const track = root?.querySelector<HTMLElement>(".shot-track");
const dots = root?.querySelector<HTMLElement>(".shot-dots");
if (root && track && dots) {
  const buttons = Array.from(dots.querySelectorAll("button"));
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const current = (): number => Math.round(track.scrollLeft / track.clientWidth);
  const go = (index: number): void => track.scrollTo({ left: index * track.clientWidth, behavior: still ? "auto" : "smooth" });
  const mark = (): void => buttons.forEach((button, index) => button.setAttribute("aria-current", String(index === current())));
  let paused = false;
  let timer = 0;
  // Each advance schedules the next; a manual change waits longer so the slide someone picked is not pulled away.
  const schedule = (delay: number): void => {
    window.clearTimeout(timer);
    if (still) return;
    timer = window.setTimeout(() => {
      if (!paused && !document.hidden) go((current() + 1) % buttons.length);
      schedule(5000);
    }, delay);
  };
  buttons.forEach((button, index) => button.addEventListener("click", () => go(index)));
  track.addEventListener("scroll", mark, { passive: true });
  dots.hidden = false;
  mark();
  // Later slides are lazy so they do not compete with the first paint; fetch them once the page has loaded, before they slide in.
  const preload = (): void => track.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
  if (document.readyState === "complete") preload(); else window.addEventListener("load", preload);
  for (const type of ["pointerenter", "focusin"]) root.addEventListener(type, () => { paused = true; });
  for (const type of ["pointerleave", "focusout"]) root.addEventListener(type, () => { paused = false; });
  for (const type of ["pointerdown", "touchstart", "wheel", "keydown"]) root.addEventListener(type, () => schedule(8000), { passive: true });
  schedule(5000);
}
