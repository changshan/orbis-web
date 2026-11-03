import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { describe,it,expect,vi } from "vitest";
import { checkPreviewPrivacy } from "../../scripts/preview-privacy";
const env={CLOUDFLARE_ACCOUNT_ID:"0".repeat(32),CLOUDFLARE_API_TOKEN:"SYNTHETIC_TEST_TOKEN"};
const current=(observability:unknown)=>vi.fn(async(_request:Request)=>Response.json({success:true,result:{observability}}));
describe("preview upload checks existing non-versioned privacy settings",()=>{
 it("runs the privacy check before the CI preview version upload",()=>{
  const workflow=parse(readFileSync(".github/workflows/web.yml","utf8")) as {jobs:{preview:{steps:{run?:string}[]}}};
  const steps=workflow.jobs.preview.steps;const check=steps.findIndex(s=>s.run==="npm run check:vision-preview");const upload=steps.findIndex(s=>s.run==="npx wrangler versions upload");
  expect(check).toBeGreaterThanOrEqual(0);expect(check).toBeLessThan(upload);
 });
 it("rejects URL-bearing logging when a version upload would inherit unsafe settings",async()=>{
  for(const settings of [undefined,{enabled:true},{enabled:true,logs:{enabled:true,invocation_logs:true}},{enabled:true,redact_query_string:true,logs:{enabled:true,invocation_logs:false},traces:{enabled:true}}])await expect(checkPreviewPrivacy(env,current(settings))).rejects.toThrow("preview privacy");
 });
 it("accepts explicitly disabled collection or redacted custom logs without traces/invocation logs",async()=>{
  for(const settings of [{enabled:true,logs:{enabled:false},traces:{enabled:false}},{enabled:true,redact_query_string:true,logs:{enabled:true,invocation_logs:false},traces:{enabled:false}}]){
   const send=current(settings);await expect(checkPreviewPrivacy(env,send)).resolves.toBeUndefined();
   const request=send.mock.calls[0]![0] as Request;expect(request.url).toBe("https://api.cloudflare.com/client/v4/accounts/"+env.CLOUDFLARE_ACCOUNT_ID+"/workers/scripts/orbis-web/settings");expect(request.method).toBe("GET");expect(request.redirect).toBe("error");
  }
 });
 it("fails closed for missing identity, API failure and oversized metadata",async()=>{
  const send=vi.fn();await expect(checkPreviewPrivacy({},send)).rejects.toThrow("preview privacy");expect(send).not.toHaveBeenCalled();
  for(const response of [new Response("PRIVATE_API_ERROR",{status:403}),Response.json({success:false}),new Response("x".repeat(262145))])await expect(checkPreviewPrivacy(env,async()=>response)).rejects.toThrow("preview privacy");
 });
});
