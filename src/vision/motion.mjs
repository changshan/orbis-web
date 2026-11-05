export function shouldAnimate({hidden=false,paused=false,hasAlerts=false} = {}) {
  return !hidden && !paused && hasAlerts;
}
export function pulseFrame(elapsed) {
  const time = Number.isFinite(elapsed) ? Math.max(0,elapsed) : 0;
  const phase = (time % 2800) / 2800;
  const freshPhase = (time % 1800) / 1800;
  const spread = 1 - (1-phase) ** 2;
  return { pointRadius:10+20*spread, clusterExtra:3+18*spread,
    opacity:0.42*(1-phase), freshRadius:16+18*freshPhase, freshOpacity:0.65*(1-freshPhase) };
}
export function isRecentEvent(event, now, windowMs=30000) {
  const age = now-event.recordedAt;
  return !event.removed && event.lifecycleStatus==='active'
    && (event.displayUntil==null || now<event.displayUntil)
    && Number.isFinite(age) && age>=0 && age<windowMs;
}
