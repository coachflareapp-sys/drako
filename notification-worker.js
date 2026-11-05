const base='https://xbhjqejqbqovwamztdcn.supabase.co';
const required=['WHATSAPP_TOKEN','WHATSAPP_PHONE_NUMBER_ID','WHATSAPP_TEMPLATE_DRIVER','WHATSAPP_TEMPLATE_CUSTOMER','WHATSAPP_API_VERSION'];
export const whatsappStatus=env=>({configured:required.every(key=>Boolean(env[key])),missing:required.filter(key=>!env[key])});
export async function checkReservationService(env){
 if(!env.SUPABASE_SERVICE_KEY)return;
 const response=await fetch(base+'/rest/v1/rpc/get_public_settings',{method:'POST',headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error('Control diario del servicio de reservas: HTTP '+response.status);
 console.log('Control diario del servicio de reservas: disponible.');
}
async function request(env,path,body,method='POST'){
 const response=await fetch(base+'/rest/v1/'+path,{method,headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY,'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!response.ok)throw new Error('No se pudo consultar la cola de avisos.');const text=await response.text();return text?JSON.parse(text):null;
}
export async function dispatchNotifications(env){
 if(!whatsappStatus(env).configured)return {configured:false,sent:0};
 const notifications=await request(env,'rpc/claim_whatsapp_notifications',{});let sent=0;
 for(const notification of notifications){const payload=notification.payload;try{
 const response=await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,{method:'POST',headers:{Authorization:'Bearer '+env.WHATSAPP_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:payload.to.replace(/\D/g,''),type:'template',template:{name:payload.audience==='driver'?env.WHATSAPP_TEMPLATE_DRIVER:env.WHATSAPP_TEMPLATE_CUSTOMER,language:{code:env.WHATSAPP_TEMPLATE_LANGUAGE||'es'},components:[{type:'body',parameters:[payload.reference,payload.event,payload.details].map(text=>({type:'text',text}))}]}}),signal:AbortSignal.timeout(15000)});
 const result=await response.json();if(!response.ok)throw new Error('WhatsApp HTTP '+response.status+' · código '+(result.error?.code||'desconocido'));
 if(!result.messages?.[0]?.id)throw new Error('WhatsApp no confirmó la aceptación del mensaje.');
 await request(env,'notification_outbox?id=eq.'+notification.id,{provider_accepted_at:new Date().toISOString(),provider_message_id:result.messages[0].id,last_error:null},'PATCH');sent++;
 }catch(error){await request(env,'notification_outbox?id=eq.'+notification.id,{last_error:error.name==='TimeoutError'?'El proveedor tardó demasiado.':error.message,next_attempt_at:new Date(Date.now()+Math.min(3600,60*2**notification.attempts)*1000).toISOString()},'PATCH');}}
 return {configured:true,sent};
}
export async function isAdministrator(request,env){
 const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return false;
 const response=await fetch(base+'/auth/v1/user',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:authorization}});if(!response.ok)return false;const user=await response.json();
 const profile=await fetch(base+'/rest/v1/profiles?id=eq.'+encodeURIComponent(user.id)+'&select=role',{headers:{apikey:env.SUPABASE_SERVICE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_KEY}});if(!profile.ok)return false;return (await profile.json()).some(p=>['business_admin','technical_admin'].includes(p.role));
}
export async function dispatchForBooking(request,env){const {reference,token}=await request.json();if(typeof reference!=='string'||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Solicitud inválida.');await requestBooking(env,reference,token);return dispatchNotifications(env);}
async function requestBooking(env,reference,token){return request(env,'rpc/get_booking',{p_reference:reference,p_token:token});}
