import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {providerMatches,searchReferences,zoneMatches,isAreaQuery} from '../reference-search.js';
import {referencePoint,geometrySpanMeters,pointInGeometry} from '../geo-reference.js';
import {parseAddress} from '../address-search.js';
import worker from '../worker.js';
assert.equal(providerMatches('Escuela San Carlos Borromeo, Golondrinas, Cali',{label:'Escuela Carlos Alberto Sardi Garces, Cali'}),false);
assert.equal(providerMatches('Crucero Alto de los Mangos, Cali',{label:'Crucero Turismo Centro, Cali'}),false);
assert.equal(providerMatches('IE San Carlos Borromeo, Los Mangos, Cali',{label:'I.E. Politecnico Municipal, Cali'}),false);
assert.equal(providerMatches('Universidad Santiago de Cali',{label:'Universidad del Valle, Cali'}),false);
assert.equal(providerMatches('Universidad Santiago de Cali',{label:'Universidad Santiago de Cali, Cali'}),true);
assert.equal(providerMatches('Santiago de Cali',{label:'Universidad Santiago de Cali, Cali'}),false);
assert.equal(providerMatches('Escuela San Carlos Borromeo, Golondrinas, Cali',{label:'Escuela San Carlos Borromeo, Golondrinas, Cali'}),true);
assert.equal(providerMatches('Calle 11 Oeste #42-12, Montebello, Cali',{label:'Calle 11 Oeste #42-12, Lleras Camargo, Cali'}),false);
assert.equal(zoneMatches('Montebello','Montebello (Cabecera)'),true);
assert.equal(zoneMatches('Pance','Gran Limonar'),false);
assert.equal(isAreaQuery('Vereda Los Mangos, Golondrinas, Cali'),true);assert.equal(isAreaQuery('Barrio Aguacatal, Cali'),true);assert.equal(isAreaQuery('Biblioteca Montebello'),false);
assert.equal(parseAddress('Avenida 43 Oeste Nº 5ª 49').normalized,parseAddress('AV 43 OESTE #5A-49').normalized);
const concave={type:'Polygon',coordinates:[[[0,0],[3,0],[3,1],[1,1],[1,3],[0,3],[0,0]]]};const p=referencePoint(concave);assert.ok(p[0]<=1||p[1]<=1);
const hole={type:'Polygon',coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[1,3],[3,3],[3,1],[1,1]]]};const h=referencePoint(hole);assert.ok(h[0]<1||h[0]>3||h[1]<1||h[1]>3);
assert.equal(referencePoint(null),null);
assert.ok(geometrySpanMeters({type:'Polygon',coordinates:[[[3,3],[3.01,3],[3.01,3.01],[3,3.01],[3,3]]]})>250);
assert.equal(pointInGeometry([2,2],hole),false);assert.equal(pointInGeometry([.5,.5],hole),true);
const rows=JSON.parse(await readFile('catalogue/cali/references.json','utf8'));
for(const row of rows.rows)assert.ok(Object.keys(row).every(k=>['name','addresses','zone','aliases','lon','lat','kind','layer'].includes(k)),'Public field whitelist');
for(const [q,lat,lon] of [
 ['Avenida 43 Oeste #5A-49, Montebello, Cali',3.48391406,-76.54744174],
 ['Calle 11 Oeste #42-12, Montebello, Cali',3.48476247,-76.55229820],
 ['Avenida 42 Oeste #11-18, Montebello, Cali',3.48416060,-76.55258391]
]){const matches=searchReferences(q,rows);assert.ok(matches.some(r=>Math.hypot((r.lat-lat)*111000,(r.lon-lon)*111000)<30),q);assert.ok(matches.every(r=>['facility','rural_reference'].includes(r.quality)));}
assert.equal(searchReferences('Calle 11 Oeste #42-99999, Montebello, Cali',rows).length,0);
assert.equal(searchReferences('Crucero Alto de los Mangos, Cali',rows).length,0);
assert.ok(searchReferences('Biblioteca Montebello',rows).some(r=>r.label.includes('Perea Padilla')));
assert.ok(searchReferences('Escuela San Carlos Borromeo, Golondrinas, Cali',rows).some(r=>r.source.startsWith('Registraduría')&&Math.abs(r.lat-3.45738153)<.000001));
assert.ok(searchReferences('IE San Carlos Borromeo, Los Mangos, Cali',rows).some(r=>r.label.includes('referencia electoral')));
assert.ok(searchReferences('Institucion Educativa Monte Bello Sede Andres Joaquin Lenis, Campo Alegre, Cali',rows).length>0);
const lenis=searchReferences('Institucion Educativa Montebello Sede Andres Joaquin Lenis',rows);assert.equal(lenis.length,1);assert.ok(Math.hypot((lenis[0].lat-3.47198775)*111000,(lenis[0].lon+76.55528844)*111000)<50);
const env={SUPABASE_SERVICE_KEY:'test-references',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+decodeURIComponent(new URL(url).pathname)))}catch{return new Response('',{status:404})}}}};
for(const [q,quality] of [['Calle 12 Oeste #42-67, Montebello, Cali','rural_reference'],['Avenida 15 Oeste #10-40, Aguacatal, Cali','facility']]){const r=await worker.fetch(new Request('https://test/api/places?q='+encodeURIComponent(q)),env);assert.equal(r.status,200);const d=await r.json();assert.ok(d.places.some(p=>p.quality===quality),q);assert.equal(d.auto_select,false);}
assert.equal(providerMatches('Avenida 42 Oeste #11-18, Montebello, Cali',{label:'Avenida 42 Oeste #11-18, Cali'}),false);
const sector=await worker.fetch(new Request('https://test/api/places?q='+encodeURIComponent('Vereda Los Mangos, Golondrinas, Cali')),env);const sectorData=await sector.json();assert.equal(sectorData.area_suggestions,true);assert.equal(sectorData.auto_select,false);assert.ok(sectorData.message.includes('solo si'));
console.log('PASS: municipal references, ordinal letters, zone constraints, unrelated-result rejection and polygon interior points.');
