import {describe,it,expect,vi} from "vitest";
import {planAcceptance,runAcceptance,checkLogCanary,type AcceptanceManifest,type Credential} from "../../scripts/vision/acceptance";
import {readFileSync} from "node:fs";
const manifest:AcceptanceManifest={schemaVersion:1,gateway:"https://myorbis.xyz",origins:{default:["https://synthetic.cn-wulanchabu.fcapp.run/api/vision/snapshot"],alias:[],version:[],custom:[],preview:[]},absentKinds:["alias","version","custom","preview"],deniedTargets:[{id:"other-function",url:"https://other.cn-wulanchabu.fcapp.run/api/vision/snapshot"},{id:"other-region",url:"https://other.ap-southeast-1.fcapp.run/api/vision/snapshot"}],privateObjects:[{id:"synthetic-object",url:"https://synthetic.oss-cn-wulanchabu.aliyuncs.com/vision-verify/access/synthetic.json"}]};
const credential=(suffix:string,expiresAt=Date.now()+600000):Credential=>({accessKeyId:"synthetic-id-"+suffix,accessKeySecret:"synthetic-secret-"+suffix,securityToken:"synthetic-token-"+suffix,expiresAt});
const credentials={allowed:credential("allowed"),wrongRole:credential("wrong"),expired:credential("expired",1)};
const snapshot=JSON.parse(readFileSync("tests/fixtures/vision/snapshot.ok.json","utf8"));
const deny=()=>Response.json({ErrorCode:"AccessDenied"},{status:403});
function validResponse(r:Request){const u=new URL(r.url);if(u.hostname==="other.cn-wulanchabu.fcapp.run"&&r.headers.get("x-acs-security-token")===credentials.wrongRole.securityToken)return Response.json(snapshot);if(u.hostname==="myorbis.xyz")return Response.json({code:"UNAUTHORIZED"},{status:401});if(u.hostname.startsWith("synthetic.cn")&&r.headers.get("x-acs-security-token")===credentials.allowed.securityToken)return Response.json(snapshot);return deny();}
describe("read-only cloud acceptance",()=>{
 it("requires an explicit complete inventory and never silently omits endpoint kinds",()=>{
  const plan=planAcceptance(manifest);expect(plan.length).toBe(10);expect(plan.every(c=>c.method==="GET")).toBe(true);
  for(const bad of [{...manifest,origins:{default:manifest.origins.default}},{...manifest,absentKinds:[]},{...manifest,privateObjects:[]},{...manifest,deniedTargets:[]}])expect(()=>planAcceptance(bad)).toThrow("acceptance configuration");
 });
 it("rejects redirect/credential/query/unsafe targets before any I/O",()=>{
  for(const url of ["http://example.com/api/vision/snapshot","https://user:secret@example.com/api/vision/snapshot","https://example.com/api/vision/snapshot?token=private","https://127.0.0.1/api/vision/snapshot","https://example.com/api/feedback"]){expect(()=>planAcceptance({...manifest,origins:{...manifest.origins,default:[url]}})).toThrow();}
 });
 it("validates credentials up front and keeps plan mode credential-free",async()=>{
  const send=vi.fn();expect(()=>planAcceptance(manifest)).not.toThrow();await expect(runAcceptance(manifest,{credentials:{...credentials,allowed:credential("bad",1)},send})).rejects.toThrow("acceptance credentials");expect(send).not.toHaveBeenCalled();
 });
 it("uses native signing for each credential case, no redirect, no response or credential output",async()=>{
  const requests:Request[]=[];const report=await runAcceptance(manifest,{credentials,send:async r=>{requests.push(r);return validResponse(r);}});
  expect(report.passed).toBe(true);expect(requests).toHaveLength(10);expect(requests.every(r=>r.method==="GET"&&r.redirect==="error")).toBe(true);
  const signed=requests.filter(r=>r.headers.has("authorization"));expect(signed).toHaveLength(7);for(const r of signed)expect(r.headers.get("authorization")).toMatch(/^ACS3-HMAC-SHA256 /);
  const text=JSON.stringify(report);expect(text).not.toContain("synthetic-secret");expect(text).not.toContain("synthetic-token");expect(text).not.toContain("Synthetic contract sample");
 });
 it("recognizes native FC unsigned authorization rejection with protocol-valid headers",async()=>{
  let anonymous:Request|undefined;
  const report=await runAcceptance(manifest,{credentials,send:async r=>{
   if(new URL(r.url).hostname==="synthetic.cn-wulanchabu.fcapp.run"&&!r.headers.has("authorization")){anonymous=r;return Response.json({Code:"InvalidArgument",Message:"invalid authorization ''"},{status:400});}
   return validResponse(r);
  }});
  expect(anonymous?.headers.get("x-acs-date")).toBeTruthy();expect(anonymous?.headers.get("x-acs-signature-nonce")).toBeTruthy();expect(report.passed).toBe(true);
 });
 it("recognizes FC RamCheckFail for signed token denials",async()=>{
  const report=await runAcceptance(manifest,{credentials,send:async r=>{
   if(new URL(r.url).hostname==="synthetic.cn-wulanchabu.fcapp.run"&&r.headers.has("authorization")&&r.headers.get("x-acs-security-token")!==credentials.allowed.securityToken)return Response.json({Code:"RamCheckFail"},{status:403});
   return validResponse(r);
  }});expect(report.passed).toBe(true);
 });
 it("does not count generic protocol errors or unrelated 400s as authentication denial",async()=>{
  for(const body of [{Code:"MissingRequiredHeader",Message:"missing x-acs-date"},{Code:"InvalidArgument",Message:"invalid path"},{Code:"OtherError",Message:"invalid authorization ''"}]){
   const report=await runAcceptance(manifest,{credentials,send:async r=>new URL(r.url).hostname==="synthetic.cn-wulanchabu.fcapp.run"&&!r.headers.has("authorization")?Response.json(body,{status:400}):validResponse(r)});expect(report.passed).toBe(false);
  }
 });
 it("does not accept an invalid wrong-role credential merely because every negative request was denied",async()=>{
  const report=await runAcceptance(manifest,{credentials,send:async r=>new URL(r.url).hostname==="other.cn-wulanchabu.fcapp.run"&&r.headers.get("x-acs-security-token")===credentials.wrongRole.securityToken?deny():validResponse(r)});expect(report.passed).toBe(false);
 });
 it("does not pass successful anonymous bypasses, redirects, unrelated denials, private data or oversized responses",async()=>{
  for(const response of [()=>Response.json(snapshot),()=>new Response(null,{status:302,headers:{location:"https://elsewhere.example"}}),()=>new Response("Forbidden",{status:403}),()=>Response.json({ErrorCode:"AccessDenied",secret:credentials.allowed.securityToken},{status:403}),()=>new Response("x".repeat(4194305),{status:403})]){
   const report=await runAcceptance(manifest,{credentials,send:async r=>new URL(r.url).hostname.includes(".oss-")?response():validResponse(r)});expect(report.passed).toBe(false);expect(report.results.filter(r=>!r.passed)).toHaveLength(1);expect(JSON.stringify(report)).not.toContain(credentials.allowed.securityToken);
  }
 });
 it("requires positive scoped log evidence and rejects markers and private fields anywhere in records",()=>{
  const runId="synthetic-run";const evidence={schemaVersion:1,runId,exportComplete:true,platformRecords:[{level:"info",message:{area:"vision",status:400,outcome:"gateway"}}],records:[{area:"vision",status:400,outcome:"gateway"}]};
  expect(checkLogCanary(evidence,runId,["synthetic-canary"])).toBe(true);
  for(const bad of [{...evidence,runId:"old-run"},{...evidence,exportComplete:false},{...evidence,records:[]},{...evidence,platformRecords:[]},{...evidence,platformRecords:[{}]},{...evidence,platformRecords:[null]},{...evidence,platformRecords:[{request:{authorization:"PRIVATE"}}]},{...evidence,records:[...evidence.records,{request:{url:"https://example.test/?cursor=synthetic-canary"}}]},{...evidence,records:[{area:"vision",status:400,outcome:"gateway",ip:"203.0.113.8"}]}])expect(checkLogCanary(bad,runId,["synthetic-canary"])).toBe(false);
 });
});
