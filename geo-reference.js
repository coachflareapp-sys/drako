// Reference inside a polygon, never advertised as an entrance or a road access.
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
