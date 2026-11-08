import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{junctionReferences}from'../junction-references.js';import worker from'../worker.js';
const line=(name,coordinates)=>({properties:{nvnmcvial:name,nvbarrio:'Prueba'},geometry:{type:'LineString',coordinates}});
const through=line('CL 1',[[-76.55,3.449],[-76.55,3.451]]),branch=line('KR 2',[[-76.55,3.45],[-76.549,3.45]]);
assert.equal(junctionReferences([through,branch])['CL 1|KR 2'][0][5],'endpoint_segment');
assert.equal(junctionReferences([through,line('KR 2',[[-76.54998,3.45],[-76.549,3.45]])])['CL 1|KR 2'].length,1);
assert.deepEqual(junctionReferences([through,line('KR 2',[[-76.54996,3.45],[-76.549,3.45]])]),{});
assert.deepEqual(junctionReferences([through,line('KR 2',[[-76.54999,3.45],[-76.54999,3.4505]])]),{}); // parallel nearby lane
assert.deepEqual(junctionReferences([through,line('KR 2',[[-76.551,3.45],[-76.549,3.45]])]),{}); // interior crossing/bridge
assert.deepEqual(junctionReferences([through,branch],{'CL 1|KR 2':[['existing','Prueba',-76.55,3.45]]}),{});
const env={SUPABASE_SERVICE_KEY:'junction-tests',ORS_API_KEY:'unused',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+decodeURIComponent(new URL(url).pathname)))}catch{return new Response('',{status:404})}}}};
const data=await(await worker.fetch(new Request('https://test/api/places?q='+encodeURIComponent('CL 21 A NORTE con AV 10')),env)).json();
assert.equal(data.requires_map,true);assert.equal(data.auto_select,false);assert.ok(data.places.length);assert.ok(data.places.every(p=>!p.signature&&p.quality==='corner_hint'));
const bad=await worker.fetch(new Request('https://test/api/quote',{method:'POST',body:JSON.stringify({places:[data.places[0],data.places[0]]})}),env);assert.equal(bad.status,400);
console.log('PASS: T-junction references, original endpoints, 3m limit, parallel-lane and bridge rejection, map required before quote.');
