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
    how: string;
    principles: string;
    feedback: string;
    privacy: string;
    download: string;
    skip: string;
    langLabel: string;
    homeAria: string;
    primaryAria: string;
  };
  hero: {
    titleLines: readonly [string, string];
    body: string;
    learn: string;
    eyebrow: string;
    boundary: string;
  };
  preview: {
    tag: string;
    title: string;
    firstPlace: string;
    firstTime: string;
    secondPlace: string;
    secondTime: string;
    routeNote: string;
  };
  how: {
    title: string;
    intro: string;
    steps: ReadonlyArray<{ title: string; body: string }>;
  };
  plans: {
    title: string;
    intro: string;
    tag: string;
    items: readonly [{ title: string; body: string }, { title: string; body: string }];
    note: string;
  };
  alertSample: {
    sampleTag: string;
    title: string;
    body: string;
    intensityLabel: string;
    intensity: string;
    officialLabel: string;
    officialLevel: string;
    placeLabel: string;
    place: string;
    timeLabel: string;
    time: string;
    sourceLabel: string;
    source: string;
    actionLabel: string;
    action: string;
    foot: string;
  };
  principles: {
    title: string;
    items: ReadonlyArray<{ tag: "RELEVANT" | "CLEAR" | "TRUSTED"; title: string; body: string }>;
  };
  boundary: {
    title: string;
    body: string;
    rules: readonly [string, string, string];
  };
  feedback: FeedbackContent;
  download: { title: string; body: string; qrAlt: string };
  privacy: PrivacyContent;
  footer: { boundary: string; copyright: string };
}
