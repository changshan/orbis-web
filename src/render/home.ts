import { APP_STORE_URL, type Locale } from "../config/site";
import { getContent } from "../content";
import type { WebsiteContent } from "../content/types";
import { escapeHtml as esc } from "./html";
import { renderFeedbackSection } from "./feedback";
import { pageDocument } from "./layout";

function renderPreview(c: WebsiteContent): string {
  return `<figure class="plan-preview">
<div class="preview-sky"><div class="preview-head"><span class="mono">${esc(c.preview.tag)}</span></div><div class="preview-orbit" aria-hidden="true"><span></span><span></span><span></span></div></div>
<div class="preview-surface"><figcaption>${esc(c.preview.title)}</figcaption>
<ol class="preview-stops">
<li><span class="stop-dot" aria-hidden="true"></span><div><strong>${esc(c.preview.firstPlace)}</strong><small>${esc(c.preview.firstTime)}</small></div></li>
<li><span class="stop-dot" aria-hidden="true"></span><div><strong>${esc(c.preview.secondPlace)}</strong><small>${esc(c.preview.secondTime)}</small></div></li>
</ol>
<p class="preview-note">${esc(c.preview.routeNote)}</p></div>
</figure>`;
}

function renderExample(c: WebsiteContent): string {
  const a = c.alertSample;
  return `<section class="home-alert" id="alert-example" aria-labelledby="alert-title">
<div class="alert-intro"><span class="eyebrow mono">OFFICIAL SIGNAL / ORBIS CONTEXT</span><h2 id="alert-title">${esc(a.title)}</h2><p>${esc(a.body)}</p></div>
<figure class="example-card">
<div class="example-head"><span class="alert-sample mono">${esc(a.sampleTag)}</span></div>
<div class="example-levels"><div><span class="mono">${esc(a.intensityLabel)}</span><strong class="orbis-intensity">${esc(a.intensity)}</strong></div><div><span class="mono">${esc(a.officialLabel)}</span><strong class="official-level">${esc(a.officialLevel)}</strong></div></div>
<dl class="example-facts"><div><dt>${esc(a.placeLabel)}</dt><dd>${esc(a.place)}</dd></div><div><dt>${esc(a.timeLabel)}</dt><dd>${esc(a.time)}</dd></div><div><dt>${esc(a.sourceLabel)}</dt><dd>${esc(a.source)}</dd></div></dl>
<div class="example-action"><span class="mono">${esc(a.actionLabel)}</span><p>${esc(a.action)}</p></div>
<figcaption>${esc(a.foot)}</figcaption>
</figure>
</section>`;
}

function renderPrinciples(c: WebsiteContent): string {
  return `<section class="home-principles" id="principles" aria-labelledby="principles-title">
<h2 id="principles-title">${esc(c.principles.title)}</h2>
<ul class="ledger">${c.principles.items.map((item) => `<li><span class="l-mark" aria-hidden="true"></span><h3>${esc(item.title)}<small class="mono">${esc(item.tag)}</small></h3><p>${esc(item.body)}</p></li>`).join("\n")}</ul>
</section>`;
}

export function renderHome(locale: Locale): string {
  const c = getContent(locale);
  const steps = c.how.steps.map((step, index) => `<li><span class="step-index mono">${String(index + 1).padStart(2, "0")}</span><h3>${esc(step.title)}</h3><p>${esc(step.body)}</p></li>`).join("\n");
  const plans = c.plans.items.map((item, index) => `<article class="plan-card"><span class="mono">0${index + 1}</span><h3>${esc(item.title)}</h3><p>${esc(item.body)}</p></article>`).join("\n");
  const rules = c.boundary.rules.map((rule) => `<li><span class="rule-mark" aria-hidden="true"></span>${esc(rule)}</li>`).join("");
  const main = `<section class="home-hero" aria-labelledby="home-title">
<div class="hero-grid">
<div class="hero-copy"><p class="eyebrow mono">${esc(c.hero.eyebrow)}</p><h1 id="home-title">${c.hero.titleLines.map((line) => `<span>${esc(line)}</span>`).join("")}</h1><p class="hero-lede">${esc(c.hero.body)}</p>
<div class="hero-actions"><a class="hero-cta" href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer">${esc(c.nav.download)} <span aria-hidden="true">↗</span></a><a class="hero-secondary" href="#how-it-works">${esc(c.hero.learn)} <span aria-hidden="true">↓</span></a></div></div>
<div class="hero-figure">${renderPreview(c)}</div>
</div>
<p class="hero-boundary"><span class="mono">BOUNDARY</span><span>${esc(c.hero.boundary)}</span></p>
</section>
<section class="home-how" id="how-it-works" aria-labelledby="how-title"><div class="section-heading"><span class="eyebrow mono">HOW IT WORKS</span><h2 id="how-title">${esc(c.how.title)}</h2><p>${esc(c.how.intro)}</p></div><ol class="step-grid">${steps}</ol></section>
<section class="home-plans" id="plans" aria-labelledby="plans-title"><div class="section-heading"><span class="eyebrow mono">${esc(c.plans.tag)}</span><h2 id="plans-title">${esc(c.plans.title)}</h2><p>${esc(c.plans.intro)}</p></div><div class="plan-grid">${plans}</div><p class="release-note">${esc(c.plans.note)}</p></section>
${renderExample(c)}
${renderPrinciples(c)}
<aside class="home-boundary" id="boundary" aria-labelledby="boundary-title"><h2 id="boundary-title">${esc(c.boundary.title)}</h2><p>${esc(c.boundary.body)}</p><ul>${rules}</ul></aside>
${renderFeedbackSection(locale, c)}
<section class="home-download" id="download" aria-labelledby="download-title"><div class="download-inner"><div class="download-copy"><span class="eyebrow mono">APP STORE</span><h2 id="download-title">${esc(c.download.title)}</h2><p>${esc(c.download.body)}</p></div><a class="download-qr" href="${APP_STORE_URL}" target="_blank" rel="noopener noreferrer"><img src="/assets/app-store-qr.png" width="216" height="216" loading="lazy" decoding="async" alt="${esc(c.download.qrAlt)}" /></a></div></section>`;
  return pageDocument(locale, "home", c, main, ["/assets/feedback.js"]);
}
