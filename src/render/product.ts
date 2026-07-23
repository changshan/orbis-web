import type { Locale } from "../config/site";
import { getContent } from "../content";
import { escapeHtml as esc } from "./html";
import { renderFeedbackSection } from "./feedback";
import { pageDocument } from "./layout";

export function renderProduct(locale: Locale): string {
  const c = getContent(locale);
  const p = c.product;
  const risks = p.risks.items.map((item) => `<article class="risk-card">
<img src="/assets/product/risk-${item.key}.svg" alt="" width="360" height="260" />
<div class="risk-card-copy">
<h3>${esc(item.name)}</h3>
<p>${esc(item.body)}</p>
</div>
</article>`).join("\n");
  const clarity = p.clarity.items.map((item) => `<li>
<span class="mono">${esc(item.tag)}</span>
<h3>${esc(item.title)}</h3>
<p>${esc(item.body)}</p>
</li>`).join("\n");
  const boundaryRules = p.boundary.rules.map((rule) => `<li>${esc(rule)}</li>`).join("");

  const main = `<section class="product-hero" aria-labelledby="product-title">
<div class="product-hero-copy">
<p class="mono">${esc(p.hero.eyebrow)}</p>
<h1 id="product-title">${esc(p.hero.title)}</h1>
<p class="product-lede">${esc(p.hero.body)}</p>
<a class="product-action" href="#relevance">${esc(p.hero.action)} <span aria-hidden="true">↓</span></a>
<ul class="product-metrics mono">
${p.hero.metrics.map((metric) => `<li>${esc(metric)}</li>`).join("")}
</ul>
</div>
<figure class="product-hero-figure">
<img src="/assets/product/hero-radar.png" alt="" width="596" height="640" />
</figure>
</section>
<section class="product-risks" id="risks" aria-labelledby="risks-title">
<header class="product-section-head">
<div>
<p class="mono">${esc(p.risks.eyebrow)}</p>
<h2 id="risks-title">${esc(p.risks.title)}</h2>
</div>
<p class="product-scope-note">${esc(p.risks.note)}</p>
</header>
<div class="product-risk-grid">
${risks}
</div>
</section>
<section class="product-relevance" id="relevance" aria-labelledby="relevance-title">
<div class="product-relevance-copy">
<p class="mono">${esc(p.relevance.eyebrow)}</p>
<h2 id="relevance-title">${esc(p.relevance.title)}</h2>
<p>${esc(p.relevance.body)}</p>
</div>
<figure class="product-relevance-figure">
<img src="/assets/product/relevance.png" alt="" width="770" height="584" />
</figure>
</section>
<section class="product-clarity" id="clarity" aria-labelledby="clarity-title">
<header>
<p class="mono">${esc(p.clarity.eyebrow)}</p>
<h2 id="clarity-title">${esc(p.clarity.title)}</h2>
<p>${esc(p.clarity.body)}</p>
</header>
<div class="product-clarity-stage">
<img class="product-clarity-figure" src="/assets/product/clarity.png" alt="" width="1240" height="630" />
<ol class="product-clarity-list">${clarity}</ol>
</div>
</section>
<aside class="product-boundary" id="product-boundary" aria-labelledby="product-boundary-title">
<div>
<p class="mono">${esc(p.boundary.eyebrow)}</p>
<h2 id="product-boundary-title">${esc(p.boundary.title)}</h2>
<p>${esc(p.boundary.body)}</p>
<ul>${boundaryRules}</ul>
</div>
</aside>
${renderFeedbackSection(locale, c)}`;
  return pageDocument(locale, "product", c, main, ["/assets/feedback.js"], c.product.meta);
}
