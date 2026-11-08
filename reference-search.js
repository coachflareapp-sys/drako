import {parseAddress,addressMatches} from './address-search.js';
export const fold=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
export function zoneMatches(query,candidate){
 const text=fold(query),actual=fold(candidate);
 return ['MONTEBELLO','GOLONDRINAS','AGUACATAL','MANGOS','CAMPOALEGRE','JAMUNDI','YUMBO','PALMIRA','CANDELARIA','BOGOTA','MEDELLIN'].filter(z=>new RegExp('\\b'+z+'\\b').test(text)).every(z=>new RegExp('\\b'+z+'\\b').test(actual));
}
function nameTokens(text){
 const localityOnly=/^(?:SANTIAGO DE CALI|CALI|COLOMBIA|VALLE DEL CAUCA)$/.test(fold(text));
 if(localityOnly)return [];
 const normalized=fold(String(text).replace(/,\s*SANTIAGO\s+DE\s+CALI\b/gi,', Cali').replace(/,\s*VALLE\s+DEL\s+CAUCA\b/gi,''))
 .replace(/\bCOLOMBIA\b|\bCALI\b/g,' ')
 .replace(/\bI E\b|\bIE\b|INSTITUCION EDUCATIVA|INSTITUTO EDUCATIVO|\bESCUELA\b|\bCOLEGIO\b/g,' EDUCACION ')
 .replace(/\bAVENIDA\b|\bAVDA\b/g,' AV ').replace(/\bKM\b/g,' KILOMETRO ');
 return normalized.split(' ').filter(t=>t&&!['DE','DEL','LA','EL','LOS','LAS','EN','Y','CORREGIMIENTO','CORREG','VEREDA','VDA'].includes(t));
}
export function buildReferenceIndex(rows){
 const roads={},tokens={};
 rows.forEach((row,i)=>{
  for(const road of new Set(row.addresses.map(a=>parseAddress(a)?.road).filter(Boolean)))(roads[road]??=[]).push(i);
  if(row.kind!=='parcel')for(const token of new Set(nameTokens([row.name,...row.aliases,...row.addresses,row.zone].join(' '))))(tokens[token]??=[]).push(i);
 });
 return {rows,roads,tokens};
}
export function nameMatches(query,candidate){
 const wanted=nameTokens(query),actual=nameTokens(candidate);
 return wanted.length>0&&wanted.every((t,i)=>actual.some(v=>v===t||(i===wanted.length-1&&t.length>=4&&v.startsWith(t))));
}
export function providerMatches(query,properties){
 if(/\bCALI\b/.test(fold(query))&&!/\bCALI\b/.test(fold([properties.label,properties.locality,properties.localadmin].filter(Boolean).join(' '))))return false;
 if(!zoneMatches(query,[properties.label,properties.name,properties.neighbourhood,properties.localadmin,properties.locality].filter(Boolean).join(' ')))return false;
 const parsed=parseAddress(query);
 if(parsed?.kind==='intersection')return false;
 if(parsed?.rest.length>=2)return addressMatches(parsed,[properties.label||'']);
 if(parsed)return false; // A road alone is not a house or an entrance.
 return nameMatches(query,[properties.name,properties.label,properties.neighbourhood,properties.localadmin,properties.locality].filter(Boolean).join(' '));
}
export function searchReferences(query,data){
 if(Array.isArray(data))data=buildReferenceIndex(data);
 const rows=data.rows||[];
 const parsed=parseAddress(query),text=fold(query);
 let indices;
 if(parsed){if(parsed.kind!=='address'||parsed.rest.length<2)return [];indices=data.roads?.[parsed.road]||[];}
 else{
  const wanted=nameTokens(query);if(!wanted.length)return [];
  const lists=wanted.map((token,i)=>data.tokens?.[token]||(i===wanted.length-1&&token.length>=4?Object.keys(data.tokens||{}).filter(t=>t.startsWith(token)).flatMap(t=>data.tokens[t]):[])).sort((a,b)=>a.length-b.length);
  indices=lists.length===1?lists[0]:lists[0].filter(i=>lists.every(list=>list.includes(i)));
 }
 const matches=[];
 for(const index of indices){const row=rows[index];if(!zoneMatches(text,[row.name,row.zone,...row.aliases].join(' ')))continue;
  if(parsed?!row.addresses.some(a=>addressMatches(parsed,[a])):!nameMatches(query,[row.name,...row.aliases,...row.addresses,row.zone].join(' ')))continue;
  if(matches.some(other=>other.addresses.some(a=>row.addresses.some(b=>parseAddress(a)?.normalized===parseAddress(b)?.normalized))&&Math.hypot((row.lon-other.lon)*111000,(row.lat-other.lat)*111000)<25))continue;
  matches.push(row);if(matches.length===5)break;
 }
 // An explicit rural zone must not resolve to a different part of Cali.
 return matches.map(row=>({label:row.name+' · '+(row.addresses[0]?row.addresses[0]+' · ':'')+row.zone+', Cali',lat:row.lat,lon:row.lon,quality:row.kind==='parcel'?'rural_reference':'facility',source:'Alcaldía de Cali · '+row.layer}));
}
