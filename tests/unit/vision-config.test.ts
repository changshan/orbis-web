import{describe,it,expect}from'vitest';
import{experimental_readRawConfig}from'wrangler';
import{settings,type VisionEnvironment}from'../../src/worker/vision/config';
const{rawConfig}=experimental_readRawConfig({config:'wrangler.jsonc'});
const env={...rawConfig.vars,VISION_GATEWAY_KEY:Buffer.alloc(32,1).toString('base64'),VISION_TURNSTILE_SECRET:'synthetic-secret',VISION_STS_ACCESS_KEY_ID:'synthetic-id',VISION_STS_ACCESS_KEY_SECRET:'synthetic-secret'} as VisionEnvironment;
const limits=JSON.parse(env.VISION_LIMITS!);
describe('Vision admission configuration',()=>{
 it('supports requiring verification for every new session without disabling budgets',()=>{
  expect(settings({...env,VISION_LIMITS:JSON.stringify({...limits,challengeAfter:0})}).limits.challengeAfter).toBe(0);
 });
 it('still rejects zero hard quotas and negative challenge thresholds',()=>{
  expect(()=>settings({...env,VISION_LIMITS:JSON.stringify({...limits,requestPerMinute:0})})).toThrow();
  expect(()=>settings({...env,VISION_LIMITS:JSON.stringify({...limits,challengeAfter:-1})})).toThrow();
 });
});
