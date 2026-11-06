// Local-only entry. Never referenced by Wrangler or website build configurations.
export {VisionQuota,VisionCacheShard} from "../../src/worker/vision/durable";
import {handleVision} from "../../src/worker/vision/runtime";
export default {async fetch(request:Request,env:VisionBindings){
 const url=new URL(request.url);
 if(url.pathname==="/__fixture/take")return Response.json(await env.VISION_QUOTA.getByName("fixture-counter").take([{key:"synthetic-persistent",limit:1,ms:60000}]));
 return handleVision(request,env);
}};
