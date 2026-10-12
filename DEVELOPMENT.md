# Implementación y decisiones

## Datos confirmados

- Dominio: drakotransport.app. DNS: alberto.ns.cloudflare.com y nena.ns.cloudflare.com.
- Cobertura inicial: Cali urbana, municipios adyacentes incluyendo Palmira, aeropuerto Alfonso Bonilla Aragón.
- Responsable/contacto: Carlos Eduardo García, +57 315 471 7642.
- Conductor: cegarve@hotmail.com.
- Administración del negocio: drakotransportapp@gmail.com.
- Administración técnica: aitrezsg@gmail.com, sin avisos de viajes.
- Vehículo: IZN897, Kia Rio Stylus, 2016, Plata.
- Horario: lunes a jueves 07:00–20:00, viernes bloqueado inicialmente, sábado 07:00–12:00, domingo cerrado.
- Excepciones por fecha y turnos que crucen medianoche editables por conductor/admin. Cambios que afecten reservas activas rechazados hasta resolver conflictos.
- Tarifa: 2.000 COP/km. Mínimo sin confirmar, no se inventa un valor de Uber.
- Nequi y Daviplata. Datos de recepción pendientes.
- Mascotas y equipaje declarados. No hay recargos definidos.
- Telegram para avisos del conductor. No enviar avisos de carreras a administración técnica.
- Logo principal plateado sobre negro, slogan: El camino seguro hacia tu destino.

## Siguientes entregas

### Backend

Aplicar migración revisada mediante conexión administrativa segura. La clave anon suministrada no permite crear tablas ni cuentas administrativas. Crear cuentas mediante invitación, nunca contraseñas predecibles. Asignar roles desde servidor, no desde metadatos editables por usuarios.

Crear cotizaciones temporales en servidor con coordenadas validadas, ruta por carretera incluyendo paradas, precio y versión de tarifa. No aceptar distancia/precio calculados por el navegador. Confirmación idempotente con revalidación de horario, restricciones, capacidad y traslado entre viajes; escritura de reserva, intervalo y evento de aviso en una transacción.

Las modificaciones de horario y confirmaciones deben usar el mismo bloqueo transaccional por conductor para evitar carreras entre operaciones. La restricción de exclusión de intervalos es una defensa adicional, no resuelve por sí sola el tiempo de traslado ni las reglas de horario.

Token aleatorio para invitados, almacenado como hash, con vencimiento. Referencia pública nunca autoriza acceso. Cancelación libera intervalo de forma transaccional. Reprogramación conserva el intervalo anterior hasta que se confirme el nuevo.

### Operación

Agenda diaria, cambios de estado y registro manual del pago. Los comprobantes no acreditan pago automáticamente. Reglas de pico y placa con vigencia, fuente oficial y revisión; no asumir que el viernes indicado es válido indefinidamente. Todo el calendario se interpreta en America/Bogota y se almacena en UTC.

Cola de avisos Telegram con intentos y deduplicación. El conductor activa previamente el bot. Recordatorios programados fuera del navegador. Fallar el aviso no elimina una reserva confirmada.

### Cliente registrado y administración

Historial y direcciones guardadas, gestión por enlace para invitados, edición de mensajes/tarifas, reportes Excel/PDF, gestión de conductores y vehículos. Precio acordado y desglose visibles para ambas partes; el taxímetro GPS permanece como decisión pendiente.

### Validación antes de habilitar reservas

- Dos confirmaciones simultáneas del mismo intervalo.
- Dos conductores disponibles a la misma hora y un vehículo compartido.
- Cambios de horario simultáneos con confirmación de reserva.
- Traslado necesario desde destino anterior hasta siguiente recogida.
- Restricciones, excepciones y turnos nocturnos.
- Aislamiento entre pasajeros y conductores, invitados sin acceso a otras reservas.
- Reprogramación, cancelación, precio histórico y avisos fallidos.
- Accesibilidad, formularios y notificaciones en celulares reales.

## Estado actual

Migraciones 202610110001, 202610110002 y 202610110003 aplicadas. Historial sincronizado. Tres cuentas configuradas, roles verificados mediante sesiones autenticadas temporales; conductor, vehículo y cinco intervalos semanales iniciales vinculados. Autenticación, consulta de agenda y edición de horario semanal conectadas. Pruebas transaccionales de conflictos y solapamientos pasaron sin dejar datos de prueba.

Compilación y comprobaciones de sintaxis pasaron. No se ha realizado aún validación visual en navegador. Recuperación de contraseñas requiere configurar URLs y SMTP. Reservas públicas, rutas automáticas, excepciones desde la interfaz y notificaciones activas siguen pendientes; el formulario no afirma que se haya confirmado un servicio.
