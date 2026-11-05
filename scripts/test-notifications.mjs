import assert from 'node:assert/strict';
import {dispatchNotifications,formatTelegramMessage,handleTelegramWebhook,telegramWebhookSecret,setupTelegram,whatsappStatus} from '../notification-worker.js';
const originalFetch=globalThis.fetch;
const env={SUPABASE_SERVICE_KEY:'test-server-key',TELEGRAM_BOT_TOKEN:'123:test-only-not-a-real-token'};
let patches=[],links=0,sends=0,lastPayload;
const job={id:'test-job',attempts:1,payload:{driver_id:'test-driver',chat_id:5550001,event:'recibida',reference:'DRK-TEST',first_name:'Cliente',phone:'+573001234567',origin:{address:'Recogida'},destination:{address:'Llegada'},stops:[],passengers:2,pets:true,luggage:true,luggage_details:'2 pequeñas, 1 grande',pickup_at:'2026-11-20T10:00:00-05:00',created_at:'2026-11-04T12:00:00Z',price_cop:12000,payment_method:'efectivo'}};
globalThis.fetch=async()=>{throw new Error('Missing token must not access any provider');};
assert.equal((await dispatchNotifications({SUPABASE_SERVICE_KEY:'test'})).configured,false);assert.equal(whatsappStatus(env).enabled,false);
globalThis.fetch=async(url,options)=>{const path=String(url);if(path.includes('graph.facebook.com'))throw new Error('Paid provider invoked');
 if(path.includes('claim_telegram_notifications'))return Response.json([job]);
 if(options.method==='PATCH'){patches.push(JSON.parse(options.body));return new Response(null,{status:204});}
 if(path.endsWith('/sendMessage')){sends++;lastPayload=JSON.parse(options.body);return Response.json({ok:true,result:{message_id:42}});}
 if(path.includes('link_telegram_chat')){links++;return Response.json(true);}
 if(path.endsWith('/getMe'))return Response.json({ok:true,result:{username:'DrakoTestBot'}});
 if(path.endsWith('/setWebhook')){const data=JSON.parse(options.body);assert.equal(data.secret_token,await telegramWebhookSecret(env));assert.equal(data.url,'https://drakotransport.app/api/telegram/webhook');return Response.json({ok:true,result:true});}
 throw new Error('Unexpected test request');};
const result=await dispatchNotifications(env);assert.equal(result.sent,1);assert.equal(sends,1);assert.equal(lastPayload.chat_id,5550001);assert.ok(lastPayload.text.indexOf('Cliente:')<lastPayload.text.indexOf('Recogida:'));assert.ok(!('parse_mode' in lastPayload));assert.ok(!('delivered_at' in patches[0]));assert.equal(patches[0].provider_message_id,'42');
assert.ok(!('allow_paid_broadcast' in lastPayload));
const bad=await handleTelegramWebhook(new Request('https://test/api/telegram/webhook',{method:'POST',body:'{}'}),env);assert.equal(bad.status,403);assert.equal(links,0);
const webhook=(chatType,code)=>new Request('https://test/api/telegram/webhook',{method:'POST',headers:{'X-Telegram-Bot-Api-Secret-Token':code},body:JSON.stringify({message:{chat:{id:5550001,type:chatType},from:{id:5550001},text:'/start '+'a'.repeat(64)}})});
await handleTelegramWebhook(webhook('group',await telegramWebhookSecret(env)),env);assert.equal(links,0);
const linked=await handleTelegramWebhook(webhook('private',await telegramWebhookSecret(env)),env);assert.equal(linked.status,200);assert.equal(links,1);assert.ok((await linked.json()).text.includes('conectado'));
assert.equal((await setupTelegram(env)).username,'DrakoTestBot');
patches=[];globalThis.fetch=async(url,options)=>{if(String(url).includes('claim_telegram_notifications'))return Response.json([job]);if(options.method==='PATCH'){patches.push(JSON.parse(options.body));return new Response(null,{status:204});}return Response.json({ok:false,error_code:429,parameters:{retry_after:90}},{status:429});};
assert.equal((await dispatchNotifications(env)).sent,0);assert.ok(patches[0].last_error.includes('429'));assert.ok(!patches[0].provider_accepted_at);assert.ok(Date.parse(patches[0].next_attempt_at)>Date.now());
let unlinked=false;patches=[];globalThis.fetch=async(url,options)=>{if(String(url).includes('claim_telegram_notifications'))return Response.json([job]);if(String(url).includes('telegram_chat_unreachable')){unlinked=true;return new Response(null,{status:204});}if(options.method==='PATCH'){patches.push(JSON.parse(options.body));return new Response(null,{status:204});}return Response.json({ok:false,error_code:403},{status:403});};
assert.equal((await dispatchNotifications(env)).sent,0);assert.equal(unlinked,true);assert.ok(!patches[0].provider_accepted_at);
assert.ok(formatTelegramMessage({...job.payload,origin:{address:'x'.repeat(10000)}}).length<4096);
globalThis.fetch=originalFetch;console.log('PASS: Telegram free channel, authenticated webhook, private-chat binding, provider acceptance, retries and no paid API calls.');
