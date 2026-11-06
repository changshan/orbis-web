import { describe,it,expect,vi } from "vitest";
import { CredentialCache } from "../../src/worker/vision/credentials";
describe("Vision in-memory STS renewal",()=>{
 it("coalesces parallel issuance and renews before expiry",async()=>{
  let now=0,n=0;const issue=vi.fn(async()=>({accessKeyId:"id-"+(++n),accessKeySecret:"secret",securityToken:"token",credentialsExpireAt:now+900000}));
  const cache=new CredentialCache(issue,()=>now);const first=await Promise.all(Array.from({length:20},()=>cache.get()));expect(issue).toHaveBeenCalledTimes(1);expect(first.every(c=>c.accessKeyId==="id-1")).toBe(true);
  now=780001;expect((await cache.get()).accessKeyId).toBe("id-2");expect(issue).toHaveBeenCalledTimes(2);
 });
 it("backs off failed renewal, permits only unexpired fallback and fails closed",async()=>{
  let now=0,fail=false;const issue=vi.fn(async()=>{if(fail)throw new Error("synthetic failure");return {accessKeyId:"id",accessKeySecret:"secret",securityToken:"token",credentialsExpireAt:900000};});
  const cache=new CredentialCache(issue,()=>now);await cache.get();fail=true;now=780001;expect((await cache.get()).accessKeyId).toBe("id");await cache.get();expect(issue).toHaveBeenCalledTimes(2);
  now=870001;await expect(cache.get()).rejects.toThrow("credentials unavailable");
 });
 it("rejects invalid responses and never relies on persisted credentials",async()=>{
  const cache=new CredentialCache(async()=>({accessKeyId:"id",accessKeySecret:"secret",securityToken:"",credentialsExpireAt:900000}),()=>0);await expect(cache.get()).rejects.toThrow("credentials unavailable");
 });
});
