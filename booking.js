const money=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);

export function booking(root){
 root.innerHTML=`<span class="eyebrow">TU PRÓXIMO RECORRIDO</span><h2>Programa tu viaje</h2>
 <div class="layout"><form id="booking" class="card"><div class="form-grid">
 <div class="full"><h3 class="form-section-title">Datos del cliente</h3></div>
 <div><label for="first">Nombre (obligatorio)</label><input id="first" name="first_name" required autocomplete="given-name"></div>
 <div><label for="last">Apellido (opcional, recomendado)</label><input id="last" name="last_name" autocomplete="family-name"></div>
 <div class="full"><label for="phone">Teléfono de contacto</label><input id="phone" name="phone" type="tel" required autocomplete="tel" placeholder="+57"></div>
 <div class="full"><h3 class="form-section-title">Datos del viaje</h3></div>
 <div class="full"><label for="origin">Punto de recogida</label><input id="origin" name="origin" required placeholder="Dirección, barrio o lugar"></div>
 <div class="full"><label for="destination">Punto de llegada</label><input id="destination" name="destination" required placeholder="¿A dónde vamos?"></div>
 <div class="full"><label for="stops">Paradas adicionales (si las hay)</label><textarea id="stops" name="stops" placeholder="Escribe cada parada en una línea"></textarea></div>
 <div class="full"><label for="passengers">Cantidad de pasajeros</label><select id="passengers" name="passengers" required><option value="1">1 pasajero</option><option value="2">2 pasajeros</option><option value="3">3 pasajeros</option><option value="4">4 pasajeros</option></select><p class="field-help">Dato para organizar el servicio. Sin recargo por pasajeros.</p></div>
 <div class="full"><label for="pets">Mascotas</label><select id="pets" name="pets" required><option value="no">No</option><option value="yes">Sí</option></select><p class="field-help">Indica si viajas con mascota. Sin recargo por mascotas.</p></div>
 <div class="full"><label for="luggage">Equipaje</label><select id="luggage" name="luggage" required><option value="no">No</option><option value="yes">Sí</option></select></div>
 <div class="full" id="luggage-details" hidden><label for="bags">Cantidad y tamaño de maletas</label><input id="bags" name="luggage_details" placeholder="Ejemplo: 2 maletas de cabina"></div>
 <div><label for="date">Fecha de recogida</label><input id="date" name="pickup_date" type="date" required></div>
 <div><label for="time">Hora de recogida</label><input id="time" name="pickup_time" type="time" required></div>
 <div class="full"><p class="field-help">La fecha y hora en que se crea la reserva se registran automáticamente al guardarla.</p></div>
 <div class="full"><label for="payment">Método de pago</label><select id="payment" name="payment_method"><option>Nequi</option><option>Daviplata</option></select></div>
 <div class="full"><p class="notice">Una vez planificado el viaje se generará un costo. No se tendrán en cuenta paradas adicionales no registradas.</p><label class="check"><input type="checkbox" required><span>Autorizo el tratamiento de mis datos para gestionar esta solicitud conforme a la <a href="/privacidad.html#datos">política de privacidad</a>.</span></label></div>
 </div><div class="actions"><button type="submit">Revisar solicitud →</button></div><p id="result" role="status"></p></form>
 <aside class="card summary"><span class="pill">Cotizador inicial</span><h3>Tu recorrido, en números</h3><label for="km">Distancia de referencia (km)</label><input id="km" type="number" min="0.1" max="500" step="0.1" placeholder="Ejemplo: 12"><p class="muted">Introduce los kilómetros para explorar la tarifa. La distancia automática por carretera se conectará antes de habilitar reservas.</p><div class="price" id="price">—</div><div class="line"><span>Tarifa mínima</span><span>Por definir</span></div><div class="line"><span>Pasajeros y mascotas</span><span>Sin recargo</span></div><p class="notice">Esta versión todavía no confirma ni bloquea reservas. Revisar la solicitud no genera un servicio confirmado.</p></aside></div>`;
 document.querySelector('#km').oninput=e=>{const n=Number(e.target.value);document.querySelector('#price').textContent=n>0?money(n*2000):'—'};
 document.querySelector('#luggage').onchange=e=>{document.querySelector('#luggage-details').hidden=e.target.value!=='yes'};
 document.querySelector('#booking').onsubmit=e=>{e.preventDefault();document.querySelector('#result').textContent='Datos revisados. La confirmación se habilitará al conectar rutas, disponibilidad y Supabase. No se ha creado una reserva.'};
}
