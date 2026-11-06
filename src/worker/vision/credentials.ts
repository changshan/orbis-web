/** Secrets live only in this coordinator instance's memory, never in Durable Object storage. */
export interface Credentials { accessKeyId:string;accessKeySecret:string;securityToken:string;credentialsExpireAt:number; }
export class CredentialCache {
 private current?:Credentials;
 private pending?:Promise<Credentials>;
 private retryAt=0;
 constructor(private issue:()=>Promise<Credentials>,private now:()=>number=Date.now){}
 async get():Promise<Credentials>{
  const now=this.now();
  if(this.current&&this.current.credentialsExpireAt>now+120000)return this.current;
  if(now<this.retryAt){if(this.current&&this.current.credentialsExpireAt>now+30000)return this.current;throw new Error("credentials unavailable");}
  if(this.pending)return this.pending;
  const work=this.renew();this.pending=work;
  try{return await work;}finally{this.pending=undefined;}
 }
 private async renew():Promise<Credentials>{
  try{
   const value=await this.issue();const now=this.now();
   if(!value.accessKeyId||!value.accessKeySecret||!value.securityToken||!Number.isSafeInteger(value.credentialsExpireAt)||value.credentialsExpireAt<=now+30000||value.credentialsExpireAt>now+3600000)throw new Error("invalid STS response");
   this.current={...value};this.retryAt=0;return this.current;
  }catch{
   this.retryAt=this.now()+30000;
   if(this.current&&this.current.credentialsExpireAt>this.now()+30000)return this.current;
   throw new Error("credentials unavailable");
  }
 }
}
