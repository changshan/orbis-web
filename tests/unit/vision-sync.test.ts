import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
// @ts-expect-error JavaScript view adapter, exercised at its public protocol boundary.
import {VisionPipelineClient} from '../../src/vision/sync.mjs';
const fixture=(name:string)=>JSON.parse(readFileSync(`tests/fixtures/vision/${name}.json`,'utf8'));
const feed=(...pages:object[])=>async()=>Response.json(pages.shift());
describe('Vision map synchronization',()=>{
 it('rejects unexpected public fields without replacing a prior snapshot',async()=>{
  const page=fixture('snapshot.ok');page.events[0].privateSourceBody='must reject';
  const client=new VisionPipelineClient('en',feed(page));
  await expect(client.snapshot()).rejects.toThrow();expect(client.events.size).toBe(0);expect(client.cursor).toBeNull();
 });
 it('keeps a prior complete view when later snapshot pages change identity',async()=>{
  const first=fixture('snapshot.page1'),second=fixture('snapshot.page2');second.snapshotId='different';
  const client=new VisionPipelineClient('en',feed(first,second));
  await expect(client.snapshot()).rejects.toThrow();expect(client.events.size).toBe(0);expect(client.cursor).toBeNull();
 });
});

describe('serial pagination and recovery',()=>{
 it('reads all pages before exposing one complete snapshot',async()=>{
  const first=fixture('snapshot.page1'),second=fixture('snapshot.page2');
  const calls:string[]=[];const pages=[first,second];
  const client=new VisionPipelineClient('en',async(url:string)=>{calls.push(url);return Response.json(pages.shift());});
  const view=await client.snapshot();expect(calls).toHaveLength(2);expect(calls[1]).toContain('pageToken=');
  expect(client.sequence).toBe(first.viewSequence);expect(view.events).toHaveLength(first.events.length+second.events.length);
 });
 it('does not commit a malformed change page or advance its cursor',async()=>{
  const first=fixture('snapshot.ok'),changes=fixture('changes.ok');changes.changes[0].sequence+=2;
  const client=new VisionPipelineClient('en',feed(first,changes));await client.snapshot();const before=client.cursor;
  await expect(client.poll()).rejects.toThrow();expect(client.cursor).toBe(before);expect(client.sequence).toBe(first.viewSequence);
 });
 it('keeps city detail versions separate from the global summary view',async()=>{
  const first=fixture('snapshot.ok'),detail=fixture('city.ok');detail.events[0].recordVersion+=1;
  const client=new VisionPipelineClient('en',feed(first,detail));await client.snapshot();const before=client.cursor;
  await client.detail(detail.city.placeKey);expect(client.events.get(detail.events[0].eventId).recordVersion).toBe(first.events[0].recordVersion);expect(client.cursor).toBe(before);
 });
 it('rejects repeated snapshot tokens without leaving a partial view',async()=>{
  const first=fixture('snapshot.page1');const client=new VisionPipelineClient('en',feed(first,first));
  await expect(client.snapshot()).rejects.toThrow();expect(client.events.size).toBe(0);
 });
 it('keeps unknown hazard types and degrades if any snapshot page is stale',async()=>{
  const first=fixture('snapshot.page1'),second=fixture('snapshot.page2');first.events[0].hazardType='futureHazard';second.readStatus.isStale=true;
  const client=new VisionPipelineClient('en',feed(first,second));const view=await client.snapshot();
  expect(view.events.some((x:any)=>x.hazardType==='futureHazard')).toBe(true);expect(view.readStatus.isStale).toBe(true);
 });
});


describe('bounded transient page recovery',()=>{
 it('retries the same page after Retry-After without restarting or committing a partial view',async()=>{
  const first=fixture('snapshot.page1'),last=fixture('snapshot.page2');last.resumeCursor=first.resumeCursor+'x';const calls:string[]=[];let now=1000;
  const pages=[Response.json(first),new Error('temporary'),Response.json(last)];Object.assign(pages[1]!,{code:'rate-limited',retryAt:3000});
  const client=new VisionPipelineClient('en',async(url:string)=>{calls.push(url);const next=pages.shift();if(next instanceof Error)throw next;return next;},{now:()=>now,wait:async(ms:number)=>{expect(client.events.size).toBe(0);expect(ms).toBeGreaterThanOrEqual(2000);now+=ms;}});
  await client.snapshot();expect(calls).toHaveLength(3);expect(calls[1]).toBe(calls[2]);expect(client.cursor).toBe(last.resumeCursor);
 });
 it('caps retries and keeps the previous complete snapshot intact',async()=>{
  const seed=fixture('snapshot.ok'),first=fixture('snapshot.page1');const wait=vi.fn(async()=>{});let calls=0;
  const client=new VisionPipelineClient('en',async()=>{calls++;if(calls===1)return Response.json(seed);if(calls===2)return Response.json(first);throw Object.assign(new Error('unavailable'),{code:'unavailable'});},{wait,now:()=>1000});
  await client.snapshot();const cursor=client.cursor;await expect(client.snapshot()).rejects.toThrow('unavailable');expect(calls).toBe(5);expect(wait).toHaveBeenCalledTimes(2);expect(client.cursor).toBe(cursor);expect(client.events.size).toBe(seed.events.length);
 });
 it('never retries reset, invalid contract, closed access or long server backoff',async()=>{
  for(const error of [Object.assign(new Error('reset'),{code:'reset'}),Object.assign(new Error('closed'),{code:'closed'}),Object.assign(new Error('rate-limited'),{code:'rate-limited',retryAt:100000})]){
   const wait=vi.fn();const request=vi.fn(async()=>{throw error;});const client=new VisionPipelineClient('en',request,{wait,now:()=>1000});await expect(client.snapshot()).rejects.toThrow();expect(request).toHaveBeenCalledOnce();expect(wait).not.toHaveBeenCalled();
  }
 });
});


describe('snapshot recovery across polling cycles',()=>{
 it('retains validated pages after bounded retries exhaust and resumes the interrupted page',async()=>{
  const first=fixture('snapshot.page1'),last=fixture('snapshot.page2');const calls:string[]=[];let fail=true;
  const client=new VisionPipelineClient('en',async(url:string)=>{calls.push(url);if(!url.includes('pageToken='))return Response.json(first);if(fail)throw Object.assign(new Error('unavailable'),{code:'unavailable'});return Response.json(last);},{wait:async()=>{},now:()=>1000});
  await expect(client.snapshot()).rejects.toThrow('unavailable');expect(client.events.size).toBe(0);expect(client.cursor).toBeNull();
  fail=false;const view=await client.snapshot();expect(calls.filter(url=>!url.includes('pageToken='))).toHaveLength(1);expect(calls.at(-1)).toBe(calls[1]);expect(view.events).toHaveLength(first.events.length+last.events.length);
 });
 it('discards partial pages after an invalid response and restarts cleanly',async()=>{
  const first=fixture('snapshot.page1'),last=fixture('snapshot.page2'),invalid=fixture('snapshot.page2');invalid.privateBody='reject';let invalidNext=true;const calls:string[]=[];
  const client=new VisionPipelineClient('en',async(url:string)=>{calls.push(url);return Response.json(!url.includes('pageToken=')?first:invalidNext?invalid:last);});
  await expect(client.snapshot()).rejects.toThrow('Vision public contract rejected');invalidNext=false;await client.snapshot();expect(calls.filter(url=>!url.includes('pageToken='))).toHaveLength(2);
 });
});


it('keeps the snapshot page budget across transient interruptions',async()=>{
 const page=fixture('snapshot.page1');let delivered=0,interrupted=false;
 const client=new VisionPipelineClient('en',async()=>{
  if(delivered===999&&!interrupted){interrupted=true;throw Object.assign(new Error('backoff'),{code:'rate-limited',retryAt:100000});}
  delivered++;return Response.json({...page,nextPageToken:'page-'+delivered});
 },{now:()=>1000,wait:async()=>{}});
 await expect(client.snapshot()).rejects.toThrow('backoff');expect(client.events.size).toBe(0);
 await expect(client.snapshot()).rejects.toThrow('snapshot budget');expect(client.events.size).toBe(0);expect(client.cursor).toBeNull();
});
