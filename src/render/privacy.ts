import type { Locale } from "../config/site";
import { getContent } from "../content";
import { escapeHtml as esc } from "./html";
import { pageDocument } from "./layout";

export function renderPrivacy(locale: Locale): string {
  const c = getContent(locale);
  const main = `<article class="privacy-page">
<h1>${esc(c.privacy.title)}</h1>
<p>${esc(c.privacy.intro)}</p>
${c.privacy.sections.map((s) => `<section><h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></section>`).join("\n")}
</article>`;
  return pageDocument(locale, "privacy", c, main, [], c.privacy.meta);
}
