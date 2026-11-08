import {readFile,writeFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseAddress,normalizeAddress,bucketFor} from '../address-search.js';
import {referencePoint,geometrySpanMeters} from '../geo-reference.js';
import {buildReferenceIndex,fold} from '../reference-search.js';
const root='.private/cali-references';await mkdir(root,{recursive:true});
const endpoint='https://ws-idesc.cali.gov.co/geoserver/ows';
async function load(layer,properties,filter=''){
 const all=[];let expected;
 for(let start=0;expected===undefined||start<expected;start+=1000){
  const key=createHash('sha256').update(layer+properties+filter).digest('hex').slice(0,12),file=`${root}/${key}-${start}.json`;let data;
  try{data=JSON.parse(await readFile(file,'utf8'));}catch{
   const sortBy=layer.startsWith('catastro:')?'id':layer.startsWith('pot_2014:')?(properties.includes('localizaci')?'nombre,localizaci':'nombre'):'gid';
   const url=new URL(endpoint);url.search=new URLSearchParams({service:'WFS',version:'2.0.0',request:'GetFeature',typeNames:layer,count:'1000',startIndex:String(start),outputFormat:'application/json',srsName:'EPSG:4326',...(properties?{propertyName:properties}:{}),...(filter?{cql_filter:filter}:{}),sortBy});
   for(let retry=0;retry<3;retry++){try{const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw Error('HTTP '+response.status);data=await response.json();if(!Array.isArray(data.features))throw Error('Invalid features');break;}catch(e){if(retry===2)throw e;await new Promise(r=>setTimeout(r,1000));}}
   await writeFile(file,JSON.stringify(data));
  }
  expected=Number(data.numberMatched);if(!Number.isFinite(expected)||(!data.features.length&&start<expected))throw Error('Incomplete layer '+layer);all.push(...data.features);
 }
 if(all.length!==expected)throw Error('Changed layer count '+layer);return all;
}
const rows=[],seen=new Set(),counts={};let largeParcels=0,ruralSourceRecords=0;
function pointRow({name,address='',zone='Cali',aliases=[],geometry,point,layer,kind='facility'}){
 if(layer.startsWith('pot_2014:')&&rows.some(r=>r.layer==='educacion:esf_establecimiento_educativo'&&fold(r.name)===fold(name)))return;
 if(kind==='parcel'&&geometrySpanMeters(geometry)>250){largeParcels++;return;}
 const p=point||referencePoint(geometry);if(!p||!p.every(Number.isFinite)||p[0]<-76.9||p[0]>-75.9||p[1]<3||p[1]>4.1||!name)return;
 const addresses=address?[address.trim()]:[];const key=[name,address,zone,...p.map(v=>v.toFixed(6))].join('|');if(seen.has(key))return;seen.add(key);
 rows.push({name,addresses,zone,aliases,lon:Number(p[0].toFixed(8)),lat:Number(p[1].toFixed(8)),kind,layer});counts[layer]=(counts[layer]||0)+1;
}
const layers=[
 ['educacion:esf_establecimiento_educativo','eenomins,eenomsede,eedirecc,ecrcomcor,eebarver,the_geom',p=>({name:p.eenomins+' · '+p.eenomsede,address:p.eedirecc?.replace(/^IND\s+/i,''),zone:p.eebarver+' · '+p.ecrcomcor})],
 ['cultura:pbic_inc_bibliotecas','nombib,dirbib,barbib,latbib,lonbib,the_geom',p=>({name:'Biblioteca '+p.nombib,address:p.dirbib?.replace(/\bO\b/g,'OESTE').replace(/\bN\b/g,'NORTE'),zone:p.barbib,point:[Number(p.lonbib),Number(p.latbib)]})],
 ['pot_2014:eqp_equipamiento_rural_colectivo','nombre,the_geom',p=>({name:p.nombre,zone:p.nombre})],
 ['pot_2014:eqp_uba_seguridad_ciudadana','nombre,localizaci,the_geom',p=>({name:p.nombre,address:p.localizaci})],
 ['pot_2014:eqp_uco_salud','nombre,localizaci,the_geom',p=>({name:p.nombre,address:p.localizaci})],
 ['pot_2014:eqp_uco_educacion','nombre,localizaci,the_geom',p=>({name:p.nombre,address:p.localizaci})],
 ['bienestar_social:oapi_oeppi_privados','priv,direccpriv,barriopriv,the_geom',p=>({name:p.priv,address:p.direccpriv,zone:p.barriopriv})],
 ['salud:ads_ips_capacidad_reps','nombre_ips,direccion,barrio,comu_corre,the_geom',p=>({name:p.nombre_ips,address:p.direccion,zone:p.barrio+' · '+p.comu_corre})]
];
for(const [layer,properties,map] of layers){const data=await load(layer,properties);for(const f of data)pointRow({...map(f.properties),geometry:f.geometry,layer});console.log(layer,data.length);}
const fire=rows.find(r=>r.layer==='pot_2014:eqp_uba_seguridad_ciudadana'&&r.name==='ESCUELA INTERAMERICANA DE BOMBEROS');
if(fire){fire.zone='Aguacatal';fire.aliases=['Academia Nacional de Bomberos de Colombia','Bomberos Aguacatal'];}
// Address corroborated by the institution's 2025 user-care manual; location from
// the separate municipal rural-equipment point, not an invented road coordinate.
const health=rows.find(r=>r.layer==='pot_2014:eqp_equipamiento_rural_colectivo'&&r.name==='Puesto de Salud corregimiento Montebello');
if(health){health.addresses=['Avenida 42 Oeste #11-18'];health.aliases=['IPS Montebello'];}
const curated=JSON.parse(await readFile('catalogue/cali/curated-references.json','utf8'));
for(const record of curated.records){if(record.verified_reference!==true||record.provenance.length<2)throw Error('Unreviewed curated reference');pointRow(record);}
const ruralLayer='dapm:pdt_est_estrato_rural';let excluded=0;
{
 const data=await load(ruralLayer,'gid,erdireccio,ercorregim,the_geom');ruralSourceRecords=data.length;
 for(const f of data){const raw=String(f.properties.erdireccio||'');
  const road=raw.match(/\b(?:AVENIDA|AV|CALLE|CL|CARRERA|KR|CRA|K|C|A)\s*\d[\s\S]*/i)?.[0];
  if(!road){excluded++;continue;}
  const address=normalizeAddress(road.replace(/^A\b/,'AV')).replace(/\b(?:O|W)\b/g,'OESTE');const parsed=parseAddress(address);
  if(!parsed||parsed.kind!=='address'||parsed.rest.length<2||parsed.rest.some(t=>!/^\d+$|^[A-Z]$|^BIS$|^NORTE$|^SUR$|^ESTE$|^OESTE$/.test(t))){excluded++;continue;}
  const sectors=['AGUACATAL','MANGOS','CAMPOALEGRE'].filter(z=>new RegExp('\\b'+z+'\\b').test(raw.toUpperCase()));
  pointRow({name:'Referencia de predio rural',address:normalizeAddress(address),zone:[f.properties.ercorregim,...sectors].join(' · '),geometry:f.geometry,layer:ruralLayer,kind:'parcel'});
 }
 console.log('municipal rural source',data.length);
}
const parcelLayer='catastro:cat_bas_terrenos';
const parcels=await load(parcelLayer,'id,direpred,nom_barrio,the_geom',"BBOX(the_geom,-76.58,3.449,-76.54,3.473,'EPSG:4326')");
for(const f of parcels){const p=f.properties;if(!p.nom_barrio)continue;const address=normalizeAddress(p.direpred).replace(/^A\b/,'AV').replace(/\b(?:O|W)\b/g,'OESTE'),parsed=parseAddress(address);
 if(!parsed||parsed.kind!=='address'||parsed.rest.length<2||parsed.rest.some(t=>!/^\d+$|^[A-Z]$|^BIS$|^NORTE$|^SUR$|^ESTE$|^OESTE$/.test(t)))continue;
 pointRow({name:'Referencia de predio',address,zone:p.nom_barrio,geometry:f.geometry,layer:parcelLayer,kind:'parcel'});
}
console.log('Aguacatal cadastral source',parcels.length);
await mkdir('catalogue/cali',{recursive:true});
const body=JSON.stringify(buildReferenceIndex(rows.filter(r=>r.kind!=='parcel')));await writeFile('catalogue/cali/references.json',body);
const grouped=new Map(),written=new Set();for(const row of rows.filter(r=>r.kind==='parcel')){const road=parseAddress(row.addresses[0]).road;if(!grouped.has(road))grouped.set(road,[]);grouped.get(road).push(row);}
await mkdir('catalogue/cali/parcels',{recursive:true});for(const [road,entries] of grouped){const bucket=bucketFor(road),file=road.replaceAll(' ','_')+'.json';await mkdir('catalogue/cali/parcels/'+bucket,{recursive:true});await writeFile('catalogue/cali/parcels/'+bucket+'/'+file,JSON.stringify(buildReferenceIndex(entries)));written.add(bucket+'/'+file);}
for(const bucket of await readdir('catalogue/cali/parcels'))for(const file of await readdir('catalogue/cali/parcels/'+bucket)){if(/^[A-Z0-9_]+\.json$/.test(file)&&!written.has(bucket+'/'+file))await unlink('catalogue/cali/parcels/'+bucket+'/'+file);}
await writeFile('catalogue/cali/references-manifest.json',JSON.stringify({generated_at:new Date().toISOString(),source:endpoint,counts,total:rows.length,parcel_files:written.size,rural_source_records:ruralSourceRecords,rural_scope:'Whole published municipal rural layer',parcel_max_extent_m:250,excluded_large_parcels:largeParcels,curated_sources:'/catalogue/cali/curated-references.json',excluded_rural_formats:excluded,facility_sha256:createHash('sha256').update(body).digest('hex'),privacy:'Only public place names, addresses, zones and reference coordinates. No contacts, parcel identifiers, strata, owners or student data.',location_quality:'Municipal reference points or interior parcel points, not verified entrances.',attribution:'Alcaldía de Santiago de Cali — IDESC and the municipal departments named in each layer; Registraduría Nacional for the curated electoral reference. DRAKO adapted field selection, search indexes and polygon interior reference points.',source_terms:'Original source licences apply to the derived data; the application code is separate. The rural-equipment catalogue declares Creative Commons Attribution Share-Alike.',rural_equipment_catalogue:'https://datos.cali.gov.co/dataset/pot-equipamientos-rurales',rural_equipment_licence:'https://www.opendefinition.org/licenses/cc-by-sa',fire_address_source:'https://bomberoscali.org/academia-nacional-de-bomberos-de-colombia/',health_address_source:'https://www.saludladera.gov.co/docs/Transparencia%20y%20Acceso%20Informacion%20Publica/6.%20Participa/6.2.1%20diagnostico_e_identificacion_de_problemas/caja%20de%20herramientas/Manual%20del%20Proceso%20de%20Atenci%C3%B3n%20al%20Usuario.pdf'},null,2));
console.log(JSON.stringify({total:rows.length,counts,excluded_rural_formats:excluded}));
