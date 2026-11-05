import { Buffer } from "node:buffer";
import { PlaceKey, VisionError } from "./contract.generated.cjs";
export interface GatewayConfig { publicOrigin:string; epoch:string; key:string; sessionMs:number; }
export type DependencyReason="storage"|"rpc"|"context"|"overloaded"|"resource"|"transport"|"dependency"|"credentials"|"origin_transport"|"origin_contract"|"origin_response"|"breaker"|"cache_busy";
export type QuotaReason="concurrency"|"budget"|"breaker";
export interface Envelope { status:number; body:string; failureReason?:DependencyReason; quotaReason?:QuotaReason; }
function dependencyReason(error:unknown):DependencyReason {
 const message=error instanceof Error?error.message:"";
 return /SQL|sqlite|storage/i.test(message)?"storage":/different request|I\/O.*context/i.test(message)?"context":/RPC|serializ|clone/i.test(message)?"rpc":/overload/i.test(message)?"overloaded":/CPU|memory|resource limit/i.test(message)?"resource":/timeout|connection|network/i.test(message)?"transport":"dependency";
}
export interface Target { kind:"snapshot"|"changes"|"city"; target:string; language:string; token?:string; tokenKind?:"page"|"cursor"; }
export interface GatewayPorts {
 now():number;
 onUnavailable?(reason:DependencyReason):void;
 onQuota?(reason:QuotaReason,status:number):void;
 admit(sid:string,request:Request,kind:string):Promise<boolean>;
 load(target:Target):Promise<Envelope>;
 issue(request:Request):Promise<boolean>;
}
export class GatewayFailure extends Error { constructor(public status:number,public code:string){super(code);} }
export function failure(status:number,code:string,now=Date.now()):Response {
 const body={schemaVersion:1,code,message:code,requestId:crypto.randomUUID(),serverTime:now,resetRequired:["CURSOR_EXPIRED","SNAPSHOT_EXPIRED","EPOCH_CHANGED","CATALOG_CHANGED"].includes(code),...(status===429||status===503?{retryAfterSeconds:1}:{})};
 if(!VisionError(body))throw new Error("invalid local error");
 return publicResponse({status,body:JSON.stringify(body)});
}
export function publicResponse(value:Envelope):Response {
 const headers:Record<string,string>={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff"};
 if(value.status===429||value.status===503)headers["retry-after"]="1";
 return new Response(value.body,{status:value.status,headers});
}
export function normalizeTarget(raw:string):Target {
 if(raw.length>4096 || /[#\x00-\x20\x7f]/.test(raw))throw new GatewayFailure(400,"INVALID_ARGUMENT");
 const q=raw.indexOf("?");const path=decodeURIComponent(q<0?raw:raw.slice(0,q));const values=new Map<string,string>();
 if(q>=0)for(const part of raw.slice(q+1).split("&")){
  const eq=part.indexOf("=");if(eq<1)throw new GatewayFailure(400,"INVALID_ARGUMENT");
  const key=decodeURIComponent(part.slice(0,eq).replaceAll("+"," "));const value=decodeURIComponent(part.slice(eq+1).replaceAll("+"," "));
  if(values.has(key)||/[\x00-\x1f\x7f]/.test(value))throw new GatewayFailure(400,"INVALID_ARGUMENT");values.set(key,value);
 }
 const language=values.get("lang")??"en";if(!["en","zh"].includes(language))throw new GatewayFailure(400,"INVALID_ARGUMENT");
 let kind:Target["kind"],tokenName:string|undefined,canonical=path;
 if(path==="/api/vision/snapshot"){kind="snapshot";tokenName="pageToken";}
 else if(path==="/api/vision/changes"){kind="changes";tokenName="cursor";if(!values.has(tokenName))throw new GatewayFailure(400,"INVALID_ARGUMENT");}
 else if(path.startsWith("/api/vision/cities/")){
  kind="city";const city=path.slice("/api/vision/cities/".length);
  if(city.length>256 || /[/\\%\x00-\x20\x7f]/.test(city)||!PlaceKey(city))throw new GatewayFailure(400,"INVALID_ARGUMENT");canonical="/api/vision/cities/"+encodeURIComponent(city);
 }else throw new GatewayFailure(404,"INVALID_ARGUMENT");
 for(const key of values.keys())if(key!=="lang"&&key!==tokenName)throw new GatewayFailure(400,"INVALID_ARGUMENT");
 const token=tokenName?values.get(tokenName):undefined;
 if(token!==undefined && (token.length>2048||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)))throw new GatewayFailure(400,"INVALID_CURSOR");
 const params=new URLSearchParams({lang:language});if(token!==undefined)params.set(tokenName!,token);
 return {kind,target:canonical+"?"+params,language,...(token!==undefined?{token,tokenKind:kind==="snapshot"?"page" as const:"cursor" as const}:{})};
}
interface Claims { kind:string; expiresAt:number; language?:string; originToken?:string; sid?:string; }
export class TokenCodec {
 private readonly key:Promise<CryptoKey>;
 constructor(private config:GatewayConfig,private now=Date.now){
  const bytes=new Uint8Array(Buffer.from(config.key,"base64"));
  if(bytes.length<32||bytes.length>64||Buffer.from(bytes).toString("base64")!==config.key)throw new Error("invalid token configuration");
  this.key=crypto.subtle.importKey("raw",bytes,{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]);
 }
 async sign(data:Claims):Promise<string>{
  const part=Buffer.from(JSON.stringify({...data,epoch:this.config.epoch})).toString("base64url");
  const signature=await crypto.subtle.sign("HMAC",await this.key,new TextEncoder().encode(part));
  const token=part+"."+Buffer.from(signature).toString("base64url");if(token.length>2048)throw new Error("token budget exceeded");return token;
 }
 async verify(token:string,kind:string,language?:string):Promise<Claims>{
  try{
   if(token.length>2048||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))throw new Error();
   const [part,signature]=token.split(".");
   if(!await crypto.subtle.verify("HMAC",await this.key,new Uint8Array(Buffer.from(signature!,"base64url")),new TextEncoder().encode(part!)))throw new Error();
   const data=JSON.parse(Buffer.from(part!,"base64url").toString());
   if(data.kind!==kind||data.language!==language||!Number.isSafeInteger(data.expiresAt))throw new Error();
   if(data.epoch!==this.config.epoch)throw new GatewayFailure(kind==="session"?401:409,kind==="session"?"UNAUTHORIZED":"EPOCH_CHANGED");
   if(data.expiresAt<=this.now())throw new GatewayFailure(kind==="session"?401:410,kind==="session"?"UNAUTHORIZED":kind==="page"?"SNAPSHOT_EXPIRED":"CURSOR_EXPIRED");
   if(kind==="session"?typeof data.sid!=="string"||data.sid.length>64:typeof data.originToken!=="string"||data.originToken.length>2048)throw new Error();
   return data;
  }catch(error){if(error instanceof GatewayFailure)throw error;throw new GatewayFailure(kind==="session"?401:400,kind==="session"?"UNAUTHORIZED":"INVALID_CURSOR");}
 }
}
export async function wrapTokens(body:string,target:Target,codec:TokenCodec,now:number):Promise<string>{
 const value=JSON.parse(body);
 for(const field of ["resumeCursor","nextCursor","nextPageToken"]){
  if(typeof value[field]!=="string")continue;
  // Only called after validating a trusted origin response. Preserve the origin's absolute lifetime.
  const original=value[field] as string;let expiresAt:number;
  try{expiresAt=JSON.parse(Buffer.from(original.split(".")[0]!,"base64url").toString()).expiresAt;}catch{throw new Error("invalid origin token");}
  if(!Number.isSafeInteger(expiresAt)||expiresAt<=now)throw new Error("expired origin token");
  value[field]=await codec.sign({kind:field==="nextPageToken"?"page":"cursor",language:target.language,originToken:original,expiresAt:Math.min(expiresAt,now+300000)});
 }
 return JSON.stringify(value);
}
export async function gateway(request:Request,config:GatewayConfig,ports:GatewayPorts):Promise<Response>{
 try{
  const url=new URL(request.url);if(url.origin!==config.publicOrigin)return failure(503,"UNAVAILABLE",ports.now());
  const codec=new TokenCodec(config,ports.now);
  if(url.pathname==="/api/vision/session"){
   if(request.method!=="POST"||url.search||request.headers.get("origin")!==config.publicOrigin)return failure(403,"FORBIDDEN",ports.now());
   if(!await ports.issue(request))return failure(403,"FORBIDDEN",ports.now());
   const expiresAt=ports.now()+config.sessionMs;const token=await codec.sign({kind:"session",sid:crypto.randomUUID(),expiresAt});
   const response=publicResponse({status:200,body:JSON.stringify({expiresAt})});response.headers.set("set-cookie","__Host-vision="+token+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age="+Math.floor(config.sessionMs/1000));return response;
  }
  if(request.method!=="GET")return failure(405,"INVALID_ARGUMENT",ports.now());
  if(request.body!==null)return failure(400,"INVALID_ARGUMENT",ports.now());
  const target=normalizeTarget(url.pathname+url.search);
  if(target.token){const claims=await codec.verify(target.token,target.tokenKind!,target.language);const origin=new URL(target.target,config.publicOrigin);origin.searchParams.set(target.tokenKind==="page"?"pageToken":"cursor",claims.originToken!);target.target=origin.pathname+origin.search;}
  const cookies=request.headers.get("cookie")??"";const tokens=cookies.split(";").map(c=>c.trim()).filter(c=>c.startsWith("__Host-vision="));
  if(tokens.length!==1)return failure(401,"UNAUTHORIZED",ports.now());
  const session=await codec.verify(tokens[0]!.slice("__Host-vision=".length),"session");
  if(!await ports.admit(session.sid!,request,target.kind))return failure(429,"RATE_LIMITED",ports.now());
  const result=await ports.load(target);if(result.quotaReason&&["concurrency","budget","breaker"].includes(result.quotaReason))ports.onQuota?.(result.quotaReason,result.status);if(result.status===503)ports.onUnavailable?.(result.failureReason??"dependency");if(result.status!==200)return publicResponse(result);
  return publicResponse({status:200,body:await wrapTokens(result.body,target,codec,ports.now())});
 }catch(error){if(!(error instanceof GatewayFailure)&&!(error instanceof URIError))ports.onUnavailable?.(dependencyReason(error));return error instanceof GatewayFailure?failure(error.status,error.code,ports.now()):error instanceof URIError?failure(400,"INVALID_ARGUMENT",ports.now()):failure(503,"UNAVAILABLE",ports.now());}
}
