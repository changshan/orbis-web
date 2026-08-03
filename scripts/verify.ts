import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]
  );
}
const files = walk(dist);
const rel = (f: string): string => relative(dist, f).split(sep).join("/");
const fail = (msg: string): never => { throw new Error(`verify failed: ${msg}`); };

const required = [
  "index.html", "404.html", "zh/index.html", "en/index.html",
  "zh/privacy/index.html", "en/privacy/index.html",
  "sitemap.xml", "robots.txt", "_headers", "favicon.svg"
];
for (const r of required) if (!files.some((f) => rel(f) === r)) fail(`missing ${r}`);

const expectedAssets = [
  "assets/global.css", "assets/lang.js", "assets/feedback.js",
  "assets/home/risk-earthquake.svg",
  "assets/home/risk-rain.svg", "assets/home/risk-heatwave.svg",
  "assets/home/risk-flood.svg", "assets/home/risk-wildfire.svg",
  "assets/home/risk-tornado.svg",
  "assets/home/clarity.png", "assets/home/clarity.en.svg"
];
const fingerprintPattern = /\.[a-f0-9]{12}\.[^./]+$/;
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
for (const logicalAsset of expectedAssets) {
  const extension = extname(logicalAsset);
  const stem = logicalAsset.slice(0, -extension.length);
  const pattern = new RegExp(`^${escapeRegExp(stem)}\\.[a-f0-9]{12}${escapeRegExp(extension)}$`);
  if (!files.some((file) => pattern.test(rel(file)))) fail(`missing fingerprinted ${logicalAsset}`);
}
for (const removed of ["zh/product/index.html", "en/product/index.html"]) {
  if (files.some((file) => rel(file) === removed)) fail(`obsolete product page present: ${removed}`);
}

let jsGzip = 0;
const referencedAssets = new Set<string>();
for (const file of files) {
  const ext = extname(file);
  if (rel(file).startsWith("assets/") && !fingerprintPattern.test(rel(file))) {
    fail(`unfingerprinted asset present: ${rel(file)}`);
  }
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(ext)) fail(`font file present: ${rel(file)}`);
  if (ext === ".js") jsGzip += gzipSync(readFileSync(file)).byteLength;
  if (ext === ".html") {
    const html = readFileSync(file, "utf8");
    // `\ssrc=` (whitespace before src) avoids matching `data-src=`, whose `-src` a `\b` would wrongly accept.
    if (/<script(?![^>]*\ssrc=)/i.test(html)) fail(`inline script in ${rel(file)}`);
    // Both an inline <style> element and a style="…" attribute violate style-src 'self'.
    if (/<style/i.test(html) || /\sstyle\s*=["']/i.test(html)) fail(`inline style in ${rel(file)}`);
    // Strip the only allowed absolute URLs (canonical/hreflang), then reject any other external src/href in either quote style.
    const withoutMeta = html.replace(/rel=["'](?:canonical|alternate)["'][^>]*/gi, "");
    if (/(?:src|href)=["']https?:\/\//i.test(withoutMeta)) fail(`external resource in ${rel(file)}`);
    for (const reference of html.match(/\/assets\/[^"' <>)]+/g) ?? []) {
      const assetPath = reference.slice(1);
      if (!fingerprintPattern.test(assetPath)) fail(`unfingerprinted reference in ${rel(file)}: ${reference}`);
      if (!files.some((candidate) => rel(candidate) === assetPath)) fail(`missing referenced asset: ${reference}`);
      referencedAssets.add(assetPath);
    }
  }
  if (ext === ".css" && /url\(["']?https?:/i.test(readFileSync(file, "utf8"))) fail(`external url() in ${rel(file)}`);
}
for (const file of files.filter((candidate) => rel(candidate).startsWith("assets/"))) {
  if (!referencedAssets.has(rel(file))) fail(`unreferenced asset: ${rel(file)}`);
}
if (jsGzip > 10 * 1024) fail(`JS gzip budget exceeded: ${jsGzip}`);
console.log(JSON.stringify({ jsGzip, files: files.length }));
