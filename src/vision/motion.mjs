export function shouldAnimate({hidden=false,paused=false,hasAlerts=false,hasClusters=false,reducedMotion=false} = {}) {
  return !hidden && !paused && hasAlerts && (!reducedMotion || hasClusters);
}
export function pulseFrame(elapsed) {
  const time = Number.isFinite(elapsed) ? Math.max(0,elapsed) : 0;
  const phase = (time % 2800) / 2800;
  const freshPhase = (time % 1800) / 1800;
  const spread = 1 - (1-phase) ** 2;
  return {clusterPhase:(time%3000)/3000,clusterActive:true,clusterBreath:0,clusterOpacity:1,
    pointRadius:10+20*spread,opacity:0.42*(1-phase),freshRadius:16+18*freshPhase,freshOpacity:0.65*(1-freshPhase)};
}
// These expressions stagger each published point without rebuilding its geometry per frame.
function localPhase(phase,offset=0){return ['%', ['+',phase,offset,['coalesce',['get','radarPhase'],0]],1];}
export function clusterWavePaint(phase,offset=0){
  const progress=localPhase(phase,offset);
  return {extra:['+',4,['*',34,progress]],opacity:['*',0.82,['sin',['*',Math.PI,progress]]],width:['-',2.8,['*',1.2,progress]]};
}
export function clusterGlowPaint(phase){
  const breath=['*',0.5,['-',1,['cos',['*',Math.PI*2,localPhase(phase)]]]];
  return {extra:['+',6,['*',10,breath]],opacity:['+',0.07,['*',0.18,breath]]};
}

export function isRecentEvent(event, now, windowMs=30000) {
  const age = now-event.recordedAt;
  return !event.removed && event.lifecycleStatus==='active'
    && (event.displayUntil==null || now<event.displayUntil)
    && Number.isFinite(age) && age>=0 && age<windowMs;
}
