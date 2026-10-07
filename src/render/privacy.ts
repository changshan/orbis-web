import type { Locale } from "../config/site";
import { getContent } from "../content";
import type { PrivacySection } from "../content/types";
import { escapeHtml as esc } from "./html";
import { pageDocument } from "./layout";

function renderSection(s: PrivacySection): string {
  const parts = [`<h2>${esc(s.title)}</h2>`];
  if (s.body) parts.push(`<p>${esc(s.body)}</p>`);
  if (s.items) parts.push(`<ul>\n${s.items.map((item) => `<li>${esc(item)}</li>`).join("\n")}\n</ul>`);
  if (s.table) {
    const head = s.table.head.map((cell) => `<th scope="col">${esc(cell)}</th>`).join("");
    const rows = s.table.rows
      .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
      .join("\n");
    parts.push(`<div class="privacy-table"><table><thead><tr>${head}</tr></thead>\n<tbody>\n${rows}\n</tbody></table></div>`);
  }
  if (s.after) parts.push(`<p>${esc(s.after)}</p>`);
  return `<section>${parts.join("\n")}</section>`;
}

export function renderPrivacy(locale: Locale): string {
  const c = getContent(locale);
  const main = `<article class="privacy-page">
<h1>${esc(c.privacy.title)}</h1>
<p class="privacy-effective">${esc(c.privacy.effective)}</p>
<p>${esc(c.privacy.intro)}</p>
${c.privacy.sections.map(renderSection).join("\n")}
</article>`;
  return pageDocument(locale, "privacy", c, main, [], c.privacy.meta);
}
