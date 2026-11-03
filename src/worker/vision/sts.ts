import {Client,AssumeRoleRequest,Config,RuntimeOptions} from "./sts-sdk.cjs";
import type { Credentials } from "./credentials";
import type { VisionEnvironment } from "./config";
/** Fixed native STS endpoint and role. SDK errors are never logged or returned to browsers. */
export async function assumeGatewayRole(env:VisionEnvironment):Promise<Credentials>{
 const role=env.VISION_FC_ROLE_ARN;
 if(typeof role!=="string"||!/^acs:ram::[0-9]{8,20}:role\/orbis-vision-gateway$/.test(role)||!env.VISION_STS_ACCESS_KEY_ID||!env.VISION_STS_ACCESS_KEY_SECRET)throw new Error("credentials unavailable");
 const client=new Client(new Config({accessKeyId:env.VISION_STS_ACCESS_KEY_ID,accessKeySecret:env.VISION_STS_ACCESS_KEY_SECRET,endpoint:"sts.cn-hangzhou.aliyuncs.com",regionId:"cn-hangzhou",readTimeout:3000,connectTimeout:1500}));
 const response=await client.assumeRoleWithOptions(new AssumeRoleRequest({roleArn:role,roleSessionName:"orbis-vision-gateway",durationSeconds:900}),new RuntimeOptions({autoretry:false,maxAttempts:1,readTimeout:3000,connectTimeout:1500}));
 const c=response.body?.credentials;
 return {accessKeyId:c?.accessKeyId??"",accessKeySecret:c?.accessKeySecret??"",securityToken:c?.securityToken??"",credentialsExpireAt:Date.parse(c?.expiration??"")};
}
