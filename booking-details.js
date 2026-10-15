const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency=n=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n);
const date=value=>value?new Intl.DateTimeFormat('es-CO',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Bogota'}).format(new Date(value)):'Sin registrar';
const place=value=>{if(typeof value==='string')return value;const text=value?.address||value?.formatted_address||value?.label||value?.name||'Sin indicar';return value?.label&&value.label!==text?text+' · '+value.label:text;};
const yesNo=value=>value===true?'Sí':value===false?'No':'Sin indicar';
const states={pending_driver:'Pendiente de confirmación del conductor',confirmed:'Confirmado',en_route:'En camino',in_progress:'En curso',completed:'Finalizado',cancelled:'Cancelado',rejected:'Rechazado'};
export function bookingDetails(b){
 const stops=Array.isArray(b.stops)?b.stops:[];
 const review=b.review||(Array.isArray(b.trip_reviews)?b.trip_reviews[0]:b.trip_reviews);
 const field=(label,value)=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`;
 const navigation=(label,p)=>{if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lon))return '';const coordinates=encodeURIComponent(p.lat+','+p.lon);return `<div class="navigation-links"><span>${escape(label)}</span><a target="_blank" rel="noopener noreferrer" href="https://waze.com/ul?ll=${coordinates}&navigate=yes">Abrir en Waze</a><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=${coordinates}&travelmode=driving">Google Maps</a></div>`;};
 return `<article class="reservation-card" data-reservation="${escape(b.id)}">${b.is_test?'<span class="pill">Prueba anterior</span>':''}<h4>${escape(b.first_name)} ${escape(b.last_name)}</h4><dl class="reservation-fields">
 ${field('Nombre',b.first_name)}${field('Apellido',b.last_name||'Sin indicar')}${field('Teléfono de contacto',b.phone||'Sin indicar')}
 ${field('Punto de recogida',place(b.origin))}${field('Punto de llegada',place(b.destination))}${field('Paradas adicionales',stops.length?stops.map(place).join(' → '):'Sin paradas')}
 ${field('Cantidad de pasajeros',b.passengers??'Sin indicar')}${field('Mascotas',yesNo(b.pets))}${field('Equipaje',yesNo(b.luggage))}
 ${b.luggage&&b.luggage_details?field('Detalle del equipaje',b.luggage_details):''}
 ${field('Fecha y hora de recogida',date(b.pickup_at))}${field('Fecha y hora de reserva',date(b.created_at))}
 ${field('Número de reserva',b.reference)}${field(b.status==='completed'?'Valor del recorrido':'Valor aproximado',currency(b.price_cop))}${field('Método de pago',b.payment_method)}${field('Estado',states[b.status]||b.status)}
 ${review?field('Calificación',review.rating+' / 5')+field('Comentario',review.comment||'Sin comentario'):''}
 </dl>${navigation('Recogida',b.origin)}${navigation('Llegada',b.destination)}${stops.map((p,i)=>navigation('Parada '+(i+1),p)).join('')}</article>`;
}
