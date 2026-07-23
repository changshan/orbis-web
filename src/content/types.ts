export interface HeroContent {
  eyebrow: string;
  title: string;
  titleLines: readonly [string, string];
  body: string;
  action: string;
  metrics: readonly [string, string, string];
}

export interface RiskContent {
  eyebrow: string;
  title: string;
  note: string;
  items: ReadonlyArray<{
    key: "earthquake" | "rain" | "heatwave" | "flood" | "wildfire" | "tornado";
    name: string;
    body: string;
  }>;
}

export interface ClarityContent {
  eyebrow: string;
  title: string;
  body: string;
  items: ReadonlyArray<{ tag: string; title: string; body: string }>;
}

export interface BoundaryContent {
  eyebrow: string;
  title: string;
  body: string;
  rules: readonly [string, string, string];
}

export interface FeedbackContent {
  title: string;
  body: string;
  messageLabel: string;
  messagePlaceholder: string;
  contactLabel: string;
  contactPlaceholder: string;
  hint: string;
  submit: string;
  sending: string;
  success: string;
  validation: string;
  rateLimited: string;
  unavailable: string;
  uncertain: string;
}

export interface PrivacyContent {
  title: string;
  intro: string;
  sections: ReadonlyArray<{ title: string; body: string }>;
}

export interface WebsiteContent {
  meta: { title: string; description: string };
  nav: {
    why: string;
    principles: string;
    feedback: string;
    privacy: string;
    skip: string;
    langLabel: string;
    homeAria: string;
    primaryAria: string;
  };
  hero: HeroContent;
  risks: RiskContent;
  relevance: { eyebrow: string; title: string; body: string };
  clarity: ClarityContent;
  principles: {
    title: string;
    items: ReadonlyArray<{ tag: "RELEVANT" | "CLEAR" | "TRUSTED"; title: string; body: string }>;
  };
  boundary: BoundaryContent;
  feedback: FeedbackContent;
  privacy: PrivacyContent;
  footer: { boundary: string; copyright: string };
}
