import {supabaseConfig} from './config.js';
let session;try{session=JSON.parse(sessionStorage.getItem('drako-session')||'null')}catch{session=null}
function store(value){session=value;if(value)sessionStorage.setItem('drako-session',JSON.stringify(value));else sessionStorage.removeItem('drako-session')}
async function request(path,{method='GET',body,token}={}){
 const response=await fetch(supabaseConfig.url+path,{method,headers:{apikey:supabaseConfig.anonKey,Authorization:`Bearer ${token||supabaseConfig.anonKey}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const payload=await response.text();let data;try{data=payload?JSON.parse(payload):null}catch{data=null}
 if(!response.ok){const error=new Error(data?.message||data?.msg||data?.error_description||'No se pudo completar la operación.');error.status=response.status;throw error}return data;
}
export const auth={
 async signIn(email,password){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});store({...data,expires_at:Date.now()+data.expires_in*1000});return data.user},
 async token(){if(!session)return null;if(session.expires_at<Date.now()+60000){try{const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});store({...data,expires_at:Date.now()+data.expires_in*1000})}catch(error){if(error.status===400||error.status===401)store(null);throw error}}return session.access_token},
 async signOut(){const token=await this.token();try{if(token)await request('/auth/v1/logout?scope=local',{method:'POST',token})}finally{store(null)}},
 async recover(email){await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin+'/#restablecer')}`,{method:'POST',body:{email}})},
 acceptRecovery(){const values=new URLSearchParams(location.hash.slice(1));if(values.get('type')!=='recovery'||!values.get('access_token'))return false;store({access_token:values.get('access_token'),refresh_token:values.get('refresh_token'),expires_at:Date.now()+Number(values.get('expires_in')||3600)*1000});history.replaceState(null,'','#restablecer');return true},
 async updatePassword(password){return request('/auth/v1/user',{method:'PUT',token:await this.token(),body:{password}})}
};
export async function acceptActivation(){const values=new URLSearchParams(location.hash.slice(1));const hash=values.get('activar');if(!hash)return;history.replaceState(null,'','#restablecer');try{const data=await request('/auth/v1/verify',{method:'POST',body:{token_hash:hash,type:'recovery'}});store({...data,expires_at:Date.now()+data.expires_in*1000})}catch{store(null);history.replaceState(null,'','#activacion-vencida')}}
export async function dataRequest(path,options={}){const token=await auth.token();if(!token)throw new Error('Inicia sesión para continuar.');return request('/rest/v1/'+path,{...options,token})}
export async function publicRpc(name,body){return request('/rest/v1/rpc/'+name,{method:'POST',body})}
