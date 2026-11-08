import{readdir,readFile,writeFile}from'node:fs/promises';
import{parseAddress}from'../address-search.js';import worker from'../worker.js';
const env={SUPABASE_SERVICE_KEY:'audit-only',ASSETS:{async fetch(url){try{return new Response(await readFile('dist'+decodeURIComponent(new URL(url).pathname)))}catch{return new Response('',{status:404})}}}};
const failures=[],skipped=[];let checked=0;
for(const bucket of await readdir('catalogue/cali/streets'))for(const file of await readdir('catalogue/cali/streets/'+bucket)){
 if(!/^[A-Z0-9_]+\.json$/.test(file))continue;
 const rows=JSON.parse(await readFile('catalogue/cali/streets/'+bucket+'/'+file));
 const candidates=rows.filter(row=>{const p=parseAddress(row[1]);return p?.rest.filter(t=>/^\d+$/.test(t)).length>=2&&row[1].length<=180;}).sort((a,b)=>(a[3]==='Certificada'?0:1)-(b[3]==='Certificada'?0:1)||a[0].localeCompare(b[0]));
 const sample=candidates[0];if(!sample){skipped.push(file);continue;}checked++;
 const response=await worker.fetch(new Request('https://audit/api/places?q='+encodeURIComponent(sample[1]+', Cali')),env);const data=await response.json();const found=(data.places||[]).some(p=>Math.hypot((p.lon-sample[4])*111000,(p.lat-sample[5])*111000)<30);
 if(!found)failures.push({query:sample[1],status:response.status,places:data.places?.length||0,file});
}
const report={checked,failed:failures.length,skipped_roads_without_complete_numeric_plate:skipped.length,failures,skipped};await writeFile('.private/street-lookup-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,skipped:undefined,failures:failures.slice(0,12)}));if(failures.length)process.exitCode=1;
