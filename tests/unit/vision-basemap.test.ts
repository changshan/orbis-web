import{describe,it,expect,vi}from'vitest';
// @ts-expect-error Approved map adapter is JavaScript.
import{createBasemapController}from'../../src/vision/basemap.mjs';
describe('Vision basemap changes',()=>{
 it('restores layers without resetting a user camera or selection',()=>{
  const callbacks=new Map<string,()=>void>();const ready=vi.fn();const map={on:(key:string,fn:()=>void)=>callbacks.set(key,fn),setStyle:vi.fn(),easeTo:vi.fn()};
  const controller=createBasemapController(map,{styleReady:ready});expect(controller.select('fiord')).toBe(true);callbacks.get('style.load')!();
  expect(map.easeTo).not.toHaveBeenCalled();expect(ready).toHaveBeenCalledOnce();expect(controller.select('unsupported')).toBe(false);expect(controller.select('positron')).toBe(false);expect(map.setStyle).toHaveBeenCalledOnce();
 });
});
