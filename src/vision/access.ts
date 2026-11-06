import {VisionClient,type AccessState} from "./client";
import {turnstileChallenge} from "./turnstile";
const words={
 en:{idle:"Connect to load updates.",connecting:"Connecting…",challenge:"Complete verification to continue.",ready:"Connected.",stale:"Updates are delayed. Displayed data may be stale.","rate-limited":"Too many requests. Please wait before retrying.",unavailable:"Temporarily unavailable. Try again later.",reset:"Updates need to be reloaded. Retry to refresh.",unauthorized:"Your session has expired. Try again.",closed:"Disconnected.",failedChallenge:"Verification did not complete. Try again.",connect:"Connect",refresh:"Refresh",retry:"Retry"},
 zh:{idle:"连接后加载更新。",connecting:"正在连接…",challenge:"请完成验证以继续。",ready:"已连接。",stale:"更新延迟，当前数据可能已过期。","rate-limited":"请求过于频繁，请稍后重试。",unavailable:"暂时不可用，请稍后重试。",reset:"更新需要重新加载，请重试。",unauthorized:"会话已过期，请重试。",closed:"已断开连接。",failedChallenge:"验证未完成，请重试。",connect:"连接",refresh:"刷新",retry:"重试"}
};
export interface AccessOptions {locale:"en"|"zh";siteKey:string;onData?:(data:Record<string,unknown>)=>void;onReset?:()=>void;}
/** Mount into the approved Vision view; never auto-poll or load challenges on ordinary visits. */
export function mountVisionAccess(root:HTMLElement,options:AccessOptions){
 const copy=words[options.locale];const status=document.createElement("p");status.role="status";status.setAttribute("aria-live","polite");
 const challenge=document.createElement("div");challenge.dataset.visionChallenge="";
 const button=document.createElement("button");button.type="button";root.replaceChildren(status,challenge,button);
 const client=new VisionClient({origin:window.location.origin,challenge:turnstileChallenge(challenge,options.siteKey,options.locale)});
 let timer:ReturnType<typeof setTimeout>|undefined;let busy=false;let disposed=false;
 function render(state:AccessState){
  if(disposed)return;clearTimeout(timer);status.textContent=state.kind==="challenge"&&!busy?copy.failedChallenge:copy[state.kind];
  button.textContent=state.kind==="idle"?copy.connect:["ready","stale"].includes(state.kind)?copy.refresh:copy.retry;
  const remaining=Math.max(0,(state.retryAt??0)-Date.now());button.disabled=busy||remaining>0;root.setAttribute("aria-busy",String(busy));
  if(remaining)timer=setTimeout(()=>render(client.state),remaining);
 }
 const unsubscribe=client.subscribe(render);
 const refresh=async()=>{
  if(busy||disposed||button.disabled)return;busy=true;render(client.state);
  try{const value=await client.read("/api/vision/snapshot?lang="+options.locale);if(!disposed)options.onData?.(value);}
  catch{if(!disposed&&client.state.kind==="reset")options.onReset?.();}
  finally{busy=false;render(client.state);}
 };
 const click=()=>{void refresh();};button.addEventListener("click",click);
 return {client,refresh,dispose(){disposed=true;clearTimeout(timer);unsubscribe();client.dispose();button.removeEventListener("click",click);root.replaceChildren();}};
}
