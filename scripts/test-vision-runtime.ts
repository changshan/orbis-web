// Fully local workerd/SQLite test. All outbound requests terminate in the fixture handler.
import { Miniflare,convertV4MiniflareOptions,Response as SimulatorResponse } from "miniflare";
import { readFileSync,writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const bundle=process.argv[2];if(!bundle)throw new Error("Pass Wrangler dry-run entry.js");
const source=readFileSync(bundle,"utf8");const results:string[]=[];let origins=0,verifications=0,issuances=0;const assumeMode=process.argv[4]==="assume-role";let mode="ok";
const original=(kind:string)=>Buffer.from(JSON.stringify({kind,expiresAt:Date.now()+600000})).toString("base64url")+".synthetic-signature";
const fixture=(name:string)=>JSON.parse(readFileSync("tests/fixtures/vision/"+name+".json","utf8"));
const limits={requestPerMinute:100,sessionTotal:1000,ipPerMinute:1000,mintPerMinute:100,mintPerDay:1000,mintIpPerMinute:20,challengeAfter:1,sessionMs:60000,originPerMinute:100,originPerDay:1000,originConcurrent:2,originTimeoutMs:1000,breakerFailures:2,breakerCooldownMs:1000,cacheTtlMs:2000,tailTtlMs:500,cacheEntries:4,cacheBytes:100000,maxResponseBytes:100000,maxQuotaKeys:1000};
const bindings={VISION_ENABLED:"true",VISION_PUBLIC_ORIGIN:"https://myorbis.xyz",VISION_CN_ORIGIN:"https://synthetic.cn-wulanchabu.fcapp.run/",VISION_LIMITS:JSON.stringify(limits),VISION_SESSION_EPOCH:"synthetic-test",VISION_GATEWAY_KEY:Buffer.from("synthetic-key-32-bytes-long-enough!").toString("base64"),VISION_TURNSTILE_SECRET:"synthetic-secret",VISION_FC_ACCESS_KEY_ID:"synthetic-id",VISION_FC_ACCESS_KEY_SECRET:"synthetic-key",VISION_FC_SECURITY_TOKEN:"synthetic-sts",VISION_FC_CREDENTIALS_EXPIRE_AT:String(Date.now()+600000)};
if(assumeMode)Object.assign(bindings,{VISION_CREDENTIAL_MODE:"assume-role",VISION_FC_ROLE_ARN:"acs:ram::1234567890123456:role/orbis-vision-gateway",VISION_STS_ACCESS_KEY_ID:"synthetic-bootstrap-id",VISION_STS_ACCESS_KEY_SECRET:"synthetic-bootstrap-secret"});
const used=new Set<string>();
const mf=new Miniflare(convertV4MiniflareOptions({name:"orbis-web",modules:true,script:source,compatibilityDate:"2026-07-20",compatibilityFlags:["nodejs_compat"],bindings,durableObjects:{VISION_QUOTA:{className:"VisionQuota",useSQLite:true},VISION_CACHE:{className:"VisionCacheShard",useSQLite:true}},outboundService:async req=>{
 const url=new URL(req.url);
 if(url.hostname==="sts.cn-hangzhou.aliyuncs.com"){
  issuances++;assert.equal(req.method,"POST");assert(req.headers.get("authorization")||url.searchParams.has("Signature"));assert.equal(url.searchParams.get("RoleArn"),"acs:ram::1234567890123456:role/orbis-vision-gateway");assert.equal(url.searchParams.get("DurationSeconds"),"900");
  return SimulatorResponse.json({RequestId:"synthetic-request",Credentials:{AccessKeyId:"synthetic-id",AccessKeySecret:"synthetic-key",SecurityToken:"synthetic-sts",Expiration:new Date(Date.now()+(issuances===1?60000:900000)).toISOString()}});
 }
 if(url.hostname==="challenges.cloudflare.com"){
  verifications++;const input=await req.json() as {response:string};const ok=!used.has(input.response);used.add(input.response);
  return SimulatorResponse.json({success:ok,hostname:input.response==="wrong-host"?"other.example":"myorbis.xyz",action:input.response==="wrong-action"?"other":"vision_session",challenge_ts:new Date(input.response==="stale"?Date.now()-400000:Date.now()).toISOString()});
 }
 assert.equal(url.origin,bindings.VISION_CN_ORIGIN.slice(0,-1));origins++;
 assert.match(req.headers.get("authorization")??"",/^ACS3-HMAC-SHA256 /);assert.equal(req.headers.get("x-acs-security-token"),"synthetic-sts");assert.equal(req.headers.has("cookie"),false);
 await new Promise(resolve=>setTimeout(resolve,30));
 if(mode==="bad")return SimulatorResponse.json({...fixture("city.ok"),payloadRef:"synthetic-private-field"});
 if(url.pathname==="/api/vision/changes"){const body=fixture("changes.ok");body.nextCursor=original("changes");return SimulatorResponse.json(body);}
 const body=fixture("snapshot.ok");body.resumeCursor=original("changes");return SimulatorResponse.json(body);
}}));
const send=(path:string,cookie?:string,extra:Record<string,string>={})=>mf.dispatchFetch("https://myorbis.xyz"+path,{headers:{"cf-connecting-ip":"203.0.113.8",...(cookie?{cookie}:{}),...extra}});
const mint=(token?:string)=>mf.dispatchFetch("https://myorbis.xyz/api/vision/session",{method:"POST",headers:{"origin":"https://myorbis.xyz","content-type":"application/json","cf-connecting-ip":"203.0.113.8"},body:JSON.stringify(token?{token}:{})});
async function check(name:string,run:()=>Promise<void>){await run();results.push(name);}
try{
 await check("unauthenticated reads never reach origin",async()=>{assert.equal((await send("/api/vision/snapshot")).status,401);assert.equal(origins,0);});
 let cookie="";
 await check("normal short session has secure noncacheable cookie",async()=>{const response=await mint();assert.equal(response.status,200);const value=response.headers.get("set-cookie")!;assert.match(value,/HttpOnly; Secure; SameSite=Strict/);assert.equal(response.headers.get("cache-control"),"no-store");cookie=value.split(";")[0]!;});
 await check("same-key concurrent cold reads coalesce across durable shard",async()=>{const values=await Promise.all(Array.from({length:12},()=>send("/api/vision/snapshot",cookie)));assert(values.every(r=>r.status===200));assert.equal(origins,1);});
 await check("cached response still rejects missing or bad sessions",async()=>{assert.equal((await send("/api/vision/snapshot")).status,401);assert.equal((await send("/api/vision/snapshot",cookie+"x")).status,401);assert.equal(origins,1);});
 await check("raw duplicates and forged cursors fail before origin",async()=>{assert.equal((await send("/api/vision/snapshot?lang=en&%6cang=zh",cookie)).status,400);assert.equal((await send("/api/vision/changes?cursor=forged.fake",cookie)).status,400);assert.equal(origins,1);});
 await check("gateway cursors unwrap for signed CN request",async()=>{const snapshot=await (await send("/api/vision/snapshot",cookie)).json() as {resumeCursor:string};assert.match(snapshot.resumeCursor,/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);assert.equal((await send("/api/vision/changes?cursor="+snapshot.resumeCursor,cookie)).status,200);assert.equal(origins,2);});
 await check("suspicious session creation requires challenge",async()=>{assert.equal((await mint()).status,403);assert.equal(verifications,0);});
 await check("hostname, action, freshness and single-use checks",async()=>{for(const token of ["wrong-host","wrong-action","stale"])assert.equal((await mint(token)).status,403);assert.equal((await mint("valid-token")).status,200);assert.equal((await mint("valid-token")).status,403);});
 await check("preview host cannot reach shared public cache",async()=>{assert.equal((await mf.dispatchFetch("https://preview.workers.dev/api/vision/snapshot",{headers:{cookie,"cf-connecting-ip":"203.0.113.8"}})).status,503);assert.equal(origins,2);});
 await check("malformed session input fails before challenge services",async()=>{const before=verifications;const response=await mf.dispatchFetch("https://myorbis.xyz/api/vision/session",{method:"POST",headers:{origin:"https://myorbis.xyz","content-type":"application/json","cf-connecting-ip":"203.0.113.8"},body:"{"});assert.equal(response.status,400);assert.equal(verifications,before);});
 await check("private origin fields are rejected and not cached",async()=>{mode="bad";for(const key of ["1","2"])assert.equal((await send("/api/vision/cities/GB:geonames:"+key,cookie)).status,503);assert.equal(origins,4);});
 await check("persistent breaker blocks more expensive origin reads",async()=>{assert.equal((await send("/api/vision/cities/GB:geonames:3",cookie)).status,503);assert.equal(origins,4);});
 await check("session rate limits apply before a warm shared-cache response",async()=>{assert.equal((await send("/api/vision/snapshot",cookie)).status,200);const before=origins;const burst=await Promise.all(Array.from({length:101},()=>send("/api/vision/snapshot",cookie)));assert(burst.some(r=>r.status===429));assert.equal(origins,before);});
 if(assumeMode)await check("official STS SDK issues once, renews near expiry and shares credentials across origin fills",async()=>{assert.equal(issuances,2);});
 const output={stsIssuances:issuances,credentialMode:assumeMode?"assume-role":"fixed",passed:true,cases:results.length,results,originRequests:origins,siteverifyRequests:verifications,realCloudRequests:false};console.log(JSON.stringify(output));if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(output,null,2)+"\n");
}finally{await mf.dispose();}
