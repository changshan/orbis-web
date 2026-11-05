import {test,expect,type Page} from '@playwright/test';
import{readFileSync}from'node:fs';
const fixture=(name:string)=>JSON.parse(readFileSync(`tests/fixtures/vision/${name}.json`,'utf8'));
async function setup(page:Page,{mapFailure=false,challenge=false,unknown=false,badLink=false}={}){
 const calls:string[]=[];let minted=0;
 await page.route('https://tiles.openfreemap.org/**',route=>mapFailure?route.abort():route.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':'#d9e9f5'}}]}}));
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={ready:()=>{throw new Error('ready cannot be used with async script');},render:(el,o)=>{el.textContent='TEST VERIFICATION';setTimeout(()=>o.callback('synthetic-once'),20);return 'synthetic';},remove:()=>{}};`}));
 await page.route('**/api/vision/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname);const lang=url.searchParams.get('lang')||'en';
  if(url.pathname.endsWith('/session')){minted++;await route.fulfill({status:challenge&&minted===1?403:200,json:challenge&&minted===1?{code:'FORBIDDEN'}:{expiresAt:Date.now()+900000}});return;}
  let data=fixture(url.pathname.includes('/cities/')?'city.ok':url.pathname.endsWith('/changes')?'changes.ok':'snapshot.ok');
  data.language=lang;data.readStatus={...data.readStatus,state:'degraded',isStale:true};
  if(data.events)for(const event of data.events){event.displayUntil=Date.now()+600000;event.sourceRetrievedAt=Date.now();if(unknown)event.hazardType='futureHazard';}
  if(url.pathname.includes('/cities/')){data.events[0].headline.text='<img src=x onerror=alert(1)>';data.events[0].sourceUrl=badLink?'javascript:alert(1)':'https://example.com/synthetic-event';data.events[0].recordVersion+=1;}
  await route.fulfill({json:data});
 });
 // Exercise the actual generated page under its restrictive CSP, not only the static test server.
 await page.route(/\/(en|zh)\/vision\/$/,async route=>{
  const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; connect-src 'self' https://tiles.openfreemap.org https://challenges.cloudflare.com; worker-src 'self'; img-src 'self' data: blob: https://tiles.openfreemap.org; frame-src https://challenges.cloudflare.com; object-src 'none'"}});
 });
 return {calls,mints:()=>minted};
}
test('public map loads live protocol, keeps a degraded warning, and isolates details',async({page})=>{
 const f=await setup(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/en/vision/');await expect(page.locator('#sync-label')).toContainText('Updates are delayed');
 await expect(page.locator('#map-loading')).toBeHidden({timeout:20000});await page.getByRole('button',{name:'Live alerts',exact:true}).click();
 await expect(page.locator('.city-row')).toHaveCount(1);await expect(page.locator('#feed-status')).toHaveAttribute('data-degraded','true');
 await page.locator('.city-row').click();await expect(page.locator('#detail h3')).toHaveText('<img src=x onerror=alert(1)>');
 await expect(page.locator('#detail img')).toHaveCount(0);await expect(page.locator('#detail a')).toHaveAttribute('href','https://example.com/synthetic-event');
 await page.getByRole('button',{name:'Back to live alerts',exact:true}).click();await expect(page.locator('.city-subtitle')).toHaveText('Synthetic contract sample');
 expect(f.mints()).toBe(1);expect(errors).toEqual([]);await expect(page.locator('#diagnostics')).toHaveCount(0);
 await page.screenshot({path:'/private/tmp/orbis-vision-web-public/map-desktop.jpg',fullPage:true});
});
test('theme changes preserve filter, selection, and list position',async({page})=>{
 await setup(page);await page.goto('/en/vision/');await expect(page.locator('#map-loading')).toBeHidden({timeout:20000});
 await page.locator('#list-toggle').click();await page.locator('#search').fill('London');await page.locator('[data-hazard="earthquake"]').click();await page.locator('.city-row').click();
 for(const name of ['Dark','Simple','Standard']){
  await page.locator('#basemap-picker summary').click();await page.getByRole('button',{name,exact:true}).click();
  await expect(page.locator('#map-loading')).toBeHidden({timeout:20000});await expect(page.locator('.filters [data-hazard] .filter-icon svg')).toHaveCount(5);await expect(page.locator('#search')).toHaveValue('London');await expect(page.locator('#detail')).toBeVisible();await expect(page.locator('[data-hazard="earthquake"]')).toHaveAttribute('aria-pressed','true');
 }
});
test('mobile stacks the list below the map and keeps the language route',async({page})=>{
 await page.setViewportSize({width:390,height:844});await setup(page);await page.goto('/zh/');await expect(page.getByRole('link',{name:'Vision',exact:true})).toBeVisible();await page.getByRole('link',{name:'Vision',exact:true}).click();
 await expect(page.locator('#sync-label')).toContainText('数据更新延迟');await page.locator('#list-toggle').click();
 const map=await page.locator('.map-panel').boundingBox(),list=await page.locator('#latest-panel').boundingBox();
 expect(map!.height).toBeGreaterThan(300);await expect(page.locator('.vision-entry')).toBeVisible();expect(list!.y).toBeGreaterThanOrEqual(map!.y+map!.height-1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.locator('.lang-switch')).toHaveAttribute('href','/en/vision/');
 await page.screenshot({path:'/private/tmp/orbis-vision-web-public/map-mobile.jpg',fullPage:true});
});
test('basemap failure leaves the alerts and details usable with unknown hazards',async({page})=>{
 await setup(page,{mapFailure:true,unknown:true});await page.goto('/en/vision/');await expect(page.locator('#sync-label')).toContainText('Updates are delayed');
 await page.locator('#list-toggle').click();await expect(page.locator('.city-row')).toContainText('Unclassified (futureHazard)');await page.locator('.city-row').click();await expect(page.locator('#detail h3')).toBeVisible();
});
test('a demanded challenge mints a session once, then clears the token UI',async({page})=>{
 const f=await setup(page,{challenge:true});await page.goto('/en/vision/');await expect(page.locator('#sync-label')).toContainText('Updates are delayed');expect(f.mints()).toBe(2);await expect(page.locator('#vision-challenge')).toBeEmpty();
 expect(await page.evaluate(()=>Object.keys(localStorage).length+Object.keys(sessionStorage).length)).toBe(0);
});

test('unsafe source URLs fail closed while summaries remain readable',async({page})=>{
 await setup(page,{badLink:true});await page.goto('/en/vision/');await expect(page.locator('#sync-label')).toContainText('Updates are delayed');
 await page.locator('#list-toggle').click();await page.locator('.city-row').click();
 await expect(page.locator('#detail')).toContainText('Details unavailable');await expect(page.locator('#detail a')).toHaveCount(0);
});
