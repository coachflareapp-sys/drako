const BASE='https://xbhjqejqbqovwamztdcn.supabase.co';
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function sign(value,secret){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(JSON.stringify(value)))),v=>v.toString(16).padStart(2,'0')).join('')}
async function db(env,path,body){const response=await fetch(BASE+'/rest/v1/'+path,{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)});if(!response.ok)throw new Error('No fue posible guardar la cotización.');return response.json()}
export default {async fetch(request,env){const url=new URL(request.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!env.ORS_API_KEY||!env.SUPABASE_SERVICE_KEY)return json({message:'La cotización automática todavía está conectándose. Intenta nuevamente en unos minutos.'},503);
 try{
 if(url.pathname==='/api/places'&&request.method==='GET'){
 const query=url.searchParams.get('q')?.trim();if(!query||query.length<4||query.length>200)return json({places:[]});
 const provider=new URL('https://api.heigit.org/pelias/v1/search');provider.search=new URLSearchParams({api_key:env.ORS_API_KEY.trim(),text:query,'boundary.country':'COL','boundary.rect.min_lon':'-76.9','boundary.rect.max_lon':'-75.9','boundary.rect.min_lat':'3.0','boundary.rect.max_lat':'4.1','focus.point.lon':'-76.53','focus.point.lat':'3.45',size:'5'});
 const response=await fetch(provider,{headers:{Authorization:env.ORS_API_KEY.trim()},signal:AbortSignal.timeout(12000)});if(!response.ok)return json({message:'El servicio de direcciones no respondió. Intenta nuevamente.',provider_status:response.status},502);const data=await response.json();const places=[];
 for(const feature of data.features||[]){const [lon,lat]=feature.geometry?.coordinates||[];if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;const place={label:feature.properties.label,lon,lat,expires:Date.now()+20*60000};places.push({...place,signature:await sign(place,env.SUPABASE_SERVICE_KEY)})}return json({places})}
 if(url.pathname==='/api/quote'&&request.method==='POST'){
 if(Number(request.headers.get('content-length')||0)>12000)return json({message:'Solicitud demasiado grande.'},413);
 const {places}=await request.json();if(!Array.isArray(places)||places.length<2||places.length>10)return json({message:'Selecciona recogida, llegada y las paradas en las sugerencias.'},400);
 for(const p of places){const value={label:p.label,lon:p.lon,lat:p.lat,expires:p.expires};if(p.expires<Date.now()||p.signature!==await sign(value,env.SUPABASE_SERVICE_KEY))return json({message:'Selecciona nuevamente las direcciones para actualizar la cotización.'},400)}
 const response=await fetch('https://api.heigit.org/openrouteservice/v2/directions/driving-car/json',{method:'POST',headers:{Authorization:env.ORS_API_KEY.trim(),'Content-Type':'application/json'},body:JSON.stringify({coordinates:places.map(p=>[p.lon,p.lat])}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)return json({message:'No se encontró una ruta por carretera. Revisa los puntos seleccionados.'},422);const route=await response.json();const summary=route.routes?.[0]?.summary;if(!summary||summary.distance<=0)return json({message:'No se pudo calcular este recorrido.'},422);
 const tariffResponse=await fetch(BASE+'/rest/v1/tariff_versions?select=id,per_km_cop,minimum_cop&order=effective_from.desc&limit=1',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY}});if(!tariffResponse.ok)throw new Error('No se pudo consultar la tarifa.');const [tariff]=await tariffResponse.json();if(!tariff)throw new Error('Tarifa pendiente de configuración.');
 const meters=Math.ceil(summary.distance);const seconds=Math.ceil(summary.duration);const price=Math.max(tariff.minimum_cop||0,Math.ceil(meters/1000*tariff.per_km_cop));const id=crypto.randomUUID();
 await db(env,'route_quotes',{id,places:places.map(({label,lon,lat})=>({label,lon,lat})),distance_m:meters,duration_s:seconds,price_cop:price,tariff_id:tariff.id,expires_at:new Date(Date.now()+15*60000).toISOString()});return json({id,distance_m:meters,duration_s:seconds,price_cop:price,expires_at:Date.now()+15*60000})}
 return json({message:'Ruta no encontrada.'},404);
 }catch(error){return json({message:error.name==='TimeoutError'?'El cálculo tardó demasiado. Intenta nuevamente.':'No pudimos completar el cálculo. Intenta nuevamente.'},502)}
}};
