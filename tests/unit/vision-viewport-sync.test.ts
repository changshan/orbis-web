import {readFileSync} from 'node:fs';
import {describe,it,expect,vi} from 'vitest';
// @ts-expect-error JavaScript client tested at its public contract boundary.
import {VisionViewportClient} from '../../src/vision/viewport-sync.mjs';
import {viewportFromBounds} from '../../src/vision/viewport';
import {responseCacheTtl} from '../../src/worker/vision/origin';
const fixture=(name:string)=>JSON.parse(readFileSync(`tests/fixtures/vision/${name}.json`,'utf8'));
const base=()=>({...fixture('map.ok'),expiresAt:61000});
describe('viewport loading',()=>{
 it('renders the world in one request, caches revisits and asks for deltas after freshness expires',async()=>{
  let now=1000;const request=vi.fn(async(_url:string)=>Response.json(base()));const client=new VisionViewportClient('en',request,{now:()=>now});
  expect((await client.load('0/0/0/1/1')).points).toHaveLength(1);expect(request).toHaveBeenCalledTimes(1);
  await client.load('0/0/0/1/1');expect(request).toHaveBeenCalledTimes(1);
  now=12000;request.mockImplementationOnce(async (url:string)=>{expect(url).toContain('cursor=');return Response.json({...base(),mode:'delta',fromSnapshotId:base().snapshotId,points:[],removed:[]});});
  expect((await client.load('0/0/0/1/1')).points).toHaveLength(1);
 });
 it('rejects a broken delta atomically and keeps the last validated complete viewport',async()=>{
  let now=1000;const request=vi.fn(async(_url:string)=>Response.json(base()));const client=new VisionViewportClient('en',request,{now:()=>now});await client.load('0/0/0/1/1');now=12000;
  request.mockResolvedValueOnce(Response.json({...base(),mode:'delta',fromSnapshotId:'c'.repeat(64),removed:['g:2:1:1']}));
  await expect(client.load('0/0/0/1/1')).rejects.toThrow();expect(client.current.points).toHaveLength(1);
 });
 it('ignores late pan responses and does not let old requests replace the active viewport',async()=>{
  let resolve!:(value:Response)=>void;const request=vi.fn().mockImplementationOnce(()=>new Promise(r=>resolve=r)).mockImplementationOnce(async()=>Response.json({...base(),view:'1/1/0/1/1'}));
  const client=new VisionViewportClient('en',request,{now:()=>1000});const old=client.load('0/0/0/1/1');await client.load('1/1/0/1/1');resolve(Response.json(base()));await old;
  expect(client.current.view).toBe('1/1/0/1/1');
 });
 it('resets an expired cursor once without retrying indefinitely',async()=>{
  let now=1000;const request=vi.fn(async(_url:string)=>Response.json(base()));const client=new VisionViewportClient('en',request,{now:()=>now});await client.load('0/0/0/1/1');now=12000;
  request.mockResolvedValueOnce(Response.json({code:'CURSOR_EXPIRED',resetRequired:true},{status:410})).mockImplementationOnce(async (url:string)=>{expect(url).not.toContain('cursor=');return Response.json(base());});await client.load('0/0/0/1/1');expect(request).toHaveBeenCalledTimes(3);
 });
 it('binds on-demand list and detail to the displayed immutable watermark',async()=>{
  const request=vi.fn(async (url:string)=>Response.json(url.includes('/map?')?base():url.includes('/feed?')?fixture('feed.ok'):fixture('city.ok')));
  const client=new VisionViewportClient('en',request,{now:()=>1000});await client.load('0/0/0/1/1');await client.feed('');expect(request.mock.calls[1]![0]).toContain('cursor=SYNTHETIC_CURSOR_40');
  const bad={...fixture('feed.ok'),viewSequence:41};request.mockResolvedValueOnce(Response.json(bad));await expect(client.feed('')).rejects.toThrow();
 });
 it('handles dateline windows and full-world bounds without dropping edge tiles',()=>{
  expect(viewportFromBounds({west:-180,south:-85,east:180,north:85},0).key).toBe('0/0/0/1/1');
  expect(viewportFromBounds({west:170,south:-10,east:-170,north:10},2)).toMatchObject({x:3,width:2});
  expect(()=>viewportFromBounds({west:NaN,south:0,east:1,north:2},2)).toThrow();
 });
 it('never caches aggregate responses past their declared expiry',()=>{
  expect(responseCacheTtl('map',{expiresAt:1500},10000,1000,1000)).toBe(500);
  expect(responseCacheTtl('map',{expiresAt:900},10000,1000,1000)).toBe(0);
  expect(responseCacheTtl('changes',{hasMore:false},10000,1000,1000)).toBe(1000);
 });
});
