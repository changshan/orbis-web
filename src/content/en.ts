import type { WebsiteContent } from "./types";

export const en = {
  meta: { title: "Orbis | Keeping watch, whenever it matters", description: "Calm, relevant, trustworthy risk understanding for the places you care about." },
  nav: { why: "Why Orbis", principles: "Principles", feedback: "Feedback", privacy: "Privacy", skip: "Skip to main content", langLabel: "中文" },
  hero: {
    eyebrow: "Quiet protection / clear judgment", titleLead: "Keeping watch,", titleMain: "whenever it matters", titleDot: ".",
    body: "Orbis brings calm, relevant understanding to the places you care about—so the next step feels clearer.",
    action: "Explore our principles", watchLabel: "KEEPING WATCH",
    youLabel: "YOU", placeLabel: "A place you care about", placeName: "Geneva"
  },
  why: {
    title: "More information does not always mean more certainty.",
    questions: ["What happened?", "Is it relevant to you?", "What deserves attention next?"],
    outroPlain: "Those three questions are what matter.", outroStrong: "Orbis begins there."
  },
  principles: {
    title: "Three principles",
    items: [
      { tag: "RELEVANT", title: "Relevant", body: "Focused on what matters to the places you care about." },
      { tag: "CLEAR", title: "Clear", body: "Designed to make important information easier to understand." },
      { tag: "TRUSTED", title: "Trusted", body: "Calm by design, honest about sources, limits, and uncertainty." }
    ]
  },
  boundary: { title: "Know the boundary", body: "Orbis helps you understand risk, but it does not replace official local alerts, government instructions, or emergency services. In an emergency, contact local emergency services immediately." },
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
