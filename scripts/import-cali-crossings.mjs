import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {endpointCrossings} from '../endpoint-crossings.js';
const features=[];for(const file of (await readdir('.private/cali')).sort())if(file.startsWith('pdt_nmc_nomenclatura_vial-'))features.push(...JSON.parse(await readFile('.private/cali/'+file,'utf8')).features);
if(features.length!==11304)throw Error('Expected complete cached municipal road source; refresh and review counts explicitly if source changed.');
const exact=JSON.parse(await readFile('catalogue/cali/intersections.json','utf8')),data=endpointCrossings(features,exact),body=JSON.stringify(data);
await writeFile('catalogue/cali/intersection-references.json',body);
await writeFile('catalogue/cali/intersection-references-manifest.json',JSON.stringify({generated_at:new Date().toISOString(),source:'https://ws-idesc.cali.gov.co/geoserver/dapm/ows',layer:'dapm:pdt_nmc_nomenclatura_vial',source_records:features.length,tolerance_m:3,pairs:Object.keys(data).length,sha256:createHash('sha256').update(body).digest('hex'),method:'Distinct named road endpoints within 3m; existing exact pairs excluded. No interior geometric crossings and no invented house points.',quality:'Approximate road-junction references; not certification of vehicle access or grade.'},null,2));
console.log(JSON.stringify({pairs:Object.keys(data).length,aguacatal:data['AV 12 OESTE|CL 11 OESTE']}));
