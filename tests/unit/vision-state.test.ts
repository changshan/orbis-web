import { DatabaseSync } from "node:sqlite";
import { describe,expect,it } from "vitest";
import { QuotaCore, SqlCache, type SqlPort } from "../../src/worker/vision/state";
function sql():SqlPort {const db=new DatabaseSync(":memory:");return {exec<T extends Record<string,string|number|null>>(query:string,...values:(string|number|null)[]){const rows=db.prepare(query).all(...values);return {toArray:()=>rows as T[]};}};}
describe("Vision durable admission/cache state",()=>{
 it("checks all budgets atomically, survives re-instantiation, expires and caps key growth",()=>{
  const db=sql();let q=new QuotaCore(db);const rules=[{key:"minute",limit:2,ms:60000},{key:"day",limit:3,ms:86400000}];
  expect(q.take(rules,0,5)).toBe(true);expect(q.take(rules,1,5)).toBe(true);expect(q.take(rules,2,5)).toBe(false);
  q=new QuotaCore(db);expect(q.take(rules,60001,5)).toBe(true);expect(q.take(rules,60002,5)).toBe(false);
  expect(q.take([{key:"other",limit:1,ms:100}],60003,2)).toBe(false);
  expect(q.take(rules,86400001,5)).toBe(true);
 });
 it("persists origin concurrency and breaker; admits just one recovery probe",()=>{
  const db=sql();let q=new QuotaCore(db);const limits={originPerMinute:10,originPerDay:100,originConcurrent:1,breakerFailures:1,breakerCooldownMs:100};
  const first=q.reserve(limits,0);expect(first.status).toBe(200);expect(q.reserve(limits,1).status).toBe(429);
  q=new QuotaCore(db);q.finish(first.lease!,false,false,2,limits);expect(q.reserve(limits,3).status).toBe(503);
  const probe=q.reserve(limits,103);expect(probe.status).toBe(200);expect(q.reserve(limits,104).status).toBe(503);
  q.finish(probe.lease!,true,false,105,limits);expect(q.reserve(limits,106).status).toBe(200);
 });
 it("holds uncertain timed-out origin leases across restart",()=>{
  const db=sql();let q=new QuotaCore(db);const limits={originPerMinute:10,originPerDay:100,originConcurrent:1,breakerFailures:10,breakerCooldownMs:100};
  const first=q.reserve(limits,0);q.finish(first.lease!,false,true,1,limits);q=new QuotaCore(db);expect(q.reserve(limits,2).status).toBe(429);expect(q.reserve(limits,60001).status).toBe(200);
 });
 it("credential issuance requires a live reserved origin lease",()=>{
  const q=new QuotaCore(sql());const limits={originPerMinute:10,originPerDay:100,originConcurrent:1,breakerFailures:10,breakerCooldownMs:100};
  expect(q.owns("forged",0)).toBe(false);const first=q.reserve(limits,0);expect(q.owns(first.lease!,1)).toBe(true);expect(q.owns(first.lease!,60000)).toBe(false);
  q.finish(first.lease!,true,false,2,limits);expect(q.owns(first.lease!,3)).toBe(false);
 });
 it("cache uses absolute expiry, bounded bytes/entries and never admits oversized objects",()=>{
  const c=new SqlCache(sql());c.put("a","1234",10,0,2,8);c.put("b","5678",10,1,2,8);expect(c.get("a",5)).toBe("1234");
  c.put("c","1111",10,6,2,8);expect(c.get("b",6)).toBeUndefined();expect(c.get("a",10)).toBeUndefined();
  c.put("oversized","x".repeat(20),10,10,2,8);expect(c.get("oversized",11)).toBeUndefined();
 });
});
