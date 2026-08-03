export interface MetricItem {
  value: string;
  label: string;
}

export interface HeroContent {
  title: string;
  titleLines: readonly [string, string];
  body: string;
  action: string;
  metrics: readonly [MetricItem, MetricItem, MetricItem];
  boundary: { tag: string; note: string };
}

export interface AlertSampleContent {
  sampleTag: string;
  nowLabel: string;
  levelLabel: string;
  headLabel: string;
  indexLabel: string;
  hazard: string;
  whatValue: string;
  where: string;
  whenLabel: string;
  when: string;
  updatedLabel: string;
  updated: string;
  actionLabel: string;
  action: string;
  sourceNote: string;
  boundaryNote: string;
  fieldLabels: { what: string; where: string; when: string; action: string };
}

export type RiskKey = "earthquake" | "rain" | "heatwave" | "flood" | "wildfire" | "tornado";

export interface SeverityLevel {
  tone: "watch" | "alert" | "urgent";
  text: string;
}

export interface RiskContent {
  title: string;
  note: string;
  items: ReadonlyArray<{ key: RiskKey; code: string; name: string; term: string }>;
  severity: {
    label: string;
    levels: readonly [SeverityLevel, SeverityLevel, SeverityLevel];
  };
}

export interface RelevanceContent {
  title: string;
  body: string;
  factors: readonly [{ name: string; term: string }, { name: string; term: string }, { name: string; term: string }];
  diagram: {
    caption: string;
    rows: ReadonlyArray<{ label: string; verdict: string; pass: boolean }>;
    sourceTitle: string;
    sourceSub: string;
    resultTag: string;
    resultText: string;
  };
}

export interface ClarityContent {
  title: string;
  body: string;
  items: ReadonlyArray<{ index: string; title: string; body: string }>;
}

export interface BoundaryContent {
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
  meta: { title: string; description: string };
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
  alertSample: AlertSampleContent;
  risks: RiskContent;
  relevance: RelevanceContent;
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
