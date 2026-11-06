import { getAuthorization } from "./aliyun-sign.cjs";
import { Request as TeaRequest } from "@alicloud/tea-typescript";
import { SnapshotResponse,ChangesResponse,CityResponse,MapResponse,FeedResponse,VisionError } from "./contract.generated.cjs";
import { failure } from "./gateway";
import type { Envelope,Target } from "./gateway";
import type { Settings } from "./config";
export async function boundedText(response:Response,maxBytes:number):Promise<string>{
 if(Number(response.headers.get("content-length"))>maxBytes){await response.body?.cancel();throw new Error("response budget");}
 const reader=response.body?.getReader();if(!reader)return "";
 let total=0;const bytes=new Uint8Array(maxBytes);
 try{for(;;){const part=await reader.read();if(part.done)break;total+=part.value.length;if(total>maxBytes)throw new Error("response budget");bytes.set(part.value,total-part.value.length);}}
 catch(error){await reader.cancel().catch(()=>undefined);throw error;}
 return new TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(0,total));
}
export async function fetchOrigin(config:Settings,target:Target,send:(request:Request)=>Promise<Response>=fetch):Promise<Envelope>{
 if(config.credentialsExpireAt<=Date.now()+30000)throw new Error("origin credentials unavailable");
 const url=new URL(target.target,config.origin);if(url.origin!==new URL(config.origin).origin)throw new Error("origin scope escaped");
 const headers:Record<string,string>={host:url.host,"x-acs-date":new Date().toISOString(),"x-acs-signature-nonce":crypto.randomUUID(),"x-acs-security-token":config.securityToken};
 const input=Object.assign(new TeaRequest(),{method:"GET",pathname:url.pathname,headers,query:Object.fromEntries(url.searchParams)});
 headers.authorization=getAuthorization(input,"ACS3-HMAC-SHA256","",config.accessKeyId,config.accessKeySecret);
 const response=await send(new Request(url,{method:"GET",headers,redirect:"manual",signal:AbortSignal.timeout(config.limits.originTimeoutMs)}));
 if(![200,400,404,409,410,429,503].includes(response.status)){await response.body?.cancel();throw new Error("unexpected origin status");}
 const body=await boundedText(response,config.limits.maxResponseBytes);const parsed:unknown=JSON.parse(body);
 // FC rejects before the handler when its fixed concurrency is full. Do not expose that platform envelope.
 if(response.status===429 && response.headers.get("x-fc-error-type")==="FCCommonError" && parsed && typeof parsed==="object" && !Array.isArray(parsed)){
  const value=parsed as Record<string,unknown>;
  if(Object.keys(value).length===3 && Object.keys(value).every(k=>["Code","Message","RequestId"].includes(k)) && value.Code==="ResourceExhausted" && typeof value.Message==="string" && typeof value.RequestId==="string")return {status:429,body:await failure(429,"RATE_LIMITED").text()};
 }
 const validate=response.status===200?({snapshot:SnapshotResponse,changes:ChangesResponse,city:CityResponse,map:MapResponse,feed:FeedResponse}[target.kind]):VisionError;
 if(!validate(parsed)){
  const error=(validate as typeof validate & {errors?:{instancePath?:unknown;keyword?:unknown}[]}).errors?.[0];
  const path=typeof error?.instancePath==="string"?error.instancePath:"";
  const kind=/^\/cit(?:ies|y)(?:\/|$)/.test(path)?"city":/^\/(events|changes)(?:\/|$)/.test(path)?"event":/^\/sourceHealth(?:\/|$)/.test(path)?"source_health":"response";
  const fields=["text","name","language","point","latitude","longitude","placeKey","countryCode","recordVersion","eventId","headline","authority","sourceUpdatedAt","schemaVersion","isFallback","other"];
  const keywords=["minLength","maxLength","pattern","enum","type","required","additionalProperties","anyOf","minimum","maximum","other"];
  const leaf=path.split("/").at(-1)??"";const field=fields.includes(leaf)?leaf:"other";
  const keyword=typeof error?.keyword==="string"&&keywords.includes(error.keyword)?error.keyword:"other";
  console.warn(JSON.stringify({area:"vision",status:503,outcome:`contract_${kind}_${field}_${keyword}`}));
  throw new Error("origin public contract rejected");
 }
 return {status:response.status,body};
}

export function responseCacheTtl(kind:string,parsed:Record<string,unknown>,cacheMs:number,tailMs:number,now:number):number {
 const ttl=kind==="changes"&&!parsed.hasMore?tailMs:cacheMs;
 return kind==="map"?Math.max(0,Math.min(ttl,Number(parsed.expiresAt)-now)):ttl;
}
