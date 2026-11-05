const base='https://tiles.openfreemap.org/styles/';
export const BASEMAPS=Object.freeze({
  positron:{url:base+'positron',pitch:0},
  liberty:{url:base+'liberty',pitch:0},
  fiord:{url:base+'fiord',pitch:0},
});

// Source data stays with the caller, so every style load restores the latest filters.
export function createBasemapController(map,{initial='liberty',beforeChange=()=>{},styleReady=()=>{},modeChanged=()=>{}}={}) {
  let current=Object.hasOwn(BASEMAPS,initial)?initial:'liberty';
  modeChanged(current);
  map.on('style.load',()=>{styleReady();});
  return {
    get current(){return current;},
    select(id) {
      if(!Object.hasOwn(BASEMAPS,id)||id===current) return false;
      current=id;
      modeChanged(current);
      beforeChange();map.setStyle(BASEMAPS[id].url,{diff:false});
      return true;
    },
  };
}
