import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {parseAddress} from '../address-search.js';
import worker from '../worker.js';
const groups={norte:[],sur:[],oriente:[],occidente:[],centro:[]};
for(const bucket of await readdir('catalogue/cali/streets')){
 for(const file of await readdir('catalogue/cali/streets/'+bucket)){
 if(file.includes('%'))continue;const rows=JSON.parse(await readFile('catalogue/cali/streets/'+bucket+'/'+file,'utf8'));
 for(const row of rows){const parsed=parseAddress(row[0]);if(row[3]!=='Certificada'||!parsed||parsed.rest.length<2||parsed.rest.some(t=>!/^(\d+|[A-Z]|BIS|OESTE|NORTE|SUR|ESTE)$/.test(t)))continue;
 const group=row[5]>3.48?'norte':row[5]<3.4?'sur':row[4]>-76.50?'oriente':row[4]<-76.55?'occidente':'centro';if(groups[group].length<6&&!groups[group].some(p=>p[2]===row[2]))groups[group].push(row);
 }
 }if(Object.values(groups).every(list=>list.length===6))break;
}
const live=process.argv.includes('--live');const env={ORS_API_KEY:'test',SUPABASE_SERVICE_KEY:'test',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+new URL(url).pathname))}catch{return new Response('',{status:404})}}}};
const results=[];
for(const [zone,rows] of Object.entries(groups))for(const row of rows){const query=row[1].replace(/^KR\b/,'Carrera').replace(/^CL\b/,'Calle').replace(/^AV\b/,'Avenida')+', '+row[2]+', Cali';const start=Date.now();const url='https://drakotransport.app/api/places?q='+encodeURIComponent(query);const response=live?await fetch(url):await worker.fetch(new Request(url),env);const data=await response.json();const found=(data.places||[]).some(p=>Math.hypot((p.lon-row[4])*111000,(p.lat-row[5])*111000)<30);results.push({zone,query,found,automatic:data.auto_select===true,milliseconds:Date.now()-start,choices:data.places?.length||0});}
await mkdir('.private',{recursive:true});await writeFile('.private/address-audit-'+(live?'live':'local')+'.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({mode:live?'live':'local',cases:results.length,found:results.filter(r=>r.found).length,automatic:results.filter(r=>r.automatic).length,failures:results.filter(r=>!r.found)},null,2));
if(results.length<30||results.some(r=>!r.found))process.exitCode=1;
