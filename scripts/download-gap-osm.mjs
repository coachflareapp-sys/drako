import{mkdir,writeFile,readFile}from'node:fs/promises';
const file='.private/cali-osm-gap-roads.json';try{const d=JSON.parse(await readFile(file));console.log('Cached ways: '+d.elements.length);process.exit(0);}catch{}
// Targeted download for Carrera 150/Pance and the six unresolved western cases.
// One cached extraction, never a live Overpass dependency of the booking UI.
const query='[out:json][timeout:45];(way[highway][name](3.307,-76.526,3.316,-76.508);way[highway][name](3.446,-76.589,3.509,-76.539););out body geom;';
const endpoint=process.env.OVERPASS_ENDPOINT||'https://overpass-api.de/api/interpreter';
const response=await fetch(endpoint+'?data='+encodeURIComponent(query),{headers:{'User-Agent':'DrakoAddressImport/1.0 (one-off cached public data review)'},signal:AbortSignal.timeout(55000)});if(!response.ok)throw Error('Overpass '+response.status);const d=await response.json();if(!Array.isArray(d.elements)||d.remark)throw Error('Incomplete Overpass response');await mkdir('.private',{recursive:true});await writeFile(file,JSON.stringify({...d,extraction_query:query,source_endpoint:endpoint,downloaded_at:new Date().toISOString()}));console.log(JSON.stringify({ways:d.elements.length,bytes:JSON.stringify(d).length}));
