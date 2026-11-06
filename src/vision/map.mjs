import {VisionClient} from './client';
import {turnstileChallenge} from './turnstile';
import * as maplibregl from 'maplibre-gl';
import { applyChanges, diffAlerts, syncStatus, PRIMARY_HAZARDS, otherHazardTypes } from './model.mjs';
import { shouldAnimate, pulseFrame, clusterWavePaint, clusterGlowPaint, isRecentEvent } from './motion.mjs';
import { localeFromPath,translate,eventText } from './i18n.mjs';
import { VisionPipelineClient } from './sync.mjs';
import { VisionViewportClient } from './viewport-sync.mjs';
import { viewportFromBounds } from './viewport';
import {mapFeatures} from './point-features.mjs';
import { BASEMAPS,createBasemapController } from './basemap.mjs';
const locale=localeFromPath(location.pathname),t=(key,values)=>translate(locale,key,values);
const challengeRoot=document.getElementById('vision-challenge');
const access=new VisionClient({origin:location.origin,challenge:turnstileChallenge(challengeRoot,document.querySelector('[data-vision-root]').dataset.siteKey,locale)});
const legacy=new VisionPipelineClient(locale);
const pipeline=new VisionViewportClient(locale,async(url)=>Response.json(await access.read(url)));
let mapPoints=[],mapView=null,feedReady=false,feedHasMore=false,feedRows=[],feedGeneration=0,viewGeneration=0,viewportTimer,searchTimer;
let feedIdentity='',feedLoadedAt=0;
let detailEvents=new Map(),detailStatus='loading',detailGeneration=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const eventLabel=(event,field)=>eventText(event,field,locale);
const cityLabel=city=>locale==='zh'?city.name:city.nameEn;
const countryNames=new Intl.DisplayNames([locale],{type:'region',fallback:'code'});
const clockZone=locale==='zh'?'Asia/Shanghai':'UTC';

maplibregl.setWorkerUrl(document.querySelector('[data-vision-root]').dataset.mapWorker);
const $ = id => document.getElementById(id);
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"></path></svg>`;
const allHazardsIcon=icon('M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z');
const hazards = {
  heavyRain: { name:t('heavyRain'), icon:icon('M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4.5 4.5 0 1 1 2 9M7 17l-1 3m6-3-1 3m6-3-1 3'), color:'#1C6BB0' },
  flooding: { name:t('flooding'),icon:icon('M2 14c3-4 5 4 8 0s5 4 8 0 4 0 4 0M2 19c3-4 5 4 8 0s5 4 8 0 4 0 4 0M5 10V6l5-4 5 4v4'),color:'#168C9B' },
  earthquake: { name:t('earthquake'), icon:icon('M2 12h4l2-6 4 13 3-10 2 3h5'), color:'#7D699F' },
  wildfire: { name:t('wildfire'), icon:icon('M13 3c1 5 5 6 5 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 3 1 3 2 4 2-3 2-6 2-9Zm-1 11c-2 2-3 5 0 6 3-1 2-4 0-6Z'), color:'#E2701A' },
  wind: { name:t('wind'), icon:icon('M3 8h12a3 3 0 1 0-3-3M3 12h16a2 2 0 1 1-2 2M3 17h7a2 2 0 1 1-2 2'), color:'#A87923' },
  snow: { name:t('snow'), icon:icon('M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3'), color:'#6C899B' },
  volcano: { name:t('volcano'), icon:icon('M3 21 9 8h6l6 13H3Zm6-13 3 3 3-3M10 4 9 2m5 2 1-2'), color:'#7D699F' },
  avalanche: { name:t('avalanche'), icon:icon('M3 20 11 4l9 16M8 10l4 2 2-2m-4 5 2 1m2 2 2 1m-9 0 2 1'), color:'#6C899B' },
};
function hazardMeta(type) {
  if(type==='riverFlood'||type==='flashFlood') return {...hazards.flooding,name:t(type)};
  return (Object.hasOwn(hazards,type)?hazards[type]:null)||{name:t('unknownHazard',{code:type||'unknown'}),color:'#6C899B',icon:icon('M12 3 2 21h20L12 3Zm0 6v5m0 3v1')};
}
const hazardFilterName=type=>type==='avalanche'?t('avalancheFilter'):hazardMeta(type).name;
let state = new Map(), cityIndex = new Map(), cities = [], selected = '', hazard = '', query = '';
let lastPoll = 0, failures = 0, polling = false, mapReady = false, map = null, simulatedFailure = false;
let toastTimer, mapTimeout,basemapControl;
let basemapId='liberty';
let previousAlerts=[];
let feedSync={lastSuccessAt:0,requestStartedAt:0,refreshing:false,failed:false,changedCount:0,feedbackUntil:0};
let feedStatusTimer=0,feedIconAnimation=null,feedPhase='',liveDegraded=false;
const syncClock=new Intl.DateTimeFormat(locale==='zh'?'zh-CN':'en-GB',{
  hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:clockZone});
let animationId = 0, animationStart = 0, lastPaint = 0, freshTimer = 0, hasAnimatedAlerts = false, hasAnimatedClusters = false;
const clusterRadius = ['step',['get','point_count'],18,5,22,10,27];
const mapStats = { startedAt: performance.now(), tileLoads: 0, loadedAt: null };
const date = (value, zone = 'UTC') => new Intl.DateTimeFormat(locale==='zh'?'zh-CN':'en-GB', { month:'2-digit', day:'2-digit',
  hour:'2-digit', minute:'2-digit', hour12:false, timeZone:zone }).format(value);
function cityEvents(city, filtered = false) {
  return (cityIndex.get(city.placeKey)||[]).filter(event=>!event.removed&&event.lifecycleStatus==='active'&&(event.displayUntil==null||Date.now()<event.displayUntil)&&(!filtered||!hazard||event.hazardType===hazard||(hazard==='flooding'&&['flooding','riverFlood','flashFlood'].includes(event.hazardType))));
}
function renderHazardControls() {
  document.querySelectorAll('.filters [data-hazard]').forEach(button=>{
    const type=button.dataset.hazard,active=hazard===type;
    button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
    if(type) {
      const meta=hazardMeta(type);
      button.style.setProperty('--hazard',meta.color);
      const glyph=button.querySelector('.filter-icon');
      if(glyph.innerHTML!==meta.icon) glyph.innerHTML=meta.icon;
    }
  });
  const otherSelected=!hazard||!PRIMARY_HAZARDS.includes(hazard);
  const specific=otherSelected&&!!hazard;
  const label=specific?hazardFilterName(hazard):t('all');
  const toggle=$('other-hazard-toggle');
  toggle.classList.toggle('active',otherSelected);toggle.setAttribute('aria-pressed',String(otherSelected));
  toggle.title=label;toggle.setAttribute('aria-label',label);toggle.style.setProperty('--hazard',specific?hazardMeta(hazard).color:'#6C899B');
  $('other-hazard-label').textContent=label;
  const selectedIcon=specific?hazardMeta(hazard).icon:allHazardsIcon;
  if($('other-hazard-icon').innerHTML!==selectedIcon) $('other-hazard-icon').innerHTML=selectedIcon;
  const observed=new Map([...state,...(mapView?.hazardTypes||[]).map(type=>[type,{hazardType:type}])]);
  const options=['',...otherHazardTypes(observed,Object.keys(hazards))];
  const markup=options.map(type=>{
    const name=type?hazardFilterName(type):t('all');
    const color=type?hazardMeta(type).color:'#6C899B';
    return `<button class="other-hazard-option" data-hazard="${escape(type)}" aria-pressed="${hazard===type}"><span class="filter-icon" aria-hidden="true">${type?hazardMeta(type).icon:allHazardsIcon}</span><span>${escape(name)}</span><span class="option-check" aria-hidden="true">${hazard===type?'✓':''}</span></button>`;
  }).join('');
  if($('other-hazard-menu').innerHTML!==markup) {
    const focusedInside=$('other-hazard-menu').contains(document.activeElement);
    const focused=document.activeElement?.dataset.hazard;
    $('other-hazard-menu').innerHTML=markup;
    $('other-hazard-menu').querySelectorAll('[data-hazard]').forEach(el=>el.style.setProperty('--hazard',hazardMeta(el.dataset.hazard).color));
    if(focusedInside&&options.includes(focused)&&!$('other-hazard-menu').hidden) {
      [...$('other-hazard-menu').querySelectorAll('button')].find(button=>button.dataset.hazard===focused)?.focus({preventScroll:true});
    }
  }
}
function showOtherHazards(open,returnFocus=false) {
  $('other-hazard-menu').hidden=!open;
  $('other-hazard-toggle').setAttribute('aria-expanded',String(open));
  if(open) {
    const room=$('latest-panel').getBoundingClientRect().bottom-$('other-hazard-menu').getBoundingClientRect().top-12;
    $('other-hazard-menu').style.maxHeight=`${Math.max(64,Math.min(190,room))}px`;
  }
  if(returnFocus) $('other-hazard-toggle').focus({preventScroll:true});
}
function setHazardFilter(type) {
  hazard=type;feedReady=false;renderList();renderDetail();void poll({changed:true});
}
function openOtherHazards(focusOption=false) {
  if(PRIMARY_HAZARDS.includes(hazard)) setHazardFilter('');
  showOtherHazards(true);
  if(focusOption) ($('other-hazard-menu').querySelector('[aria-pressed="true"]')||$('other-hazard-menu').querySelector('button'))?.focus();
}
function renderList({animate=false}={}) {
  if($('alert-feed').hidden) return;
  renderHazardControls();
  const alerts=feedReady?feedRows.filter(({event})=>event.displayUntil==null||Date.now()<event.displayUntil):[];
  const changes=diffAlerts(previousAlerts,alerts);
  previousAlerts=alerts;
  $('result-count').textContent=feedReady?t('count',{count:alerts.length})+(feedHasMore?t('countLimit'):''):t(feedSync.failed?'detailFailure':'listLoading');
  const list=$('city-list');
  const visible=animate&&!document.hidden&&!$('latest-panel').hidden&&!selected;
  // Reuse buttons by event identity so focus and a reader's scroll anchor survive polling.
  list.querySelectorAll('.alert-exit,.empty').forEach(element=>element.remove());
  const before=new Map([...list.querySelectorAll('[data-event-id]')].map(row=>[row.dataset.eventId,row]));
  const oldRects=new Map([...before].map(([id,row])=>[id,row.getBoundingClientRect()]));
  const viewport=list.getBoundingClientRect(),atTop=list.scrollTop<8,oldScroll=list.scrollTop;
  const anchor=[...before].find(([id])=>oldRects.get(id).bottom>viewport.top);
  const focused=list.contains(document.activeElement)?document.activeElement:null;
  const ids=new Set(alerts.map(({event,city})=>event.eventId+'|'+city.placeKey));
  const exits=[];
  for(const [id,row] of before) if(!ids.has(id)) {
    if(visible) {
      const ghost=row.cloneNode(true);
      ghost.removeAttribute('data-event-id');
      ghost.classList.add('alert-exit');ghost.disabled=true;ghost.tabIndex=-1;ghost.setAttribute('aria-hidden','true');
      Object.assign(ghost.style,{top:`${row.offsetTop}px`,left:`${row.offsetLeft}px`,width:`${row.offsetWidth}px`,height:`${row.offsetHeight}px`});
      exits.push(ghost);
    }
    row.remove();
  }
  const rows=alerts.map(({event,city,time},index)=>{
    const h=hazardMeta(event.hazardType),fresh=isRecentEvent(event,Date.now());
    const headline=eventLabel(event,'headline'),name=cityLabel(city);
    const row=before.get(event.eventId+'|'+city.placeKey)||document.createElement('button');
    row.className=`city-row ${selected===city.placeKey?'selected':''}`;
    row.dataset.eventId=event.eventId+'|'+city.placeKey;row.dataset.place=city.placeKey;row.disabled=!city.placeKey;
    row.setAttribute('aria-label',t('viewCity',{city:name,headline}));
    const markup=`<span class="hazard-icon">${h.icon}</span><span class="city-copy"><span class="city-name">${escape(name)}<span class="city-country">${escape(city.countryCode)} · ${escape(h.name)}</span>${fresh?`<span class="new-tag">${t('updated')}</span>`:''}</span><span class="city-subtitle">${escape(headline)}</span><span class="alert-time"><time datetime="${new Date(time).toISOString()}">${date(time,clockZone)}</time> ${t('clockZone')} · ${event.sourceUpdatedAt!=null?t('updated'):t('published')}</span></span><span class="row-arrow" aria-hidden="true">›</span>`;
    if(row.innerHTML!==markup) row.innerHTML=markup;
    row.querySelector('.hazard-icon').style.setProperty('--hazard',h.color);
    if(list.children[index]!==row) list.insertBefore(row,list.children[index]||null);
    return row;
  });
  if(!alerts.length) list.innerHTML=`<p class="empty">${feedReady?t('empty'):t(feedSync.failed?'detailFailure':'listLoading')}</p>`;
  if(atTop) list.scrollTop=0;
  else if(anchor&&ids.has(anchor[0])) list.scrollTop+=before.get(anchor[0]).getBoundingClientRect().top-oldRects.get(anchor[0]).top;
  else list.scrollTop=oldScroll;
  if(focused?.isConnected&&document.activeElement!==focused) focused.focus({preventScroll:true});
  if(!visible||reduced.matches) return;
  const appearance=getComputedStyle($('latest-panel'));
  const flashStart=appearance.getPropertyValue('--alert-flash-start').trim();
  const flashMid=appearance.getPropertyValue('--alert-flash-mid').trim();
  const accent=appearance.getPropertyValue('--brand-blue').trim();
  const added=new Set(changes.added),updated=new Set(changes.updated);
  rows.forEach((row,index)=>{
    const id=row.dataset.eventId,rect=row.getBoundingClientRect(),old=oldRects.get(id);
    const inView=rect.bottom>=viewport.top&&rect.top<=viewport.bottom;
    const wasInView=old&&old.bottom>=viewport.top&&old.top<=viewport.bottom;
    if(!inView&&!wasInView) return;
    row.getAnimations().forEach(animation=>animation.cancel());
    if(added.has(id)) row.animate([{opacity:0,transform:'translateY(-14px)'},{opacity:1,transform:'translateY(0)'}],
      {duration:420,delay:Math.min(index,4)*35,easing:'cubic-bezier(.2,.8,.2,1)'});
    else if(old&&Math.abs(old.top-rect.top)>1) row.animate([
      {transform:`translateY(${Math.max(-180,Math.min(180,old.top-rect.top))}px)`},{transform:'translateY(0)'}],
      {duration:420,easing:'cubic-bezier(.2,.8,.2,1)'});
    if(added.has(id)||updated.has(id)) row.animate([
      {backgroundColor:flashStart,boxShadow:`inset 3px 0 ${accent}`},
      {backgroundColor:flashMid,boxShadow:`inset 3px 0 ${accent}`,offset:0.5},
      {backgroundColor:'transparent',boxShadow:'inset 0 0 transparent'}],{duration:2200,easing:'ease-out'});
  });
  for(const ghost of exits) {
    list.append(ghost);
    ghost.animate([{opacity:0.7,transform:'translateX(0)'},{opacity:0,transform:'translateX(-16px)'}],{duration:260,easing:'ease-out'})
      .finished.then(()=>ghost.remove(),()=>ghost.remove());
  }
  if(changes.added.length+changes.updated.length+changes.removed.length) {
    $('live-dot').getAnimations().forEach(animation=>animation.cancel());
    $('live-dot').animate([{boxShadow:`0 0 0 0 ${accent}55`},{boxShadow:`0 0 0 7px ${accent}00`}],{duration:850,iterations:2});
  }
}
function selectCity(placeKey, fly = true) {
  const city = cities.find(item => item.placeKey === placeKey);
  if (!city) return;
  selected = placeKey;
  if($('latest-panel').hidden){$('latest-panel').hidden=false;$('list-toggle').hidden=true;$('list-toggle').setAttribute('aria-expanded','true');requestAnimationFrame(()=>map?.resize());}
  renderList(); renderDetail();
  if (mapReady && fly) {
    map.flyTo({ center:[city.longitude,city.latitude],zoom:Math.max(6,map.getZoom()),
      padding:{right:0,left:0,top:0,bottom:0},
      duration:matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 950 });
  }
  updateMap();
  detailEvents=new Map();detailStatus='loading';renderDetail();const generation=++detailGeneration;
  pipeline.detail(placeKey,mapView).then(data=>{
    if(selected!==placeKey||generation!==detailGeneration)return;
    detailEvents=new Map(data.events.map(event=>[event.eventId,legacy.legacy(event)]));cityIndex.set(placeKey,[...detailEvents.values()]);detailStatus='ready';renderDetail();
  }).catch(()=>{if(selected===placeKey&&generation===detailGeneration){detailStatus='failed';renderDetail();}});
}
function renderDetail() {
  const city=cities.find(item=>item.placeKey===selected);
  $('alert-feed').hidden=!!city;
  if(!city){$('detail').hidden=true;return;}
  const events=cityEvents(city,true).map(summary=>detailEvents.get(summary.eventId)||summary);
  $('detail').hidden=false;
  $('detail').innerHTML=`<div class="detail-head"><button class="detail-close detail-back" aria-label="${t('backToList')}">←</button><div class="detail-title"><h2>${escape(cityLabel(city))}</h2><p class="detail-sub">${escape(locale==='zh'?city.nameEn:city.countryCode)} · ${escape(countryNames.of(city.countryCode))}</p></div></div><div class="detail-meta">${t('placeId')} <code>${escape(city.placeKey)}</code><br>${t('point')} ${city.latitude.toFixed(3)}°, ${city.longitude.toFixed(3)}°<br>${t('detailCount',{count:events.length,version:escape(city.catalogVersion)})}</div><div class="detail-events">${detailStatus!=='ready'?`<p class="empty">${t(detailStatus==='failed'?'detailFailure':'detailLoading')}</p>`:''}${events.length?events.map(event=>{
    const h=hazardMeta(event.hazardType);
    return `<article class="event-card"><div class="event-type"><i></i>${escape(h.name)}${event.isFallback?`<span class="original-language">${t('original')}</span>`:''}</div><h3>${escape(eventLabel(event,'headline'))}</h3><p class="event-summary">${escape(eventLabel(event,'summary'))}</p><dl><dt>${t('level')}</dt><dd>${escape(eventLabel(event,'sourceSeverity'))}</dd><dt>${t('authority')}</dt><dd>${escape(eventLabel(event,'authority'))}</dd>${event.occurredAt?`<dt>${t('occurred')}</dt><dd>${date(event.occurredAt,clockZone)} ${t('clockZone')}</dd>`:''}<dt>${t('publishedAt')}</dt><dd>${(event.publishedAt==null?'—':date(event.publishedAt,clockZone))} ${t('clockZone')}</dd><dt>${t('sourceUpdatedAt')}</dt><dd>${(event.sourceUpdatedAt==null?'—':date(event.sourceUpdatedAt,clockZone))} ${t('clockZone')}</dd><dt>${t('version')}</dt><dd>r${event.recordVersion}</dd></dl><p class="match-note">${escape(eventLabel(event,'matchDescription'))}</p><p class="event-attribution">${escape(event.attribution?.text||'')}</p>${/^https?:\/\//.test(event.sourceUrl||'')?`<a class="sample-source" href="${escape(event.sourceUrl)}" target="_blank" rel="noopener noreferrer">${t('sourceLink')}</a>`:''}</article>`;
  }).join(''):`<p class="empty">${t('detailEmpty')}</p>`}</div>`;
  $('detail').querySelectorAll('.event-type').forEach((el,i)=>el.style.setProperty('--hazard',hazardMeta(events[i].hazardType).color));
}
function features() {return mapFeatures(mapPoints,selected,Date.now(),type=>hazardMeta(type).color);}
function updateMap() {
  if (!mapReady) return;
  const data = features();
  hasAnimatedAlerts = data.features.some(feature=>feature.properties.count>0);
  hasAnimatedClusters = data.features.some(feature=>Object.hasOwn(feature.properties,'point_count'));
  map.getSource('cities')?.setData(data);
  syncMotion();
}
function motionAllowed() {
  return mapReady && shouldAnimate({hidden:document.hidden||simulatedFailure,hasAlerts:hasAnimatedAlerts,hasClusters:hasAnimatedClusters,reducedMotion:reduced.matches});
}
function paintMotion(frame) {
  if (!mapReady || !map.getLayer('vision-city-ripple')) return;
  map.setPaintProperty('vision-city-ripple','circle-radius',frame.pointRadius);
  map.setPaintProperty('vision-city-ripple','circle-stroke-opacity',reduced.matches?0:frame.opacity);
  const glow=clusterGlowPaint(frame.clusterPhase);
  map.setPaintProperty('vision-cluster-glow','circle-radius',['+',clusterRadius,glow.extra]);
  map.setPaintProperty('vision-cluster-glow','circle-opacity',frame.clusterActive?glow.opacity:0);
  for(const [layer,offset] of [['vision-cluster-ripple',0],['vision-cluster-ripple-secondary',0.5]]){
    const wave=clusterWavePaint(frame.clusterPhase,offset);
    map.setPaintProperty(layer,'circle-radius',['+',clusterRadius,wave.extra]);
    map.setPaintProperty(layer,'circle-stroke-opacity',frame.clusterActive?wave.opacity:0);
    map.setPaintProperty(layer,'circle-stroke-width',wave.width);
  }
  map.setPaintProperty('vision-city-fresh','circle-radius',frame.freshRadius);
  map.setPaintProperty('vision-city-fresh','circle-stroke-opacity',reduced.matches?0:frame.freshOpacity);
  map.setPaintProperty('vision-cluster-fresh','circle-radius',['+',clusterRadius,frame.freshRadius-10]);
  map.setPaintProperty('vision-cluster-fresh','circle-stroke-opacity',frame.freshOpacity);
}
function stopMotion() {
  cancelAnimationFrame(animationId); animationId=0;
  paintMotion({...pulseFrame(0),opacity:0,clusterActive:false,freshOpacity:0});
}
function motionTick(now) {
  animationId=0;
  if (!motionAllowed()) {syncMotion();return;}
  // Animate paint only, at most 30 fps. GeoJSON and clusters are not rebuilt per frame.
  if (now-lastPaint>=1000/30) {paintMotion(pulseFrame(now-animationStart));lastPaint=now;}
  animationId=requestAnimationFrame(motionTick);
}
function syncMotion() {
  const active=motionAllowed();
  if (active&&!animationId) {animationStart=performance.now();lastPaint=0;animationId=requestAnimationFrame(motionTick);}
  if (!active) stopMotion();
}
function addMotionLayers() {
  const pointFilter=['all',['!', ['has','point_count']],['>', ['get','count'],0]];
  const clusterFilter=['all',['has','point_count'],['>', ['get','activeCount'],0]];
  const common={'circle-opacity':0,'circle-stroke-width':1.8,'circle-stroke-opacity':0,'circle-radius-transition':{duration:0,delay:0},'circle-stroke-opacity-transition':{duration:0,delay:0}};
  map.addLayer({id:'vision-city-ripple',type:'circle',source:'cities',filter:pointFilter,
    paint:{...common,'circle-radius':10,'circle-stroke-color':['get','color']}},'vision-cities');
  map.addLayer({id:'vision-city-fresh',type:'circle',source:'cities',filter:['all',pointFilter,['>', ['get','recentCount'],0]],
    paint:{...common,'circle-radius':16,'circle-stroke-width':2.2,'circle-stroke-color':['get','color']}},'vision-cities');
  map.addLayer({id:'vision-cluster-glow',type:'circle',source:'cities',filter:clusterFilter,
    paint:{'circle-color':'#2989D8','circle-radius':['+',clusterRadius,10],'circle-opacity':0,'circle-blur':0.8,
      'circle-radius-transition':{duration:0,delay:0},'circle-opacity-transition':{duration:0,delay:0}}},'vision-clusters');
  for(const id of ['vision-cluster-ripple','vision-cluster-ripple-secondary'])map.addLayer({id,type:'circle',source:'cities',filter:clusterFilter,
    paint:{...common,'circle-radius':['+',clusterRadius,4],'circle-stroke-width':2.4,'circle-stroke-width-transition':{duration:0,delay:0},'circle-stroke-color':'#2786CD'}},'vision-clusters');
  map.addLayer({id:'vision-cluster-fresh',type:'circle',source:'cities',filter:['all',clusterFilter,['>', ['get','recentCount'],0]],
    paint:{...common,'circle-radius':['+',clusterRadius,6],'circle-stroke-width':2.2,'circle-stroke-color':'#1C6BB0'}},'vision-clusters');
}
function toast(message) {
  $('update-toast').textContent = message; $('update-toast').hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('update-toast').hidden = true, 4200);
}
function renderFeedStatus() {
  clearTimeout(feedStatusTimer);
  const now=Date.now(),phase=syncStatus({...feedSync,now,hidden:document.hidden});
  const keys={connecting:'feedConnecting',refreshing:'feedRefreshing',live:'feedLive',updated:'feedUpdated',
    checked:'feedChecked',error:'feedError',background:'feedBackground'};
  const connection=phase==='error'?'error':phase==='background'?'paused':phase==='connecting'||phase==='refreshing'?'connecting':liveDegraded?'degraded':'live';
  const status=t(connection==='error'?'connectionLost':connection==='paused'?'feedBackground':connection==='connecting'?'connecting':connection==='degraded'?'degraded':'connected');
  $('list-toggle').dataset.connection=connection;$('list-toggle').title=t('latest')+' · '+status;$('sync-label').textContent=status;
  const autoRefresh=phase!=='error'&&phase!=='background';
  $('feed-status').dataset.state=phase;
  $('feed-status').dataset.autoRefresh=String(autoRefresh);
  $('feed-status-text').textContent=t(autoRefresh&&phase!=='connecting'?'feedRefreshing':keys[phase]);
  const time=$('feed-sync-time');
  time.hidden=!feedSync.lastSuccessAt;
  if(feedSync.lastSuccessAt) {
    time.dateTime=new Date(feedSync.lastSuccessAt).toISOString();
    time.textContent=t('syncedAt',{time:syncClock.format(feedSync.lastSuccessAt),count:feedSync.changedCount});
    time.title=date(feedSync.lastSuccessAt,clockZone)+' '+t('clockZone');
  }
  const iconPhase=autoRefresh?'refreshing':phase;
  if(iconPhase!==feedPhase) {
    feedPhase=iconPhase;feedIconAnimation?.cancel();feedIconAnimation=null;
    const icon=$('feed-status-icon');
    icon.textContent=autoRefresh?'↻':phase==='error'?'!':'●';
    if(autoRefresh) feedIconAnimation=icon.animate(
      [{transform:'rotate(0deg)'},{transform:'rotate(360deg)'}],{duration:1200,iterations:Infinity,easing:'linear'});
  }
  const next=[feedSync.requestStartedAt+650,feedSync.feedbackUntil].filter(time=>time>now);
  if(next.length&&!feedSync.refreshing&&!document.hidden&&!feedSync.failed) feedStatusTimer=setTimeout(renderFeedStatus,Math.min(...next)-now+1);
}
function beginFeedSync() {
  feedSync={...feedSync,refreshing:true,requestStartedAt:Date.now(),feedbackUntil:0};
  renderFeedStatus();
}
function finishFeedSync(changedCount=0) {
  const now=Date.now();
  feedSync={...feedSync,refreshing:false,failed:false,lastSuccessAt:now,changedCount,
    feedbackUntil:Math.max(now,feedSync.requestStartedAt+650)+(changedCount?5000:2000)};
  renderFeedStatus();
}
function failFeedSync() {
  feedSync={...feedSync,refreshing:false,failed:true,feedbackUntil:0};
  renderFeedStatus();
}
function cityPresentation(city) {
 const names=new Intl.DisplayNames(['en'],{type:'region'});
 return {...city,name:city.name.text,nameEn:city.name.text,latitude:city.point.latitude,longitude:city.point.longitude,
  timeZone:'UTC',countryName:city.countryCode,countryNameEn:names.of(city.countryCode)};
}
function mergeCities(incoming) {
 const next=new Map(cities.filter(city=>city.placeKey===selected).map(city=>[city.placeKey,city]));
 for(const city of incoming)next.set(city.placeKey,cityPresentation(city));
 for(const point of mapPoints)if(point.city&&!next.has(point.city.placeKey))next.set(point.city.placeKey,cityPresentation({...point.city,point:point.point,events:[]}));
 cities=[...next.values()];
}
function applyMap(data) {
 mapView=data;mapPoints=data.points;mergeCities([...legacy.cities.values()]);updateMap();renderHazardControls();
 liveDegraded=!!(data.readStatus?.isStale||data.readStatus?.state==='degraded');
 $('feed-status').dataset.degraded=String(liveDegraded);
 clearTimeout(freshTimer);const delay=Math.max(1,data.expiresAt-Date.now());
 freshTimer=setTimeout(()=>{updateMap();void poll({changed:true});},Math.min(delay,2147483647));
}
async function loadFeed(pin=mapView) {
 if(!pin||$('latest-panel').hidden||selected)return 0;
 const generation=++feedGeneration,term=query,filter=hazard,identity=pin.snapshotId+'|'+term+'|'+filter;
 if(feedReady&&identity===feedIdentity&&Date.now()-feedLoadedAt<10000)return 0;
 const data=await pipeline.feed(term,filter,pin);
 if(generation!==feedGeneration||term!==query||filter!==hazard||mapView!==pin)return 0;
 legacy.events=new Map(data.events.map(event=>[event.eventId,event]));legacy.cities=new Map(data.cities.map(city=>[city.placeKey,city]));
 const presentation=legacy.result();
 const before=state;state=applyChanges(new Map(),presentation.events.map(event=>({operation:'upsert',event})));cityIndex=new Map();
 for(const event of state.values())for(const key of event.placeKeys){if(!cityIndex.has(key))cityIndex.set(key,[]);cityIndex.get(key).push(event);}
 mergeCities(data.cities);feedHasMore=data.hasMore;feedReady=true;feedIdentity=identity;feedLoadedAt=Date.now();
 const byKey=new Map(cities.map(city=>[city.placeKey,city]));
 feedRows=[...state.values()].map(event=>({event,city:byKey.get(event.placeKeys[0])||{placeKey:'',name:t('noAssociatedCity'),nameEn:t('noAssociatedCity'),countryCode:event.countryCodes?.join(', ')||''},time:event.sourceUpdatedAt??event.publishedAt??event.recordedAt??0}));
 renderList({animate:true});return presentation.events.filter(event=>!before.has(event.eventId)||before.get(event.eventId).recordVersion<event.recordVersion).length;
}
function visibleWindow() {
 if(!mapReady)return '0/0/0/1/1';const bounds=map.getBounds();
 return viewportFromBounds({west:bounds.getWest(),south:bounds.getSouth(),east:bounds.getEast(),north:bounds.getNorth()},map.getZoom()).key;
}
async function poll({changed=false}={}){
 if((polling&&!changed)||document.hidden)return;polling=true;const generation=++viewGeneration,view=visibleWindow(),filter=hazard;beginFeedSync();
 try{
  const data=await pipeline.load(view,filter);
  if(generation!==viewGeneration)return;
  const oldSequence=mapView?.viewSequence;applyMap(data);
  if(selected&&(oldSequence!==data.viewSequence||detailStatus==='failed'))selectCity(selected,false);
  const count=await loadFeed(data);if(generation!==viewGeneration)return;
  finishFeedSync(count);failures=0;
 }catch(error){if(generation===viewGeneration){failFeedSync();failures++;renderList();}}
 finally{if(generation===viewGeneration){lastPoll=Date.now();polling=false;}}
}
function setMapFailed(message) {
  $('map-loading').hidden = true; $('map-error').hidden = false;
  stopMotion();
}
function applyLanguage() {
  if (!mapReady) return;
  const preferred = `name:${locale}`;
  for (const layer of map.getStyle().layers) {
    if (layer.type === 'symbol' && layer.layout?.['text-field'] && !layer.id.startsWith('vision-')) {
      map.setLayoutProperty(layer.id,'text-field',['coalesce',['get',preferred],['get','name:latin'],['get','name']]);
    }
  }
  updateMap();
}
function installVisionLayers() {
  map.addSource('cities',{type:'geojson',data:features(),cluster:false});
  map.addLayer({id:'vision-clusters',type:'circle',source:'cities',filter:['has','point_count'],paint:{
    'circle-color':'#1C6BB0','circle-radius':clusterRadius,'circle-radius-transition':{duration:0,delay:0},'circle-opacity-transition':{duration:0,delay:0},
    'circle-stroke-width':1.5,'circle-stroke-color':'rgba(255,255,255,0.5)'}});
  map.addLayer({id:'vision-cluster-count',type:'symbol',source:'cities',filter:['has','point_count'],layout:{
    'text-field':['get','point_count_abbreviated'],'text-size':12,'text-font':['Noto Sans Regular'],
    'text-allow-overlap':true},paint:{'text-color':'#ffffff'}});
  map.addLayer({id:'vision-city-halo',type:'circle',source:'cities',filter:['!', ['has','point_count']],paint:{
    'circle-color':['get','color'],'circle-opacity':0.12,'circle-radius':['case',['==',['get','count'],0],8,16]}});
  map.addLayer({id:'vision-cities',type:'circle',source:'cities',filter:['!', ['has','point_count']],paint:{
    'circle-color':['case',['==',['get','count'],0],'#ffffff',['get','color']],
    'circle-radius':['case',['==',['get','selected'],1],8,6],
    'circle-stroke-color':['case',['==',['get','count'],0],'#91a4af','#ffffff'],'circle-stroke-width':2}});
  map.addLayer({id:'vision-city-labels',type:'symbol',source:'cities',filter:['!', ['has','point_count']],layout:{
    'text-field':['get','name'],'text-font':['Noto Sans Regular'],'text-size':11,'text-offset':[0,1.4],
    'text-anchor':'top'},paint:{'text-color':basemapId==='fiord'?'#f2f7fc':'#435e74','text-halo-color':basemapId==='fiord'?'#203b50':'#fff','text-halo-width':2}});
  addMotionLayers();
  applyLanguage();
}
async function initMap() {
  const begin = performance.now();
  try {
    const style=BASEMAPS[basemapId].url;
    map = new maplibregl.Map({container:'map',style,
      center:[0,15],zoom:Math.max(0,Math.log2($('map').clientWidth/512)-0.15),
      minZoom:0,maxZoom:16,renderWorldCopies:false,
      locale:locale==='zh'?{'NavigationControl.ZoomIn':'放大','NavigationControl.ZoomOut':'缩小','AttributionControl.ToggleAttribution':'地图署名'}:{},
      attributionControl:false});
    const attribution=document.createElement('div');
    attribution.className='map-attribution maplibregl-ctrl';
    attribution.innerHTML='<a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>';
    map.addControl({onAdd:()=>attribution,onRemove:()=>attribution.remove()},'bottom-right');
    map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right');
    map.addControl(new maplibregl.ScaleControl({maxWidth:90,unit:'metric'}),'bottom-left');
    map.on('error', event => {
      const message = String(event.error?.message || '底图资源错误');

      if (!mapReady && style === '/missing-map-style.json') { clearTimeout(mapTimeout); setMapFailed(t('map404')); }
    });
    map.on('sourcedata', event => { if (event.dataType === 'source' && event.tile) mapStats.tileLoads += 1; });
    basemapControl=createBasemapController(map,{initial:basemapId,
      modeChanged(mode) {
        $('latest-panel').dataset.basemap=mode;
        // Cancel old palette highlights without rebuilding rows or changing reading position.
        $('city-list').querySelectorAll('.city-row').forEach(row=>row.getAnimations().forEach(animation=>animation.cancel()));
      },
      beforeChange() {
        stopMotion();mapReady=false;
        $('map-loading').hidden=false;$('map-error').hidden=true;
        clearTimeout(mapTimeout);
        mapTimeout=setTimeout(()=>{if(!mapReady)setMapFailed(t('mapTimeout'));},20000);
      },
      styleReady() {
        mapReady=true;clearTimeout(mapTimeout);
        mapStats.loadedAt=Math.round(performance.now()-begin);
        $('map-loading').hidden=true;$('map-error').hidden=true;
        installVisionLayers();void poll({changed:true});
      }
    });
      for (const layer of ['vision-cities','vision-city-labels']) map.on('click',layer,event => selectCity(event.features[0].properties.placeKey));
      map.on('click','vision-clusters',async event => {
        const cluster = event.features[0];
        const bounds=JSON.parse(cluster.properties.bounds);
        map.fitBounds([[bounds.west,bounds.south],[bounds.east,bounds.north]],{padding:55,maxZoom:Math.min(16,map.getZoom()+3),duration:reduced.matches?0:500});
      });
      for (const layer of ['vision-clusters','vision-cities','vision-city-labels']) {
        map.on('mouseenter',layer,() => map.getCanvas().style.cursor='pointer');
        map.on('mouseleave',layer,() => map.getCanvas().style.cursor='');
      }
    map.on('moveend',()=>{clearTimeout(viewportTimer);viewportTimer=setTimeout(()=>void poll({changed:true}),180);});
    mapTimeout = setTimeout(() => { if (!mapReady) setMapFailed(t('mapTimeout')); },20000);
  } catch (error) { setMapFailed(String(error.message)); }
}
$('basemap-picker').addEventListener('click',event=>{
  const button=event.target.closest('[data-basemap]');
  if(!button||!basemapControl) return;
  basemapId=button.dataset.basemap;
  basemapControl.select(basemapId);
  document.querySelectorAll('#basemap-picker button[data-basemap]').forEach(option=>{
    const active=option.dataset.basemap===basemapId;
    option.setAttribute('aria-pressed',String(active));
    option.querySelector('span').textContent=active?'✓':'';
  });
  $('basemap-picker').open=false;
  $('basemap-picker').querySelector('summary').focus({preventScroll:true});
});
document.addEventListener('pointerdown',event=>{if(!$('basemap-picker').contains(event.target))$('basemap-picker').open=false;});
$('basemap-picker').addEventListener('keydown',event=>{
  if(event.key==='Escape') {event.stopPropagation();$('basemap-picker').open=false;$('basemap-picker').querySelector('summary').focus();}
});
$('city-list').addEventListener('click', event => { const button=event.target.closest('[data-place]'); if(button)selectCity(button.dataset.place); });
function setListVisible(visible) {
  if(selected){selected='';detailGeneration++;renderDetail();}
  $('latest-panel').hidden=!visible;
  $('list-toggle').hidden=visible;
  if(!visible) showOtherHazards(false);
  $('list-toggle').setAttribute('aria-expanded',String(visible));
  if(visible){renderList();void poll({changed:true});}
  updateMap();
  requestAnimationFrame(()=>{
    map?.resize();
    (visible?$('latest-panel'):$('list-toggle')).focus({preventScroll:true});
  });
}
$('list-toggle').addEventListener('click',()=>{setListVisible(true);if(feedSync.failed)void poll();});
$('panel-close').addEventListener('click',()=>setListVisible(false));
$('detail').addEventListener('click', event => { if(event.target.closest('.detail-close')){selected='';renderDetail();renderList();updateMap();} });
$('search').maxLength=64;
let searchComposing=false;
function submitSearch(immediate=false){
 if(searchComposing)return;
 clearTimeout(searchTimer);
 const next=$('search').value.trim().slice(0,64).toLowerCase();
 if(next!==query){query=next;feedGeneration++;feedReady=false;renderList();}
 if(immediate)void poll({changed:true});else searchTimer=setTimeout(()=>void poll({changed:true}),250);
}
$('search').addEventListener('compositionstart',()=>{searchComposing=true;clearTimeout(searchTimer);});
$('search').addEventListener('compositionend',()=>{searchComposing=false;submitSearch();});
$('search').addEventListener('input',event=>{if(!event.isComposing)submitSearch();});
$('vision-search').addEventListener('submit',event=>{event.preventDefault();submitSearch(true);});
$('hazard-controls').addEventListener('click',event=>{
  const button=event.target.closest('[data-hazard]');
  if(!button) return;
  const fromMenu=$('other-hazard-menu').contains(button);
  setHazardFilter(button.dataset.hazard);showOtherHazards(false,fromMenu);
});
$('other-hazard-toggle').addEventListener('click',()=>{
  if($('other-hazard-menu').hidden) openOtherHazards();else showOtherHazards(false);
});
$('other-hazard-toggle').addEventListener('keydown',event=>{
  if(event.key==='ArrowDown'){event.preventDefault();openOtherHazards(true);}
});
$('other-hazard-menu').addEventListener('keydown',event=>{
  const buttons=[...$('other-hazard-menu').querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
  buttons[next]?.focus();
});
document.addEventListener('pointerdown',event=>{if(!$('hazard-controls').contains(event.target))showOtherHazards(false);});
$('hazard-controls').addEventListener('focusout',event=>{
  if(event.relatedTarget&&!$('hazard-controls').contains(event.relatedTarget)) showOtherHazards(false);
});
$('retry-map').addEventListener('click',()=>{clearTimeout(mapTimeout);stopMotion();mapReady=false;map?.remove();$('map-loading').hidden=false;$('map-error').hidden=true;syncMotion();initMap();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!$('other-hazard-menu').hidden){showOtherHazards(false,true);return;}selected='';renderDetail();renderList();updateMap();}});
document.addEventListener('visibilitychange',()=>{syncMotion();renderFeedStatus();if(!document.hidden){updateMap();poll();}});
window.addEventListener('pagehide',()=>{clearTimeout(freshTimer);clearTimeout(viewportTimer);clearTimeout(searchTimer);clearTimeout(feedStatusTimer);feedIconAnimation?.cancel();feedPhase='';stopMotion();});
window.addEventListener('pageshow',()=>{syncMotion();renderFeedStatus();if(mapReady)updateMap();});
const interval=setInterval(()=>{if(!document.hidden&&Date.now()-lastPoll>=10000)void poll();},500);
reduced.addEventListener('change',()=>{syncMotion();renderFeedStatus();});
window.addEventListener('pagehide',event=>{if(!event.persisted){clearInterval(interval);access.dispose();clearTimeout(mapTimeout);clearTimeout(toastTimer);}});
syncMotion();initMap();void poll();
