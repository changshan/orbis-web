import {describe,it,expect,vi} from "vitest";
import {VisionClient,VisionClientError} from "../../src/vision/client";
const endpoint="https://myorbis.xyz";
const ok=()=>Response.json({readStatus:{isStale:false},events:[]});
const session=(now=1000)=>Response.json({expiresAt:now+60000});
const fail=(status:number,code:string,extra={})=>Response.json({code,...extra},{status});
function setup(replies:Response[],challenge=vi.fn(async()=>"synthetic-once")){
 let now=1000;const send=vi.fn(async(_r:Request)=>{const value=replies.shift();if(!value)throw Error("unexpected request");return value;});
 const client=new VisionClient({origin:endpoint,send,now:()=>now,challenge});
 return {client,send,challenge,time:(value:number)=>{now=value;}};
}
describe("Vision browser session client",()=>{
 it("coalesces minting and reuses a memory-only session for polling",async()=>{
  const s=setup([session(),ok(),ok(),ok()]);await Promise.all([s.client.read("/api/vision/snapshot?lang=en"),s.client.read("/api/vision/snapshot?lang=en")]);await s.client.read("/api/vision/snapshot?lang=en");
  expect(s.send.mock.calls.filter(([r])=>r.method==="POST")).toHaveLength(1);expect(s.challenge).not.toHaveBeenCalled();
  for(const [r] of s.send.mock.calls){expect(r.credentials).toBe("same-origin");expect(r.cache).toBe("no-store");expect(r.redirect).toBe("error");expect(r.headers.has("authorization")).toBe(false);}
 });
 it("mints once after challenge and does not reuse the challenge token",async()=>{
  const s=setup([fail(403,"FORBIDDEN"),session(),ok(),ok()]);await s.client.read("/api/vision/snapshot");await s.client.read("/api/vision/snapshot");
  expect(s.challenge).toHaveBeenCalledTimes(1);expect(await s.send.mock.calls[0]![0].clone().json()).toEqual({});expect(await s.send.mock.calls[1]![0].clone().json()).toEqual({token:"synthetic-once"});
 });
 it("renews near expiry, retries an unauthorized read only once",async()=>{
  const s=setup([session(),ok(),session(58000),fail(401,"UNAUTHORIZED"),session(58000),ok()]);await s.client.read("/api/vision/snapshot");s.time(58000);await s.client.read("/api/vision/snapshot");expect(s.send).toHaveBeenCalledTimes(6);
 });
 it("a delayed unauthorized response cannot invalidate a session renewed by another read",async()=>{
  let posts=0,gets=0;const client=new VisionClient({origin:endpoint,now:()=>1000,challenge:vi.fn(),send:async r=>{
   if(r.method==="POST"){posts++;return session();}const index=gets++;if(index===2)await new Promise(r=>setTimeout(r,20));return index===1||index===2?fail(401,"UNAUTHORIZED"):ok();
  }});await client.read("/api/vision/snapshot");await Promise.all([client.read("/api/vision/snapshot"),client.read("/api/vision/snapshot")]);expect(posts).toBe(2);
 });
 it("disposal aborts an in-flight request without notifying removed listeners",async()=>{
  const listener=vi.fn();let started!:()=>void;const ready=new Promise<void>(r=>{started=r;});
  const client=new VisionClient({origin:endpoint,challenge:vi.fn(),send:r=>new Promise((_resolve,reject)=>{r.signal.addEventListener("abort",()=>reject(Error("PRIVATE_NETWORK")),{once:true});started();})});client.subscribe(listener);const pending=client.read("/api/vision/snapshot");await ready;client.dispose();const count=listener.mock.calls.length;await expect(pending).rejects.toMatchObject({code:"closed"});expect(listener).toHaveBeenCalledTimes(count);
 });
 it("does not loop when renewed reads or challenged minting are rejected",async()=>{
  const s=setup([session(),fail(401,"UNAUTHORIZED"),session(),fail(401,"UNAUTHORIZED")]);await expect(s.client.read("/api/vision/snapshot")).rejects.toMatchObject({code:"unauthorized"});expect(s.send).toHaveBeenCalledTimes(4);
  const t=setup([fail(403,"FORBIDDEN"),fail(403,"FORBIDDEN")]);await expect(t.client.read("/api/vision/snapshot")).rejects.toMatchObject({code:"challenge"});expect(t.challenge).toHaveBeenCalledTimes(1);
 });
 it("obeys retry-after without issuing more requests during cooldown",async()=>{
  const s=setup([session(),new Response('{"code":"RATE_LIMITED"}',{status:429,headers:{"retry-after":"10"}}),ok()]);await expect(s.client.read("/api/vision/snapshot")).rejects.toMatchObject({code:"rate-limited",retryAt:11000});await expect(s.client.read("/api/vision/snapshot")).rejects.toBeInstanceOf(VisionClientError);expect(s.send).toHaveBeenCalledTimes(2);s.time(11000);await s.client.read("/api/vision/snapshot");
 });
 it("surfaces reset and stale states without silently treating them as empty data",async()=>{
  const s=setup([session(),fail(410,"CURSOR_EXPIRED",{resetRequired:true}),Response.json({readStatus:{isStale:true},events:[]})]);await expect(s.client.read("/api/vision/changes?cursor=a.b")).rejects.toMatchObject({code:"reset"});await s.client.read("/api/vision/snapshot");expect(s.client.state.kind).toBe("stale");
 });
 it("rejects cross-origin and unexpected paths before any I/O",async()=>{
  const s=setup([]);for(const path of ["https://evil.example/api/vision/snapshot","//evil.example/api/vision/snapshot","/api/feedback","/api/vision/session","/api/vision/snapshot#secret"]){await expect(s.client.read(path)).rejects.toMatchObject({code:"invalid"});}expect(s.send).not.toHaveBeenCalled();
 });
 it("rejects malformed, oversized or invalid expiry responses without echoing content",async()=>{
  for(const response of [Response.json({expiresAt:1}),Response.json({expiresAt:999999999}),new Response("PRIVATE_CONTENT"),new Response("x".repeat(4097))]){
   const s=setup([response]);await expect(s.client.read("/api/vision/snapshot")).rejects.toMatchObject({code:"unavailable",message:"unavailable"});expect(s.send).toHaveBeenCalledTimes(1);
  }
 });
 it("cancels pending work and prevents callbacks after disposal",async()=>{
  const listener=vi.fn();const s=setup([session(),ok()]);s.client.subscribe(listener);s.client.dispose();const count=listener.mock.calls.length;await expect(s.client.read("/api/vision/snapshot")).rejects.toMatchObject({code:"closed"});expect(listener).toHaveBeenCalledTimes(count);expect(s.send).not.toHaveBeenCalled();
 });
 it("reports unavailable network and challenge errors with fixed messages",async()=>{
  const s=setup([fail(403,"FORBIDDEN")],vi.fn(async()=>{throw Error("PRIVATE_UPSTREAM_ERROR");}));await expect(s.client.read("/api/vision/snapshot")).rejects.toMatchObject({code:"challenge",message:"challenge"});
 });
});
