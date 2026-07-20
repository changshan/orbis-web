export interface WebsiteContent {
  meta: { title: string; description: string };
  nav: { why: string; principles: string; feedback: string; privacy: string; skip: string; langLabel: string };
  hero: {
    eyebrow: string; titleLead: string; titleMain: string; titleDot: string;
    body: string; action: string; watchLabel: string;
    youLabel: string; placeLabel: string; placeName: string;
  };
  why: { title: string; questions: readonly [string, string, string]; outroPlain: string; outroStrong: string };
  principles: { title: string; items: ReadonlyArray<{ tag: "RELEVANT" | "CLEAR" | "TRUSTED"; title: string; body: string }> };
  boundary: { title: string; body: string };
  feedback: {
    title: string; body: string;
    messageLabel: string; messagePlaceholder: string;
    contactLabel: string; contactPlaceholder: string; hint: string;
    submit: string; sending: string; success: string; validation: string;
    rateLimited: string; unavailable: string; uncertain: string;
  };
  privacy: { title: string; intro: string; sections: ReadonlyArray<{ title: string; body: string }> };
  footer: { boundary: string; copyright: string };
}
