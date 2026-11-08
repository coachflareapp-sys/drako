import{roadName}from'./address-search.js';
const meters=(a,b)=>Math.hypot((a[0]-b[0])*111000*Math.cos(a[1]*Math.PI/180),(a[1]-b[1])*111000);
// Endpoint-to-segment references, not arbitrary interior line intersections.
// Their coordinates are always an original municipal endpoint. A passenger
// must place/confirm the actual entrance on the map before a quote is allowed.
export function junctionReferences(features,known={},tolerance=3){
 const size=.0005,cells=new Map(),ends=[],result={};
 for(const f of features){const road=roadName(f.properties.nvnmcvial);if(!road)continue;
  for(const line of f.geometry?.type==='MultiLineString'?f.geometry.coordinates:f.geometry?.type==='LineString'?[f.geometry.coordinates]:[]){
   if(line.length<2)continue;const zone=f.properties.nvbarrio||'';
   ends.push({road,zone,p:line[0],adjacent:line[1]},{road,zone,p:line.at(-1),adjacent:line.at(-2)});
   for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];if(![...a,...b].every(Number.isFinite))continue;const segment={road,zone,a,b};
    for(let x=Math.floor(Math.min(a[0],b[0])/size);x<=Math.floor(Math.max(a[0],b[0])/size);x++)for(let y=Math.floor(Math.min(a[1],b[1])/size);y<=Math.floor(Math.max(a[1],b[1])/size);y++){const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(segment);}
   }
  }
 }
 for(const end of ends){const p=end.p;if(!p.every(Number.isFinite))continue;const x=Math.floor(p[0]/size),y=Math.floor(p[1]/size),scale=Math.cos(p[1]*Math.PI/180),seen=new Set();
  for(let cx=-1;cx<=1;cx++)for(let cy=-1;cy<=1;cy++)for(const s of cells.get((x+cx)+','+(y+cy))||[]){
   if(s.road===end.road||seen.has(s))continue;seen.add(s);
   const ax=(s.a[0]-p[0])*scale,ay=s.a[1]-p[1],dx=(s.b[0]-s.a[0])*scale,dy=s.b[1]-s.a[1],len=dx*dx+dy*dy;if(!len)continue;
   const t=-(ax*dx+ay*dy)/len;if(t<=0||t>=1)continue;const gap=Math.hypot(ax+t*dx,ay+t*dy)*111000;if(gap>tolerance)continue;
   const ex=(end.adjacent[0]-p[0])*scale,ey=end.adjacent[1]-p[1],el=Math.hypot(ex,ey);if(!el)continue;
   const sin=Math.abs(ex*dy-ey*dx)/(el*Math.sqrt(len));if(gap>.02&&sin<Math.sin(20*Math.PI/180))continue;
   const key=[end.road,s.road].sort().join('|');if([...(known[key]||[]),...(result[key]||[])].some(row=>meters(p,[row[2],row[3]])<25))continue;
   (result[key]??=[]).push([key.split('|').join(' con '),end.zone||s.zone,p[0],p[1],+gap.toFixed(3),'endpoint_segment']);
  }
 }
 return result;
}
