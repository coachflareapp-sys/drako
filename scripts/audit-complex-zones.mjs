import {mkdir,writeFile} from 'node:fs/promises';
const cases=[
 ['Aguacatal','Avenida 15 Oeste #10-40, Aguacatal, Cali','Bomberos'],
 ['Aguacatal','Avenida 9 Oeste #19C1-100, Aguacatal, Cali','Santa Isabel'],
 ['Aguacatal','Calle 11 Oeste #11-63, Aguacatal, Cali','Directorio municipal'],
 ['Aguacatal','Diagonal 15 Oeste #110-14, Aguacatal, Cali','Directorio municipal'],
 ['Aguacatal','Avenida 12 Oeste con Calle 11 Oeste, Aguacatal, Cali','Inventario municipal'],
 ['Aguacatal','Avenida 4 Oeste #12-05, Cali','IE Isaias Gamboa'],
 ['Montebello','Avenida 43 Oeste #5A-49, Montebello, Cali','IE Montebello'],
 ['Montebello','Avenida 43 oeste Nº 5ª 49, Montebello, Cali','IE Montebello literal'],
 ['Montebello','Avenida 42 Oeste #11-18, Montebello, Cali','IPS manual usuario'],
 ['Montebello','Carrera 42 Oeste #11-18, Montebello, Cali','IPS PIGA variante documental'],
 ['Montebello','Calle 11 Oeste #42-12, Montebello, Cali','Biblioteca'],
 ['Montebello','Calle 12 Oeste #42-67, Montebello, Cali','Policia directorio antiguo'],
 ['Montebello','Calle 9 Oeste #41A-40, Montebello, Cali','INVIMA Avicola'],
 ['Montebello','Calle 11 Oeste Av 42-07, Montebello, Cali','INVIMA supermercado literal'],
 ['Montebello','Avenida 42 Oeste #10C-46, Montebello, Cali','INVIMA restaurante'],
 ['Los Mangos rural','Escuela San Carlos Borromeo, Golondrinas, Cali','Registraduria'],
 ['Los Mangos rural','IE San Carlos Borromeo, Los Mangos, Cali','Registraduria'],
 ['Los Mangos rural','Vereda Los Mangos, Golondrinas, Cali','Referencia rural, sin placa'],
 ['Los Mangos rural','Crucero Alto de los Mangos, Cali','Centro poblado, sin placa'],
 ['Los Mangos rural','Los Mangos, Montebello, Cali','Referencia ambigua, sin placa']
];
const results=[];for(const [zone,q,source] of cases){try{const r=await fetch('https://drakotransport.app/api/places?q='+encodeURIComponent(q),{signal:AbortSignal.timeout(25000)});const d=await r.json();const row={zone,q,source,status:r.status,automatic:d.auto_select===true,areaSuggestions:d.area_suggestions===true,requiresMap:d.requires_map===true,places:(d.places||[]).map(({label,lon,lat,source,quality})=>({label,lon,lat,source,quality})),message:d.message};results.push(row);console.log(JSON.stringify(row));}catch(e){results.push({zone,q,error:e.message});console.log(JSON.stringify(results.at(-1)));}}
await mkdir('.private',{recursive:true});await writeFile('.private/complex-address-after.json',JSON.stringify({fixture_date:'2026-11-07',executed_at:new Date().toISOString(),results},null,2));
console.log(JSON.stringify({queries:results.length,withResults:results.filter(r=>r.places?.length).length,matchedReferences:results.filter(r=>r.places?.length&&!r.areaSuggestions).length,directReferences:results.filter(r=>r.places?.length&&!r.areaSuggestions&&!r.requiresMap).length,mapReferences:results.filter(r=>r.places?.length&&r.requiresMap).length,sectorSuggestions:results.filter(r=>r.places?.length&&r.areaSuggestions).length,unresolved:results.filter(r=>r.status===200&&!r.places?.length).length,errors:results.filter(r=>r.error||r.status!==200).length}));
if(results.some(r=>r.error||r.status!==200))process.exitCode=1;
