export const PRIMARY_HAZARDS=Object.freeze(['heavyRain','flooding','earthquake','wind','wildfire']);
const FLOOD_TYPES=['flooding','flashFlood','riverFlood'];
const isPrimary=type=>PRIMARY_HAZARDS.includes(FLOOD_TYPES.includes(type)?'flooding':type);
function matchesHazard(type,filter) {
  return !filter||(filter==='flooding'?FLOOD_TYPES.includes(type):type===filter);
}
export function otherHazardTypes(state,knownTypes=[]) {
  const known=knownTypes.filter(type=>!isPrimary(type));
  const observed=[...new Set([...state.values()].map(event=>event.hazardType))]
    .filter(type=>typeof type==='string'&&type&&!isPrimary(type)&&!known.includes(type)).sort();
  return [...new Set([...known,...observed])];
}
export function applyChanges(state, changes) {
  const next = new Map(state);
  for (const change of changes) {
    const event = change.event;
    const previous = next.get(event.eventId);
    if (previous && previous.recordVersion >= event.recordVersion) continue;
    next.set(event.eventId, { ...event, removed: change.operation === 'remove' });
  }
  return next;
}
export function visibleEvents(state, { now = Date.now(), placeKey, hazardType } = {}) {
  return [...state.values()].filter(event => !event.removed && event.lifecycleStatus === 'active'
    && (event.displayUntil == null || now < event.displayUntil)
    && (!placeKey || (event.placeKey === placeKey || event.placeKeys?.includes(placeKey)))
    && matchesHazard(event.hazardType,hazardType));
}

export function latestAlerts(state, cities, { now=Date.now(), hazardType, query='', limit=100 } = {}) {
  const term=query.trim().toLowerCase();
  const byId=new Map(cities.map(city=>[city.placeKey,city]));
  return visibleEvents(state,{now,hazardType})
    .flatMap(event=>(event.placeKeys ?? [event.placeKey]).map(key=>({event,city:byId.get(key),time:event.sourceUpdatedAt ?? event.publishedAt ?? event.recordedAt ?? 0})))
    .filter(({city})=>city && (!term || `${city.name} ${city.nameEn} ${city.countryName} ${city.countryNameEn??""} ${city.countryCode}`.toLowerCase().includes(term)))
    .sort((a,b)=>b.time-a.time || a.event.eventId.localeCompare(b.event.eventId))
    .slice(0,limit);
}

export function diffAlerts(previous, current) {
  const before=new Map(previous.map(({event,city})=>[event.eventId+'|'+city.placeKey,event.recordVersion]));
  const after=new Map(current.map(({event,city})=>[event.eventId+'|'+city.placeKey,event.recordVersion]));
  return {
    added:[...after.keys()].filter(id=>!before.has(id)),
    updated:[...after.keys()].filter(id=>before.has(id)&&after.get(id)>before.get(id)),
    removed:[...before.keys()].filter(id=>!after.has(id)),
  };
}

export function syncStatus({now=Date.now(),lastSuccessAt=0,requestStartedAt=0,refreshing=false,failed=false,
  changedCount=0,feedbackUntil=0,hidden=false}={}) {
  if(hidden) return 'background';
  if(refreshing) return 'refreshing';
  if(failed) return 'error';
  if(!lastSuccessAt) return 'connecting';
  if(requestStartedAt>0&&now<requestStartedAt+650) return 'refreshing';
  if(now<feedbackUntil) return changedCount>0?'updated':'checked';
  return 'live';
}
