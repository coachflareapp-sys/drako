import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import worker from '../worker.js';
import {parseAddress} from '../address-search.js';
const live=process.argv.includes('--live');
const env={SUPABASE_SERVICE_KEY:'local-only-test-key',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+decodeURIComponent(new URL(url).pathname)))}catch{return new Response('',{status:404})}}}};
const ask=async q=>{const url='https://drakotransport.app/api/places?q='+encodeURIComponent(q);const r=live?await fetch(url):await worker.fetch(new Request(url),env);assert.equal(r.status,200,q);return r.json();};
const expected=[-76.5510361,3.45827658];
const queries=['Avenida 14 Oeste #8-18','Avda 14 Oeste #8-18','Cali, Avenida 14 Oeste #8-18','Santiago de Cali, Av. 14 Oeste #8-18','Avda 14 Oeste numero 8-18 apartamento 201','Avenida 14 Oeste #8-18, apto 201, Aguacatal, Cali','Avenida 14 Oeste #8-18 torre 2','Avenida 14 Oeste #8-18 interior 3','Avenida 14 Oeste #8-18 edificio Mirador','Avenida 14 Oeste nro 8-18','Avenida 14 Oeste No. 8-18','Avenida 14 Oeste N° 8-18','Avenida 14 Oeste #08-018'];
const results=[];
for(const q of queries){const d=await ask(q);assert.ok(d.places.some(p=>Math.hypot((p.lon-expected[0])*111000,(p.lat-expected[1])*111000)<30),q);assert.ok(d.places.every(p=>!p.label.includes('201')),q);results.push({query:q,found:true,automatic:d.auto_select===true});}
for(const q of ['Calle 5 con Carrera 39','Cl 5 con Cra 39 esquina','Cali, Calle 5 con Carrera 39','Calle 5 y 39']){const d=await ask(q);assert.ok(d.places.some(p=>p.quality==='intersection'&&Math.hypot((p.lon+76.5462561)*111000,(p.lat-3.42465042)*111000)<30),q);if(q==='Calle 5 y 39')assert.equal(d.auto_select,false);results.push({query:q,found:true,automatic:d.auto_select===true});}
// Recovery checks are source-based technical tests, not independent city coverage.
let recovered=0;const visited=new Set();for(const file of (await readdir('.private/cali')).sort()){if(!file.startsWith('pdt_nmc_nomenclatura_domiciliaria-'))continue;const source=JSON.parse(await readFile('.private/cali/'+file,'utf8'));for(const f of source.features){const q=f.properties.nddirecc;if(!/^[CK]\s+\d/.test(q))continue;const p=parseAddress(q);if(!p||p.rest.length!==2||p.rest.some(t=>!/^\d+$/.test(t))||visited.has(p.road))continue;visited.add(p.road);const d=await ask(q),[lon,lat]=f.geometry.coordinates;assert.ok(d.places.some(x=>Math.hypot((x.lon-lon)*111000,(x.lat-lat)*111000)<30),'Recovered source: '+q);if(++recovered>=25)break;}if(recovered>=25)break;}
assert.equal(recovered,25);await mkdir('.private',{recursive:true});await writeFile('.private/address-variants-'+(live?'live':'local')+'.json',JSON.stringify({queries:results,recoveredSourceChecks:recovered},null,2));console.log(JSON.stringify({mode:live?'live':'local',fixedUserExampleVariants:results.length,recoveredSourceChecks:recovered,passed:true}));
