import {describe,it,expect} from 'vitest';
import {readFileSync}from'node:fs';
// @ts-expect-error JavaScript renderer tested through its GeoJSON boundary.
import {mapFeatures}from'../../src/vision/point-features.mjs';
const fixture=()=>JSON.parse(readFileSync('tests/fixtures/vision/map.ok.json','utf8')).points[0];
describe('server map points retain rendering semantics',()=>{
 it('keeps active/recent counts for cluster radar layers without reclustering',()=>{
  const point=fixture();point.recentCount=1;const feature=mapFeatures([point],'',1000,()=> '#123456').features[0];
  expect(feature.properties).toMatchObject({point_count:2,activeCount:1,recentCount:1,count:1});expect(JSON.parse(feature.properties.bounds)).toEqual(point.bounds);
 });
 it('uses city identity for clicks and selection',()=>{
  const point=fixture();point.kind='city';point.city={placeKey:'GB:geonames:2643743',name:{text:'London'}};point.bounds=null;
  const feature=mapFeatures([point],point.city.placeKey,1000,()=> '#123456').features[0];expect(feature.properties).toMatchObject({placeKey:point.city.placeKey,selected:1,name:'London'});expect(feature.properties).not.toHaveProperty('point_count');
 });
 it('does not render an expired cached point as current',()=>{const point=fixture();point.validUntil=1000;expect(mapFeatures([point],'',1000,()=> '#123456').features).toHaveLength(0);});
 it('assigns stable distinct radar phases so clusters do not all pulse in unison',()=>{
  const point=fixture(),second={...point,id:'g:2:3:1'};const phases=mapFeatures([point,second],'',1000,()=> '#123456').features.map((feature:any)=>feature.properties.radarPhase);
  expect(phases[0]).toBeGreaterThanOrEqual(0);expect(phases[0]).toBeLessThan(1);expect(phases[0]).not.toBe(phases[1]);expect(mapFeatures([point],'',2000,()=> '#123456').features[0].properties.radarPhase).toBe(phases[0]);
 });

});
