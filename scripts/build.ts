import { buildSync } from "esbuild";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, localizedPath, siteOrigin } from "../src/config/site";
import { renderEntry } from "../src/render/entry";
import { renderHome } from "../src/render/home";
import { renderNotFound } from "../src/render/notFound";
import { renderPrivacy } from "../src/render/privacy";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });

const writePage = (relDir: string, html: string): void => {
  const dir = join(dist, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
};
writeFileSync(join(dist, "index.html"), renderEntry());
writeFileSync(join(dist, "404.html"), renderNotFound());
for (const locale of SITE.locales) {
  writePage(locale, renderHome(locale));
  writePage(join(locale, "privacy"), renderPrivacy(locale));
}

cpSync(join(root, "src/styles/global.css"), join(dist, "assets/global.css"));
buildSync({
  entryPoints: [join(root, "src/client/lang.ts"), join(root, "src/client/feedback.ts")],
  outdir: join(dist, "assets"),
  bundle: true, minify: true, format: "iife", target: "es2020"
});

const origin = siteOrigin();
const urls = SITE.locales.flatMap((l) => [localizedPath(l, "home"), localizedPath(l, "privacy")]);
writeFileSync(join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${origin}${u}</loc></url>`).join("")}</urlset>`);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);

cpSync(join(root, "public"), dist, { recursive: true });
console.log(JSON.stringify({ built: true, origin }));
