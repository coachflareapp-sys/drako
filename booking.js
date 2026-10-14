import {publicRpc} from './api.js';
import {setupPhone} from './phone.js';
import {setupQuote} from './route-quote.js';
const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);

export function booking(root){
 root.innerHTML=`<span class="eyebrow">TU PRÓXIMO RECORRIDO</span><h2>Programa tu viaje</h2>
 <div class="layout"><form id="booking" class="card"><div class="form-grid">
 <div class="full"><h3 class="form-section-title">Datos del cliente</h3></div>
 <div><label for="first">Nombre (obligatorio)</label><input id="first" name="first_name" required autocomplete="given-name"></div>
 <div><label for="last">Apellido (opcional, recomendado)</label><input id="last" name="last_name" autocomplete="family-name"></div>
 <div class="full"><label for="phone-country">País del teléfono</label><select id="phone-country" aria-label="País e indicativo"><option value="CO">Colombia +57</option></select><label for="phone" class="duration-label">Teléfono de contacto</label><div class="phone-field"><span class="phone-prefix"><img id="phone-flag" alt="Colombia" src="/assets/flags/co.svg" width="24" height="18"><span id="calling-code">+57</span></span><input id="phone" name="phone" type="tel" required inputmode="numeric" autocomplete="tel-national" pattern="[0-9]{4,13}" maxlength="13" placeholder="Número sin indicativo"></div></div>
 <div class="full"><h3 class="form-section-title">Datos del viaje</h3></div>
 <div class="full"><label for="origin">Punto de recogida</label><input id="origin" name="origin" required placeholder="Dirección, barrio o lugar"></div>
 <div class="full"><label for="destination">Punto de llegada</label><input id="destination" name="destination" required placeholder="¿A dónde vamos?"></div>
 <div class="full"><label>Paradas adicionales (si las hay)</label><div id="stops"></div><button id="add-stop" type="button" class="secondary">Añadir parada</button></div>
 <div class="full"><label for="passengers">Cantidad de pasajeros</label><select id="passengers" name="passengers" required><option value="1">1 pasajero</option><option value="2">2 pasajeros</option><option value="3">3 pasajeros</option><option value="4">4 pasajeros</option></select><p class="field-help">Dato para organizar el servicio. Sin recargo por pasajeros.</p></div>
 <div class="full"><label for="pets">Mascotas</label><select id="pets" name="pets" required><option value="no">No</option><option value="yes">Sí</option></select><p class="field-help">Indica si viajas con mascota. Sin recargo por mascotas.</p></div>
 <div class="full"><label for="luggage">Equipaje</label><select id="luggage" name="luggage" required><option value="no">No</option><option value="yes">Sí</option></select></div>
 <div class="full" id="luggage-details" hidden><label for="bags">Cantidad y tamaño de maletas</label><input id="bags" name="luggage_details" placeholder="Ejemplo: 2 maletas de cabina"></div>
 <div><label for="date">Fecha de recogida</label><input id="date" name="pickup_date" type="date" required></div>
 <div><label for="time">Hora de recogida</label><input id="time" name="pickup_time" type="time" required></div>
 <div class="full"><p class="field-help">La fecha y hora en que se crea la reserva se registran automáticamente al guardarla.</p></div>
 <div class="full"><label for="payment">Método de pago</label><select id="payment" name="payment_method"><option>Nequi</option><option>Daviplata</option></select></div>
 <div class="full"><p class="notice">Una vez planificado el viaje se generará un costo. No se tendrán en cuenta paradas adicionales no registradas.</p><label class="check"><input id="consent" type="checkbox" required><span>Autorizo el tratamiento de mis datos para gestionar esta solicitud conforme a la <a href="/privacidad.html#datos">política de privacidad</a>.</span></label></div>
 </div><div class="actions"><button id="submit-booking" type="submit" disabled>Solicitar viaje →</button></div><div id="result" role="status"></div></form>
 <aside class="card summary"><span class="pill">Valor aproximado</span><h3>Tu recorrido</h3><div class="price" id="price">—</div><div class="line"><span>Distancia por carretera</span><span id="route-distance">—</span></div><div class="line"><span>Duración aproximada</span><span id="route-duration">—</span></div><p id="quote-status" role="status">Selecciona las direcciones para calcular el valor aproximado.</p><div class="line"><span>Pasajeros y mascotas</span><span>Sin recargo</span></div><p class="notice">El valor mostrado es aproximado. La solicitud queda pendiente de confirmación del conductor. Al iniciar el servicio se activará la medición del recorrido.</p><p class="muted">Rutas: <a href="https://openrouteservice.org/" target="_blank" rel="noopener">OpenRouteService</a> · datos de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>.</p></aside></div>`;
 const getQuote=setupQuote();let getPhone;setupPhone().then(read=>{getPhone=read;document.querySelector('#submit-booking').disabled=false}).catch(error=>document.querySelector('#result').textContent=error.message);
 document.querySelector('#luggage').onchange=e=>{document.querySelector('#luggage-details').hidden=e.target.value!=='yes'};
 const requestId=crypto.randomUUID();const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
 document.querySelector('#booking').onsubmit=async e=>{e.preventDefault();const button=document.querySelector('#submit-booking');const result=document.querySelector('#result');button.disabled=true;result.textContent='Comprobando disponibilidad y guardando…';
 const value=id=>document.querySelector('#'+id).value;
 try{const quote=getQuote();const response=await publicRpc('submit_quoted_booking',{p_request_id:requestId,p_token:token,p_quote_id:quote.id,p_data:{first_name:value('first'),last_name:value('last'),phone:getPhone(),passengers:Number(value('passengers')),pets:value('pets')==='yes',luggage:value('luggage')==='yes',luggage_details:value('bags'),pickup_at:`${value('date')}T${value('time')}:00-05:00`,consent:document.querySelector('#consent').checked,payment_method:value('payment')}});
 if(response.ok){location.hash=`reserva=${encodeURIComponent(response.reference)}&token=${token}`;return}
 result.textContent=response.alternatives?.length?'Elige uno de estos horarios alternativos:':'No se encontró un intervalo viable en los próximos 14 días. Prueba otra fecha o contacta al conductor.';
 for(const alternative of response.alternatives||[]){const choice=document.createElement('button');choice.type='button';choice.className='secondary alternative';choice.textContent=new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(alternative));choice.onclick=()=>{const local=new Date(new Date(alternative).getTime()-5*3600000).toISOString();document.querySelector('#date').value=local.slice(0,10);document.querySelector('#time').value=local.slice(11,16);result.textContent='Horario seleccionado. Envía de nuevo para confirmar la solicitud.'};result.append(choice)}
 }catch(error){result.textContent=error.message}finally{button.disabled=false}};
}
