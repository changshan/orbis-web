import {describe,it,expect} from 'vitest';
// @ts-expect-error JavaScript motion model used by the map renderer.
import {pulseFrame,shouldAnimate} from '../../src/vision/motion.mjs';
describe('map cluster radar motion',()=>{
 it('keeps two staggered waves moving while the label-sized core stays stable',()=>{
  const first=pulseFrame(0),later=pulseFrame(600);
  expect(first.clusterSecondaryExtra).toBeGreaterThan(first.clusterExtra);
  expect(later.clusterExtra).toBeGreaterThan(first.clusterExtra);
  expect(later.clusterSecondaryExtra).toBeGreaterThan(first.clusterSecondaryExtra);
  expect(later.clusterBreath).toBeGreaterThanOrEqual(0);expect(later.clusterBreath).toBeLessThanOrEqual(2.4);
  expect(later.clusterOpacity).toBeGreaterThanOrEqual(.85);expect(later.clusterOpacity).toBeLessThanOrEqual(1);
  expect(first.secondaryOpacity).toBeGreaterThan(0);
 });
 it('keeps motion bounded over long runs and invalid elapsed values',()=>{
  for(const time of [NaN,-1,0,600,1200,1800,2400,99999999]){
   const frame=pulseFrame(time);
   for(const key of ['clusterExtra','clusterSecondaryExtra','clusterBreath','clusterOpacity','secondaryOpacity'])expect(Number.isFinite(frame[key])).toBe(true);
   expect(frame.clusterExtra).toBeLessThanOrEqual(30);expect(frame.clusterSecondaryExtra).toBeLessThanOrEqual(30);
  }
 });
 it('stops expensive frame updates in the background or without visible alerts',()=>{
  expect(shouldAnimate({hidden:true,hasAlerts:true})).toBe(false);expect(shouldAnimate({paused:true,hasAlerts:true})).toBe(false);expect(shouldAnimate({hasAlerts:false})).toBe(false);expect(shouldAnimate({hasAlerts:true})).toBe(true);
 });
});
