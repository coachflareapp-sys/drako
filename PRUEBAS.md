# Probar DRAKO

## Acceso

Abrir `.private/accesos.html` localmente y utilizar el enlace de la cuenta deseada para establecer su contraseña. Son enlaces privados de un solo uso con vencimiento de Supabase; no se suben al hosting ni a Git. Si vencen, ejecutar `scripts/create-test-access.ps1` para generar nuevos enlaces.

- Conductor: cegarve@hotmail.com, portal /#conductor.
- Administración del negocio: drakotransportapp@gmail.com, portal /#administracion.
- Administración técnica: aitrezsg@gmail.com, portal /#administracion; avisos desactivados.

## Recorrido de prueba

1. Abrir https://drakotransport.app/#reservar en una pestaña como pasajero.
2. Completar datos del cliente primero, luego direcciones, paradas, pasajeros, mascota/equipaje y recogida. Introducir kilómetros y minutos manualmente en el panel de pruebas.
3. Enviar. El sistema guarda una solicitud pendiente de confirmación y su fecha de creación, calcula el precio en servidor, bloquea su intervalo más 15 minutos y muestra un enlace privado. Guardar ese enlace.
4. En otra pestaña abrir el portal del conductor, iniciar sesión y actualizar la agenda. Confirmar el viaje de prueba.
5. Volver al enlace del pasajero y actualizar estado: ahora se muestran conductor y vehículo.
6. Probar cancelar desde el pasajero o rechazar desde conductor: se libera el intervalo.
7. Probar dos solicitudes a la misma hora: la segunda recibe hasta tres horarios alternativos. Ninguno se reserva hasta enviar nuevamente.
8. Intentar quitar un horario con una reserva pendiente: la base de datos rechaza el cambio.

## Alcance

Todas estas solicitudes se marcan `is_test=true`. No prestar servicios ni efectuar pagos por ellas. Distancia y duración son manuales, con tarifa de 2.000 COP/km y sin tarifa mínima en pruebas. Pasajeros y mascotas no tienen recargo. Capacidad de pasajeros provisional para prueba: hasta cuatro; confirmar capacidad real antes de operar.

El horario inicial cierra viernes y domingo; sábado hasta mediodía. Se respetan excepciones/restricciones existentes en base de datos, pero no se ha configurado un calendario oficial actualizado de pico y placa. La prueba utiliza al primer conductor activo con vehículo, no un algoritmo de asignación de flota. El margen fijo no calcula el desplazamiento real entre servicios. No hay Telegram, mapas, pagos verificados ni recordatorios activos todavía. La modificación del recorrido por el pasajero queda pendiente.

Las pruebas no se eliminan automáticamente; cancelar libera la agenda, pero conserva el registro. AITREZ puede limpiar registros de prueba de forma controlada. Las verificaciones automáticas de implementación eliminan exclusivamente sus propios datos.

## Verificaciones realizadas

- scripts/test-booking-flow.ps1: persistencia, precio calculado, fecha automática, idempotencia, alternativas, secreto de invitado, confirmación autenticada, vehículo oculto hasta confirmación y liberación al cancelar.
- Navegador publicado: formulario → solicitud → agenda del conductor → confirmación → vehículo visible al pasajero → cancelación. Sin errores de JavaScript observados.
