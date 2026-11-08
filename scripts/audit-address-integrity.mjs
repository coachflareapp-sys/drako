import{readdir,readFile,writeFile}from'node:fs/promises';
import{parseAddress,addressMatches}from'../address-search.js';
let rows=0,rawMismatch=0,normalizedMismatch=0,selfMismatch=0;const examples=[];
for(const bucket of await readdir('catalogue/cali/streets'))for(const file of await readdir('catalogue/cali/streets/'+bucket)){
 if(!/^[A-Z0-9_]+\.json$/.test(file))continue;
 const road=file.replace(/\.json$/,'').replaceAll('_',' ');const data=JSON.parse(await readFile('catalogue/cali/streets/'+bucket+'/'+file));
 for(const row of data){rows++;const raw=parseAddress(row[1]),normalized=parseAddress(row[0]);
 if(raw?.road!==road)rawMismatch++;if(normalized?.road!==road)normalizedMismatch++;
 if(raw&&!addressMatches(raw,row)){selfMismatch++;if(examples.length<20)examples.push({label:row[1],road,raw,normalized});}
 }
}
const result={rows,raw_road_mismatch:rawMismatch,normalized_road_mismatch:normalizedMismatch,own_source_address_not_matching:selfMismatch,examples};await writeFile('.private/address-integrity-audit.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
if(rawMismatch||selfMismatch)process.exitCode=1;
