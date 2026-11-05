import { buildSync } from "esbuild";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, localizedPath, siteOrigin } from "../src/config/site";
import { renderEntry } from "../src/render/entry";
import { renderHome } from "../src/render/home";
import { renderNotFound } from "../src/render/notFound";
import { renderVision } from "../src/render/vision";
import { renderPrivacy } from "../src/render/privacy";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const origin = siteOrigin({ requireExplicit: process.env.CI === "true" });

rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "assets"), { recursive: true });

const writePage = (relDir: string, html: string): void => {
  const dir = join(dist, relDir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
};

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]
);

const webPath = (file: string): string => `/${relative(dist, file).split(sep).join("/")}`;

const fingerprintAssets = (): number => {
  const assets = walk(join(dist, "assets")).sort();
  const replacements = new Map<string, string>();

  for (const source of assets) {
    const extension = extname(source);
    const hash = createHash("sha256").update(readFileSync(source)).digest("hex").slice(0, 12);
    const stem = basename(source, extension);
    const target = join(dirname(source), `${stem}.${hash}${extension}`);
    const originalUrl = webPath(source);
    renameSync(source, target);
    replacements.set(originalUrl, webPath(target));
  }

  for (const htmlFile of walk(dist).filter((file) => extname(file) === ".html")) {
    let html = readFileSync(htmlFile, "utf8");
    for (const [originalUrl, fingerprintedUrl] of replacements) {
      html = html.replaceAll(originalUrl, fingerprintedUrl);
    }
    writeFileSync(htmlFile, html);
  }

  return replacements.size;
};

writeFileSync(join(dist, "index.html"), renderEntry());
writeFileSync(join(dist, "404.html"), renderNotFound());
for (const locale of SITE.locales) {
  writePage(locale, renderHome(locale));
  writePage(join(locale, "privacy"), renderPrivacy(locale));
  writePage(join(locale,"vision"),renderVision(locale));
}

cpSync(join(root, "src/styles/global.css"), join(dist, "assets/global.css"));
buildSync({
  entryPoints: [join(root, "src/client/lang.ts"), join(root, "src/client/feedback.ts"), join(root, "src/client/carousel.ts")],
  outdir: join(dist, "assets"),
  bundle: true, minify: true, format: "iife", target: "es2020"
});

cpSync(join(root,"src/styles/vision.css"),join(dist,"assets/vision.css"));
cpSync(join(root,"node_modules/maplibre-gl/dist/maplibre-gl.css"),join(dist,"assets/maplibre.css"));
for(const [source,target] of [["src/vision/map.mjs","vision"],["node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs","vision-worker"]]){
 // Worker response CSP is cached with the script, so policy changes must invalidate its immutable URL.
 const banner=target==='vision-worker'?{js:`/* response-policy-sha256:${createHash('sha256').update(readFileSync(join(root,'public/_headers'))).digest('hex')} */`}:undefined;
 buildSync({entryPoints:[join(root,source!)],outfile:join(dist,`assets/${target}.js`),bundle:true,minify:true,format:"iife",target:"es2022",banner});
}
const urls = SITE.locales.flatMap((locale) => [
  localizedPath(locale, "home"), localizedPath(locale, "privacy"), localizedPath(locale,"vision")
]);
writeFileSync(join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${origin}${u}</loc></url>`).join("")}</urlset>`);
writeFileSync(join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);

cpSync(join(root, "public"), dist, { recursive: true });
const fingerprintedAssets = fingerprintAssets();
console.log(JSON.stringify({ built: true, origin, fingerprintedAssets }));
