import { describe, expect, it, vi } from "vitest";
import { normalizeTarget, TokenCodec, gateway, type GatewayPorts } from "../../src/worker/vision/gateway";
const key = btoa("synthetic-key-32-bytes-long-enough!");
const config = { publicOrigin: "https://myorbis.xyz", epoch: "synthetic-v1", key, sessionMs: 60000 };
const request = (path: string, headers: Record<string,string> = {}) => new Request("https://myorbis.xyz" + path, { headers });
describe("Vision gateway trust boundary", () => {
 it("rejects duplicate, unknown, malformed, overlong and unbounded query shapes", () => {
  for (const p of ["snapshot?lang=en&%6cang=zh", "snapshot?limit=999", "snapshot?lang=%FF", "snapshot?x=1", "changes", "cities/GB:geonames:1/extra", "snapshot/", "snapshot?lang=en&", "snapshot?lang=en%00"]) expect(() => normalizeTarget("/api/vision/" + p)).toThrow();
  expect(normalizeTarget("/api/vision/snapshot")).toEqual({ kind:"snapshot", target:"/api/vision/snapshot?lang=en", language:"en" });
 });
 it("binds HMAC tokens to kind, language, epoch and absolute expiry", async () => {
  const codec = new TokenCodec(config, () => 1000); const token = await codec.sign({ kind:"cursor", language:"en", expiresAt:2000, originToken:"opaque.original" });
  expect((await codec.verify(token,"cursor","en")).originToken).toBe("opaque.original");
  await expect(codec.verify(token+"x","cursor","en")).rejects.toThrow();
  await expect(codec.verify(token,"page","en")).rejects.toThrow();
  await expect(codec.verify(token,"cursor","zh")).rejects.toThrow();
  await expect(new TokenCodec({...config,epoch:"revoked"},()=>1000).verify(token,"cursor","en")).rejects.toMatchObject({status:409,code:"EPOCH_CHANGED"});
  await expect(new TokenCodec(config,()=>2000).verify(token,"cursor","en")).rejects.toThrow();
 });
 it("requires a valid session and admission before even a warm-cache read", async () => {
  const load=vi.fn(async()=>({status:200,body:"{}"})); const admit=vi.fn(async()=>false);
  const ports:GatewayPorts={admit,load,issue:vi.fn(),now:()=>1000};
  expect((await gateway(request("/api/vision/snapshot"),config,ports)).status).toBe(401);expect(load).not.toHaveBeenCalled();expect(admit).not.toHaveBeenCalled();
  const cookie=await new TokenCodec(config,()=>1000).sign({kind:"session",sid:"synthetic",expiresAt:2000});
  expect((await gateway(request("/api/vision/snapshot",{cookie:"__Host-vision="+cookie}),config,ports)).status).toBe(429);expect(load).not.toHaveBeenCalled();
 });
 it("rejects preview hosts, bad parameters and unissued cursors before cache or origin", async()=>{
  const load=vi.fn();const ports:GatewayPorts={load,admit:vi.fn(async()=>true),issue:vi.fn(),now:()=>1000};
  const cookie=await new TokenCodec(config,()=>1000).sign({kind:"session",sid:"synthetic",expiresAt:2000});
  for(const p of ["/api/vision/snapshot?random=abc","/api/vision/changes?cursor=random.fake"]){expect((await gateway(request(p,{cookie:"__Host-vision="+cookie}),config,ports)).status).toBe(400);}
  expect((await gateway(new Request("https://preview.workers.dev/api/vision/snapshot"),config,ports)).status).toBe(503);expect(load).not.toHaveBeenCalled();
 });
});

describe('gateway dependency failure privacy',()=>{
 it('reports a bounded failure category without returning private error details',async()=>{
  const onUnavailable=vi.fn();const now=()=>1000;const cookie=await new TokenCodec(config,now).sign({kind:'session',sid:'synthetic',expiresAt:2000});
  const ports={now,admit:async()=>true,issue:async()=>true,load:async()=>{throw new Error('SQL failure SYNTHETIC_PRIVATE_CREDENTIAL');},onUnavailable};
  const r=await gateway(request('/api/vision/snapshot',{cookie:'__Host-vision='+cookie}),config,ports);
  expect(r.status).toBe(503);expect(await r.text()).not.toContain('SYNTHETIC_PRIVATE_CREDENTIAL');expect(onUnavailable).toHaveBeenCalledWith('storage');
 });
});
