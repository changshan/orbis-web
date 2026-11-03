import { checkPreviewPrivacy } from "./preview-privacy";
checkPreviewPrivacy(process.env).then(()=>console.log("Preview privacy preflight passed.")).catch(()=>{
 console.error("Preview blocked: remote log privacy settings are unavailable or unsafe. Version uploads do not apply observability settings.");
 process.exitCode=1;
});
