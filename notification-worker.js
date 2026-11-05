const base='https://xbhjqejqbqovwamztdcn.supabase.co';
const origin='https://drakotransport.app';
export const whatsappStatus=()=>({configured:false,enabled:false,mode:'manual'});
async function request(env,path,body,method='POST',authorization){
 const response=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:authorization||'Bearer '+env.SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 if(!response.ok)throw new Error('No se pudo consultar el servicio de avisos.');const text=await response.text();return text?JSON.parse(text):null;
}
export async function checkReservationService(env){if(!env.SUPABASE_SERVICE_KEY)return;await request(env,'rpc/get_public_settings',{});console.log('Control diario del servicio de reservas: disponible.');}
async function telegram(env,method,body){
 let response;try{response=await fetch('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN.trim()+'/'+method,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{}),signal:AbortSignal.timeout(15000)});}catch{throw new Error('Telegram no respondió. Se reintentará.');}
 const data=await response.json().catch(()=>({}));if(!response.ok||!data.ok){const error=new Error('Telegram rechazó la operación (código '+(data.error_code||response.status)+').');error.provider_code=data.error_code||response.status;error.retry_after=data.parameters?.retry_after;throw error;}return data.result;
}
export async function telegramWebhookSecret(env){const bytes=new TextEncoder().encode(env.SUPABASE_SERVICE_KEY+'|drako-telegram-webhook|'+env.TELEGRAM_BOT_TOKEN);return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');}
let botCache;
export async function telegramStatus(env){
 if(!env.TELEGRAM_BOT_TOKEN)return {configured:false,webhook:false,username:null};
 if(botCache?.key===env.TELEGRAM_BOT_TOKEN&&botCache.until>Date.now())return botCache.value;
 const [bot,hook]=await Promise.all([telegram(env,'getMe'),telegram(env,'getWebhookInfo')]);
 const value={configured:true,webhook:hook.url===origin+'/api/telegram/webhook',username:bot.username};botCache={key:env.TELEGRAM_BOT_TOKEN,until:Date.now()+30000,value};return value;
}
export async function setupTelegram(env){
 if(!env.TELEGRAM_BOT_TOKEN)throw new Error('Falta guardar la clave del bot de Telegram como secreto del servidor.');
 const bot=await telegram(env,'getMe');await telegram(env,'setWebhook',{url:origin+'/api/telegram/webhook',secret_token:await telegramWebhookSecret(env),allowed_updates:['message'],drop_pending_updates:false});botCache=null;return {configured:true,webhook:true,username:bot.username};
}
export async function notificationActor(httpRequest,env){
 const authorization=httpRequest.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return null;
 const response=await fetch(base+'/auth/v1/user',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:authorization}});if(!response.ok)return null;const user=await response.json();
 const rows=await request(env,'profiles?id=eq.'+encodeURIComponent(user.id)+'&select=role',undefined,'GET');return rows[0]?{id:user.id,role:rows[0].role}:null;
}
export async function isAdministrator(httpRequest,env){const actor=await notificationActor(httpRequest,env);return Boolean(actor&&['business_admin','technical_admin'].includes(actor.role));}
export async function telegramUserStatus(httpRequest,env){const actor=await notificationActor(httpRequest,env);if(!actor||!['driver','business_admin','technical_admin'].includes(actor.role))return null;return {telegram:await telegramStatus(env),drivers:await request(env,'rpc/telegram_connection_status',{},'POST',httpRequest.headers.get('Authorization')),admin:actor.role!=='driver'};}
const place=p=>typeof p==='string'?p:p?.address||p?.original||p?.label||'Sin indicar';
const time=value=>value&&!Number.isNaN(Date.parse(value))?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(value)):'Sin dato';
export function formatTelegramMessage(p){
 const events={recibida:'Nueva solicitud de viaje',confirmada:'Viaje confirmado',reprogramada:'Cambio de horario',cancelada:'Reserva cancelada',rechazada:'Solicitud rechazada',finalizada:'Servicio finalizado'};
 if(p.details&&!p.first_name)return ('DRAKO · '+(events[p.event]||'Aviso de viaje')+'\n'+p.details).slice(0,3900);
 return ['DRAKO · '+(events[p.event]||'Aviso de viaje'),'Reserva: '+p.reference,'Cliente: '+[p.first_name,p.last_name].filter(Boolean).join(' '),'Móvil: '+p.phone,'Recogida: '+place(p.origin),'Llegada: '+place(p.destination),'Paradas: '+(p.stops?.length?p.stops.map(place).join(' → '):'Sin paradas'),'Pasajeros: '+p.passengers,'Mascotas: '+(p.pets?'Sí':'No'),'Equipaje: '+(p.luggage?p.luggage_details||'Sí':'No'),'Recogida (Colombia): '+time(p.pickup_at),'Reserva creada: '+time(p.created_at),'Valor '+(p.event==='finalizada'?'final':'aproximado')+': '+new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(p.price_cop),'Pago: '+p.payment_method].join('\n').slice(0,3800)+'\nConsulta todos los detalles en tu agenda.';
}
export async function dispatchNotifications(env){
 if(!env.TELEGRAM_BOT_TOKEN)return {configured:false,channel:'telegram',sent:0};
 const jobs=await request(env,'rpc/claim_telegram_notifications',{});let sent=0;const chats=new Set();
 for(const job of jobs){const p=job.payload;try{
 if(chats.has(p.chat_id))await new Promise(resolve=>setTimeout(resolve,1100));chats.add(p.chat_id);
 const message=await telegram(env,'sendMessage',{chat_id:p.chat_id,text:formatTelegramMessage(p),link_preview_options:{is_disabled:true},reply_markup:{inline_keyboard:[[{text:'Abrir mi agenda',url:origin+'/#conductor'}]]}});
 if(!message?.message_id)throw new Error('Telegram no confirmó la recepción del aviso.');
 await request(env,'notification_outbox?id=eq.'+job.id,{provider_accepted_at:new Date().toISOString(),provider_message_id:String(message.message_id),last_error:null},'PATCH');sent++;
 }catch(error){if(error.provider_code===403)await request(env,'rpc/telegram_chat_unreachable',{p_driver:p.driver_id,p_chat:p.chat_id});const seconds=Math.min(3600,Math.max(Number(error.retry_after)||0,30*2**job.attempts));await request(env,'notification_outbox?id=eq.'+job.id,{last_error:error.message,next_attempt_at:new Date(Date.now()+seconds*1000).toISOString()},'PATCH');}}
 return {configured:true,channel:'telegram',sent};
}
export async function dispatchForBooking(httpRequest,env){const {reference,token}=await httpRequest.json();if(typeof reference!=='string'||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Solicitud inválida.');await request(env,'rpc/get_booking',{p_reference:reference,p_token:token});return dispatchNotifications(env);}
export async function handleTelegramWebhook(httpRequest,env){
 if(!env.TELEGRAM_BOT_TOKEN||httpRequest.headers.get('X-Telegram-Bot-Api-Secret-Token')!==await telegramWebhookSecret(env))return Response.json({ok:false},{status:403});
 const raw=await httpRequest.text();if(raw.length>65536)return Response.json({ok:false},{status:413});let update;try{update=JSON.parse(raw);}catch{return Response.json({ok:false},{status:400});}
 const message=update.message;if(!message||message.chat?.type!=='private'||message.from?.id!==message.chat?.id||!Number.isSafeInteger(message.chat.id))return Response.json({ok:true});
 const match=/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([a-f0-9]{64}))?\s*$/.exec(message.text||'');if(!match)return Response.json({ok:true});
 let text='Para conectar los avisos, abre DRAKO → Conductor → Avisos por Telegram y genera tu enlace privado.';
 if(match[1]){const linked=await request(env,'rpc/link_telegram_chat',{p_code:match[1],p_chat:message.chat.id});text=linked?'Telegram quedó conectado a tu agenda de DRAKO. Aquí recibirás los avisos de tus viajes.':'El enlace venció, ya se utilizó en otro chat o no es válido. Genera otro desde tu panel de DRAKO.';}
 // Telegram can execute this reply directly from the webhook response. This does
 // not claim delivery/read status and does not expose any reservation details.
 return Response.json({method:'sendMessage',chat_id:message.chat.id,text});
}
