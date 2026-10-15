// Nomenclature tokens stay separate: 14, 14 A and 14 OESTE are different roads.
export function normalizeAddress(text){
 return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
 .replace(/\([^)]*\)/g,' ').replace(/\b(?:SANTIAGO DE CALI|CALI|COLOMBIA|VALLE DEL CAUCA)\b/g,' ')
 .replace(/\b(?:CARRERA|CRA|CR|KRA)\b/g,'KR').replace(/\b(?:CALLE|CLL)\b/g,'CL')
 .replace(/\bAVENIDA\b/g,'AV').replace(/\bDIAGONAL\b/g,'DG').replace(/\bTRANSVERSAL\b/g,'TV')
 .replace(/(\d)([A-Z])/g,'$1 $2').replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
export function parseAddress(text){
 const original=String(text||'').replace(/[,\s]+esquina\s*$/i,'');const crossing=original.split(/\s+(?:con|esquina(?:\s+con)?|y)\s+/i);
 if(crossing.length===2){const a=parseAddress(crossing[0]),b=parseAddress(crossing[1]);if(a&&b)return {kind:'intersection',road:a.road,otherRoad:b.road,key:[a.road,b.road].sort().join('|')};}
 const tokens=normalizeAddress(original).split(' ');if(!['CL','KR','AV','DG','TV'].includes(tokens[0])||!/^\d+$/.test(tokens[1]||''))return null;
 let end=2;while(end<tokens.length&&!/^\d+$/.test(tokens[end])&&!['CL','KR','AV','DG','TV'].includes(tokens[end]))end++;
 return {kind:'address',road:tokens.slice(0,end).join(' '),rest:tokens.slice(end),normalized:tokens.join(' ')};
}
export function bucketFor(road){let hash=2166136261;for(const c of road)hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0)%256;}
export function addressMatches(query,row){
 const parsed=parseAddress(row[0]);if(!parsed||parsed.road!==query.road)return false;
 // A fully entered plate must agree with all components. Missing sector is only
 // a candidate variant; an explicitly supplied letter/sector cannot disappear.
 const supplied=query.rest;if(!supplied.length)return true;
 let index=0;for(const token of parsed.rest){if(token===supplied[index])index++;else if(!['OESTE','NORTE','SUR','ESTE'].includes(token))return false;if(index===supplied.length)return true;}return false;
}
