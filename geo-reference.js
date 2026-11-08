// Reference inside a polygon, never advertised as an entrance or a road access.
function inRing(point,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function pointInGeometry(point,geometry){const polygons=geometry?.type==='MultiPolygon'?geometry.coordinates:geometry?.type==='Polygon'?[geometry.coordinates]:[];return polygons.some(rings=>inRing(point,rings[0])&&!rings.slice(1).some(ring=>inRing(point,ring)));}
export function geometrySpanMeters(geometry){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;const visit=value=>{if(!Array.isArray(value))return;if(typeof value[0]==='number'){minX=Math.min(minX,value[0]);maxX=Math.max(maxX,value[0]);minY=Math.min(minY,value[1]);maxY=Math.max(maxY,value[1]);}else for(const child of value)visit(child);};visit(geometry?.coordinates);return Math.hypot((maxX-minX)*111000*Math.cos((minY+maxY)/2*Math.PI/180),(maxY-minY)*111000);}
export function referencePoint(geometry){
 if(geometry?.type==='Point')return geometry.coordinates;
 const polygons=geometry?.type==='MultiPolygon'?geometry.coordinates:geometry?.type==='Polygon'?[geometry.coordinates]:[];
 const ranked=polygons.map(rings=>{const xs=rings[0].map(p=>p[0]),ys=rings[0].map(p=>p[1]);return {rings,minY:Math.min(...ys),maxY:Math.max(...ys),area:(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))};}).sort((a,b)=>b.area-a.area);
 for(const {rings,minY,maxY} of ranked){
  for(const fraction of [.5,.25,.75]){const y=minY+(maxY-minY)*fraction,xs=[];
   for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[j],b=ring[i];if((a[1]>y)!==(b[1]>y))xs.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
   xs.sort((a,b)=>a-b);let best;
   for(let i=0;i+1<xs.length;i+=2)if(!best||xs[i+1]-xs[i]>best[1]-best[0])best=[xs[i],xs[i+1]];
   if(best&&best[1]>best[0])return [(best[0]+best[1])/2,y];
  }
 }
 return null;
}
