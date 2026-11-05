import {describe,it,expect} from 'vitest';
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
