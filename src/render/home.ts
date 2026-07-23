import type { Locale } from "../config/site";
import { getContent } from "../content";
import type { WebsiteContent } from "../content/types";
import { escapeHtml as esc } from "./html";
import { renderFeedbackSection } from "./feedback";
import { pageDocument } from "./layout";

function renderPrinciples(content: WebsiteContent): string {
  return `<section class="day home-principles" id="principles" aria-labelledby="principles-title">
<p class="section-code mono">04 · PRINCIPLES</p>
<h2 class="day-title" id="principles-title">${esc(content.principles.title)}</h2>
<ul class="ledger">
${content.principles.items.map((item) => `<li><span class="l-mark" aria-hidden="true"></span><h3>${esc(item.title)}<small>${esc(item.tag)}</small></h3><p>${esc(item.body)}</p></li>`).join("\n")}
</ul>
</section>`;
}

export function renderHome(locale: Locale): string {
  const c = getContent(locale);
  const visuals = locale === "en"
    ? { hero: "hero-radar.en.svg", relevance: "relevance.en.svg", clarity: "clarity.en.svg" }
    : { hero: "hero-radar.png", relevance: "relevance.png", clarity: "clarity.png" };
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
<div class="home-hero-copy">
<p class="mono">${esc(c.hero.eyebrow)}</p>
<h1 id="home-title">${c.hero.titleLines.map((line) => `<span>${esc(line)}</span>`).join("")}</h1>
<p class="home-lede">${esc(c.hero.body)}</p>
<a class="home-action" href="#relevance">${esc(c.hero.action)} <span aria-hidden="true">↓</span></a>
<ul class="home-metrics mono">
${c.hero.metrics.map((metric) => `<li>${esc(metric)}</li>`).join("")}
</ul>
</div>
<figure class="home-hero-figure">
<img src="/assets/home/${visuals.hero}" alt="" fetchpriority="high" decoding="async" width="656" height="704" />
</figure>
</section>
<section class="home-risks" id="risks" aria-labelledby="risks-title">
<header class="home-section-head">
<div>
<p class="mono">${esc(c.risks.eyebrow)}</p>
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
<p class="mono">${esc(c.relevance.eyebrow)}</p>
<h2 id="relevance-title">${esc(c.relevance.title)}</h2>
<p>${esc(c.relevance.body)}</p>
</div>
<figure class="home-relevance-figure">
<img src="/assets/home/${visuals.relevance}" alt="" loading="lazy" decoding="async" width="770" height="584" />
</figure>
</section>
<section class="home-clarity" id="clarity" aria-labelledby="clarity-title">
<header>
<p class="mono">${esc(c.clarity.eyebrow)}</p>
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
<p class="mono">${esc(c.boundary.eyebrow)}</p>
<h2 id="boundary-title">${esc(c.boundary.title)}</h2>
<p>${esc(c.boundary.body)}</p>
<ul>${boundaryRules}</ul>
</div>
</aside>
${renderFeedbackSection(locale, c)}`;

  return pageDocument(locale, "home", c, main, ["/assets/feedback.js"]);
}
