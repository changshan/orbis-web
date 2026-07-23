import type { WebsiteContent } from "./types";

export const en = {
  meta: {
    title: "How Orbis works | Keeping watch over your safety",
    description: "See how Orbis relates changing risks to the places you care about and presents only the information that deserves attention."
  },
  nav: {
    why: "Why Orbis", principles: "Principles", feedback: "Feedback", privacy: "Privacy",
    skip: "Skip to main content", langLabel: "中文",
    homeAria: "Orbis home", primaryAria: "Primary navigation"
  },
  hero: {
    eyebrow: "QUIET PROTECTION / CLEAR JUDGMENT",
    title: "Keeping watch over your safety.",
    titleLines: ["Keeping watch over", "your safety."],
    body: "Orbis considers the places you choose, understands whether changing risks are relevant, and presents concise, trustworthy information when it matters.",
    action: "See how Orbis decides",
    metrics: ["1  PLACE", "6  RISK TYPES", "4  KEY DETAILS"]
  },
  risks: {
    eyebrow: "01 · WHAT WE WATCH",
    title: "Comprehensive awareness across risks.",
    note: "Examples of risks that can fit the Orbis relevance framework. Availability depends on local information sources and service coverage.",
    items: [
      { key: "earthquake", name: "Earthquake", body: "Understand magnitude, location, timing, and distance from a place you care about." },
      { key: "rain", name: "Heavy rain", body: "Understand the affected area, duration, and level of risk." },
      { key: "heatwave", name: "Heatwave", body: "Understand the expected timing and points to watch before extreme heat arrives." },
      { key: "flood", name: "Flood", body: "Understand water-level changes, affected areas, and official action information." },
      { key: "wildfire", name: "Wildfire", body: "Understand the fire location, spread, and related restrictions." },
      { key: "tornado", name: "Tornado", body: "Understand the location, affected area, and urgent shelter information." }
    ]
  },
  relevance: {
    eyebrow: "02 · RELEVANCE",
    title: "Keep only the alerts that truly matter.",
    body: "Orbis combines the place you care about, the affected area, and the level of risk to filter out information that is not relevant to you."
  },
  clarity: {
    eyebrow: "03 · ONE CLEAR ALERT",
    title: "Important information, never missed.",
    body: "Risk type, affected place, key timing, and the first action are presented in order of importance.",
    items: [
      { tag: "01 · WHAT", title: "What happened", body: "Risk type and severity" },
      { tag: "02 · WHERE", title: "Where it matters", body: "Relation to the place you chose" },
      { tag: "03 · WHEN", title: "Key timing", body: "Occurrence, start, or update time" },
      { tag: "04 · ACTION", title: "What to notice first", body: "Reviewed, fixed action language" }
    ]
  },
  principles: {
    title: "Three principles",
    items: [
      { tag: "RELEVANT", title: "Relevant", body: "Focused on what matters to the places you care about." },
      { tag: "CLEAR", title: "Clear", body: "Designed to make important information easier to understand." },
      { tag: "TRUSTED", title: "Trusted", body: "Calm by design, honest about sources, limits, and uncertainty." }
    ]
  },
  boundary: {
    eyebrow: "05 · CLEAR BOUNDARIES",
    title: "Trust also means clear boundaries.",
    body: "Orbis is transparent about sources, uncertainty, and service limits. It does not replace official local alerts, government instructions, or emergency services. In an emergency, contact local emergency services immediately.",
    rules: ["Sources stay visible · official links remain", "Uncertainty stays visible · never presented as certainty", "Actions stay measured · no forecasts or promises"]
  },
  feedback: {
    title: "Tell us what you think", body: "Share a suggestion, a concern, or anything you want Orbis to know.",
    messageLabel: "Your feedback", messagePlaceholder: "Write your suggestion or concern",
    contactLabel: "Contact details (optional)", contactPlaceholder: "Email, phone, WeChat, Telegram…",
    hint: "Contact details are used only to reply to this feedback. You can submit without them. Do not send passwords, identity documents, exact addresses, or emergency requests—contact local emergency services in an emergency.",
    submit: "Send feedback", sending: "Sending…", success: "Thank you. Your feedback was sent.",
    validation: "Enter feedback of no more than 2,000 characters.",
    rateLimited: "You are submitting too frequently. Try again in one minute.",
    unavailable: "Feedback cannot be sent right now. Try again later.",
    uncertain: "We cannot confirm delivery. Retrying may send a duplicate email."
  },
  privacy: {
    meta: {
      title: "Privacy notice | Orbis",
      description: "Learn what information Orbis processes for feedback, how it is used, and how long it is retained."
    },
    title: "Privacy notice", intro: "Orbis processes only the minimum information needed for this feedback.",
    sections: [
      { title: "What we process", body: "The feedback message, contact details you choose to provide, page language, and submission time." },
      { title: "How we use it", body: "Contact details are used only to reply to this feedback. We do not create user profiles or sell or share feedback information." },
      { title: "Retention", body: "Feedback email is retained for no more than 90 days and may be deleted earlier after it is handled." },
      { title: "Infrastructure", body: "Cloudflare processes request metadata needed to provide the site and prevent abuse under its service terms. Orbis does not write full IP addresses, feedback messages, or contact details to application logs." }
    ]
  },
  footer: { boundary: "Not a replacement for official alerts or emergency services", copyright: "© Orbis" }
} satisfies WebsiteContent;
