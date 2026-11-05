import {Request as TeaRequest} from "@alicloud/tea-typescript";
import {getAuthorization} from "../../src/worker/vision/aliyun-sign.cjs";
import {SnapshotResponse} from "../../src/worker/vision/contract.generated.cjs";
import {boundedText} from "../../src/worker/vision/origin";
export const endpointKinds=["default","alias","version","custom","preview"] as const;
type Kind=typeof endpointKinds[number];
export interface AcceptanceManifest {schemaVersion:1;gateway:string;origins:Record<Kind,string[]>;absentKinds:Kind[];deniedTargets:{id:"other-function"|"other-region";url:string}[];privateObjects:{id:string;url:string}[];}
export interface Credential {accessKeyId:string;accessKeySecret:string;securityToken:string;expiresAt:number;}
export interface Credentials {allowed:Credential;wrongRole:Credential;expired:Credential;}
type Auth="none"|"allowed"|"wrongRole"|"expired"|"missingToken";
interface Case {id:string;url:string;method:"GET";auth:Auth;positive:boolean;gateway?:boolean;}
const invalid=()=>new Error("acceptance configuration invalid");
function target(value:string,readEndpoint:boolean):URL{
 let u:URL;try{u=new URL(value);}catch{throw invalid();}
 if(u.protocol!=="https:"||u.username||u.password||u.port||u.search||u.hash||u.hostname==="localhost"||u.hostname.endsWith(".localhost")||u.hostname.includes(":")||/^\d+(\.\d+){3}$/.test(u.hostname)||u.hostname.endsWith(".internal")||/[\x00-\x20]/.test(value))throw invalid();
 if(readEndpoint&&!u.pathname.endsWith("/api/vision/snapshot"))throw invalid();return u;
}
export function planAcceptance(input:unknown):Case[]{
 const m=input as AcceptanceManifest;
 if(!m||m.schemaVersion!==1||m.gateway!=="https://myorbis.xyz"||!m.origins||!Array.isArray(m.absentKinds)||!Array.isArray(m.deniedTargets)||!Array.isArray(m.privateObjects)||m.privateObjects.length<1||m.privateObjects.length>8)throw invalid();
 if(Object.keys(m.origins).length!==5||m.absentKinds.some(k=>!endpointKinds.includes(k))||new Set(m.absentKinds).size!==m.absentKinds.length)throw invalid();
 const cases:Case[]=[{id:"gateway-anonymous",url:m.gateway+"/api/vision/snapshot?lang=en",method:"GET",auth:"none",positive:false,gateway:true}];const seen=new Set<string>();
 for(const kind of endpointKinds){const urls=m.origins[kind];if(!Array.isArray(urls)||urls.length>16||(urls.length===0)!==m.absentKinds.includes(kind)||kind==="default"&&!urls.length)throw invalid();
  for(const [i,url] of urls.entries()){target(url,true);if(seen.has(url))throw invalid();seen.add(url);
   for(const auth of ["none","allowed","wrongRole","expired","missingToken"] as const)cases.push({id:kind+"-"+i+"-"+auth,url,method:"GET",auth,positive:auth==="allowed"});
  }
 }
 if(m.deniedTargets.length!==2||new Set(m.deniedTargets.map(v=>v.id)).size!==2||m.deniedTargets.some(v=>!["other-function","other-region"].includes(v.id)))throw invalid();
 for(const v of m.deniedTargets){target(v.url,true);if(seen.has(v.url))throw invalid();seen.add(v.url);cases.push({id:v.id,url:v.url,method:"GET",auth:"allowed",positive:false});}
 const control=m.deniedTargets.find(v=>v.id==="other-function")!;
 cases.push({id:"wrong-role-positive-control",url:control.url,method:"GET",auth:"wrongRole",positive:true});
 for(const v of m.privateObjects){const u=target(v.url,false);if(!/^[a-zA-Z0-9_-]{1,64}$/.test(v.id)||!u.hostname.endsWith(".aliyuncs.com")||!u.hostname.includes(".oss-")||!u.pathname.startsWith("/vision-verify/")||seen.has(v.url))throw invalid();seen.add(v.url);cases.push({id:"oss-anonymous-"+v.id,url:v.url,method:"GET",auth:"none",positive:false});}
 return cases;
}
function validateCredentials(c:Credentials,now:number){
 for(const key of ["allowed","wrongRole","expired"] as const){const v=c?.[key];if(!v||![v.accessKeyId,v.accessKeySecret,v.securityToken].every(s=>typeof s==="string"&&s.length>=8&&s.length<=4096)||!Number.isSafeInteger(v.expiresAt)||(key==="expired"?v.expiresAt>=now:v.expiresAt<=now+30000))throw Error("acceptance credentials invalid");}
 if(c.allowed.securityToken===c.wrongRole.securityToken||c.allowed.accessKeyId===c.wrongRole.accessKeyId)throw Error("acceptance credentials invalid");
}
function requestFor(c:Case,credentials:Credentials):Request{
 const url=new URL(c.url);const headers:Record<string,string>={};
 // Native FC requires these protocol headers even when Authorization is deliberately absent.
 if(!c.gateway&&!c.id.startsWith("oss-anonymous-"))Object.assign(headers,{host:url.host,"x-acs-date":new Date().toISOString(),"x-acs-signature-nonce":crypto.randomUUID()});
 if(c.auth!=="none"){
  const credential=credentials[c.auth==="missingToken"?"allowed":c.auth];
  Object.assign(headers,{host:url.host,"x-acs-date":new Date().toISOString(),"x-acs-signature-nonce":crypto.randomUUID()});if(c.auth!=="missingToken")headers["x-acs-security-token"]=credential.securityToken;
  const request=Object.assign(new TeaRequest(),{method:"GET",pathname:url.pathname,headers,query:Object.fromEntries(url.searchParams)});
  headers.authorization=getAuthorization(request,"ACS3-HMAC-SHA256","",credential.accessKeyId,credential.accessKeySecret);
 }
 return new Request(url,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(8000),cache:"no-store"});
}
export async function runAcceptance(manifest:unknown,ports:{credentials:Credentials;send:(request:Request)=>Promise<Response>}){
 const plan=planAcceptance(manifest);validateCredentials(ports.credentials,Date.now());
 const secrets=Object.values(ports.credentials).flatMap(c=>[c.accessKeyId,c.accessKeySecret,c.securityToken]);
 const results:{id:string;status:number;passed:boolean;reason:string}[]=[];
 for(const c of plan){let status=0;try{
  const response=await ports.send(requestFor(c,ports.credentials));status=response.status;const text=await boundedText(response,4194304);
  if(secrets.some(secret=>text.includes(secret)))throw Error();
  let passed=false;
  if(c.positive){const value:unknown=JSON.parse(text);passed=status===200&&SnapshotResponse(value);}
  else if(c.gateway){const value=JSON.parse(text) as {code?:string};passed=status===401&&value.code==="UNAUTHORIZED";}
  else {const deniedCode=/(?:"(?:ErrorCode|Code|code)"\s*:\s*"|<Code>)(?:AccessDenied|RamCheckFail|Forbidden|Unauthorized|AuthenticationFailed|InvalidAccessKeyId|SignatureDoesNotMatch|SecurityTokenExpired|InvalidSecurityToken|MissingSecurityToken|InvalidAuthorizationHeader)(?:"|<\/Code>)/.test(text);let nativeUnsignedDenial=false;
   if(status===400&&c.auth==="none"&&!c.id.startsWith("oss-anonymous-")){
    const value=JSON.parse(text) as {Code?:unknown;Message?:unknown};
    nativeUnsignedDenial=value.Code==="InvalidArgument"&&value.Message==="invalid authorization ''";
   }
   passed=([401,403].includes(status)&&deniedCode)||nativeUnsignedDenial;}
  results.push({id:c.id,status,passed,reason:passed?"expected-contract":"unexpected-status-or-contract"});
 }catch{results.push({id:c.id,status,passed:false,reason:"unavailable-or-unsafe-response"});}}
 return {schemaVersion:1,passed:results.every(r=>r.passed),readOnly:true,inventoryCompleteness:"operator-supplied; independently verify against FC inventory",results,logCanaryVerified:false,realTurnstileVerified:false};
}
function containsPositiveControl(records:unknown[]):boolean {
 const pending=[...records];let visited=0;
 while(pending.length&&visited++<10000){const value=pending.pop();if(typeof value==="string"&&value.startsWith("{")){try{pending.push(JSON.parse(value));}catch{}}else if(value&&typeof value==="object"){const v=value as Record<string,unknown>;if(v.area==="vision"&&v.status===400&&v.outcome==="gateway")return true;pending.push(...Object.values(v));}}
 return false;
}
/** Full platform export plus decoded application records. Never filter away fields to pass. */
export function checkLogCanary(input:unknown,runId:string,markers:string[]):boolean{
 try{const raw=JSON.stringify(input);if(raw.length>262144||!markers.length||markers.some(m=>m.length<8||raw.includes(m)))return false;
  const value=input as {schemaVersion:number;runId:string;exportComplete:boolean;platformRecords:unknown[];records:Record<string,unknown>[]};
  if(/"[^"\\]*(?:cookie|authorization|clientIp|ip|ipAddress|remoteAddress|headers|body|deviceId|installationId|securityToken|accessKey|password|sessionId|cursor)"\s*:/i.test(raw)||/https?:[^"\s]+\?[^"\s]+/.test(raw))return false;
  if(value.schemaVersion!==1||value.runId!==runId||value.exportComplete!==true||!Array.isArray(value.records)||!value.records.length||!Array.isArray(value.platformRecords)||!value.platformRecords.length||value.platformRecords.some(r=>!r||typeof r!=="object")||!containsPositiveControl(value.platformRecords))return false;
  return value.records.every(r=>r&&r.area==="vision"&&((Number.isInteger(r.status)&&Number(r.status)>=100&&Number(r.status)<=599)||(r.outcome==="coalesced"&&r.status===undefined))&&(["gateway","origin","cache_hit","coalesced","origin_unavailable",...(["storage","rpc","context","overloaded","resource","transport","dependency","credentials","origin_transport","origin_contract","origin_response","breaker","cache_busy"].map(x=>"dependency_"+x))].includes(String(r.outcome))||/^contract_(?:city|event|source_health|response)_(?:text|name|language|point|latitude|longitude|placeKey|countryCode|recordVersion|eventId|headline|authority|sourceUpdatedAt|schemaVersion|isFallback|other)_(?:minLength|maxLength|pattern|enum|type|required|additionalProperties|anyOf|minimum|maximum|other)$/.test(String(r.outcome)))&&Object.keys(r).every(k=>["area","status","outcome"].includes(k)))&&value.records.some(r=>r.status===400&&r.outcome==="gateway");
 }catch{return false;}
}
