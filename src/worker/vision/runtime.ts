import { Buffer } from "node:buffer";
import { gateway,failure,GatewayFailure,TokenCodec,type Envelope,type Target } from "./gateway";
import { settings,type Settings,type VisionEnvironment } from "./config";
import { boundedText } from "./origin";
export async function digest(value:string):Promise<string>{return Buffer.from(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))).toString("hex");}
async function ipKey(request:Request,c:Settings):Promise<string>{
 const ip=request.headers.get("cf-connecting-ip");if(!ip||ip.length>64)throw new GatewayFailure(503,"UNAVAILABLE");
 const key=await crypto.subtle.importKey("raw",new Uint8Array(Buffer.from(c.key,"base64")),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 return Buffer.from(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(Math.floor(Date.now()/86400000)+"|"+ip))).toString("hex");
}
async function issue(request:Request,c:Settings,env:VisionEnvironment):Promise<boolean>{
 if(request.headers.get("content-type")?.split(";")[0]!=="application/json")throw new GatewayFailure(400,"INVALID_ARGUMENT");
 let value:unknown;try{value=JSON.parse(await boundedText(new Response(request.body),4096));}catch{throw new GatewayFailure(400,"INVALID_ARGUMENT");}
 if(!value||typeof value!=="object"||Array.isArray(value))throw new GatewayFailure(400,"INVALID_ARGUMENT");
 const fields=value as Record<string,unknown>;if(Object.keys(fields).some(k=>k!=="token")||fields.token!==undefined&&(typeof fields.token!=="string"||fields.token.length>2048))throw new GatewayFailure(400,"INVALID_ARGUMENT");
 const ip=await ipKey(request,c);const quota=env.VISION_QUOTA!.getByName("ip:"+ip[0]);
 if(!await quota.take([{key:"mint-hard:"+ip,limit:c.limits.mintIpPerMinute,ms:60000}]))throw new GatewayFailure(429,"RATE_LIMITED");
 if(!await env.VISION_QUOTA!.getByName("origin-and-mint-budget").take([{key:"mint-minute",limit:c.limits.mintPerMinute,ms:60000},{key:"mint-day",limit:c.limits.mintPerDay,ms:86400000}]))throw new GatewayFailure(429,"RATE_LIMITED");
 if(await quota.take([{key:"mint-normal:"+ip,limit:c.limits.challengeAfter,ms:60000}]))return true;
 if(typeof fields.token!=="string"||!fields.token)return false;
 try{
  const response=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({secret:c.turnstileSecret,response:fields.token}),redirect:"manual",signal:AbortSignal.timeout(3000)});
  if(response.status!==200){await response.body?.cancel();return false;}
  const result=JSON.parse(await boundedText(response,16384));const time=Date.parse(result.challenge_ts);
  return result.success===true&&result.hostname===new URL(c.publicOrigin).hostname&&result.action==="vision_session"&&Number.isFinite(time)&&time>Date.now()-300000&&time<=Date.now()+10000;
 }catch{return false;}
}
export async function handleVision(request:Request,env:VisionEnvironment):Promise<Response>{
 if(String(env.VISION_ENABLED)!=="true")return failure(503,"UNAVAILABLE");
 try{
  const c=settings(env);new TokenCodec(c);if(!env.VISION_QUOTA||!env.VISION_CACHE)throw new Error("Vision bindings unavailable");
  const response=await gateway(request,c,{now:Date.now,issue:r=>issue(r,c,env),admit:async(sid,r,kind)=>{
   const ip=await ipKey(r,c);const session=await digest(c.epoch+sid);
   if(!await env.VISION_QUOTA!.getByName("ip:"+ip[0]).take([{key:ip+":all",limit:c.limits.ipPerMinute,ms:60000},{key:ip+":"+kind,limit:c.limits.ipPerMinute,ms:60000}]))return false;
   return env.VISION_QUOTA!.getByName("session:"+session[0]).take([{key:session+":life",limit:c.limits.sessionTotal,ms:c.sessionMs},{key:session+":"+kind,limit:c.limits.requestPerMinute,ms:60000}]);
  },load:async target=>{const hash=await digest(c.origin+"|"+target.target);return env.VISION_CACHE!.getByName("cache:"+(parseInt(hash.slice(0,2),16)%32)).load(target);}});
  console.log(JSON.stringify({area:"vision",status:response.status,outcome:"gateway"}));return response;
 }catch{return failure(503,"UNAVAILABLE");}
}
