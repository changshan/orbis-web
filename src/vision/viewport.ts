/** Coarse tile windows are shared by the browser and gateway; no coordinates are persisted. */
export interface Viewport {key:string;z:number;x:number;y:number;width:number;height:number;}
export function parseViewport(input="0/0/0/1/1"):Viewport {
 if(input.length>64||!/^(?:0|[1-9][0-9]?)\/(?:0|[1-9][0-9]*)\/(?:0|[1-9][0-9]*)\/[1-9][0-9]*\/[1-9][0-9]*$/.test(input))throw Error("invalid viewport");
 const values=input.split("/").map(Number);const [z,x,y,width,height]=values as [number,number,number,number,number];
 if(values.some(n=>!Number.isSafeInteger(n))||z>16)throw Error("invalid viewport");const n=2**z;
 if(x>=n||y>=n||width>n||height>n-y)throw Error("invalid viewport");return {key:values.join("/"),z,x,y,width,height};
}
export function viewportFromBounds(bounds:{west:number;south:number;east:number;north:number},zoom:number):Viewport {
 const {west,south,east,north}=bounds;if(![west,south,east,north,zoom].every(Number.isFinite)||south>north)throw Error("invalid bounds");
 const z=Math.max(0,Math.min(16,Math.floor(zoom))),n=2**z;
 const tileY=(lat:number)=>{const r=Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180;return Math.max(0,Math.min(n-1,Math.floor((1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*n)));};
 const y=tileY(north),bottom=tileY(south);let x=0,width=n;
 if(Math.abs(east-west)<359.999999){const w=((west+180)%360+360)%360-180;const span=((east-west)%360+360)%360;const first=Math.floor((w+180)/360*n),last=Math.floor((w+span+180)/360*n);x=((first%n)+n)%n;width=Math.min(n,Math.max(1,last-first+1));}
 return parseViewport([z,x,y,width,bottom-y+1].join("/"));
}
