// Regenerate only from the canonical Orbis shared contract; never edit output.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { parse } from "yaml";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standalone from "ajv/dist/standalone/index.js";
const input = process.argv[2];
if (!input) throw new Error("Pass canonical shared/vision/openapi.yaml");
const bytes = readFileSync(input);
const document = parse(bytes.toString(), { maxAliasCount: 100000 });
const names = ["SnapshotResponse", "ChangesResponse", "CityResponse", "MapResponse", "FeedResponse", "VisionError", "PlaceKey"];
const defs: Record<string, unknown> = {};
function visit(name: string) {
  if (name in defs) return;
  const schema = document.components.schemas[name];
  if (!schema) throw new Error("Unknown schema reference");
  defs[name] = schema;
  for (const match of JSON.stringify(schema).matchAll(/#\/components\/schemas\/([A-Za-z0-9]+)/g)) visit(match[1]!);
}
names.forEach(visit);
if ("EventPayload" in defs || "SourceRecord" in defs) throw new Error("Private contract leaked into gateway");
const schema = JSON.parse(JSON.stringify({ $id: "vision-public", $defs: defs }).replaceAll("#/components/schemas/", "#/$defs/"));
const ajv = new Ajv({ strict: false, allowUnionTypes: true, code: { source: true }, allErrors: false });
addFormats(ajv); ajv.addSchema(schema);
const refs = Object.fromEntries(names.map(n => [n, "vision-public#/$defs/" + n]));
const hash = createHash("sha256").update(bytes).digest("hex");
writeFileSync("src/worker/vision/contract.generated.cjs", "// Generated from Orbis shared/vision/openapi.yaml SHA256 " + hash + "\n" + standalone(ajv, refs));
writeFileSync("src/worker/vision/contract.generated.d.cts", names.map(n => "export function " + n + "(value: unknown): boolean;").join("\n") + "\n");
writeFileSync("src/worker/vision/contract-version.ts", "// Generated canonical contract identity.\nexport const contractHash = " + JSON.stringify(hash) + ";\n");
