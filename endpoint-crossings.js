import {parseAddress} from './address-search.js';
const distance=(a,b)=>Math.hypot((a[0]-b[0])*111000*Math.cos(a[1]*Math.PI/180),(a[1]-b[1])*111000);
// Shared digitised vertices also identify junctions inside an unsplit road.
// Never intersect segment interiors geometrically: those can be bridges.
export function endpointCrossings(features,exact={},tolerance=3){
 const cells=new Map(),result={};const size=.00004;
 for(const f of features){const parsed=parseAddress(f.properties.nvnmcvial);if(parsed?.kind!=='address'||parsed.rest.length)continue;
  const lines=f.geometry?.type==='MultiLineString'?f.geometry.coordinates:f.geometry?.type==='LineString'?[f.geometry.coordinates]:[];
  for(const line of lines){if(line.length<2)continue;
   for(const [index,p] of line.entries()){const endpoint=index===0||index===line.length-1;if(!p.every(Number.isFinite))continue;const x=Math.floor(p[0]/size),y=Math.floor(p[1]/size);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const other of cells.get((x+dx)+','+(y+dy))||[]){
     if(other.road===parsed.road)continue;const key=[parsed.road,other.road].sort().join('|'),gap=distance(p,other.point);
     if(exact[key]?.length||gap>tolerance||(!(endpoint&&other.endpoint)&&gap>.02))continue;
     const rows=result[key]??=[];if(rows.some(row=>distance(p,[row[2],row[3]])<25))continue;
     rows.push([key.split('|').join(' con '),f.properties.nvbarrio||other.zone||'',p[0],p[1],Number(gap.toFixed(2))]);
    }
    const key=x+','+y;if(!cells.has(key))cells.set(key,[]);cells.get(key).push({road:parsed.road,point:p,zone:f.properties.nvbarrio,endpoint});
   }
  }
 }
 return result;
}
