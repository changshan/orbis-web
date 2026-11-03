/** Lazy, explicit Turnstile lifecycle. Token exists only until the session POST. */
interface WidgetOptions {
 sitekey:string;action:string;language:"en"|"zh-CN";retry:"never";"refresh-expired":"never";"response-field":false;
 callback:(token:string)=>void;"expired-callback":()=>void;"error-callback":()=>void;"timeout-callback":()=>void;
}
interface Turnstile {ready(callback:()=>void):void;render(element:HTMLElement,options:WidgetOptions):string;remove(id:string):void;}
declare global {interface Window {turnstile?:Turnstile;}}
export function turnstileChallenge(container:HTMLElement,siteKey:string,locale:"en"|"zh"){
 let script:HTMLScriptElement|undefined;let loading:Promise<Turnstile>|undefined;
 function api(signal:AbortSignal):Promise<Turnstile>{
  if(window.turnstile)return Promise.resolve(window.turnstile);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   script=document.createElement("script");script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.referrerPolicy="no-referrer";
   const done=(value?:Turnstile)=>{clearTimeout(timer);signal.removeEventListener("abort",abort);if(script){script.onload=null;script.onerror=null;}if(value)resolve(value);else{script?.remove();loading=undefined;reject(Error("challenge"));}};
   const abort=()=>done();const timer=setTimeout(abort,10000);signal.addEventListener("abort",abort,{once:true});script.onerror=abort;script.onload=()=>{const value=window.turnstile;if(!value){done();return;}value.ready(()=>done(value));};document.head.appendChild(script);
  });return loading;
 }
 return async(signal:AbortSignal):Promise<string>=>{
  if(signal.aborted||!/^[A-Za-z0-9_-]{10,100}$/.test(siteKey))throw Error("challenge");
  const sdk=await api(signal);const remove=(id:string)=>{try{sdk.remove(id);}catch{/* Cleanup must not strand a completed verification. */}};if(signal.aborted)throw Error("challenge");
  return new Promise<string>((resolve,reject)=>{
   let id:string|undefined;let completed=false;
   const finish=(token?:string)=>{if(completed)return;completed=true;clearTimeout(timer);signal.removeEventListener("abort",abort);if(id!==undefined)remove(id);container.replaceChildren();if(token&&token.length<=2048)resolve(token);else reject(Error("challenge"));};
   const abort=()=>finish();const timer=setTimeout(abort,120000);signal.addEventListener("abort",abort,{once:true});
   try{id=sdk.render(container,{sitekey:siteKey,action:"vision_session",language:locale==="zh"?"zh-CN":"en",retry:"never","refresh-expired":"never","response-field":false,callback:token=>finish(token),"expired-callback":abort,"error-callback":abort,"timeout-callback":abort});if(completed)remove(id);}catch{finish();}
  });
 };
}
