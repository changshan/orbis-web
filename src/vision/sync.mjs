import {SnapshotResponse,ChangesResponse,CityResponse} from '../worker/vision/contract.generated.cjs';
// Full public protocol validation before committing any page to the in-memory view.
export class VisionPipelineClient {
  constructor(language,request=fetch,{wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now}={}) { this.language=language;this.request=request;this.wait=wait;this.now=now;this.events=new Map();this.cities=new Map();this.cursor=null;this.sequence=0; }
  async get(path) {
    for(let attempt=0;;attempt++) {
      try {
        const response=await this.request(`/api/vision/${path}`,{cache:'no-store'}),data=await response.json();
        if(!response.ok) {
          const error=new Error(data.code||'Vision request failed');error.resetRequired=data.resetRequired;
          error.code=response.status===429?'rate-limited':response.status===503?'unavailable':'invalid';
          if(error.code==='rate-limited'||error.code==='unavailable')error.retryAt=this.now()+Math.max(1000,Number(data.retryAfterSeconds||1)*1000);
          throw error;
        }
        const validate=path.startsWith('snapshot?')?SnapshotResponse:path.startsWith('changes?')?ChangesResponse:CityResponse;
        if(!validate(data))throw new Error('Vision public contract rejected');
        if(data.language!==this.language)throw new Error('Vision language mismatch');return data;
      } catch(error) {
        if(attempt>=2||!['rate-limited','unavailable'].includes(error.code)||error.resetRequired)throw error;
        const delay=Math.max(1000,(error.retryAt??this.now()+1000)-this.now());
        if(!Number.isFinite(delay)||delay>30000)throw error;
        await this.wait(delay+Math.floor(Math.random()*250));
      }
    }
  }
  async snapshot() {
    const pending=this.partialSnapshot??{token:null,first:null,events:new Map(),cities:new Map(),pages:0,bytes:0,seen:new Set(),degraded:false,resumeCursor:null};
    this.partialSnapshot=pending;
    try {
      do {
        const data=await this.get(`snapshot?lang=${this.language}${pending.token?`&pageToken=${encodeURIComponent(pending.token)}`:''}`);
        if(++pending.pages>1000||(pending.bytes+=JSON.stringify(data).length)>32*1024*1024)throw new Error('snapshot budget');
        pending.resumeCursor=data.resumeCursor;
        pending.degraded ||= data.readStatus.isStale||data.readStatus.state==='degraded';
        if(!pending.first)pending.first=data;
        else if(['snapshotId','streamEpoch','catalogVersion','viewSequence'].some(k=>data[k]!==pending.first[k]))throw new Error('snapshot changed');
        for(const event of data.events)pending.events.set(event.eventId,event);
        for(const city of data.cities)pending.cities.set(city.placeKey,city);
        const token=data.hasMore?data.nextPageToken:null;
        if(data.hasMore&&(!token||pending.seen.has(token)))throw new Error('invalid page token');
        if(token)pending.seen.add(token);pending.token=token;
      }while(pending.token);
      const first=pending.first;
      this.events=pending.events;this.cities=pending.cities;this.cursor=pending.resumeCursor;this.sequence=first.viewSequence;
      this.epoch=first.streamEpoch;this.catalog=first.catalogVersion;this.readStatus=pending.degraded?{...first.readStatus,state:'degraded',isStale:true}:first.readStatus;
      this.partialSnapshot=null;return this.result();
    }catch(error){
      // Keep only validated in-memory pages on transient backoff. Expiry/reset/schema failures start cleanly.
      if(!['rate-limited','unavailable'].includes(error.code)||error.resetRequired)this.partialSnapshot=null;
      throw error;
    }
  }
  async poll() {
    let more,pages=0,seen=new Set();
    if(!this.cursor)return this.snapshot();
    do {
      const data=await this.get(`changes?lang=${this.language}&cursor=${encodeURIComponent(this.cursor)}`);
      if(data.resetRequired||data.streamEpoch!==this.epoch||data.catalogVersion!==this.catalog||data.fromSequence!==this.sequence){const error=new Error('Vision stream mismatch');error.resetRequired=true;throw error;}
      if(++pages>1000||seen.has(data.nextCursor)||(data.hasMore&&data.throughSequence<=this.sequence))throw new Error('changes pagination did not progress');seen.add(data.nextCursor);
      const events=new Map(this.events),cities=new Map(this.cities);let sequence=this.sequence,group=null;
      for(const change of data.changes) {
        if(change.sequence!==sequence+1)throw new Error('Vision sequence gap');
        if(group&&(group.id!==change.commitGroupId||group.end!==change.commitGroupEndSequence))throw new Error('incomplete commit group');
        if(!group)group={id:change.commitGroupId,end:change.commitGroupEndSequence};
        if(change.commitGroupEndSequence<change.sequence)throw new Error('invalid commit group');
        const prior=events.get(change.eventId);
        if(!prior||prior.recordVersion<change.recordVersion) {
          if(change.operation==='remove')events.set(change.eventId,{eventId:change.eventId,recordVersion:change.recordVersion,removed:true});
          else events.set(change.eventId,change.event);
        }
        for(const mutation of change.cityMutations) {
          if(mutation.operation==='remove')cities.delete(mutation.placeKey);else cities.set(mutation.placeKey,mutation.city);
        }
        sequence=change.sequence;if(sequence===group.end)group=null;
      }
      if(group)throw new Error('incomplete commit group');
      if(sequence!==data.throughSequence)throw new Error('Vision watermark mismatch');
      this.events=events;this.cities=cities;this.sequence=sequence;this.cursor=data.nextCursor;this.readStatus=data.readStatus;more=data.hasMore;
    }while(more);
    return this.result();
  }
  async detail(placeKey) { const value=await this.get(`cities/${encodeURIComponent(placeKey)}?lang=${this.language}`);if(value.city.placeKey!==placeKey)throw new Error('city mismatch');return value; }
  result() {
    const cities=[...this.cities.values()].map(city=>({...city,name:city.name.text,nameEn:city.name.text,
      latitude:city.point.latitude,longitude:city.point.longitude,timeZone:'UTC',countryName:city.countryCode}));
    this.placeIndex=new Map();for(const city of this.cities.values())for(const ref of city.events){const event=this.events.get(ref.eventId);if(event?.recordVersion===ref.recordVersion){if(!this.placeIndex.has(ref.eventId))this.placeIndex.set(ref.eventId,[]);this.placeIndex.get(ref.eventId).push(city.placeKey);}}
    const events=[...this.events.values()].filter(event=>!event.removed).map(event=>this.legacy(event));
    return {cities,events,cursor:this.cursor,readStatus:this.readStatus};
  }
  legacy(event) {
    return {...event,headline:event.headline?.text||event.sourceEventName||event.hazardType,isFallback:event.headline?.isFallback===true,
      authority:event.authority?.name||'',summary:event.texts?.map(text=>[text.headline,text.description,text.instruction].filter(Boolean).join('\n')).join('\n\n')||event.summary?.text||'',recordedAt:event.sourceRetrievedAt,
      placeKeys:this.placeIndex?.get(event.eventId)||[],
      matchDescription:this.language==='zh'?'按现有 Orbis 规则匹配城市代表点。':'Matched to the city representative point using current Orbis rules.'};
  }
}
