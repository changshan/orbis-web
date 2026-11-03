import type { GatewayConfig } from "./gateway";
import type { OriginLimits } from "./state";
export interface Limits extends OriginLimits { requestPerMinute:number; sessionTotal:number; ipPerMinute:number; mintPerMinute:number; mintPerDay:number; mintIpPerMinute:number; challengeAfter:number; sessionMs:number; originTimeoutMs:number; cacheTtlMs:number; tailTtlMs:number; cacheEntries:number; cacheBytes:number; maxResponseBytes:number; maxQuotaKeys:number; }
export interface Settings extends GatewayConfig { origin:string; limits:Limits; turnstileSecret:string; accessKeyId:string; accessKeySecret:string; securityToken:string; credentialsExpireAt:number; credentialMode?:"fixed"|"assume-role"; }
export type VisionEnvironment=Partial<Omit<VisionBindings,"EMAIL"|"FEEDBACK_RATE_LIMIT"|"FEEDBACK_SENDER"|"FEEDBACK_DESTINATION">> & Partial<{VISION_FC_ACCESS_KEY_ID:string;VISION_FC_ACCESS_KEY_SECRET:string;VISION_FC_SECURITY_TOKEN:string;VISION_FC_CREDENTIALS_EXPIRE_AT:string}>;
const fields=["requestPerMinute","sessionTotal","ipPerMinute","mintPerMinute","mintPerDay","mintIpPerMinute","challengeAfter","sessionMs","originPerMinute","originPerDay","originConcurrent","originTimeoutMs","breakerFailures","breakerCooldownMs","cacheTtlMs","tailTtlMs","cacheEntries","cacheBytes","maxResponseBytes","maxQuotaKeys"] as const;
export function settings(env:VisionEnvironment,now=Date.now()):Settings {
 function need(key:keyof VisionEnvironment):string {const value=env[key];if(typeof value!=="string"||!value.trim())throw new Error("Vision configuration unavailable");return value;}
 const publicOrigin=need("VISION_PUBLIC_ORIGIN"),origin=need("VISION_CN_ORIGIN");
 const url=new URL(origin);if(publicOrigin!=="https://myorbis.xyz"||url.protocol!=="https:"||!/^[-a-z0-9]+\.cn-wulanchabu\.fcapp\.run$/.test(url.hostname)||url.port||url.username||url.password||url.pathname!=="/"||url.search||url.hash)throw new Error("Vision origin rejected");
 const raw:unknown=JSON.parse(need("VISION_LIMITS"));
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("Vision limits required");
 const values=raw as Record<string,unknown>;if(Object.keys(values).length!==fields.length||fields.some(n=>!Number.isSafeInteger(values[n])||Number(values[n])<1||Number(values[n])>100000000))throw new Error("Vision limits invalid");
 const n=(name:typeof fields[number])=>Number(values[name]);
 const limits:Limits={requestPerMinute:n("requestPerMinute"),sessionTotal:n("sessionTotal"),ipPerMinute:n("ipPerMinute"),mintPerMinute:n("mintPerMinute"),mintPerDay:n("mintPerDay"),mintIpPerMinute:n("mintIpPerMinute"),challengeAfter:n("challengeAfter"),sessionMs:n("sessionMs"),originPerMinute:n("originPerMinute"),originPerDay:n("originPerDay"),originConcurrent:n("originConcurrent"),originTimeoutMs:n("originTimeoutMs"),breakerFailures:n("breakerFailures"),breakerCooldownMs:n("breakerCooldownMs"),cacheTtlMs:n("cacheTtlMs"),tailTtlMs:n("tailTtlMs"),cacheEntries:n("cacheEntries"),cacheBytes:n("cacheBytes"),maxResponseBytes:n("maxResponseBytes"),maxQuotaKeys:n("maxQuotaKeys")};
 if(limits.originTimeoutMs>8000||limits.maxResponseBytes>4194304||limits.cacheBytes>16777216||limits.cacheEntries>64||limits.sessionMs>900000||limits.cacheTtlMs>10000||limits.tailTtlMs>limits.cacheTtlMs||limits.originConcurrent>32)throw new Error("Vision safety budget exceeded");
 const epoch=need("VISION_SESSION_EPOCH");if(!/^[a-zA-Z0-9_-]{1,64}$/.test(epoch))throw new Error("Vision epoch invalid");
 const credentialMode=env.VISION_CREDENTIAL_MODE??"fixed";
 if(credentialMode!=="fixed"&&credentialMode!=="assume-role")throw new Error("Vision credential mode invalid");
 if(credentialMode==="assume-role"&&(!/^acs:ram::[0-9]{8,20}:role\/orbis-vision-gateway$/.test(need("VISION_FC_ROLE_ARN"))||!need("VISION_STS_ACCESS_KEY_ID")||!need("VISION_STS_ACCESS_KEY_SECRET")))throw new Error("Vision STS configuration invalid");
 const credentialsExpireAt=credentialMode==="fixed"?Number(need("VISION_FC_CREDENTIALS_EXPIRE_AT")):Number.MAX_SAFE_INTEGER;if(!Number.isSafeInteger(credentialsExpireAt)||credentialsExpireAt<=now+30000)throw new Error("Vision credentials expired");
 return {publicOrigin,origin,epoch,key:need("VISION_GATEWAY_KEY"),sessionMs:limits.sessionMs,limits,turnstileSecret:need("VISION_TURNSTILE_SECRET"),accessKeyId:credentialMode==="fixed"?need("VISION_FC_ACCESS_KEY_ID"):"",accessKeySecret:credentialMode==="fixed"?need("VISION_FC_ACCESS_KEY_SECRET"):"",securityToken:credentialMode==="fixed"?need("VISION_FC_SECURITY_TOKEN"):"",credentialsExpireAt,credentialMode};
}
