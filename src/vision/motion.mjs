export function shouldAnimate({hidden=false,paused=false,hasAlerts=false,hasClusters=false,reducedMotion=false} = {}) {
  return !hidden && !paused && hasAlerts && (!reducedMotion || hasClusters);
}
export function pulseFrame(elapsed) {
  const time = Number.isFinite(elapsed) ? Math.max(0,elapsed) : 0;
  const phase = (time % 2800) / 2800;
  const freshPhase = (time % 1800) / 1800;
  const spread = 1 - (1-phase) ** 2;
  const clusterPhase=(time%2400)/2400,secondPhase=(clusterPhase+0.5)%1;
  const breath=(1-Math.cos(clusterPhase*Math.PI*2))/2;
  return {clusterSecondaryExtra:3+26*secondPhase,secondaryOpacity:0.48*(1-secondPhase)**1.4,
    clusterWaveOpacity:0.48*(1-clusterPhase)**1.4,clusterBreath:2.4*breath,clusterOpacity:0.9+0.1*breath,pointRadius:10+20*spread, clusterExtra:3+26*clusterPhase,
    opacity:0.42*(1-phase), freshRadius:16+18*freshPhase, freshOpacity:0.65*(1-freshPhase) };
}
export function isRecentEvent(event, now, windowMs=30000) {
  const age = now-event.recordedAt;
  return !event.removed && event.lifecycleStatus==='active'
    && (event.displayUntil==null || now<event.displayUntil)
    && Number.isFinite(age) && age>=0 && age<windowMs;
}
