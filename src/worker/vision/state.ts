export interface SqlPort { exec<T extends Record<string,string|number|null>>(query:string,...values:(string|number|null)[]):{toArray():T[]}; }
export interface Rule { key:string; limit:number; ms:number; }
export interface OriginLimits { originPerMinute:number; originPerDay:number; originConcurrent:number; breakerFailures:number; breakerCooldownMs:number; }
export class QuotaCore {
 constructor(private sql:SqlPort){
  sql.exec("CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL)");
  sql.exec("CREATE TABLE IF NOT EXISTS leases (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)");
  sql.exec("CREATE TABLE IF NOT EXISTS breaker (id INTEGER PRIMARY KEY, failures INTEGER NOT NULL, until_at INTEGER NOT NULL)");
  sql.exec("INSERT OR IGNORE INTO breaker VALUES (1,0,0)");
 }
 prune(now:number){this.sql.exec("DELETE FROM counters WHERE expires<=?",now);this.sql.exec("DELETE FROM leases WHERE expires<=?",now);}
 take(rules:Rule[],now:number,maxKeys:number):boolean {
  this.prune(now);const values=rules.map(r=>({r,prior:this.sql.exec<{used:number}>("SELECT used FROM counters WHERE key=?",r.key).toArray()[0]}));
  if(values.some(v=>(v.prior?.used??0)>=v.r.limit))return false;
  const count=this.sql.exec<{n:number}>("SELECT COUNT(*) AS n FROM counters").toArray()[0]!.n;
  if(count+values.filter(v=>!v.prior).length>maxKeys)return false;
  for(const {r} of values)this.sql.exec("INSERT INTO counters VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET used=used+1",r.key,now+r.ms);
  return true;
 }
 reserve(limits:OriginLimits,now:number):{status:number;lease?:string}{
  this.prune(now);const b=this.sql.exec<{failures:number;until_at:number}>("SELECT failures,until_at FROM breaker WHERE id=1").toArray()[0]!;
  if(b.until_at>now)return {status:503};
  if(this.sql.exec<{n:number}>("SELECT COUNT(*) AS n FROM leases").toArray()[0]!.n>=limits.originConcurrent)return {status:429};
  if(!this.take([{key:"origin-minute",limit:limits.originPerMinute,ms:60000},{key:"origin-day",limit:limits.originPerDay,ms:86400000}],now,8))return {status:429};
  const lease=crypto.randomUUID();this.sql.exec("INSERT INTO leases VALUES (?,?)",lease,now+60000);
  // Only one half-open probe may leave this durable coordination atom.
  if(b.failures>=limits.breakerFailures)this.sql.exec("UPDATE breaker SET until_at=? WHERE id=1",now+limits.breakerCooldownMs);
  return {status:200,lease};
 }
 owns(lease:string,now:number):boolean{return this.sql.exec("SELECT id FROM leases WHERE id=? AND expires>?",lease,now).toArray().length===1;}
 finish(lease:string,ok:boolean,uncertain:boolean,now:number,limits:OriginLimits){
  if(!this.sql.exec("SELECT id FROM leases WHERE id=?",lease).toArray().length)return;
  if(!uncertain)this.sql.exec("DELETE FROM leases WHERE id=?",lease);
  if(ok)this.sql.exec("UPDATE breaker SET failures=0,until_at=0 WHERE id=1");
  else {this.sql.exec("UPDATE breaker SET failures=failures+1 WHERE id=1");const b=this.sql.exec<{failures:number}>("SELECT failures FROM breaker WHERE id=1").toArray()[0]!;if(b.failures>=limits.breakerFailures)this.sql.exec("UPDATE breaker SET until_at=? WHERE id=1",now+limits.breakerCooldownMs);}
 }
}
export class SqlCache {
 constructor(private sql:SqlPort){sql.exec("CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY,body TEXT NOT NULL,bytes INTEGER NOT NULL,expires INTEGER NOT NULL,touched INTEGER NOT NULL)");}
 prune(now:number){this.sql.exec("DELETE FROM cache WHERE expires<=?",now);}
 get(key:string,now:number):string|undefined {this.prune(now);const value=this.sql.exec<{body:string}>("SELECT body FROM cache WHERE key=?",key).toArray()[0];if(value)this.sql.exec("UPDATE cache SET touched=? WHERE key=?",now,key);return value?.body;}
 put(key:string,body:string,ttl:number,now:number,maxEntries:number,maxBytes:number){
  this.prune(now);const bytes=new TextEncoder().encode(body).length;
  // Stay below SQLite per-row limits too; a valid large response is served uncached.
  if(ttl<=0||maxEntries<=0||bytes>maxBytes||bytes>1000000)return;
  this.sql.exec("DELETE FROM cache WHERE key=?",key);
  for(;;){const size=this.sql.exec<{n:number;b:number}>("SELECT COUNT(*) AS n, COALESCE(SUM(bytes),0) AS b FROM cache").toArray()[0]!;if(size.n<maxEntries&&size.b+bytes<=maxBytes)break;this.sql.exec("DELETE FROM cache WHERE key=(SELECT key FROM cache ORDER BY touched,key LIMIT 1)");}
  this.sql.exec("INSERT INTO cache VALUES (?,?,?,?,?)",key,body,bytes,now+ttl,now);
 }
}
