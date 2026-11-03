// Explicit CommonJS exports preserve the official SDK's constructor shape in Node and workerd bundles.
const sts=require("@alicloud/sts20150401");
module.exports={Client:sts.default,AssumeRoleRequest:sts.AssumeRoleRequest,Config:require("@alicloud/openapi-core").$OpenApiUtil.Config,RuntimeOptions:require("@darabonba/typescript").RuntimeOptions};
