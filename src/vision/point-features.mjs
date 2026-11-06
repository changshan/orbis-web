function radarPhase(id){let hash=2166136261;for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;return (hash%997)/997;}
/** MapLibre consumes server clusters directly; activeCount also drives existing ripple layers. */
export function mapFeatures(points,selected,now,color) {
 return {type:'FeatureCollection',features:points.filter(point=>point.validUntil==null||now<point.validUntil).map(point=>({
  type:'Feature',geometry:{type:'Point',coordinates:[point.point.longitude,point.point.latitude]},properties:{
   id:point.id,radarPhase:radarPhase(point.id),placeKey:point.city?.placeKey||'',name:point.city?.name.text||'',count:point.eventCount,activeCount:point.eventCount,recentCount:point.recentCount,
   color:color(point.hazardTypes[0]),selected:point.city?.placeKey===selected?1:0,
   ...(point.kind==='cluster'?{point_count:point.cityCount,point_count_abbreviated:String(point.cityCount),bounds:JSON.stringify(point.bounds)}:{})
  }
 }))};
}
