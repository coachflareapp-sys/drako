import {addLocationPicker} from './location-picker.js';
export function setupQuote(){
 const fields=new Map();let quote=null,version=0,calculation=Promise.resolve();
 const status=document.querySelector('#quote-status');
 const clear=()=>{quote=null;version++;for(const id of ['price','route-distance','route-duration'])document.getElementById(id).textContent='—';};
 const ordered=()=>[fields.get('origin'),...[...fields].filter(([id])=>id.startsWith('stop-')).map(([,field])=>field),fields.get('destination')];
 const refresh=()=>calculation=(async()=>{
 clear();const current=version,points=ordered();if(points.some(field=>!field?.place)){status.textContent='Escribe recogida y llegada. Calcularemos el valor cuando identifiquemos ambos puntos.';return;}
 status.textContent='Calculando distancia y valor aproximado…';
 try{const response=await fetch('/api/quote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({places:points.map(field=>field.place)})});const data=await response.json();if(current!==version)return;if(!response.ok)throw new Error(data.message);quote=data;
 document.querySelector('#price').textContent=new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(data.price_cop);
 document.querySelector('#route-distance').textContent=(data.distance_m/1000).toFixed(2)+' km';document.querySelector('#route-duration').textContent=Math.ceil(data.duration_s/60)+' min';status.textContent='Valor aproximado por carretera, incluyendo las paradas registradas. '+(data.access_notes||[]).join(' ');
 }catch(error){if(current===version)status.textContent=error.message;}
 })();
 const attach=input=>{
 input.autocomplete='off';const list=document.createElement('div');list.className='place-suggestions';list.setAttribute('aria-live','polite');input.after(list);
 const item={place:null};fields.set(input.id,item);let timer,sequence=0,pending=null,lastQuery='';
 const select=place=>{sequence++;clearTimeout(timer);input.value=place.original||place.label;item.place=place;list.replaceChildren();const note=document.createElement('p');note.className='field-help';note.textContent='Ubicación encontrada: '+place.label+(place.quality==='cadastral'?' · Punto de referencia catastral.':'');list.append(note);if(place.source?.startsWith('Alcaldía')){const source=document.createElement('a');source.href='https://datos.cali.gov.co/dataset/spt-nomenclatura-domiciliaria';source.target='_blank';source.rel='noopener';source.className='field-help';source.textContent='Alcaldía de Cali · CC BY';list.append(source);}refresh();};
 item.lookup=()=>{
 const text=input.value.trim();clearTimeout(timer);if(item.place)return Promise.resolve();if(text.length<4)return Promise.resolve();if(pending&&lastQuery===text)return pending;lastQuery=text;const own=++sequence;
 pending=(async()=>{try{const response=await fetch('/api/places?q='+encodeURIComponent(text));const data=await response.json();if(own!==sequence||!input.isConnected)return;if(!response.ok)throw new Error(data.message);list.replaceChildren();if(data.auto_select&&data.places.length===1){select(data.places[0]);return;}
 for(const place of data.places){const button=document.createElement('button');button.type='button';button.textContent=place.label;button.onclick=()=>select(place);list.append(button);}
 const note=document.createElement('p');note.className='field-help';note.textContent=data.places.length?'Toca la dirección que corresponde a tu viaje.':data.message||'No encontramos el número exacto. Revisa la dirección y selecciona una coincidencia; el mapa es una ayuda opcional.';list.append(note);
 }catch(error){if(own===sequence)status.textContent=error.message;}finally{if(lastQuery===text)pending=null;}})();return pending;
 };
 addLocationPicker(input,select,()=>item.place);
 input.oninput=()=>{item.place=null;sequence++;clear();clearTimeout(timer);list.replaceChildren();status.textContent='Buscando las direcciones para calcular tu recorrido…';timer=setTimeout(item.lookup,600);};
 input.addEventListener('blur',()=>item.lookup());
 };
 attach(document.querySelector('#origin'));attach(document.querySelector('#destination'));
 let stops=0;document.querySelector('#add-stop').onclick=()=>{if(stops>=8)return;const id='stop-'+(++stops),row=document.createElement('div'),input=document.createElement('input'),label=document.createElement('label'),remove=document.createElement('button');row.className='stop-field';label.textContent='Parada '+stops;label.htmlFor=id;input.id=id;input.required=true;input.placeholder='Ejemplo: Calle 5 # 39-71, Cali';remove.type='button';remove.className='secondary';remove.textContent='Quitar parada';remove.onclick=()=>{fields.delete(id);row.remove();refresh();};row.append(label,input,remove);document.querySelector('#stops').append(row);attach(input);refresh();};
 const getQuote=async()=>{await Promise.all([...fields.values()].map(field=>field.lookup()));await calculation;if(!quote||quote.expires_at<Date.now()){if(ordered().every(field=>field?.place))await refresh();}if(!quote||quote.expires_at<Date.now())throw new Error('Selecciona las direcciones encontradas para calcular el valor. '+status.textContent);return quote;};
 const retry=document.createElement('button');retry.type='button';retry.className='secondary';retry.textContent='Calcular valor';retry.onclick=()=>getQuote().catch(error=>status.textContent=error.message);status.after(retry);
 return getQuote;
}
