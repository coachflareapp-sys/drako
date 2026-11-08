import{parseAddress}from'./address-search.js';
// Only complete, unambiguous two-number plates. Do not turn 110 into 11,
// remove a supplied letter/sector or guess multipart numeric road suffixes.
function block(text){const p=parseAddress(text);if(p?.kind!=='address'||p.rest.filter(t=>/^\d+$/.test(t)).length!==2||!/^\d+$/.test(p.rest.at(-1)))return null;return{road:p.road,cross:p.rest.slice(0,-1).join(' '),crossType:p.crossType,offset:Number(p.rest.at(-1))};}
export function nearbyAddressDistance(query,candidate){const a=block(query),b=block(candidate);if(!a||!b||a.road!==b.road||a.cross!==b.cross||a.crossType&&b.crossType&&a.crossType!==b.crossType)return null;const delta=Math.abs(a.offset-b.offset);return delta>0&&delta<=75?delta:null;}
