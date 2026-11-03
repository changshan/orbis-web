import {readFileSync,writeFileSync} from "node:fs";
import {planAcceptance,runAcceptance,checkLogCanary,type Credentials,type AcceptanceManifest} from "./acceptance";
import {boundedText} from "../../src/worker/vision/origin";
function read(path:string|undefined):unknown {if(!path)throw Error();const bytes=readFileSync(path);if(bytes.length>262144)throw Error();return JSON.parse(bytes.toString("utf8"));}
function output(value:unknown,path?:string){const text=JSON.stringify(value,null,2)+"\n";if(path)writeFileSync(path,text,{mode:0o600});process.stdout.write(text);}
function credential(prefix:string){const env=process.env;return {accessKeyId:env[prefix+"_ID"]??"",accessKeySecret:env[prefix+"_SECRET"]??"",securityToken:env[prefix+"_TOKEN"]??"",expiresAt:Number(env[prefix+"_EXPIRES_AT"])};}
function liveOptIn(manifest:unknown){if(process.env.ORBIS_VISION_ACCESS_ACCEPTANCE!=="read-only")throw Error();const plan=planAcceptance(manifest);if(plan.some(c=>/synthetic|replace|\.invalid\//i.test(c.url)))throw Error();}
async function main(){
 const [mode="plan",path,out]=process.argv.slice(2);
 if(mode==="logs"){
  const expected=read(out) as {runId:string;markers:string[];passed:boolean;startedAt:number;finishedAt:number};
  const evidence=read(path) as {from:number;through:number;collectedAt:number};
  const passed=expected.passed===true&&Number.isSafeInteger(evidence.from)&&evidence.from<=expected.startedAt&&Number.isSafeInteger(evidence.through)&&evidence.through>=expected.finishedAt&&Number.isSafeInteger(evidence.collectedAt)&&evidence.collectedAt>=expected.finishedAt&&evidence.through<=evidence.collectedAt&&evidence.from>0&&evidence.through-evidence.from<=300000&&checkLogCanary(evidence,expected.runId,expected.markers);
  output({schemaVersion:1,passed,runId:expected.runId,scope:"operator-supplied complete platform and application log export"},process.argv[5]);if(!passed)process.exitCode=1;return;
 }
 const manifest=read(path);const plan=planAcceptance(manifest);
 if(mode==="plan"){output({schemaVersion:1,mode:"plan",networkRequests:0,cases:plan.map(c=>({id:c.id,method:c.method,auth:c.auth,expected:c.positive?"200 + public schema":c.gateway?"401 UNAUTHORIZED":"401/403 + authentication denial code"})),inventoryCompleteness:"operator must compare with actual FC triggers, aliases, versions and domains"},out);return;}
 if(!["live","canary"].includes(mode))throw Error();liveOptIn(manifest);
 if(mode==="canary"){
  const runId=crypto.randomUUID();const markers=[runId+"-query",runId+"-cookie",runId+"-auth"];const startedAt=Date.now();let passed=false,status=0;
  try{const response=await fetch((manifest as AcceptanceManifest).gateway+"/api/vision/snapshot?lang=en&acceptanceCanary="+markers[0],{method:"GET",headers:{cookie:"__Host-vision="+markers[1],authorization:"Bearer "+markers[2]},redirect:"error",signal:AbortSignal.timeout(8000),cache:"no-store"});status=response.status;const text=await boundedText(response,16384);passed=status===400&&JSON.parse(text).code==="INVALID_ARGUMENT"&&!markers.some(m=>text.includes(m));}catch{passed=false;}
  output({schemaVersion:1,runId,syntheticOnly:true,startedAt,finishedAt:Date.now(),markers,status,passed,logsVerified:false},out);if(!passed)process.exitCode=1;return;
 }
 const credentials:Credentials={allowed:credential("VISION_VERIFY_ALLOWED"),wrongRole:credential("VISION_VERIFY_WRONG_ROLE"),expired:credential("VISION_VERIFY_EXPIRED")};
 const result=await runAcceptance(manifest,{credentials,send:request=>fetch(request)});output(result,out);if(!result.passed)process.exitCode=1;
}
main().catch(()=>{console.error("Vision acceptance stopped: invalid input, missing read-only opt-in, credentials or unavailable evidence. No response bodies or credentials are printed.");process.exitCode=1;});
