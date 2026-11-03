/** Real local workerd + SQLite; synthetic outbound only. No target URL or credentials accepted. */
import {Miniflare,convertV4MiniflareOptions,Response as FixtureResponse,Log,LogLevel} from "miniflare";
import {execFileSync} from "node:child_process";
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {performance} from "node:perf_hooks";
import assert from "node:assert/strict";
const root=mkdtempSync(join(tmpdir(),"orbis-vision-recovery-"));
// Use the same official bundler/polyfills as deployment, not a simplified esbuild surrogate.
writeFileSync(join(root,"wrangler.jsonc"),JSON.stringify({name:"orbis-recovery-fixture",main:join(process.cwd(),"tests/runtime/vision-recovery-entry.ts"),compatibility_date:"2026-07-20",compatibility_flags:["nodejs_compat"],observability:{enabled:false},durable_objects:{bindings:[{name:"VISION_QUOTA",class_name:"VisionQuota"},{name:"VISION_CACHE",class_name:"VisionCacheShard"}]},migrations:[{tag:"fixture-v1",new_sqlite_classes:["VisionQuota","VisionCacheShard"]}]}));
execFileSync(process.execPath,["node_modules/wrangler/bin/wrangler.js","deploy","--dry-run","--config",join(root,"wrangler.jsonc"),"--outdir",join(root,"bundle")],{env:{...process.env,WRANGLER_SEND_METRICS:"false"},stdio:["ignore","pipe","pipe"]});
const source=readFileSync(join(root,"bundle","vision-recovery-entry.js"),"utf8");
const origin="https://synthetic.cn-wulanchabu.fcapp.run";
const limits={requestPerMinute:100000,sessionTotal:100000,ipPerMinute:100000,mintPerMinute:1000,mintPerDay:10000,mintIpPerMinute:100,challengeAfter:99,sessionMs:900000,originPerMinute:1000,originPerDay:10000,originConcurrent:8,originTimeoutMs:1000,breakerFailures:2,breakerCooldownMs:1000,cacheTtlMs:10000,tailTtlMs:1000,cacheEntries:2,cacheBytes:50000,maxResponseBytes:100000,maxQuotaKeys:10000};
let requestCount=0,originCount=0,active=0,maxActive=0,mode:"ok"|"fail"|"timeout"|"slow"="ok";let cookie="";
const results:{name:string;passed:boolean;ms:number}[]=[];
const fixture=(name:string)=>JSON.parse(readFileSync("tests/fixtures/vision/"+name+".json","utf8"));
function start(){
 return new Miniflare(convertV4MiniflareOptions({name:"orbis-recovery-fixture",modules:true,script:source,compatibilityDate:"2026-07-20",compatibilityFlags:["nodejs_compat"],resourcePersistencePath:root,log:new Log(LogLevel.NONE),bindings:{VISION_ENABLED:"true",VISION_PUBLIC_ORIGIN:"https://myorbis.xyz",VISION_CN_ORIGIN:origin+"/",VISION_LIMITS:JSON.stringify(limits),VISION_SESSION_EPOCH:"synthetic-recovery",VISION_GATEWAY_KEY:Buffer.from("synthetic-key-32-bytes-long-enough!").toString("base64"),VISION_TURNSTILE_SECRET:"synthetic-secret",VISION_FC_ACCESS_KEY_ID:"synthetic-id",VISION_FC_ACCESS_KEY_SECRET:"synthetic-secret",VISION_FC_SECURITY_TOKEN:"synthetic-token",VISION_FC_CREDENTIALS_EXPIRE_AT:String(Date.now()+900000)},durableObjects:{VISION_QUOTA:{className:"VisionQuota",useSQLite:true},VISION_CACHE:{className:"VisionCacheShard",useSQLite:true}},outboundService:async req=>{
  const url=new URL(req.url);assert.equal(url.origin,origin);originCount++;active++;maxActive=Math.max(maxActive,active);
  const current=mode;
  try{
   await new Promise(resolve=>setTimeout(resolve,current==="timeout"?250:current==="slow"?150:15));
   if(current==="fail")return new FixtureResponse("synthetic failure",{status:500});
   const body=fixture(url.pathname.includes("/cities/")?"city.ok":url.pathname.endsWith("changes")?"changes.ok":"snapshot.ok");
   const cursor=Buffer.from(JSON.stringify({expiresAt:Date.now()+600000})).toString("base64url")+".synthetic-signature";
   if("resumeCursor" in body)body.resumeCursor=cursor;if("nextCursor" in body){body.nextCursor=cursor;body.hasMore=false;}
   return FixtureResponse.json(body);
  }finally{active--;}
 }}));
}
let mf=start();
async function send(path:string){requestCount++;return mf.dispatchFetch("https://myorbis.xyz"+path,{headers:{"cf-connecting-ip":"203.0.113.20",...(cookie?{cookie}:{})}});}
async function read(path:string){const r=await send(path);await r.arrayBuffer();return r.status;}
async function check(name:string,run:()=>Promise<void>){const t=performance.now();await run();results.push({name,passed:true,ms:Math.round(performance.now()-t)});}
async function restart(){await mf.dispose();mf=start();await mf.ready;}
function sameShardCities(count:number){const groups=new Map<number,string[]>();for(let i=1;i<10000;i++){const path="/api/vision/cities/GB%3Ageonames%3A"+i+"?lang=en";const shard=parseInt(createHash("sha256").update(origin+"/|"+path).digest("hex").slice(0,2),16)%32;const group=groups.get(shard)??[];group.push(path);groups.set(shard,group);if(group.length===count)return group;}throw Error("fixture keys");}
const snapshot="/api/vision/snapshot?lang=en";
let baseline:Record<string,unknown>={};
try{
 await mf.ready;
 const session=await mf.dispatchFetch("https://myorbis.xyz/api/vision/session",{method:"POST",headers:{origin:"https://myorbis.xyz","content-type":"application/json","cf-connecting-ip":"203.0.113.20"},body:"{}"});assert.equal(session.status,200);cookie=session.headers.get("set-cookie")!.split(";")[0]!;await session.arrayBuffer();
 await check("32 same-key cold readers share one actual origin fill",async()=>{const before=originCount;assert((await Promise.all(Array.from({length:32},()=>read(snapshot)))).every(s=>s===200));assert.equal(originCount-before,1);});
 await check("sustained warm-cache load remains bounded",async()=>{
  const times:number[]=[];const statuses:Record<number,number>={};const before=originCount,t0=performance.now();let completed=0,issued=0;
  await Promise.all(Array.from({length:16},async()=>{while(issued++<16384&&(completed<1024||performance.now()-t0<3000)){const t=performance.now(),status=await read(snapshot);times.push(performance.now()-t);statuses[status]=(statuses[status]??0)+1;completed++;}}));
  times.sort((a,b)=>a-b);const elapsed=performance.now()-t0;assert(elapsed>=3000,"fixture cap reached before the target duration; baseline incomplete");assert.equal(statuses[200],completed);assert(originCount-before<=1);
  baseline={requests:completed,targetDurationMs:3000,concurrency:16,elapsedMs:Math.round(elapsed),requestsPerSecond:Math.round(completed/elapsed*1000),p50Ms:+times[Math.floor(times.length*.5)]!.toFixed(2),p95Ms:+times[Math.floor(times.length*.95)]!.toFixed(2),p99Ms:+times[Math.floor(times.length*.99)]!.toFixed(2),originRequests:originCount-before,statuses,productionCapacityClaim:false};
 });
 await check("LRU eviction is enforced within one durable shard",async()=>{const [a,b,c]=sameShardCities(3) as [string,string,string];const before=originCount;for(const key of [a,b,a,c,b])assert.equal(await read(key),200);assert.equal(originCount-before,4);});
 await check("cache and quota counters survive a full workerd process restart",async()=>{assert.equal(await (await send("/__fixture/take")).json(),true);await read(snapshot);const before=originCount;await restart();assert.equal(await (await send("/__fixture/take")).json(),false);assert.equal(await read(snapshot),200);assert.equal(originCount,before);});
 await check("distinct cold-key burst obeys the shared global concurrency budget",async()=>{
  limits.originConcurrent=2;await restart();mode="slow";const before=originCount;const statuses=await Promise.all(Array.from({length:32},(_,i)=>read("/api/vision/cities/GB:geonames:"+(80000+i))));assert.equal(originCount-before,2);assert.equal(statuses.filter(s=>s===200).length,2);assert(statuses.includes(429));assert(maxActive<=2);mode="ok";limits.originConcurrent=8;
 });
 await check("tail cache expires earlier without extending warm snapshot TTL",async()=>{limits.tailTtlMs=80;limits.cacheTtlMs=2000;await restart();const response=await send(snapshot);const body=await response.json() as {resumeCursor:string};const path="/api/vision/changes?lang=en&cursor="+body.resumeCursor;const before=originCount;assert.equal(await read(path),200);await new Promise(r=>setTimeout(r,120));assert.equal(await read(path),200);assert.equal(originCount-before,2);const filled=originCount;assert.equal(await read(snapshot),200);assert.equal(originCount,filled);});
 await check("received failures persist an open breaker across restart and recover through one half-open probe",async()=>{
  limits.breakerCooldownMs=1000;await restart();mode="fail";for(const id of [90001,90002])assert.equal(await read("/api/vision/cities/GB:geonames:"+id),503);
  const before=originCount;await restart();assert.equal(await read("/api/vision/cities/GB:geonames:90003"),503);assert.equal(originCount,before);
  await new Promise(r=>setTimeout(r,1050));mode="ok";const values=await Promise.all(Array.from({length:8},(_,i)=>read("/api/vision/cities/GB:geonames:"+(91000+i))));assert.equal(originCount-before,1);assert(values.includes(200));assert(values.some(s=>s===503));assert.equal(await read("/api/vision/cities/GB:geonames:92000"),200);
 });
 await check("origin timeout fails closed and preserves its uncertain concurrency lease across restart",async()=>{
  limits.originTimeoutMs=50;limits.originConcurrent=1;limits.breakerFailures=10;await restart();mode="timeout";const t=performance.now();assert.equal(await read("/api/vision/cities/GB:geonames:99000"),503);assert(performance.now()-t<1000);const before=originCount;await restart();mode="ok";assert.equal(await read("/api/vision/cities/GB:geonames:99001"),429);assert.equal(originCount,before);
 });
 const output={passed:true,environment:"local workerd + persistent SQLite",realCloudRequests:false,syntheticOnly:true,cases:results.length,results,baseline,totalRequests:requestCount,totalOriginRequests:originCount,maxConcurrentSyntheticOrigins:maxActive,productionThresholdsChosen:false};
 if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(output,null,2)+"\n");console.log(JSON.stringify(output));
}finally{await mf.dispose();rmSync(root,{recursive:true,force:true});}
