import { readFileSync } from "node:fs";
import { describe,expect,it,vi } from "vitest";
import { fetchOrigin } from "../../src/worker/vision/origin";
import type { Settings } from "../../src/worker/vision/config";
const fixture=JSON.parse(readFileSync("tests/fixtures/vision/snapshot.ok.json","utf8"));
const config={origin:"https://synthetic.cn-wulanchabu.fcapp.run/",accessKeyId:"synthetic-id",accessKeySecret:"synthetic-secret",securityToken:"synthetic-sts",credentialsExpireAt:Date.now()+600000,limits:{originTimeoutMs:100,maxResponseBytes:100000}} as Settings;
const target={kind:"snapshot" as const,target:"/api/vision/snapshot?lang=en",language:"en"};
describe("Vision signed origin boundary",()=>{
 it("uses the official ACS3 SDK, fixed GET origin and STS without forwarding browser credentials",async()=>{
  const send=vi.fn(async(r:Request)=>{expect(r.method).toBe("GET");expect(r.url).toBe(config.origin.slice(0,-1)+target.target);expect(r.redirect).toBe("manual");expect(r.headers.get("authorization")).toMatch(/^ACS3-HMAC-SHA256 /);expect(r.headers.get("x-acs-security-token")).toBe("synthetic-sts");expect(r.headers.has("cookie")).toBe(false);return Response.json(fixture);});
  expect((await fetchOrigin(config,target,send)).status).toBe(200);expect(send).toHaveBeenCalledTimes(1);
 });
 it("rejects private fields, redirects and oversized/chunked origin responses",async()=>{
  const privateBody={...fixture,payloadRef:"private-internal"};
  for(const response of [Response.json(privateBody),new Response(null,{status:302,headers:{location:"https://example.invalid"}}),new Response("x".repeat(100001)),new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(60000));c.enqueue(new Uint8Array(60000));c.close();}}))])await expect(fetchOrigin(config,target,async()=>response)).rejects.toThrow();
 });
 it("never sends an origin request with expired STS configuration",async()=>{const send=vi.fn();await expect(fetchOrigin({...config,credentialsExpireAt:0},target,send)).rejects.toThrow();expect(send).not.toHaveBeenCalled();});
});

it('logs only bounded schema coordinates when rejecting a malformed city',async()=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});const invalid=structuredClone(fixture);invalid.cities[0].name.text='';
 try{await expect(fetchOrigin(config,target,async()=>Response.json(invalid))).rejects.toThrow();expect(warn).toHaveBeenCalledWith(JSON.stringify({area:'vision',status:503,outcome:'contract_city_text_minLength'}));}
 finally{warn.mockRestore();}
});


it('normalizes only the recognized FC capacity rejection without exposing its envelope',async()=>{
 const response=await fetchOrigin(config,target,async()=>Response.json({Code:'ResourceExhausted',Message:'synthetic internal platform message',RequestId:'synthetic-request'}, {status:429,headers:{'x-fc-error-type':'FCCommonError'}}));
 expect(response.status).toBe(429);const body=JSON.parse(response.body);expect(body.code).toBe('RATE_LIMITED');expect(body.retryAfterSeconds).toBe(1);expect(response.body).not.toContain('synthetic internal');expect(response.body).not.toContain('synthetic-request');
});
it('does not normalize arbitrary upstream errors or private fields as capacity rejections',async()=>{
 for(const body of [{Code:'Unexpected',Message:'synthetic',RequestId:'synthetic'},{Code:'ResourceExhausted',Message:'synthetic',RequestId:'synthetic',privateValue:'must reject'}])await expect(fetchOrigin(config,target,async()=>Response.json(body,{status:429,headers:{'x-fc-error-type':'FCCommonError'}}))).rejects.toThrow();
});
