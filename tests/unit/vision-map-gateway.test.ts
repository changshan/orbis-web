import {readFileSync} from "node:fs";
import {describe,it,expect,vi} from "vitest";
import {normalizeTarget,TokenCodec,gateway} from "../../src/worker/vision/gateway";
import {fetchOrigin} from "../../src/worker/vision/origin";
import type {Settings} from "../../src/worker/vision/config";
const fixture=(name:string)=>JSON.parse(readFileSync(`tests/fixtures/vision/${name}.json`,"utf8"));
const config={publicOrigin:"https://myorbis.xyz",epoch:"synthetic-map",key:btoa("synthetic-key-32-bytes-long-enough!"),sessionMs:60000};
describe("dynamic map gateway boundary",()=>{
 it("normalizes only bounded viewport, filter, search and cursor parameters",()=>{
  expect(normalizeTarget("/api/vision/map?view=0%2F0%2F0%2F1%2F1&lang=zh&hazard=futureHazard")).toMatchObject({kind:"map",language:"zh"});
  expect(normalizeTarget("/api/vision/feed?query=London&lang=en")).toMatchObject({kind:"feed",language:"en"});
  for(const path of ["map?view=17/0/0/1/1","map?view=1/0/1/1/2","map?view=0/0/0/1/1&view=0/0/0/1/1","map?archive=secret","feed?query="+"x".repeat(65),"map?hazard=bad%2Ffilter"])
   expect(()=>normalizeTarget("/api/vision/"+path)).toThrow();
 });
 it("validates the new public map and feed responses before returning origin data",async()=>{
  const c={origin:"https://synthetic.cn-wulanchabu.fcapp.run/",accessKeyId:"synthetic",accessKeySecret:"synthetic",securityToken:"synthetic",credentialsExpireAt:Date.now()+600000,limits:{originTimeoutMs:100,maxResponseBytes:100000}} as Settings;
  for(const kind of ["map","feed"]as const){
   const target={kind,target:"/api/vision/"+kind+"?lang=en",language:"en"};
   expect((await fetchOrigin(c,target as any,async()=>Response.json(fixture(kind+".ok")))).status).toBe(200);
   const invalid=fixture(kind+".ok");invalid.privateArchive="must reject";
   await expect(fetchOrigin(c,target as any,async()=>Response.json(invalid))).rejects.toThrow();
  }
 });
 it("unwraps map cursors only after kind and language authentication",async()=>{
  const now=()=>1000,codec=new TokenCodec(config,now);
  const cookie=await codec.sign({kind:"session",sid:"synthetic",expiresAt:2000});
  const cursor=await codec.sign({kind:"map",language:"en",expiresAt:2000,originToken:"synthetic.origin"});
  const load=vi.fn(async(target:any)=>{expect(target.target).toContain("cursor=synthetic.origin");return {status:503,body:'{"code":"UNAVAILABLE"}'};});
  const ports={now,load,issue:async()=>true,admit:async()=>true};
  const request=(p:string)=>new Request("https://myorbis.xyz"+p,{headers:{cookie:"__Host-vision="+cookie}});
  expect((await gateway(request("/api/vision/map?cursor="+cursor),config,ports)).status).toBe(503);expect(load).toHaveBeenCalledOnce();
  expect((await gateway(request("/api/vision/feed?lang=zh&cursor="+cursor),config,ports)).status).toBe(400);expect(load).toHaveBeenCalledOnce();
 });
});
