import {describe,it,expect} from "vitest";
import {experimental_readRawConfig} from "wrangler";
describe("isolated local preview",()=>{
 it("uses its own Worker and namespaces without a production route or email binding",()=>{
  const {rawConfig:c}=experimental_readRawConfig({config:"wrangler.preview.jsonc"});
  expect(c.name).toBe("orbis-web-preview-vision");expect(c.workers_dev).toBe(true);expect(c.routes).toEqual([]);
  expect(c.vars?.ORBIS_PREVIEW).toBe("true");expect(c.ratelimits??[]).toEqual([]);expect(c.send_email??[]).toEqual([]);expect(c.secrets?.required).toEqual([]);expect(c.vars?.VISION_ENABLED).toBe("false");
  expect(c.durable_objects?.bindings).toHaveLength(2);
  for(const binding of c.durable_objects!.bindings!){expect(binding.script_name).toBeUndefined();expect(binding.environment).toBeUndefined();}
  expect(c.observability?.enabled).toBe(false);expect(c.observability?.redact_query_string).toBe(true);expect(c.observability?.logs?.enabled).toBe(false);expect(c.observability?.logs?.invocation_logs).toBe(false);expect(c.observability?.traces?.enabled).toBe(false);
 });
});
