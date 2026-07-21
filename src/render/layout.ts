import { localizedPath, siteOrigin, type Locale, type LocalizedPage } from "../config/site";
import type { WebsiteContent } from "../content/types";
import { escapeHtml as esc } from "./html";

export function pageDocument(
  locale: Locale, page: LocalizedPage, content: WebsiteContent, main: string, scripts: readonly string[] = []
): string {
  const origin = siteOrigin();
  const alt: Locale = locale === "zh" ? "en" : "zh";
  const htmlLang = locale === "zh" ? "zh-CN" : "en";
  const altLang = alt === "zh" ? "zh-CN" : "en";
  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="${esc(content.meta.description)}" />
<link rel="canonical" href="${origin}${localizedPath(locale, page)}" />
<link rel="alternate" hreflang="${htmlLang}" href="${origin}${localizedPath(locale, page)}" />
<link rel="alternate" hreflang="${altLang}" href="${origin}${localizedPath(alt, page)}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/assets/global.css" />
<title>${esc(content.meta.title)}</title>
</head>
<body>
<a class="skip-link" href="#main">${esc(content.nav.skip)}</a>
${renderHeader(locale, content)}
<main id="main">
${main}
</main>
${renderFooter(locale, content)}
${scripts.map((s) => `<script src="${s}" defer></script>`).join("\n")}
</body>
</html>`;
}

export function renderHeader(locale: Locale, content: WebsiteContent): string {
  const alt: Locale = locale === "zh" ? "en" : "zh";
  return `<header class="site-header">
<a class="brand" href="${localizedPath(locale, "home")}" aria-label="Orbis home"><span class="brand-mark" aria-hidden="true"></span><span>ORBIS</span></a>
<nav class="site-nav" aria-label="Primary">
<a href="#why">${esc(content.nav.why)}</a>
<a href="#principles">${esc(content.nav.principles)}</a>
<a href="#feedback">${esc(content.nav.feedback)}</a>
<a href="${localizedPath(locale, "privacy")}">${esc(content.nav.privacy)}</a>
<a class="lang-switch" href="${localizedPath(alt, "home")}" hreflang="${alt === "zh" ? "zh-CN" : "en"}">${esc(content.nav.langLabel)}</a>
</nav>
</header>`;
}

export function renderFooter(locale: Locale, content: WebsiteContent): string {
  return `<footer>
<p>${esc(content.footer.boundary)}</p>
<p><a href="#feedback">${esc(content.nav.feedback)}</a> · <a href="${localizedPath(locale, "privacy")}">${esc(content.nav.privacy)}</a> · ${esc(content.footer.copyright)}</p>
</footer>`;
}
