import assert from 'node:assert/strict';
import {readFile}from'node:fs/promises';
import {parseAddress,addressCorner}from'../address-search.js';
import worker from '../worker.js';
const base=JSON.parse(await readFile('catalogue/cali/intersections.json')),extra=JSON.parse(await readFile('catalogue/cali/intersection-references.json'));
const all={...base};for(const[key,rows]of Object.entries(extra))all[key]=[...(all[key]||[]),...rows];
const samples=new Map();let checked=0;
for(const[key,rows]of Object.entries(all)){
 const[a,b]=key.split('|');assert.equal(parseAddress(a+' con '+b)?.key,key,key);
 assert.equal(addressCorner(a+' #'+b+'-99999')?.key,key,key);
 for(const row of rows){assert.ok(Number.isFinite(row[2])&&Number.isFinite(row[3]));if(!samples.has(row[1]))samples.set(row[1],key);}checked++;
}
const env={SUPABASE_SERVICE_KEY:'network-test',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+decodeURIComponent(new URL(url).pathname)))}catch{return new Response('',{status:404})}}}};
for(const[zone,key]of samples){const response=await worker.fetch(new Request('https://test/api/places?q='+encodeURIComponent(key.replace('|',' con '))),env);assert.equal(response.status,200,zone);const data=await response.json();assert.ok(data.places.length,zone);}
console.log(JSON.stringify({junction_pairs_parsed:checked,explicit_cross_type_house_fallbacks:checked,neighborhood_api_samples:samples.size,failures:0}));
