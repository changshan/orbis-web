/** No browser storage, readable cookie, credentials or challenge token cache. */
export type AccessKind="idle"|"connecting"|"challenge"|"ready"|"stale"|"rate-limited"|"unavailable"|"reset"|"unauthorized"|"closed";
export interface AccessState {kind:AccessKind;retryAt?:number;}
export class VisionClientError extends Error {
 constructor(public code:AccessKind|"invalid",public retryAt?:number){super(code);}
}
interface Options {origin:string;send?:(request:Request)=>Promise<Response>;now?:()=>number;challenge:(signal:AbortSignal)=>Promise<string>;timeoutMs?:number;}
async function json(response:Response,limit:number):Promise<Record<string,unknown>>{
 const reader=response.body?.getReader();if(!reader)throw Error();let length=0;const bytes=new Uint8Array(limit);
 try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>limit)throw Error();bytes.set(part.value,length-part.value.length);}}
 catch{await reader.cancel().catch(()=>undefined);throw Error();}finally{reader.releaseLock();}
 const value:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(0,length)));
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error();return value as Record<string,unknown>;
}
export class VisionClient {
 private lifetime=new AbortController();private minting?:Promise<void>;private renewAt=0;private retryAt=0;private generation=0;
 private listeners=new Set<(state:AccessState)=>void>();private current:AccessState={kind:"idle"};
 private send:(request:Request)=>Promise<Response>;private now:()=>number;
 constructor(private options:Options){this.send=options.send??(request=>fetch(request));this.now=options.now??Date.now;}
 get state():AccessState{return {...this.current};}
 subscribe(listener:(state:AccessState)=>void):()=>void {this.listeners.add(listener);listener(this.state);return ()=>{this.listeners.delete(listener);};}
 private stateTo(kind:AccessKind,retryAt?:number){if(this.lifetime.signal.aborted)return;this.current={kind,...(retryAt?{retryAt}:{})};for(const listener of this.listeners)listener(this.state);}
 dispose(){if(this.lifetime.signal.aborted)return;this.current={kind:"closed"};this.listeners.clear();this.lifetime.abort();}
 private assertOpen(){if(this.lifetime.signal.aborted)throw new VisionClientError("closed");if(this.retryAt>this.now())throw new VisionClientError(this.current.kind,this.retryAt);}
 private async request(path:string,body?:object):Promise<{response:Response;value:Record<string,unknown>}>{
  const controller=new AbortController();const abort=()=>controller.abort();this.lifetime.signal.addEventListener("abort",abort,{once:true});
  const timer=setTimeout(abort,this.options.timeoutMs??20000);
  try{
   const response=await this.send(new Request(new URL(path,this.options.origin),{method:body?"POST":"GET",credentials:"same-origin",cache:"no-store",redirect:"error",signal:controller.signal,...(body?{headers:{"content-type":"application/json"},body:JSON.stringify(body)}:{})}));
   const value=await json(response,body?4096:4194304);this.assertOpen();return {response,value};
  }catch(error){if(this.lifetime.signal.aborted)throw new VisionClientError("closed");if(error instanceof VisionClientError)throw error;throw new VisionClientError("unavailable");}
  finally{clearTimeout(timer);this.lifetime.signal.removeEventListener("abort",abort);}
 }
 private reject(response:Response,value:Record<string,unknown>):never{
  let kind:AccessKind=response.status===401?"unauthorized":value.resetRequired===true&&[409,410].includes(response.status)?"reset":response.status===429?"rate-limited":"unavailable";
  if(response.status===429||response.status===503){
   const header=response.headers.get("retry-after");const seconds=header&&/^\d+$/.test(header)?Number(header):typeof value.retryAfterSeconds==="number"?value.retryAfterSeconds:1;
   const date=header?Date.parse(header):NaN;const delay=Number.isFinite(date)&&!/^\d+$/.test(header!)?Math.max(1000,date-this.now()):Math.max(1000,Math.min(86400000,seconds*1000));
   this.retryAt=this.now()+delay;
  }
  this.stateTo(kind,this.retryAt);throw new VisionClientError(kind,this.retryAt||undefined);
 }
 private async mint():Promise<void>{
  this.stateTo("connecting");let result=await this.request("/api/vision/session",{});
  if(result.response.status===403&&result.value.code==="FORBIDDEN"){
   this.stateTo("challenge");let token:string;
   try{token=await this.options.challenge(this.lifetime.signal);if(!token||token.length>2048)throw Error();}catch{if(this.lifetime.signal.aborted)throw new VisionClientError("closed");throw new VisionClientError("challenge");}
   this.assertOpen();result=await this.request("/api/vision/session",{token});
   if(result.response.status===403)throw new VisionClientError("challenge");
  }
  if(result.response.status!==200)this.reject(result.response,result.value);
  const expiry=result.value.expiresAt;const now=this.now();if(!Number.isSafeInteger(expiry)||Number(expiry)<=now||Number(expiry)>now+900000)throw new VisionClientError("unavailable");
  this.generation++;this.renewAt=Number(expiry)-Math.min(5000,(Number(expiry)-now)/10);
 }
 private async ensureSession(){
  this.assertOpen();if(this.renewAt>this.now())return;
  if(!this.minting)this.minting=this.mint().finally(()=>{this.minting=undefined;});await this.minting;
 }
 async read(path:string):Promise<Record<string,unknown>>{
  try{
   this.assertOpen();const u=new URL(path,this.options.origin);
   if(!path.startsWith("/api/vision/")||u.origin!==this.options.origin||u.hash||!/^\/api\/vision\/(snapshot|changes|map|feed|cities\/[^/]+)$/.test(u.pathname))throw new VisionClientError("invalid");
   await this.ensureSession();const generation=this.generation;let result=await this.request(path);
   if(result.response.status===401){if(generation===this.generation)this.renewAt=0;await this.ensureSession();result=await this.request(path);}
   if(result.response.status!==200)this.reject(result.response,result.value);
   const status=result.value.readStatus as {isStale?:unknown}|undefined;this.stateTo(status?.isStale===true?"stale":"ready");return result.value;
  }catch(error){const safe=error instanceof VisionClientError?error:new VisionClientError("unavailable");if(safe.code!=="invalid"&&safe.code!=="closed")this.stateTo(safe.code,safe.retryAt);throw safe;}
 }
}
