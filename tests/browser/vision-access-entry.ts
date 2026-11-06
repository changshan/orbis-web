import {mountVisionAccess} from "../../src/vision/access";
const root=document.querySelector<HTMLElement>("[data-vision-access]")!;
const access=mountVisionAccess(root,{locale:document.documentElement.lang==="zh"?"zh":"en",siteKey:"SYNTHETIC_SITE_KEY"});
window.addEventListener("pagehide",()=>access.dispose(),{once:true});
