import type { Locale } from "../config/site";
import { getContent } from "../content";
import { escapeHtml as esc } from "./html";
import { renderFeedbackSection } from "./feedback";
import { pageDocument } from "./layout";

export function renderProduct(locale: Locale): string {
  const c = getContent(locale);
  const main = `<section class="product-hero" aria-labelledby="product-title">
<h1 id="product-title">${esc(c.product.hero.title)}</h1>
</section>
${renderFeedbackSection(locale, c)}`;
  return pageDocument(locale, "product", c, main, ["/assets/feedback.js"], c.product.meta);
}
