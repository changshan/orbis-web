import type { Locale } from "../config/site";
import { getContent } from "../content";
import type { WebsiteContent } from "../content/types";
import { escapeHtml as esc } from "./html";
import { renderFeedbackSection } from "./feedback";
import { pageDocument } from "./layout";

function corners(): string {
  return ["tl", "tr", "bl", "br"]
    .map((position) => `<span class="corner ${position}" aria-hidden="true"></span>`)
    .join("");
}

function renderAlertCard(content: WebsiteContent, variant: "compact" | "full"): string {
  const a = content.alertSample;
  const head = variant === "compact"
    ? `<span class="alert-brand mono"><span class="brand-mark" aria-hidden="true"></span>ORBIS</span>
<span class="alert-sample mono">${esc(a.sampleTag)}</span>
<span class="alert-now mono">${esc(a.nowLabel)}</span>`
    : `<span class="mono">${esc(a.headLabel)}</span>
<span class="alert-sample mono">${esc(a.sampleTag)}</span>
<span class="mono">${esc(a.indexLabel)}</span>`;
  const headline = variant === "compact"
    ? `<div class="alert-headline">
<p class="alert-level mono">${esc(a.levelLabel)}</p>
<p class="alert-hazard">${esc(a.hazard)}</p>
<p class="alert-where">${esc(a.where)}</p>
</div>`
    : `<div class="alert-headline">
<p class="alert-tag mono">${esc(a.fieldLabels.what)}</p>
<p class="alert-hazard alert-hazard-lg">${esc(a.whatValue)}</p>
<p class="alert-tag mono">${esc(a.fieldLabels.where)}</p>
<p class="alert-where">${esc(a.where)}</p>
</div>`;
  const whenLabel = variant === "compact" ? a.whenLabel : a.fieldLabels.when;
  const foot = variant === "compact"
    ? `<p class="alert-foot">${esc(a.sourceNote)}</p>`
    : `<div class="alert-foot alert-foot-split"><span>${esc(a.sourceNote)}</span><span>${esc(a.boundaryNote)}</span></div>`;
  return `<figure class="alert-card alert-card-${variant} blueprint">${corners()}
<div class="alert-head">${head}</div>
<div class="alert-bar" aria-hidden="true"></div>
${headline}
<div class="alert-facts">
<div><p class="alert-tag mono">${esc(whenLabel)}</p><p class="alert-fact">${esc(a.when)}</p></div>
<div><p class="alert-tag alert-tag-muted mono">${esc(a.updatedLabel)}</p><p class="alert-fact">${esc(a.updated)}</p></div>
</div>
<div class="alert-action">
<p class="alert-tag mono">${esc(a.actionLabel)}</p>
<p class="alert-action-body">${esc(a.action)}</p>
${foot}
</div>
</figure>`;
}

function renderPrinciples(content: WebsiteContent): string {
  return `<section class="day home-principles" id="principles" aria-labelledby="principles-title">
<h2 class="day-title" id="principles-title">${esc(content.principles.title)}</h2>
<ul class="ledger">
${content.principles.items.map((item) => `<li><span class="l-mark" aria-hidden="true"></span><h3>${esc(item.title)}<small>${esc(item.tag)}</small></h3><p>${esc(item.body)}</p></li>`).join("\n")}
</ul>
</section>`;
}

export function renderHome(locale: Locale): string {
  const c = getContent(locale);
  const visuals = locale === "en"
    ? { relevance: "relevance.en.svg", clarity: "clarity.en.svg" }
    : { relevance: "relevance.png", clarity: "clarity.png" };
  const risks = c.risks.items.map((item) => `<article class="risk-card">
<img src="/assets/home/risk-${item.key}.svg" alt="" loading="lazy" decoding="async" width="360" height="260" />
<div class="risk-card-copy">
<h3>${esc(item.name)}</h3>
<p>${esc(item.body)}</p>
</div>
</article>`).join("\n");
  const clarity = c.clarity.items.map((item) => `<li>
<span class="mono">${esc(item.tag)}</span>
<h3>${esc(item.title)}</h3>
<p>${esc(item.body)}</p>
</li>`).join("\n");
  const boundaryRules = c.boundary.rules.map((rule) => `<li>${esc(rule)}</li>`).join("");

  const main = `<section class="home-hero" aria-labelledby="home-title">
<div class="hero-grid">
<div class="hero-copy">
<h1 id="home-title">${c.hero.titleLines.map((line) => `<span>${esc(line)}</span>`).join("")}</h1>
<p class="hero-lede">${esc(c.hero.body)}</p>
<a class="hero-cta" href="#relevance">${esc(c.hero.action)} <span aria-hidden="true">↓</span></a>
<ul class="hero-metrics">
${c.hero.metrics.map((metric) => `<li><span class="metric-value">${esc(metric.value)}</span><span class="metric-label mono">${esc(metric.label)}</span></li>`).join("")}
</ul>
</div>
<div class="hero-figure">
${renderAlertCard(c, "compact")}
</div>
</div>
<p class="hero-boundary"><span class="mono">${esc(c.hero.boundary.tag)}</span><span>${esc(c.hero.boundary.note)}</span></p>
</section>
<section class="home-risks" id="risks" aria-labelledby="risks-title">
<header class="home-section-head">
<div>
<h2 id="risks-title">${esc(c.risks.title)}</h2>
</div>
<p class="home-scope-note">${esc(c.risks.note)}</p>
</header>
<div class="home-risk-grid">
${risks}
</div>
</section>
<div class="home-color-transition" aria-hidden="true"></div>
<section class="home-relevance" id="relevance" aria-labelledby="relevance-title">
<div class="home-relevance-copy">
<h2 id="relevance-title">${esc(c.relevance.title)}</h2>
<p>${esc(c.relevance.body)}</p>
</div>
<figure class="home-relevance-figure">
<img src="/assets/home/${visuals.relevance}" alt="" loading="lazy" decoding="async" width="770" height="584" />
</figure>
</section>
<section class="home-clarity" id="clarity" aria-labelledby="clarity-title">
<header>
<h2 id="clarity-title">${esc(c.clarity.title)}</h2>
<p>${esc(c.clarity.body)}</p>
</header>
<div class="home-clarity-stage">
<img class="home-clarity-figure" src="/assets/home/${visuals.clarity}" alt="" loading="lazy" decoding="async" width="1240" height="630" />
<ol class="home-clarity-list">${clarity}</ol>
</div>
</section>
${renderPrinciples(c)}
<aside class="home-boundary" id="boundary" aria-labelledby="boundary-title">
<div>
<h2 id="boundary-title">${esc(c.boundary.title)}</h2>
<p>${esc(c.boundary.body)}</p>
<ul>${boundaryRules}</ul>
</div>
</aside>
${renderFeedbackSection(locale, c)}`;

  return pageDocument(locale, "home", c, main, ["/assets/feedback.js"]);
}
