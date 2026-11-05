import { DurableObject } from "cloudflare:workers";
import { settings,type Settings } from "./config";
import { failure,type Envelope,type Target,type DependencyReason } from "./gateway";
import { CredentialCache } from "./credentials";
import { assumeGatewayRole } from "./sts";
import { fetchOrigin } from "./origin";
import { QuotaCore,SqlCache,type Rule } from "./state";
import { contractHash } from "./contract-version";
import { digest } from "./runtime";
export class VisionQuota extends DurableObject<VisionBindings>{
 private core:QuotaCore;
 private credentials=new CredentialCache(()=>assumeGatewayRole(this.env));
 constructor(ctx:DurableObjectState,env:VisionBindings){super(ctx,env);this.core=new QuotaCore(ctx.storage.sql);}
 async take(rules:Rule[]){const c=settings(this.env);const ok=this.core.take(rules,Date.now(),c.limits.maxQuotaKeys);await this.ctx.storage.setAlarm(Date.now()+60000);return ok;}
 async reserve(){const c=settings(this.env);const result=this.core.reserve(c.limits,Date.now());await this.ctx.storage.setAlarm(Date.now()+60000);return result;}
 async finish(lease:string,ok:boolean,uncertain:boolean){const c=settings(this.env);this.core.finish(lease,ok,uncertain,Date.now(),c.limits);}
 /** Private credential RPC; origin responses remain in their cache shard. No secrets enter storage. */
 async credentialsFor(lease:string){
  if(!this.core.owns(lease,Date.now()))throw new Error("origin admission required");
  const credentials=await this.credentials.get();
  if(!this.core.owns(lease,Date.now()))throw new Error("origin admission expired");
  return credentials;
 }
 async alarm(){this.core.prune(Date.now());const n=this.ctx.storage.sql.exec<{n:number}>("SELECT (SELECT COUNT(*) FROM counters)+(SELECT COUNT(*) FROM leases) AS n").one().n;if(n)await this.ctx.storage.setAlarm(Date.now()+60000);}
}
export class VisionCacheShard extends DurableObject<VisionBindings>{
 private cache:SqlCache;private pending=new Map<string,Promise<Envelope>>();
 constructor(ctx:DurableObjectState,env:VisionBindings){super(ctx,env);this.cache=new SqlCache(ctx.storage.sql);}
 async load(target:Target):Promise<Envelope>{
  const c=settings(this.env);const key=await digest(c.origin+"|"+contractHash+"|"+target.target);const cached=this.cache.get(key,Date.now());
  if(cached!==undefined){console.log(JSON.stringify({area:"vision",status:200,outcome:"cache_hit"}));return {status:200,body:cached};}
  const pending=this.pending.get(key);if(pending){console.log(JSON.stringify({area:"vision",outcome:"coalesced"}));return pending;}
  if(this.pending.size>=c.limits.cacheEntries)return {status:503,body:await failure(503,"UNAVAILABLE").text(),failureReason:"cache_busy"};
  const work=this.fill(key,target,c);this.pending.set(key,work);
  try{return await work;}finally{this.pending.delete(key);}
 }
 private async fill(key:string,target:Target,c:Settings):Promise<Envelope>{
  const global=this.env.VISION_QUOTA.getByName("origin-and-mint-budget");const permit=await global.reserve();
  if(!permit.lease)return {status:permit.status,quotaReason:permit.reason,body:await failure(permit.status,permit.status===429?"RATE_LIMITED":"UNAVAILABLE").text()};
  let received=false;let stage:DependencyReason="credentials";
  try{
   const signed=c.credentialMode==="assume-role"?{...c,...await global.credentialsFor(permit.lease)}:c;
   stage="origin_transport";const result=await fetchOrigin(signed,target,async request=>{const response=await fetch(request);received=true;return response;});
   await global.finish(permit.lease,result.status<500,false);
   stage="storage";if(result.status===200){const parsed=JSON.parse(result.body);const ttl=target.kind==="changes"&&!parsed.hasMore?c.limits.tailTtlMs:c.limits.cacheTtlMs;this.cache.put(key,result.body,ttl,Date.now(),c.limits.cacheEntries,c.limits.cacheBytes);await this.ctx.storage.setAlarm(Date.now()+c.limits.cacheTtlMs);}
   console.log(JSON.stringify({area:"vision",status:result.status,outcome:"origin"}));return result.status===503?{...result,failureReason:"origin_response"}:result;
  }catch(error){
   if(error instanceof Error&&error.message==="origin public contract rejected")stage="origin_contract";
   await global.finish(permit.lease,false,!received);console.warn(JSON.stringify({area:"vision",status:503,outcome:"origin_unavailable"}));return {status:503,body:await failure(503,"UNAVAILABLE").text(),failureReason:stage};
  }
 }
 async alarm(){this.cache.prune(Date.now());if(this.ctx.storage.sql.exec<{n:number}>("SELECT COUNT(*) AS n FROM cache").one().n)await this.ctx.storage.setAlarm(Date.now()+10000);}
}
