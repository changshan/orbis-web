import {describe,it,expect} from 'vitest';
import {createExpression} from '@maplibre/maplibre-gl-style-spec';
// @ts-expect-error JavaScript motion model used by the renderer.
import {pulseFrame,shouldAnimate,clusterWavePaint,clusterGlowPaint} from '../../src/vision/motion.mjs';
function evaluate(value:unknown,phase:number){const parsed=createExpression(value,'layers[0].paint.circle-opacity');if(parsed.result!=='success')throw Error(JSON.stringify(parsed.value));return parsed.value.evaluate({zoom:0},{type:'Point',properties:{radarPhase:phase}})as number;}
describe('layered cluster radar',()=>{
 it('emits a clearly visible traveling ring that fades cleanly at either end',()=>{
  const start=clusterWavePaint(0),mid=clusterWavePaint(.4),end=clusterWavePaint(.99);
  expect(evaluate(start.extra,0)).toBeLessThan(evaluate(mid.extra,0));expect(evaluate(mid.extra,0)).toBeLessThan(evaluate(end.extra,0));
  expect(evaluate(start.opacity,0)).toBe(0);expect(evaluate(mid.opacity,0)).toBeGreaterThan(.55);expect(evaluate(end.opacity,0)).toBeLessThan(.04);
 });
 it('offsets neighboring clusters and the second wave while keeping the core stable',()=>{
  const primary=clusterWavePaint(.1),secondary=clusterWavePaint(.1,.5);
  expect(evaluate(primary.extra,0)).not.toBe(evaluate(primary.extra,.3));expect(evaluate(primary.extra,0)).not.toBe(evaluate(secondary.extra,0));
  expect(pulseFrame(1000).clusterBreath).toBe(0);expect(pulseFrame(1000).clusterOpacity).toBe(1);
 });
 it('breathes a soft halo beneath the traveling rings',()=>{
  const first=clusterGlowPaint(0),peak=clusterGlowPaint(.5);
  expect(evaluate(first.opacity,0)).toBeGreaterThan(0);expect(evaluate(peak.opacity,0)).toBeGreaterThan(evaluate(first.opacity,0));expect(evaluate(peak.extra,0)).toBeGreaterThan(evaluate(first.extra,0));
 });
 it('keeps all paint values finite over long runs and invalid elapsed values',()=>{
  for(const time of [NaN,-1,0,750,1500,3000,99999999]){const frame=pulseFrame(time);expect(Number.isFinite(frame.clusterPhase)).toBe(true);const paint=clusterWavePaint(frame.clusterPhase);expect(evaluate(paint.extra,.37)).toBeLessThanOrEqual(38);expect(evaluate(paint.opacity,.37)).toBeLessThanOrEqual(1);}
 });
 it('pauses background work and keeps requested cluster motion available',()=>{
  expect(shouldAnimate({hidden:true,hasAlerts:true,hasClusters:true})).toBe(false);expect(shouldAnimate({hasAlerts:false})).toBe(false);expect(shouldAnimate({hasAlerts:true,hasClusters:true,reducedMotion:true})).toBe(true);
 });
});
