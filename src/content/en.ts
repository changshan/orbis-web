import type { WebsiteContent } from "./types";

export const en = {
  meta: {
    title: "Orbis | Disaster alerts for the places and trips that matter",
    description: "Orbis presents relevant official disaster alerts for places and times you confirm, with clear sources and limits."
  },
  nav: {
    why: "Why Orbis", how: "How it works", principles: "Principles", feedback: "Feedback", privacy: "Privacy",
    download: "Download on the App Store", skip: "Skip to main content", langLabel: "中文",
    homeAria: "Orbis home", primaryAria: "Primary navigation"
  },
  hero: {
    eyebrow: "ORBIS · OFFICIAL ALERTS, MADE RELEVANT",
    titleLines: ["Watch the places", "that matter to you."],
    body: "Orbis helps you follow places you care about and see relevant official disaster alerts. A planned update will add long-term places and time-based trips.",
    learn: "See how it works",
    boundary: "Orbis does not replace local official alerts, government instructions, or emergency services. In an emergency, contact local emergency services."
  },
  preview: {
    tag: "PLANNED UPDATE · TRIP EXAMPLE",
    title: "Milan in the morning, Rome in the afternoon",
    firstPlace: "Milan", firstTime: "09:00–12:00 · local time",
    secondPlace: "Rome", secondTime: "14:00–18:00 · local time",
    routeNote: "Orbis watches confirmed places and time periods; it does not monitor the route between them."
  },
  how: {
    title: "A clear path from plans to alerts",
    intro: "In the planned update, monitoring starts after you confirm places and times. You can still create them manually when natural-language input is unavailable.",
    steps: [
      { title: "Describe in natural language", body: "AI identifies places and trip details from your description, then creates a draft for you to confirm." },
      { title: "Confirm places and times", body: "Review the actual dates, specific places, and local time zones, then edit as needed." },
      { title: "Keep watch", body: "Follow a place long term, or watch each confirmed trip stop during its scheduled time period." },
      { title: "Read relevant alerts", body: "When an official alert appears or changes materially, see its place, time, and original wording." }
    ]
  },
  plans: {
    tag: "PLANNED FOR 0.2",
    title: "Two ways to keep watch",
    intro: "Choose the places you care about and how long to follow them. You control each place's status.",
    items: [
      { title: "Long-term places", body: "For places that matter over time, such as where family lives. Pause, resume, or delete them yourself." },
      { title: "Single or multi-stop trips", body: "Confirm a time period for each stop. Monitoring ends with the trip and does not extend along the route." }
    ],
    note: "New features will open as version 0.2 is released. See the app for what is available now."
  },
  alertSample: {
    sampleTag: "SAMPLE · NOT A LIVE ALERT",
    title: "Every alert should explain the facts",
    body: "Orbis intensity is mechanically mapped from the official level. The original level, issuing authority, and wording remain visible alongside it.",
    intensityLabel: "ORBIS INTENSITY", intensity: "Elevated",
    officialLabel: "OFFICIAL LEVEL", officialLevel: "Orange heavy rain alert (example)",
    placeLabel: "PLACE", place: "Milan",
    timeLabel: "VALID UNTIL", time: "Today at 20:00 (example)",
    sourceLabel: "ISSUING AUTHORITY", source: "See the actual official alert",
    actionLabel: "FIRST ACTION", action: "Limit unnecessary outdoor plans and follow local official information.",
    foot: "This sample shows the information structure. Actual alerts are governed by their original issuing authority."
  },
  principles: {
    title: "Three principles",
    items: [
      { tag: "RELEVANT", title: "Relevant", body: "Alerts relate to places and times you confirm." },
      { tag: "CLEAR", title: "Clear", body: "Place, time, official level, and the reason for the alert stay easy to understand." },
      { tag: "TRUSTED", title: "Trusted", body: "Sources, freshness, uncertainty, and product limits stay visible." }
    ]
  },
  boundary: {
    title: "Trust includes clear limits.",
    body: "Orbis uses alerts from connected official or authoritative sources. It does not predict disasters or guarantee every event is covered or every notification is delivered. Unavailable or stale sources must not be presented as safety.",
    rules: ["Official source and wording stay visible", "Only confirmed places and times are watched", "Not a replacement for official alerts or emergency services"]
  },
  download: { title: "Get Orbis on the App Store", body: "Scan the QR code with your phone, or select it to open the App Store.", qrAlt: "QR code to download Orbis on the App Store" },
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
