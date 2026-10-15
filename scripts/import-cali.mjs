import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseAddress,normalizeAddress,bucketFor} from '../address-search.js';
const root='.private/cali';await mkdir(root,{recursive:true});
const endpoint='https://ws-idesc.cali.gov.co/geoserver/dapm/ows';
async function load(layer,properties,size=10000){
 const all=[];let expected;
 for(let start=0;expected===undefined||start<expected;start+=size){
 const path=`${root}/${layer}-${start}.json`;let data;
 try{data=JSON.parse(await readFile(path,'utf8'));}catch{
 const url=new URL(endpoint);url.search=new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:'dapm:'+layer,count:String(size),startIndex:String(start),sortBy:'gid',outputFormat:'application/json',srsName:'EPSG:4326',propertyName:properties});
 for(let retry=0;retry<4;retry++){try{const response=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error('HTTP '+response.status);data=await response.json();if(!Array.isArray(data.features))throw new Error('Invalid WFS response');break;}catch(error){if(retry===3)throw error;await new Promise(r=>setTimeout(r,1000*(retry+1)));}}
 await writeFile(path,JSON.stringify(data));}
 expected=Number(data.numberMatched??data.totalFeatures);if(!Number.isFinite(expected)||!data.features.length&&start<expected)throw new Error('Incomplete source');all.push(...data.features);console.log(layer,all.length,'/',expected);
 }
 if(all.length!==expected)throw new Error('Source count changed during download');return all;
}
const data=await load('pdt_nmc_nomenclatura_domiciliaria','gid,ndid,nddirecc,ndestado,ndbarrio,ndfechcort,the_geom');
const buckets=Array.from({length:256},()=>[]),seen=new Set();let invalid=0,unsupported=0;const states={};
for(const f of data){const p=f.properties,[lon,lat]=f.geometry?.coordinates||[],parsed=parseAddress(p.nddirecc);if(!Number.isFinite(lon)||!Number.isFinite(lat)||lon< -77||lon> -76||lat<3||lat>4.2||!p.nddirecc){invalid++;continue;}if(!parsed||parsed.kind!=='address'){unsupported++;continue;}
 const normalized=normalizeAddress(p.nddirecc),key=[normalized,p.ndbarrio,lon,lat].join('|');if(seen.has(key))continue;seen.add(key);
 buckets[bucketFor(parsed.road)].push([normalized,p.nddirecc,p.ndbarrio||'',p.ndestado||'',lon,lat]);states[p.ndestado]=(states[p.ndestado]||0)+1;}
const roads=await load('pdt_nmc_nomenclatura_vial','gid,nvnmcvial,nvbarrio,the_geom',5000);
// Only shared road endpoints create intersection candidates. Geometric crossings
// alone (bridges/tunnels) must not manufacture a junction.
const nodes=new Map();for(const f of roads){const p=parseAddress(f.properties.nvnmcvial);if(!p)continue;const lines=f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[f.geometry?.coordinates||[]];for(const line of lines){if(line.length<2)continue;for(const point of [line[0],line.at(-1)]){const key=point.map(n=>n.toFixed(6)).join(',');if(!nodes.has(key))nodes.set(key,[]);nodes.get(key).push({road:p.road,point,barrio:f.properties.nvbarrio||''});}}}
const intersections={},crossSeen=new Set();for(const entries of nodes.values())for(let a=0;a<entries.length;a++)for(let b=a+1;b<entries.length;b++){const x=entries[a],y=entries[b];if(x.road===y.road)continue;const key=[x.road,y.road].sort().join('|'),unique=key+'|'+x.point.map(n=>n.toFixed(5)).join(',');if(crossSeen.has(unique))continue;crossSeen.add(unique);(intersections[key]??=[]).push([`${x.road} con ${y.road}`,x.barrio,...x.point]);}
await mkdir('catalogue/cali',{recursive:true});let bytes=0;const digest=createHash('sha256');
let streetFiles=0;for(let i=0;i<256;i++){const grouped=new Map();for(const row of buckets[i]){const road=parseAddress(row[0]).road;if(!grouped.has(road))grouped.set(road,[]);grouped.get(road).push(row);}await mkdir(`catalogue/cali/streets/${i}`,{recursive:true});for(const [road,rows] of grouped){const body=JSON.stringify(rows);bytes+=Buffer.byteLength(body);digest.update(body);await writeFile(`catalogue/cali/streets/${i}/${road.replaceAll(' ','_')}.json`,body);streetFiles++;}}
await writeFile('catalogue/cali/intersections.json',JSON.stringify(intersections));
const manifest={source:endpoint,layer:'dapm:pdt_nmc_nomenclatura_domiciliaria',license:'CC BY (catalogue metadata)',imported_at:new Date().toISOString(),source_count:data.length,unique_searchable:seen.size,invalid,unsupported,states,bytes,street_files:streetFiles,sha256:digest.digest('hex'),roads:roads.length,intersection_pairs:Object.keys(intersections).length,source_cutoffs:[...new Set(data.map(f=>f.properties.ndfechcort))],carlos_candidates:buckets.flat().filter(r=>r[0]==='AV 14 OESTE 8 OESTE 18'),cl5_kr39:intersections['CL 5|KR 39']||[]};
await writeFile('catalogue/cali/manifest.json',JSON.stringify(manifest,null,2));console.log(JSON.stringify(manifest,null,2));
