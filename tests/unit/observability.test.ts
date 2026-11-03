import { describe,it,expect } from "vitest";
import { experimental_readRawConfig } from "wrangler";
describe("private Worker observability configuration",()=>{
 it("sends native query redaction while keeping platform collection closed pending a live canary",()=>{
  const {rawConfig}=experimental_readRawConfig({config:"wrangler.jsonc"});
  expect(rawConfig.observability?.redact_query_string).toBe(true);
  expect(rawConfig.observability?.logs?.enabled).toBe(false);
  expect(rawConfig.observability?.logs?.invocation_logs).toBe(false);
  expect(rawConfig.observability?.traces?.enabled).toBe(false);
 });
});
