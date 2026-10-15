import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto} from 'node:crypto';
import worker from '../worker.js';
import {parseAddress,normalizeAddress,addressMatches} from '../address-search.js';
globalThis.crypto??=webcrypto;
const realFetch=globalThis.fetch;let stored;
globalThis.fetch=async(url,options)=>{
 const value=String(url);
 if(value.includes('/pelias/'))return Response.json({features:[{geometry:{coordinates:[-76.53,3.45]},properties:{layer:'locality',label:'Cali'}}]});
 if(value.includes('/directions/'))return Response.json({routes:[{summary:{distance:6000,duration:900}}]});
 if(value.includes('tariff_versions'))return Response.json([{id:'tariff',per_km_cop:2000,minimum_cop:null}]);
 if(value.includes('route_quotes')){stored=JSON.parse(options.body);return Response.json([stored]);}
 throw new Error('Unexpected fetch '+value);
};
const env={ORS_API_KEY:'test',SUPABASE_SERVICE_KEY:'test-secret',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+decodeURIComponent(new URL(url).pathname)))}catch{return new Response('Missing',{status:404})}}}};
async function places(q){const response=await worker.fetch(new Request('https://test/api/places?q='+encodeURIComponent(q)),env);assert.equal(response.status,200);return (await response.json()).places;}
for(const text of ['avenida 14 oeste #8-18','Av. 14 Oeste 8 18','AV 14 OESTE # 8 OESTE - 18']){
 const result=await places(text);assert.ok(result.length>0,text);assert.ok(result.every(p=>p.label.includes('Aguacatal')&&!p.label.includes('14 A')));assert.ok(result.every(p=>p.original===text));
}
const corners=await places('calle 5 con cra 39 esquina');assert.equal(corners.length,1);assert.equal(corners[0].quality,'intersection');assert.ok(!corners[0].label.includes('39-71'));
for(const q of ['Cali','Avenida 9999 #9999-9999','Calle 5 con Carrera 9999'])assert.equal((await places(q)).length,0,q);
assert.equal(addressMatches(parseAddress('AV 14 OESTE 8 18'),['AV 14 A OESTE 8 OESTE 18']),false);
assert.equal(addressMatches(parseAddress('CL 5 39 71'),['CL 5 39 173']),false);
for(const [input,road] of [['Cra 25B Bis #4-10','KR 25 B BIS'],['Cl 8 #3-20','CL 8'],['Tv 4 Norte #8-10','TV 4 NORTE'],['Dg 10 #2-5','DG 10']])assert.equal(parseAddress(input).road,road);
const start=(await places('avenida 14 oeste #8-18'))[0],end=corners[0];
const request=points=>new Request('https://test/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({places:points})});
assert.equal((await worker.fetch(request([{...start,lat:3.1},end]),env)).status,400);
const response=await worker.fetch(request([start,end]),env);assert.equal(response.status,200);assert.equal((await response.json()).price_cop,12000);assert.equal(stored.places[0].original,'avenida 14 oeste #8-18');assert.equal(stored.places[0].source,'Alcaldía de Cali');
const manual=await worker.fetch(new Request('https://test/api/location',{method:'POST',body:JSON.stringify({label:'Entrada principal',lat:3.45,lon:-76.53})}),env);assert.equal(manual.status,200);
const outside=await worker.fetch(new Request('https://test/api/location',{method:'POST',body:JSON.stringify({label:'Fuera',lat:40,lon:0})}),env);assert.equal(outside.status,400);
globalThis.fetch=realFetch;
console.log('PASS: official addresses, separate letters, intersections, coarse-result rejection, trusted coordinates and quote preservation.');
