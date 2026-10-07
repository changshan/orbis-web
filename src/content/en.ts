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
    titleLines: ["Follow important places and trips,", "and stay informed about relevant alerts."],
    body: "Orbis helps you follow places you care about and see relevant official disaster alerts. Follow places long term and receive trip alerts based on your schedule.",
    learn: "See how it works",
    boundary: "Orbis provides broader, more timely alerts without replacing official emergency services."
  },
  preview: {
    tag: "AI-GENERATED TRIP",
    title: "Milan in the morning, Rome in the afternoon",
    firstPlace: "Milan", firstTime: "09:00–12:00 · local time",
    secondPlace: "Rome", secondTime: "14:00–18:00 · local time",
    routeNote: "Follow confirmed places and time periods across your entire trip."
  },
  how: {
    title: "Intelligent alerts for greater peace of mind",
    intro: "An AI-powered flow creates clear, easy-to-follow alerts.",
    steps: [
      { title: "Describe in natural language", body: "AI identifies places and trip details from your description, then creates a draft for you to confirm." },
      { title: "Confirm places and times", body: "Review the actual dates, specific places, and local time zones, then edit as needed." },
      { title: "Keep watch", body: "Follow a place long term, or watch each confirmed trip stop during its scheduled time period." },
      { title: "Read relevant alerts", body: "When an official alert appears or changes materially, see its place, time, and original wording." }
    ]
  },
  plans: {
    title: "Two ways to keep watch",
    intro: "Choose the places you care about and how long to follow them. You control each place's status.",
    items: [
      { title: "Long-term places", body: "For places that matter over time, such as where family lives. Pause, resume, or delete them yourself." },
      { title: "Single or multi-stop trips", body: "Confirm a time period for each stop. Monitoring ends with the trip and does not extend along the route." }
    ],
  },
  alertSample: {
    title: "Every alert should explain the facts",
    body: "Alert intensity is based on scientifically grounded risk level definitions and references authoritative data published by official agencies in each country.",
    intensityLabel: "ORBIS INTENSITY", intensity: "Elevated",
    officialLabel: "OFFICIAL LEVEL", officialLevel: "Orange heavy rain alert (example)",
    placeLabel: "PLACE", place: "Milan",
    timeLabel: "VALID UNTIL", time: "Today at 20:00 (example)",
    sourceLabel: "ISSUING AUTHORITY", source: "See the actual official alert",
    actionLabel: "FIRST ACTION", action: "Limit unnecessary outdoor plans and follow local official information.",
    foot: "For illustration only; actual information may differ."
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
    body: "Orbis draws on official and authoritative sources to provide comprehensive coverage of risk events and alert notifications. When a source is unavailable or stale, we show its status and provide a clear explanation.",
    rules: ["Official source and wording stay visible", "Only confirmed places and times are watched", "Not a replacement for official alerts or emergency services"]
  },
  download: { title: "Get Orbis on the App Store", body: "Scan the QR code with your phone, or select it to open the App Store.", qrAlt: "QR code to download Orbis on the App Store" },
  feedback: {
    title: "Tell us what you think", body: "Share a suggestion, a concern, or anything you want Orbis to know.", emailLead: "Or email us at",
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
    "meta": {
      "title": "Privacy Policy | Orbis",
      "description": "What data Orbis keeps, where it is stored, how long it is kept, and how you can delete it."
    },
    "title": "Orbis Privacy Policy",
    "effective": "Effective date: 7 October 2026",
    "intro": "Orbis lets you follow the places you care about and alerts you when official agencies issue hazard warnings for them. This policy explains what data Orbis keeps, where it is stored, how long it is kept, and how you can delete it. Contact: lics0613@gmail.com.",
    "sections": [
      {
        "title": "No accounts",
        "body": "Orbis needs no sign-up and does not collect your name, phone number or email. The app creates a random installation identifier the first time it starts. Data on our servers is tied only to that installation, and we cannot link it to a specific person."
      },
      {
        "title": "Data we keep",
        "table": {
          "head": [
            "Data",
            "What it contains",
            "How long"
          ],
          "rows": [
            [
              "Places and trips you follow",
              "The city-level places you confirm, and the local start and end times of trips",
              "Places until you delete them; trips for 30 days after they end"
            ],
            [
              "Settings",
              "App language and which hazard types you have turned off",
              "With the installation"
            ],
            [
              "Push address",
              "The notification address Apple assigns to this installation, used to send you alerts",
              "With the installation"
            ],
            [
              "Alert history",
              "Which official warnings matched which of your places, and whether a notification was sent",
              "30 days"
            ],
            [
              "Feedback",
              "The category and any text you choose to send from the app, plus the place and time it relates to",
              "180 days"
            ],
            [
              "Usage statistics",
              "Daily counts of feature use, without the installation identifier and not linkable to any installation",
              "Long term"
            ],
            [
              "Service logs",
              "Request outcomes, timings and a hashed installation identifier; no notification text, feedback text or full push address",
              "30 days"
            ]
          ]
        }
      },
      {
        "title": "Location",
        "body": "Orbis checks your location once, only when you tap to use your current location. It does not locate you in the background and does not store your movements or precise address.",
        "items": [
          "To find your city: outside mainland China, the app sends coordinates rounded to about 1 km to our server to match a city, and the server does not store them; in mainland China, only the place name resolved by the system is sent.",
          "To show local weather: weather is fetched on your device from Apple's weather service, and Orbis servers do not receive that location."
        ],
        "after": "The only location data kept is the city-level places you choose to follow."
      },
      {
        "title": "When you create with AI",
        "body": "If you choose to describe your plans in text and have AI turn them into a draft of places and times, Orbis sends the text you enter and the current time and time zone to a third-party AI service, after you agree: installations from the mainland China App Store send it to DeepSeek, processed within mainland China; other regions send it to a DeepSeek model hosted on Alibaba Cloud's international (Singapore) service. This content is used only to create the draft, and the AI provider processes it under its own privacy policy. Orbis keeps your original text for 30 days, only to investigate recognition problems. You can withdraw consent in Settings at any time and create manually instead."
      },
      {
        "title": "Where data is stored and who can access it",
        "items": [
          "Installations downloaded from the mainland China App Store: data is stored on Alibaba Cloud in mainland China (Ulanqab).",
          "Installations downloaded from App Stores in other countries or regions: data is stored on Alibaba Cloud in Singapore and accessed in Singapore.",
          "The two are not connected. If you change your App Store region, the app registers as a new installation and earlier data is not moved.",
          "The developer accesses this data only to run the service, investigate problems and handle feedback."
        ]
      },
      {
        "title": "Third-party services we use",
        "table": {
          "head": [
            "Provider",
            "Purpose",
            "Data involved"
          ],
          "rows": [
            [
              "Alibaba Cloud",
              "Servers and data storage",
              "All server-side data listed above"
            ],
            [
              "Apple Push Notification service",
              "Delivering alerts to your device",
              "Push address and notification content"
            ],
            [
              "Apple weather service",
              "Showing weather on your device",
              "Requested directly by your device, not through Orbis servers"
            ],
            [
              "DeepSeek; Alibaba Cloud international (Singapore) service",
              "Only if you agree to create with AI",
              "The text you enter, current time and time zone"
            ]
          ]
        },
        "after": "Orbis has no ads, does no cross-app tracking, does not sell data, and uses no third-party analytics or advertising SDKs."
      },
      {
        "title": "Deleting your data",
        "items": [
          "Delete a place or trip: monitoring stops and it is deleted immediately.",
          "Clear All Data (Settings › Privacy): this installation's credentials stop working immediately; places, settings and the push address are erased at once, and the remaining related data is removed within about 24–48 hours. Using the app afterwards registers a new installation.",
          "Uninstalling the app does not delete server data right away. Once the push service confirms the device has been unreachable for 30 days, the data is removed automatically, usually within 6 weeks of uninstalling. Reinstalling within 30 days restores your places.",
          "Installations with no push address and nothing followed that have not been used for 30 days are removed automatically.",
          "When several installations on the same device registered the same push address, only the most recently used one is kept."
        ]
      },
      {
        "title": "Your rights",
        "body": "You can see all your places, trips and settings in the app and change or delete them at any time. Orbis has no accounts, and we cannot tell from an email which data is yours, so viewing, correcting and deleting are done through the app rather than by email. For other questions, write to lics0613@gmail.com. If you are in the EU or Switzerland, you also have the right to complain to your local data protection authority."
      },
      {
        "title": "Where alert content comes from",
        "body": "Alerts come from warnings published by official agencies in each country, and the app shows the issuing agency and time. Orbis does not replace official warning channels and does not guarantee that every warning is delivered in time."
      },
      {
        "title": "Children",
        "body": "Orbis is not directed at children and does not knowingly collect children's personal information."
      },
      {
        "title": "The feedback form on this website",
        "body": "When you send feedback through this website, Orbis processes only the minimum information needed for that feedback.",
        "items": [
          "What we process: the feedback message, contact details you choose to provide, page language, and submission time.",
          "How we use it: contact details are used only to reply to this feedback. We do not create user profiles or sell or share feedback information.",
          "Retention: Feedback email is retained for no more than 90 days and may be deleted earlier after it is handled.",
          "Infrastructure: Cloudflare processes request metadata needed to provide the site and prevent abuse under its service terms. Orbis does not write full IP addresses, feedback messages, or contact details to application logs."
        ]
      },
      {
        "title": "Changes to this policy",
        "body": "When this policy changes, we will update this page and the effective date. Changes to how AI data is handled will ask for your consent again in the app."
      }
    ]
  },
  footer: { copyright: "© Orbis" }
} satisfies WebsiteContent;
