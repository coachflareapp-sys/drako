// Nomenclature tokens stay separate: 14, 14 A and 14 OESTE are different roads.
function addressText(text){
 const value=String(text||'').replace(/(\d)ª/g,'$1A').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const parts=value.split(',');
 const road=/^(?:CALLE|CLL|CL|CARRERA|CRA|CR|KRA|KR|AVENIDA|AVDA|AV|DIAGONAL|DG|TRANSVERSAL|TV|C|K)\.?\s*\d/;
 const part=parts.find(p=>road.test(p.trim()))||parts[0];
 return part.trim().replace(/\([^)]*\)/g,' ').replace(/\b(?:APARTAMENTO|APARTAMENTOS|APTO|APT|AP|TORRE|INTERIOR|INT|PISO|OFICINA|OF|LOCAL|CASA|BLOQUE|BARRIO|URBANIZACION|CONJUNTO|EDIFICIO|PORTERIA|BODEGA|FRENTE|CERCA|AL LADO)\b.*$/,'').replace(/\bN\s*[°º]\s*/g,'#').replace(/\b(?:NUMERO|NRO|NUM|NO)\.?\s*(?=\d)/g,'#');
}
export const addressLabel=text=>addressText(text).trim().replace(/\s+/g,' ');
export function normalizeAddress(text){
 return addressText(text)
 .replace(/([A-Z])(?=\d)/g,'$1 ')
 .replace(/\([^)]*\)/g,' ').replace(/\b(?:SANTIAGO DE CALI|CALI|COLOMBIA|VALLE DEL CAUCA)\b/g,' ')
 .replace(/\b(?:CARRERA|CRA|CR|KRA)\b/g,'KR').replace(/\b(?:CALLE|CLL)\b/g,'CL')
 .replace(/^K\b/,'KR').replace(/^C\b/,'CL')
 .replace(/\b(?:AVENIDA|AVDA)\b/g,'AV').replace(/\bDIAGONAL\b/g,'DG').replace(/\bTRANSVERSAL\b/g,'TV')
 .replace(/(\d)([A-Z])/g,'$1 $2').replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ').replace(/\b0+(?=\d)/g,'');
}
export function parseAddress(text){
 const original=addressText(text).replace(/[,\s]+ESQUINA\s*$/,'');const crossing=original.split(/\s+(?:CON|ESQUINA(?:\s+CON)?|Y)\s+/);
 if(crossing.length===2){const a=parseAddress(crossing[0]);let b=parseAddress(crossing[1]),inferred=false;if(a&&!b&&/^\d+[A-Z\s]*$/.test(crossing[1])&&['CL','KR'].includes(a.road.split(' ')[0])){b=parseAddress((a.road.startsWith('CL ')?'KR ':'CL ')+crossing[1]);inferred=true;}if(a&&b&&!a.rest?.length&&!b.rest?.length)return {kind:'intersection',road:a.road,otherRoad:b.road,key:[a.road,b.road].sort().join('|'),inferred};if(/\b(?:CON|ESQUINA)\b/.test(original))return null;}
 const tokens=normalizeAddress(original).split(' ');if(!['CL','KR','AV','DG','TV'].includes(tokens[0])||!/^\d+$/.test(tokens[1]||''))return null;
 let end=2;while(end<tokens.length&&(/^[A-Z]$/.test(tokens[end])||['BIS','OESTE','NORTE','SUR','ESTE'].includes(tokens[end])))end++;
 const rest=tokens.slice(end),crossType=['CL','KR','AV','DG','TV'].includes(rest[0])?rest.shift():undefined;
 return {kind:'address',road:tokens.slice(0,end).join(' '),rest,crossType,normalized:tokens.join(' ')};
}
export function bucketFor(road){let hash=2166136261;for(const c of road)hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0)%256;}
export function addressMatches(query,row){
 const parsed=parseAddress(row[0]);if(!parsed||parsed.kind!=='address'||query.kind!=='address'||parsed.road!==query.road)return false;
 if(query.crossType&&parsed.crossType&&query.crossType!==parsed.crossType)return false;
 // A fully entered plate must agree with all components. Missing sector is only
 // a candidate variant; an explicitly supplied letter/sector cannot disappear.
 const supplied=query.rest;if(!supplied.length)return true;
 if(supplied.length===1)return parsed.rest[0]===supplied[0];
 let index=0;for(const token of parsed.rest){if(token===supplied[index])index++;else if(!['OESTE','NORTE','SUR','ESTE'].includes(token))return false;}return index===supplied.length;
}
