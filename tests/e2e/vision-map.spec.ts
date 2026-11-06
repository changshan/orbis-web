import {test,expect,type Page} from '@playwright/test';
import{readFileSync}from'node:fs';
const fixture=(name:string)=>JSON.parse(readFileSync(`tests/fixtures/vision/${name}.json`,'utf8'));

function assetCsp(path:string){
 let policy='';
 for(const block of readFileSync('dist/_headers','utf8').trim().split(/\n\s*\n/)){
  const [pattern='',...lines]=block.split('\n');
  const match=new RegExp('^'+pattern.split('*').map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$');
  if(!match.test(path))continue;
  for(const line of lines.map(x=>x.trim())){
   if(line==='! Content-Security-Policy')policy='';
   else if(line.startsWith('Content-Security-Policy:'))policy+=(policy?', ':'')+line.slice('Content-Security-Policy:'.length).trim();
  }
 }
 return policy;
}
async function setup(page:Page,{mapFailure=false,challenge=false,unknown=false,badLink=false,vector=false}={}){
 const calls:string[]=[];let minted=0;
 await page.route(/\/assets\/vision-worker\.[^/]+\.js$/,async route=>{const response=await route.fetch();await route.fulfill({response,headers:{...response.headers(),'content-security-policy':assetCsp(new URL(route.request().url()).pathname)}});});
 await page.route('https://tiles.openfreemap.org/**',route=>vector?(route.request().url().endsWith('.pbf')?route.fulfill({body:Buffer.from('GjN4AQoEbGFuZCiAIBIYEgIAABgDIhAJnA7MJRoA8Q/IIwAA8g8PGgRraW5kIgYKBGxhbmQ=','base64'),contentType:'application/vnd.mapbox-vector-tile'}):route.fulfill({json:{version:8,sources:{land:{type:'vector',tiles:['https://tiles.openfreemap.org/synthetic/{z}/{x}/{y}.pbf'],maxzoom:0}},layers:[{id:'background',type:'background',paint:{'background-color':'#ffffff'}},{id:'land',type:'fill',source:'land','source-layer':'land',paint:{'fill-color':'#18a058'}}]}})):mapFailure?route.abort():route.fulfill({json:{version:8,sources:{credits:{type:'geojson',data:{type:'FeatureCollection',features:[]},attribution:'<a href="https://openfreemap.org">OpenFreeMap</a> | © OpenMapTiles | <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}},layers:[{id:'background',type:'background',paint:{'background-color':'#d9e9f5'}},{id:'credits',type:'circle',source:'credits'}]}}));
 await page.route('https://challenges.cloudflare.com/**',route=>route.fulfill({contentType:'application/javascript',body:`window.turnstile={ready:()=>{throw new Error('ready cannot be used with async script');},render:(el,o)=>{el.textContent='TEST VERIFICATION';setTimeout(()=>o.callback('synthetic-once'),20);return 'synthetic';},remove:()=>{}};`}));
 await page.route('**/api/vision/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname);const lang=url.searchParams.get('lang')||'en';
  if(url.pathname.endsWith('/session')){minted++;await route.fulfill({status:challenge&&minted===1?403:200,json:challenge&&minted===1?{code:'FORBIDDEN'}:{expiresAt:Date.now()+900000}});return;}
  let data=fixture(url.pathname.includes('/cities/')?'city.ok':url.pathname.endsWith('/map')?'map.ok':url.pathname.endsWith('/feed')?'feed.ok':url.pathname.endsWith('/changes')?'changes.ok':'snapshot.ok');
  data.language=lang;
  if(url.pathname.endsWith('/map')){data.view=url.searchParams.get('view')||'0/0/0/1/1';data.hazard=url.searchParams.get('hazard')||'';data.expiresAt=Date.now()+60000;if(unknown)data.hazardTypes=['futureHazard'];}
  if(url.pathname.endsWith('/feed')){data.hazard=url.searchParams.get('hazard')||'';data.queryHash=(await import('node:crypto')).createHash('sha256').update(url.searchParams.get('query')||'').digest('hex');}
  data.readStatus={...data.readStatus,state:'degraded',isStale:true};
  if(data.events)for(const event of data.events){event.displayUntil=Date.now()+600000;event.sourceRetrievedAt=Date.now();if(unknown)event.hazardType='futureHazard';}
  if(url.pathname.includes('/cities/')){data.events[0].headline.text='<img src=x onerror=alert(1)>';data.events[0].sourceUrl=badLink?'javascript:alert(1)':'https://example.com/synthetic-event';}
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
 for(const name of ['Dark','Standard']){
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


test('shared header keeps ORBIS typography and a divider before Vision',async({page})=>{
 await setup(page);
 for(const width of [1280,390,360]){
  await page.setViewportSize({width,height:844});await page.goto('/zh/');
  const typography=()=>page.locator('.brand').evaluate(el=>{const s=getComputedStyle(el);return {font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,spacing:s.letterSpacing};});
  const home=await typography();await page.getByRole('link',{name:'Vision',exact:true}).click();
  expect(await typography()).toEqual(home);expect(await page.locator('.vision-entry').evaluate(el=>getComputedStyle(el).fontSize)).toBe(home.size);
  await expect(page.locator('.vision-notice')).toHaveCount(0);
  const header=await page.locator('.site-header').boundingBox(),workspace=await page.locator('.workspace').boundingBox();
  expect(workspace!.y).toBeCloseTo(header!.y+header!.height,0);
  await expect(page.locator('.brand-divider')).toBeVisible();await expect(page.locator('.brand-divider')).toHaveText('|');
  const brand=await page.locator('.brand').boundingBox(),divider=await page.locator('.brand-divider').boundingBox(),vision=await page.locator('.vision-entry').boundingBox();
  expect(divider!.x).toBeGreaterThanOrEqual(brand!.x+brand!.width);expect(divider!.x-(brand!.x+brand!.width)).toBeLessThanOrEqual(6.5);expect(vision!.x-(divider!.x+divider!.width)).toBeLessThanOrEqual(6.5);
 }
});
test('map removes optional MapLibre credit while retaining data attribution across themes',async({page})=>{
 await setup(page);await page.goto('/en/vision/');await expect(page.locator('#map-loading')).toBeHidden({timeout:20000});
 for(const name of [null,'Dark','Standard']){
  if(name){await page.locator('#basemap-picker summary').click();await page.getByRole('button',{name,exact:true}).click();await expect(page.locator('#map-loading')).toBeHidden({timeout:20000});}
  const credit=page.locator('.map-attribution');await expect(credit).toHaveText('© OpenMapTiles © OpenStreetMap');await expect(credit.locator('a')).toHaveCount(2);await expect(page.locator('.maplibregl-ctrl-attrib-button,.maplibregl-ctrl-attrib summary')).toHaveCount(0);
 }
});


test('vector basemaps actually paint geography after each layer switch',async({page})=>{
 await setup(page,{vector:true});await page.goto('/en/vision/');
 const greenPixels=async()=>{
  const image=(await page.locator('.maplibregl-canvas').screenshot()).toString('base64');
  return page.evaluate(async base64=>{
   const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
   const context=canvas.getContext('2d')!;context.drawImage(img,0,0);const {data}=context.getImageData(0,0,canvas.width,canvas.height);let count=0;
   for(let i=0;i<data.length;i+=4)if(data[i]!<40&&data[i+1]!>140&&data[i+1]!<185&&data[i+2]!>65&&data[i+2]!<110)count++;
   return count;
  },image);
 };
 for(const name of [null,'Dark','Standard']){
  if(name){await page.locator('#basemap-picker summary').click();await page.getByRole('button',{name,exact:true}).click();}
  await expect.poll(greenPixels,{timeout:12000}).toBeGreaterThan(500);
 }
});


test('connection failures use the live-alert radar instead of a left status and retry button',async({page})=>{
 await setup(page);let recover=false;
 await page.route('**/api/vision/map?**',async route=>{if(!recover){await route.fulfill({status:503,json:{code:'UNAVAILABLE',retryAfterSeconds:1}});return;}const data=fixture('map.ok');data.view=new URL(route.request().url()).searchParams.get('view')||'0/0/0/1/1';data.expiresAt=Date.now()+60000;await route.fulfill({json:data});});
 await page.goto('/en/vision/');const toggle=page.locator('#list-toggle');await expect(toggle).toHaveAttribute('data-connection','error',{timeout:10000});
 await expect(page.locator('.map-status,.connection,#retry-data')).toHaveCount(0);await expect(toggle.locator('.signal-broken')).toBeVisible();await expect(toggle).toHaveAttribute('title',/connection|retry|interrupted/i);
 recover=true;await toggle.click();await expect(page.locator('.city-row')).toHaveCount(1,{timeout:10000});await page.locator('#panel-close').click();await expect(toggle).not.toHaveAttribute('data-connection','error');
 await page.locator('#basemap-picker summary').click();await expect(page.locator('#basemap-picker button')).toHaveCount(2);await expect(page.getByRole('button',{name:'Simple',exact:true})).toHaveCount(0);
});

test('initial map uses one bounded response and defers lists and city details',async({page})=>{
 const f=await setup(page);await page.goto('/en/vision/');await expect(page.locator('#sync-label')).toContainText('Updates are delayed');
 expect(f.calls.some(path=>path.endsWith('/map'))).toBe(true);expect(f.calls.some(path=>/snapshot|changes|feed|cities/.test(path))).toBe(false);
 await page.locator('#list-toggle').click();await expect(page.locator('.city-row')).toHaveCount(1);
 expect(f.calls.some(path=>path.endsWith('/feed'))).toBe(true);expect(f.calls.some(path=>path.includes('/cities/'))).toBe(false);
 await page.locator('.city-row').click();await expect(page.locator('#detail h3')).toBeVisible();expect(f.calls.some(path=>path.includes('/cities/'))).toBe(true);
});

test('an unloaded list does not claim zero alerts',async({page})=>{
 await setup(page);let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/vision/feed?**',async route=>{await gate;await route.fallback();});
 await page.goto('/en/vision/');await expect(page.locator('#sync-label')).toContainText('Updates are delayed');await page.locator('#list-toggle').click();
 await expect(page.locator('#result-count')).toHaveText('Loading alerts…');await expect(page.locator('#city-list')).toContainText('Loading alerts…');
 release();await expect(page.locator('.city-row')).toHaveCount(1);
});

test('loading live-alert icon keeps emitting radar waves with system reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await setup(page);
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await page.route('**/api/vision/map?**',async route=>{await gate;await route.fallback();});
 await page.goto('/en/vision/');const toggle=page.locator('#list-toggle');await expect(toggle).toHaveAttribute('data-connection','connecting');
 const loading=toggle.locator('.signal-loading');await expect(loading).toBeVisible();await expect(toggle.locator('.signal-waves')).toBeHidden();
 const sweep=loading.locator('.signal-sweep');await expect(sweep).toBeVisible();await expect(loading.locator('.signal-grid circle')).toHaveCount(2);await expect(loading.locator('.signal-target')).toBeVisible();
 expect(await sweep.evaluate(node=>getComputedStyle(node).animationName)).toBe('radar-sweep');
 const before=await sweep.evaluate(node=>getComputedStyle(node).transform);await expect.poll(()=>sweep.evaluate(node=>getComputedStyle(node).transform)).not.toBe(before);
 await page.emulateMedia({reducedMotion:'reduce'});expect(await sweep.evaluate(node=>getComputedStyle(node).animationName)).toBe('radar-sweep');
 await page.emulateMedia({reducedMotion:'no-preference'});release();await expect(toggle).toHaveAttribute('data-connection','degraded');await expect(loading).toBeHidden();await expect(toggle.locator('.signal-waves')).toBeVisible();
});

test('blue map clusters visibly pulse with either system motion preference',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await setup(page);await page.goto('/en/vision/');
 await expect(page.locator('#map-loading')).toBeHidden({timeout:20000});await expect(page.locator('#sync-label')).toContainText('Updates are delayed');
 const canvas=page.locator('.maplibregl-canvas');
 const capture=async()=> (await canvas.screenshot()).toString('base64');
 const difference=async(first:string,second:string)=>page.evaluate(async({first,second})=>{
  const pixels=async(base64:string)=>{const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const ctx=canvas.getContext('2d')!;ctx.drawImage(img,0,0);return ctx.getImageData(0,0,canvas.width,canvas.height).data;};
  const a=await pixels(first),b=await pixels(second);let changed=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]!-b[i]!)+Math.abs(a[i+1]!-b[i+1]!)+Math.abs(a[i+2]!-b[i+2]!)>12)changed++;return changed;
 },{first,second});
 const first=await capture();await expect.poll(async()=>difference(first,await capture()),{timeout:3000}).toBeGreaterThan(40);
 await page.emulateMedia({reducedMotion:'reduce'});
 const reducedFrame=await capture();await expect.poll(async()=>difference(reducedFrame,await capture()),{timeout:3000}).toBeGreaterThan(40);
});

test('search action is on the right and supports clicking and Enter in both page languages',async({page})=>{
 await setup(page);const searches:string[]=[];
 await page.route('**/api/vision/feed?**',async route=>{searches.push(new URL(route.request().url()).searchParams.get('query')||'');await route.fallback();});
 for(const language of ['en','zh']){
  searches.length=0;await page.goto('/'+language+'/vision/');await page.locator('#list-toggle').click();await expect(page.locator('.city-row')).toHaveCount(1);
  const input=page.locator('#search'),button=page.locator('#search-submit');await expect(button).toBeVisible();
  const inputBox=await input.boundingBox(),buttonBox=await button.boundingBox();expect(buttonBox!.x).toBeGreaterThanOrEqual(inputBox!.x+inputBox!.width-1);
  await input.fill('伦敦');await button.click();await expect.poll(()=>searches.includes('伦敦')).toBe(true);
  await input.fill('LONDON');await input.press('Enter');await expect.poll(()=>searches.includes('london')).toBe(true);
 }
});

test('Chinese input composition waits for complete text before searching',async({page})=>{
 await setup(page);const searches:string[]=[];await page.route('**/api/vision/feed?**',async route=>{searches.push(new URL(route.request().url()).searchParams.get('query')||'');await route.fallback();});
 await page.goto('/en/vision/');await page.locator('#list-toggle').click();await expect(page.locator('.city-row')).toHaveCount(1);
 await page.locator('#search').evaluate(node=>{const input=node as HTMLInputElement;input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.value='bei';input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true,data:'bei'}));});
 await page.waitForTimeout(350);expect(searches).not.toContain('bei');
 await page.locator('#search').evaluate(node=>{const input=node as HTMLInputElement;input.value='北京';input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'北京'}));});await expect.poll(()=>searches.includes('北京')).toBe(true);
});

test('feed status keeps a rotating live-refresh arrow, updated time, and no red stale copy',async({page})=>{
 await setup(page);
 for(const lang of ['zh','en']){
  await page.goto('/'+lang+'/vision/');await page.locator('#list-toggle').click();await expect(page.locator('.city-row')).toHaveCount(1);
  const status=page.locator('#feed-status'),icon=page.locator('#feed-status-icon');
  await expect(page.locator('#feed-status-text')).toHaveText(lang==='zh'?'实时刷新':'Live refresh');
  await expect(page.locator('#feed-sync-time')).toContainText(lang==='zh'?'更新于':'Updated');
  await expect(status).toHaveAttribute('data-degraded','true');
  expect(await status.evaluate(el=>getComputedStyle(el,'::after').content)).toMatch(/^(none|normal|"")$/);
  await expect(icon).toHaveText('↻');
  await expect.poll(()=>icon.evaluate(el=>el.getAnimations().filter(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity).length)).toBe(1);
  const before=await icon.evaluate(el=>getComputedStyle(el).transform);await page.waitForTimeout(160);expect(await icon.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await expect(status).toHaveAttribute('data-state','live',{timeout:10000});
  await expect(page.locator('#feed-status-text')).toHaveText(lang==='zh'?'实时刷新':'Live refresh');
  expect(await icon.evaluate(el=>el.getAnimations().some(a=>a.playState==='running'&&a.effect?.getTiming().iterations===Infinity))).toBe(true);
 }
});
