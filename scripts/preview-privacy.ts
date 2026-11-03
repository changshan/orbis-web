/** Version uploads inherit non-versioned log settings. Read and reject unsafe remote settings first. */
export async function checkPreviewPrivacy(env:Record<string,string|undefined>,send:(request:Request)=>Promise<Response>=fetch):Promise<void>{
 const unavailable=()=>new Error("preview privacy settings unavailable or unsafe");
 const account=env.CLOUDFLARE_ACCOUNT_ID,token=env.CLOUDFLARE_API_TOKEN;
 if(!account||!/^[0-9a-f]{32}$/.test(account)||!token)throw unavailable();
 try{
  const response=await send(new Request(`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/orbis-web/settings`,{method:"GET",headers:{authorization:`Bearer ${token}`,accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(5000)}));
  if(response.status!==200){await response.body?.cancel();throw unavailable();}
  const reader=response.body?.getReader();if(!reader)throw unavailable();
  const bytes=new Uint8Array(262144);let length=0;
  try{for(;;){const next=await reader.read();if(next.done)break;length+=next.value.length;if(length>bytes.length)throw unavailable();bytes.set(next.value,length-next.value.length);}}
  catch{await reader.cancel().catch(()=>undefined);throw unavailable();}finally{reader.releaseLock();}
  const document:unknown=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(0,length)));
  if(!document||typeof document!=="object"||!("success" in document)||document.success!==true||!("result" in document))throw unavailable();
  const result=document.result;if(!result||typeof result!=="object"||!("observability" in result))throw unavailable();
  const raw=result.observability;if(!raw||typeof raw!=="object")throw unavailable();
  const obs=raw as {redact_query_string?:unknown;logs?:{enabled?:unknown;invocation_logs?:unknown};traces?:{enabled?:unknown}};
  const stopped=obs.logs?.enabled===false&&obs.traces?.enabled===false;
  const redactedCustomLogs=obs.redact_query_string===true&&obs.logs?.enabled===true&&obs.logs.invocation_logs===false&&obs.traces?.enabled===false;
  if(!stopped&&!redactedCustomLogs)throw unavailable();
 }catch{throw unavailable();}
}
