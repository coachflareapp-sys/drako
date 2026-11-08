import {parseAddress,bucketFor,addressMatches,normalizeAddress,addressLabel} from './address-search.js';
import {providerMatches,searchReferences,zoneMatches} from './reference-search.js';
import {dispatchNotifications,dispatchForBooking,isAdministrator,whatsappStatus,checkReservationService,telegramStatus,telegramUserStatus,setupTelegram,handleTelegramWebhook} from './notification-worker.js';
const BASE='https://xbhjqejqbqovwamztdcn.supabase.co';
const catalogueCache=new Map();
async function catalogue(env,url,file){if(catalogueCache.has(file))return catalogueCache.get(file);const response=await env.ASSETS.fetch(new URL('/catalogue/cali/'+file,url));if(!response.ok)return null;const data=await response.json();if(catalogueCache.size>12)catalogueCache.clear();catalogueCache.set(file,data);return data;}
const signedValue=p=>({label:p.label,lon:p.lon,lat:p.lat,expires:p.expires,original:p.original,source:p.source,quality:p.quality});
async function signedPlace(p,query,env){const value=signedValue({...p,original:query,expires:Date.now()+20*60000});return {...value,signature:await sign(value,env.SUPABASE_SERVICE_KEY)};}
async function officialPlaces(query,env,url){
 if(/\b(?:PALMIRA|YUMBO|JAMUNDI|CANDELARIA)\b/i.test(query.normalize('NFD').replace(/[\u0300-\u036f]/g,'')))return [];
 const parsed=parseAddress(query);if(!parsed)return [];
 if(parsed.kind==='intersection'){const data=await catalogue(env,url,'intersections.json');return (data?.[parsed.key]||[]).slice(0,5).map(([label,barrio,lon,lat])=>({label:label+' · '+barrio+', Cali',lon,lat,source:'Alcaldía de Cali · ejes viales',quality:'intersection'}));}
 const rows=await catalogue(env,url,'streets/'+bucketFor(parsed.road)+'/'+parsed.road.replaceAll(' ','_')+'.json');if(!rows)return [];
 let matches=rows.filter(row=>addressMatches(parsed,row)&&zoneMatches(query,row[2]));
 const words=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim();
 const text=' '+words(query)+' ',neighborhoodMatches=matches.filter(row=>row[2]&&text.includes(' '+words(row[2])+' '));
 if(neighborhoodMatches.length)matches=neighborhoodMatches;
 matches.sort((a,b)=>(a[3]==='Certificada'?0:1)-(b[3]==='Certificada'?0:1)||a[0].localeCompare(b[0]));
 const unique=[];for(const row of matches){if(unique.some(p=>p.key===row[0]&&Math.hypot((p.lon-row[4])*111000,(p.lat-row[5])*111000)<25))continue;unique.push({key:row[0],label:addressLabel(row[1])+' · '+row[2]+', Cali',lon:row[4],lat:row[5],source:'Alcaldía de Cali',quality:row[3]==='Certificada'?'official':'cadastral'});if(unique.length>=5)break;}return unique;
}
function decodeGeometry(encoded){const points=[];let index=0,lat=0,lon=0;while(index<encoded.length){const values=[];for(let axis=0;axis<2;axis++){let result=0,shift=0,byte;do{byte=encoded.charCodeAt(index++)-63;result|=(byte&31)<<shift;shift+=5;}while(byte>=32&&index<encoded.length);values.push(result&1?~(result>>1):result>>1);}lat+=values[0];lon+=values[1];points.push([lon/1e5,lat/1e5]);}return points;}
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify(value)))),v=>v.toString(16).padStart(2,'0')).join('')}
async function db(env,path,body){const response=await fetch(BASE+'/rest/v1/'+path,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)});if(!response.ok)throw new Error('No fue posible guardar la cotización.');return response.json()}
export default {async fetch(request,env){const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!env.SUPABASE_SERVICE_KEY)return json({message:'El servicio todavía está conectándose. Intenta nuevamente en unos minutos.'},503);
 try{
 if(url.pathname==='/api/telegram/webhook'&&request.method==='POST')return handleTelegramWebhook(request,env);
 if(url.pathname==='/api/telegram/status'&&request.method==='GET'){try{const status=await telegramUserStatus(request,env);return status?json(status):json({message:'Acceso restringido.'},403);}catch(error){return json({message:error.message},502);}}
 if(url.pathname==='/api/telegram/setup'&&request.method==='POST'){if(!await isAdministrator(request,env))return json({message:'Acceso restringido.'},403);try{return json(await setupTelegram(env));}catch(error){return json({message:error.message},400);}}
 if(url.pathname==='/api/integrations'&&request.method==='GET'){if(!await isAdministrator(request,env))return json({message:'Acceso restringido.'},403);return json({whatsapp:whatsappStatus(env),telegram:await telegramStatus(env),routes:Boolean(env.ORS_API_KEY)});}
 if(url.pathname==='/api/notifications/dispatch'&&request.method==='POST'){if(!env.TELEGRAM_BOT_TOKEN)return json({configured:false,channel:'telegram',sent:0});return json(await dispatchForBooking(request,env));}
 if(url.pathname==='/api/location'&&request.method==='POST'){
 if(Number(request.headers.get('content-length')||0)>2000)return json({message:'Solicitud demasiado grande.'},413);
 const {lat,lon,label}=await request.json();if(typeof lat!=='number'||typeof lon!=='number'||!Number.isFinite(lat)||!Number.isFinite(lon)||lat<3||lat>4.1||lon< -76.9||lon> -75.9||typeof label!=='string'||label.trim().length<3||label.length>300)return json({message:'Indica una dirección y un punto en Cali o sus alrededores.'},400);
 return json(await signedPlace({label:label.trim(),lat,lon,source:'Punto seleccionado por el pasajero',quality:'manual'},label.trim(),env));}
 if(url.pathname==='/api/places'&&request.method==='GET'){
 const query=url.searchParams.get('q')?.trim();if(!query||query.length<4||query.length>200)return json({places:[]});
 const official=await officialPlaces(query,env,url);if(official.length){const parsed=parseAddress(query);return json({places:await Promise.all(official.map(p=>signedPlace(p,query,env))),auto_select:official.length===1&&!parsed?.inferred&&(parsed?.kind==='intersection'||parsed?.rest.length>=2),message:parsed?.inferred?'Interpretamos el segundo número como la vía que cruza. Confirma la esquina indicada.':undefined,attribution:'Direcciones: Alcaldía de Cali · CC BY'});}
 const parsed=parseAddress(query);if(parsed?.kind==='intersection')return json({places:[],message:'No encontramos ese cruce con suficiente precisión. Puedes usar tu ubicación o marcarlo en el mapa.'});
 const references=await catalogue(env,url,'references.json');
 let local=searchReferences(query,references||[]);
 if(!local.length&&parsed?.kind==='address'&&parsed.rest.length>=2){const parcels=await catalogue(env,url,'parcels/'+bucketFor(parsed.road)+'/'+parsed.road.replaceAll(' ','_')+'.json');local=searchReferences(query,parcels||[]);}
 if(local.length)return json({places:await Promise.all(local.map(p=>signedPlace(p,query,env))),auto_select:false,message:'Encontramos referencias municipales. Selecciona el establecimiento o predio correcto; el punto puede no coincidir con su entrada exacta.'});
 if(!env.ORS_API_KEY)return json({places:[],message:'El buscador complementario no está conectado.'});
 const provider=new URL('https://api.heigit.org/pelias/v1/search');provider.search=new URLSearchParams({api_key:env.ORS_API_KEY.trim(),text:query,'boundary.country':'COL','boundary.rect.min_lon':'-76.9','boundary.rect.max_lon':'-75.9','boundary.rect.min_lat':'3.0','boundary.rect.max_lat':'4.1','focus.point.lon':'-76.53','focus.point.lat':'3.45',size:'5'});
 const response=await fetch(provider,{headers:{Authorization:env.ORS_API_KEY.trim()},signal:AbortSignal.timeout(12000)});if(!response.ok)return json({message:'El servicio de direcciones no respondió. Intenta nuevamente.',provider_status:response.status},502);const data=await response.json();const places=[];
 for(const feature of data.features||[]){const [lon,lat]=feature.geometry?.coordinates||[];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;const properties=feature.properties||{};if(!['address','venue'].includes(properties.layer))continue;
 if(!providerMatches(query,properties))continue;
 if(!parsed&&/^(?:CL|KR|AV|DG|TV)\s+\d/.test(normalizeAddress(query)))continue;
 places.push(await signedPlace({label:properties.label,lon,lat,source:'OpenRouteService · OpenStreetMap',quality:'search'},query,env));}return json({places,message:places.length?undefined:'No encontramos una coincidencia suficientemente relacionada con ese nombre, dirección y zona. Agrega el establecimiento o la dirección completa; también puedes usar tu ubicación.'})}
 if(url.pathname==='/api/quote'&&request.method==='POST'){
 if(!env.ORS_API_KEY)return json({message:'El servicio de rutas no está conectado.'},503);
 if(Number(request.headers.get('content-length')||0)>12000)return json({message:'Solicitud demasiado grande.'},413);
 const {places}=await request.json();if(!Array.isArray(places)||places.length<2||places.length>10)return json({message:'Selecciona recogida, llegada y las paradas en las sugerencias.'},400);
 for(const p of places){const value=signedValue(p);if(!Number.isFinite(p.expires)||p.expires<Date.now()||!Number.isFinite(p.lat)||!Number.isFinite(p.lon)||p.signature!==await sign(value,env.SUPABASE_SERVICE_KEY))return json({message:'Selecciona nuevamente las direcciones para actualizar la cotización.'},400)}
 const response=await fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car',{method:'POST',headers:{Authorization:env.ORS_API_KEY.trim(),'Content-Type':'application/json'},body:JSON.stringify({coordinates:places.map(p=>[p.lon,p.lat]),radiuses:places.map(()=>1000)}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){const problem=await response.json().catch(()=>({}));return json({message:'No se encontró una ruta por carretera. Revisa los puntos seleccionados.',provider_status:response.status,provider_code:problem.error?.code},422);}const route=await response.json();const summary=route.routes?.[0]?.summary;if(!summary||summary.distance<=0)return json({message:'No se pudo calcular este recorrido.'},422);
 const accessNotes=[];const resultRoute=route.routes[0];if(typeof resultRoute.geometry==='string'&&Array.isArray(resultRoute.way_points)){const geometry=decodeGeometry(resultRoute.geometry);for(let i=0;i<places.length;i++){const point=geometry[resultRoute.way_points[i]];if(!point)return json({message:'No pudimos identificar el acceso vial de uno de los puntos.'},422);const distance=Math.hypot((point[0]-places[i].lon)*111000*Math.cos(places[i].lat*Math.PI/180),(point[1]-places[i].lat)*111000);if(distance>150){if(places[i].quality==='search'&&!parseAddress(places[i].original)&&distance<=1000){places[i].access_lon=point[0];places[i].access_lat=point[1];places[i].access_distance_m=Math.ceil(distance);accessNotes.push(places[i].label+': estimación hasta la vía accesible a '+Math.ceil(distance)+' m del punto del lugar; se debe coordinar la entrada.');}else return json({message:'La vía encontrada está demasiado lejos de una dirección. Revisa la coincidencia o la referencia del acceso antes de cotizar.'},422);}}}
 const tariffResponse=await fetch(BASE+'/rest/v1/tariff_versions?select=id,per_km_cop,minimum_cop&order=effective_from.desc&limit=1',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY}});if(!tariffResponse.ok)throw new Error('No se pudo consultar la tarifa.');const [tariff]=await tariffResponse.json();if(!tariff)throw new Error('Tarifa pendiente de configuración.');
 const meters=Math.ceil(summary.distance);const seconds=Math.ceil(summary.duration);const price=Math.max(tariff.minimum_cop||0,Math.ceil(meters/1000*tariff.per_km_cop));const id=crypto.randomUUID();
 await db(env,'route_quotes',{id,places:places.map(({label,lon,lat,original,source,quality,access_lon,access_lat,access_distance_m})=>({label,lon,lat,original,source,quality,access_lon,access_lat,access_distance_m})),distance_m:meters,duration_s:seconds,price_cop:price,tariff_id:tariff.id,expires_at:new Date(Date.now()+15*60000).toISOString()});return json({id,distance_m:meters,duration_s:seconds,price_cop:price,access_notes:accessNotes,expires_at:Date.now()+15*60000})}
 return json({message:'Ruta no encontrada.'},404);
 }catch(error){return json({message:error.name==='TimeoutError'?'El cálculo tardó demasiado. Intenta nuevamente.':'No pudimos completar el cálculo. Intenta nuevamente.'},502)}
},async scheduled(event,env,ctx){ctx.waitUntil(dispatchNotifications(env));const time=new Date(event.scheduledTime);if(time.getUTCHours()===12&&time.getUTCMinutes()===0)ctx.waitUntil(checkReservationService(env));}};
