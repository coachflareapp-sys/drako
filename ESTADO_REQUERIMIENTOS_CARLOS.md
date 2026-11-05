# Estado verificado de los requisitos de Carlos

Auditoría del 4 de noviembre de 2026 sobre https://drakotransport.app/.
Este informe sustituye el estado anterior de WhatsApp automático: se eligió Telegram para el conductor y confirmación web para el pasajero, sin contratar WhatsApp Business.

## Comprobado en la aplicación publicada

| Requisito | Resultado |
| --- | --- |
| Bienvenida, marca y acceso | Logo dorado, enlace de AITREZ, bienvenida y botón de reservas. QR de 800 × 800 decodificado de forma independiente: abre el dominio actual. |
| Datos del cliente primero | Nombre y teléfono obligatorios; apellido opcional; después recogida, destino, paradas, pasajeros (1 por defecto), mascotas, equipaje por tamaños/cantidades y fecha/hora. Creación automática en servidor. |
| Teléfonos internacionales | Colombia predeterminada; 245 países/territorios. Cambio a Estados Unidos y validación de teléfono comprobados. |
| Direcciones | 30 direcciones de cinco zonas encontradas en el catálogo oficial; 29 inequívocas seleccionadas automáticamente. Cinco rutas reales cotizadas correctamente. No garantiza todas las puertas de Cali. |
| Valor aproximado | Ruta por carretera con ORS y tarifa del servidor. Pasajeros y mascotas sin recargo. Sin recargo de equipaje inventado. |
| Reserva y confianza | Reserva pública real, referencia única y enlace privado; datos de vehículo ocultos hasta confirmación del conductor. Privacidad y términos visibles. |
| Gestión del viaje | Confirmación, reprogramación con nueva aceptación, inicio, finalización, calificación y registro de pago probados en navegador. |
| Agenda | Orden por día/hora de Colombia, consulta de un día, próximos y pendientes, paginación de 100, actualización periódica. Bloqueo manual creado y retirado; conflicto rechazado. |
| Horarios y restricciones | Horarios editables y alternativas dentro de una ventana de 60 días. Pruebas SQL de pico y placa y excepción de Navidad aprobadas. Reglas vigentes de 2026; no se supone la rotación de 2027. |
| Pagos | Efectivo, Nequi y Daviplata. Registro de pago recibido; no verificación bancaria automática. |
| Reportes | Consulta por fechas, estadísticas y CSV compatible con Excel; vista imprimible y PDF generados. Importes y referencia cotejados contra la reserva temporal. |
| Administración | Acceso por rol, horarios, bloqueos, tarifas, textos y reportes. Navegación rápida no inserta paneles antiguos en el formulario público. |
| Seguridad | Escritura directa denegada, enlace privado inválido rechazado, cancelación libera agenda. Vinculación Telegram con código temporal, hash y controles de repetición. |
| Móvil | Formulario revisado a 390 × 844 sin desbordamiento horizontal. |

## Pendientes y límites reales

- **Telegram:** código, cola, reintentos y panel preparados; falta guardar `TELEGRAM_BOT_TOKEN`, activar el bot y vincular el celular de Carlos. No se ha probado una notificación real en su teléfono. Instrucciones en [TELEGRAM.md](TELEGRAM.md).
- **WhatsApp:** botón manual disponible. No hay avisos automáticos por WhatsApp ni confirmación automática al pasajero por ese canal, según la alternativa elegida.
- **Taxímetro:** ciclo completo probado con GPS simulado: 111,19 metros y 223 COP. Falta prueba de recorrido real; el navegador requiere ubicación y primer plano. No se garantiza seguimiento con pantalla apagada o Waze abierto.
- **Dominio:** se usa `drakotransport.app`; no se adquirió un `.co` o `.com.co`.
- **Modificar reserva:** cambio de fecha/hora y cancelación disponibles; edición completa del recorrido pendiente.
- **Escalabilidad:** datos y agendas separados por conductor; falta asistente de alta/invitación de conductores. Idiomas adicionales pendientes.
- **Fuentes gratuitas:** tienen cuotas y disponibilidad propias. La copia municipal no incluye tráfico en tiempo real ni garantiza cobertura universal. No se cotiza un domicilio usando silenciosamente el centro de Cali.
- **Reportes:** CSV compatible con Excel, no XLSX nativo. PDF mediante impresión del navegador.

## Evidencia y limpieza

Se recorrió el flujo con una reserva temporal desde el formulario público, incluyendo una parada, mascotas y maletas; se cotejaron recepción, panel del conductor, reporte, pago y calificación. Se eliminó esa reserva con sus registros asociados y su bloqueo temporal, conservando los demás datos. Se cerró la sesión administrativa temporal. No se enviaron mensajes de pago ni se contrataron servicios.

Comprobaciones aprobadas: `npm run check`, `npm run build`, `npm test`, `node scripts/test-qr.mjs --live`, auditoría pública de direcciones y migración transaccional `202611040008_audit_booking_safety.sql` (fixtures revertidos).

Correcciones de esta auditoría: agenda antes limitada a los primeros 100 registros históricos; ahora consulta por día y pagina. También se impide que operaciones asíncronas de administración inserten contenido después de cambiar de página.
