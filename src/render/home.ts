import { localizedPath, type Locale } from "../config/site";
import { getContent } from "../content";
import { escapeHtml as esc } from "./html";
import { renderFeedbackSection } from "./feedback";
import { pageDocument } from "./layout";

const NIGHT_FIELD_SVG = `<svg viewBox="0 0 560 400" aria-hidden="true">
<defs><radialGradient id="glow" cx="50%" cy="50%" r="50%">
<stop offset="0%" stop-color="#F0B45C" stop-opacity=".32"/>
<stop offset="55%" stop-color="#F0B45C" stop-opacity=".08"/>
<stop offset="100%" stop-color="#F0B45C" stop-opacity="0"/>
</radialGradient></defs>
<g fill="#EDEAE3" opacity=".2"><circle cx="72" cy="64" r="1.4"/><circle cx="176" cy="38" r="1.1"/><circle cx="286" cy="80" r="1.3"/><circle cx="420" cy="46" r="1.2"/><circle cx="506" cy="120" r="1.4"/><circle cx="466" cy="248" r="1.1"/><circle cx="128" cy="182" r="1.2"/><circle cx="234" cy="300" r="1.3"/><circle cx="522" cy="330" r="1.1"/><circle cx="380" cy="356" r="1.2"/></g>
<path d="M84 332 Q 200 176 336 150" fill="none" stroke="#E2A144" stroke-width="1.3" stroke-dasharray="2 7" opacity=".6"/>
<circle cx="84" cy="332" r="3.2" fill="none" stroke="#8FA0AB" stroke-width="1.2"/><circle cx="84" cy="332" r="1.1" fill="#8FA0AB"/>
<circle cx="336" cy="150" r="84" fill="url(#glow)"/>
<circle cx="336" cy="150" r="26" fill="none" stroke="#E2A144" stroke-width="1" opacity=".45"/>
<circle cx="336" cy="150" r="13" fill="none" stroke="#E2A144" stroke-width="1.2" opacity=".8"/>
<circle cx="336" cy="150" r="4.6" fill="#F0B45C"/>
</svg>`;

export function renderHome(locale: Locale): string {
  const c = getContent(locale);
  const hero = `<div class="night">
<section class="hero" aria-labelledby="hero-title">
<div class="hero-copy">
<p class="eyebrow mono">${esc(c.hero.eyebrow)}</p>
<h1 id="hero-title"><span class="phrase">${esc(c.hero.titleLead)}</span><wbr /><span class="phrase">${esc(c.hero.titleMain)}<span class="lamp-dot">${esc(c.hero.titleDot)}</span></span></h1>
<p class="lede">${esc(c.hero.body)}</p>
<a class="text-link" href="${localizedPath(locale, "product")}">${esc(c.hero.action)}</a>
<p class="mono watch-label">${esc(c.hero.watchLabel)}</p>
</div>
<div class="night-field" aria-hidden="true">
<p class="coords mono">ORBIS · KEEPING WATCH<br />46.2044° N / 6.1432° E</p>
${NIGHT_FIELD_SVG}
<p class="you-note mono">${esc(c.hero.youLabel)}</p>
<div class="place-note"><span class="mono">${esc(c.hero.placeLabel)}</span><strong>${esc(c.hero.placeName)}</strong></div>
</div>
</section>
</div>
<div class="dawn" aria-hidden="true"></div>`;

  const day = `<section class="day" id="principles" aria-labelledby="principles-title">
<p class="section-code mono">02 · PRINCIPLES</p>
<h2 class="day-title" id="principles-title">${esc(c.principles.title)}</h2>
<ul class="ledger">
${c.principles.items.map((p) => `<li><span class="l-mark" aria-hidden="true"></span><h3>${esc(p.title)}<small>${esc(p.tag)}</small></h3><p>${esc(p.body)}</p></li>`).join("\n")}
</ul>
</section>
<aside class="boundary" id="boundary" aria-labelledby="boundary-title">
<div class="inner">
<p class="section-code mono">03 · BOUNDARY</p>
<h2 class="day-title" id="boundary-title">${esc(c.boundary.title)}</h2>
<p>${esc(c.boundary.body)}</p>
</div>
</aside>
</aside>`;

  return pageDocument(locale, "home", c, hero + "\n" + day + "\n" + renderFeedbackSection(locale, c), ["/assets/feedback.js"]);
}
