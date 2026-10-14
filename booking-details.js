const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const date=value=>value?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(value)):'Sin registrar';
const place=value=>typeof value==='string'?value:value?.address||value?.formatted_address||value?.label||value?.name||'Sin indicar';
const yesNo=value=>value===true?'Sí':value===false?'No':'Sin indicar';
const states={pending_driver:'Pendiente de confirmación del conductor',confirmed:'Confirmado',en_route:'En camino',in_progress:'En curso',completed:'Finalizado',cancelled:'Cancelado',rejected:'Rechazado'};
export function bookingDetails(b){
 const stops=Array.isArray(b.stops)?b.stops:[];
 const field=(label,value)=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`;
 return `<article class="reservation-card">${b.is_test?'<span class="pill">Prueba</span>':''}<h4>${escape(b.first_name)} ${escape(b.last_name)}</h4><dl class="reservation-fields">
 ${field('Nombre',b.first_name)}${field('Apellido',b.last_name||'Sin indicar')}${field('Teléfono de contacto',b.phone||'Sin indicar')}
 ${field('Punto de recogida',place(b.origin))}${field('Punto de llegada',place(b.destination))}${field('Paradas adicionales',stops.length?stops.map(place).join(' → '):'Sin paradas')}
 ${field('Cantidad de pasajeros',b.passengers??'Sin indicar')}${field('Mascotas',yesNo(b.pets))}${field('Equipaje',yesNo(b.luggage))}
 ${b.luggage&&b.luggage_details?field('Detalle del equipaje',b.luggage_details):''}
 ${field('Fecha y hora de recogida',date(b.pickup_at))}${field('Fecha y hora de reserva',date(b.created_at))}
 ${field('Número de reserva',b.reference)}${field('Valor',currency(b.price_cop))}${field('Método de pago',b.payment_method)}${field('Estado',states[b.status]||b.status)}
 </dl></article>`;
}
