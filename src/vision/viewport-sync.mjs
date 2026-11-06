import {MapResponse,FeedResponse,CityResponse} from '../worker/vision/contract.generated.cjs';
import {parseViewport} from './viewport';
// Only complete, validated tile windows are cached. Cursors are opaque and never persisted.
export class VisionViewportClient {
 constructor(language,request=fetch,{now=Date.now,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}) {this.language=language;this.request=request;this.now=now;this.wait=wait;this.cache=new Map();this.pending=new Map();this.generation=0;this.current=null;}
 async get(path,validate){
  for(let attempt=0;;attempt++)try{
   const response=await this.request('/api/vision/'+path,{cache:'no-store'}),data=await response.json();
   if(!response.ok){const error=new Error(data.code||'Vision request failed');error.resetRequired=data.resetRequired;error.code=response.status===429?'rate-limited':response.status===503?'unavailable':'invalid';error.status=response.status;error.retryAt=this.now()+Math.max(1000,Number(data.retryAfterSeconds||1)*1000);throw error;}
   if(!validate(data)||data.language!==this.language)throw Error('Vision public contract rejected');return data;
  }catch(error){
   const delay=Math.max(1000,(error.retryAt??this.now()+1000)-this.now());
   if(attempt>=2||!['rate-limited','unavailable'].includes(error.code)||!Number.isFinite(delay)||delay>30000)throw error;
   await this.wait(delay);
  }
 }
 async load(view,hazard='',{force=false}={}){
  parseViewport(view);const key=this.language+'|'+view+'|'+hazard,generation=++this.generation,prior=this.cache.get(key);
  if(!force&&prior&&this.now()<prior.freshUntil){this.current=prior.data;this.cache.delete(key);this.cache.set(key,prior);return prior.data;}
  let work=this.pending.get(key);
  if(!work){work=this.fetchWindow(view,hazard,prior);this.pending.set(key,work);work.finally(()=>{if(this.pending.get(key)===work)this.pending.delete(key);}).catch(()=>{});}
  const data=await work;if(generation===this.generation)this.current=data;return data;
 }
 async fetchWindow(view,hazard,prior){
  const params=new URLSearchParams({lang:this.language,view});if(hazard)params.set('hazard',hazard);
  if(prior)params.set('cursor',prior.data.mapCursor);
  let data;try{data=await this.get('map?'+params,MapResponse);}catch(error){if(!params.has('cursor')||!(error.resetRequired||error.code==='reset'))throw error;params.delete('cursor');data=await this.get('map?'+params,MapResponse);}
  if(data.view!==view||data.hazard!==hazard||data.expiresAt<=this.now())throw Error('Vision viewport mismatch or expired');
  const delta=data.mode==='delta';
  if(delta&&(!prior||data.fromSnapshotId!==prior.data.snapshotId||data.streamEpoch!==prior.data.streamEpoch||data.catalogVersion!==prior.data.catalogVersion||data.viewSequence<prior.data.viewSequence))throw Error('Vision delta mismatch');
  const points=new Map(delta?prior.data.points.map(point=>[point.id,point]):[]),seen=new Set();
  for(const id of data.removed){if(seen.has(id)||!points.has(id))throw Error('Vision removal mismatch');seen.add(id);points.delete(id);}
  for(const point of data.points){if(seen.has(point.id)||point.kind!==(data.pointMode==='cities'?'city':'cluster')||(point.validUntil!==null&&point.validUntil<=this.now()))throw Error('Vision point mismatch');seen.add(point.id);points.set(point.id,point);}
  if(points.size>512)throw Error('Vision viewport budget');
  const result={...data,points:[...points.values()]};
  // A cached full result retains delta metadata only for diagnostics; it is applied atomically here.
  this.cache.delete(this.language+'|'+view+'|'+hazard);this.cache.set(this.language+'|'+view+'|'+hazard,{data:result,freshUntil:Math.min(this.now()+10000,data.expiresAt)});
  while(this.cache.size>16)this.cache.delete(this.cache.keys().next().value);return result;
 }
 async feed(query='',hazard='',pin=this.current){
  if(!pin)throw Error('Vision map not ready');const params=new URLSearchParams({lang:this.language,cursor:pin.mapCursor});if(query)params.set('query',query);if(hazard)params.set('hazard',hazard);
  const data=await this.get('feed?'+params,FeedResponse);this.assertPin(data,pin);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(query)))].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(data.hazard!==hazard||data.queryHash!==hash)throw Error('Vision feed mismatch');
  const events=new Map();for(const event of data.events){if(events.has(event.eventId))throw Error('Vision duplicate event');events.set(event.eventId,event);}
  const cities=new Set();for(const city of data.cities){if(cities.has(city.placeKey))throw Error('Vision duplicate city');cities.add(city.placeKey);}
  return data;
 }
 async detail(placeKey,pin=this.current){
  if(!pin)throw Error('Vision map not ready');const data=await this.get('cities/'+encodeURIComponent(placeKey)+'?'+new URLSearchParams({lang:this.language,cursor:pin.mapCursor}),CityResponse);
  this.assertPin(data,pin);if(data.city.placeKey!==placeKey)throw Error('Vision city mismatch');return data;
 }
 assertPin(data,pin){if(['streamEpoch','catalogVersion','viewSequence'].some(key=>data[key]!==pin[key])||('snapshotId'in data&&data.snapshotId!==pin.snapshotId))throw Error('Vision watermark mismatch');}
}
