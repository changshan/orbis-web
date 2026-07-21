import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
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
const rel = (f: string): string => relative(dist, f);
const fail = (msg: string): never => { throw new Error(`verify failed: ${msg}`); };

const required = [
  "index.html", "404.html", "zh/index.html", "en/index.html",
  "zh/privacy/index.html", "en/privacy/index.html",
  "assets/global.css", "assets/lang.js", "assets/feedback.js",
  "sitemap.xml", "robots.txt", "_headers", "favicon.svg"
];
for (const r of required) if (!files.some((f) => rel(f) === r)) fail(`missing ${r}`);

let jsGzip = 0;
for (const file of files) {
  const ext = extname(file);
  if ([".woff", ".woff2", ".ttf", ".otf"].includes(ext)) fail(`font file present: ${rel(file)}`);
  if (ext === ".js") jsGzip += gzipSync(readFileSync(file)).byteLength;
  if (ext === ".html") {
    const html = readFileSync(file, "utf8");
    if (/<script(?![^>]*\bsrc=)/i.test(html)) fail(`inline script in ${rel(file)}`);
    if (/<style/i.test(html)) fail(`inline style in ${rel(file)}`);
    if (/(?:src|href)="https?:\/\//i.test(html.replace(/rel="(?:canonical|alternate)"[^>]*/g, ""))) fail(`external resource in ${rel(file)}`);
  }
  if (ext === ".css" && /url\(["']?https?:/i.test(readFileSync(file, "utf8"))) fail(`external url() in ${rel(file)}`);
}
if (jsGzip > 10 * 1024) fail(`JS gzip budget exceeded: ${jsGzip}`);
console.log(JSON.stringify({ jsGzip, files: files.length }));
