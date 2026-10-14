# Estado de rutas, taxímetro y calificaciones

## Implementado

- Selector de 245 países/territorios e indicativos, con banderas SVG y Colombia predeterminado. Admite pegar números internacionales con +.
- Cotización en servidor con direcciones seleccionadas de las sugerencias, paradas en orden y recorrido en automóvil. Coordenadas firmadas; el navegador no determina precio, distancia ni duración.
- Cotización temporal guardada en Supabase, precio por kilómetro según versión de tarifa; pasajeros y mascotas sin adicional.
- Solicitud normal pendiente de confirmación, sin etiquetas de prueba ni campos manuales de kilómetros/minutos.
- Inicio del servicio exclusivamente por conductor asignado, con permiso GPS. Medición de distancia, cálculo acumulado y finalización en servidor.
- Consulta privada del pasajero actualiza estado y medición. Calificación 1–5 y comentario después de finalizar; visibles al conductor/admin.

## Conexión verificada

La clave actual de HeiGIT funciona. Se utiliza api.heigit.org/pelias/v1/search y api.heigit.org/openrouteservice/v2/directions/driving-car. La búsqueda de accesos por carretera admite un radio de 1000 metros para lugares grandes como el aeropuerto; la cotización sigue siendo aproximada y debe confirmarse el punto exacto de recogida/llegada.

Verificación API y navegador: Chipichape → aeropuerto Alfonso Bonilla Aragón, 23.849 metros, 2.630 segundos, 47.698 COP. El formulario mostró 23,8 km y 44 minutos automáticamente. No se crearon reservas.

Las credenciales ORS_API_KEY y SUPABASE_SERVICE_KEY se mantienen en secretos del Worker, no en la interfaz ni en Git.

## Alcance del medidor

Medición GPS aproximada por segmentos, filtrando precisión y saltos imposibles. La web debe permanecer abierta en el teléfono del conductor. Una interrupción de más de dos minutos no se extrapola ni se cobra; se muestra aviso. No es un taxímetro certificado ni seguimiento garantizado en segundo plano. No se han realizado pruebas de conducción física. No hay cobro por tiempo/espera configurado.

La tarifa mínima aún no tiene un importe acordado: no se inventa un valor. Antes de operación comercial se necesitan validación de campo, reglas oficiales de circulación vigentes, capacidad confirmada del vehículo, condiciones finales de cobro y protección/recuperación de intervalos de agenda ante retrasos. Telegram permanece pendiente.

## Verificado

- Sintaxis de todos los módulos y compilación.
- Navegador: selector internacional, cambio a Estados Unidos (+1 y bandera), campos manuales y avisos de prueba retirados.
- Migración transaccional 202610130003: cotización de fixture confiable, privacidad hasta confirmación, teléfono internacional, inicio del conductor, cálculo GPS con posiciones sintéticas, finalización y calificación; todos los registros se revirtieron al terminar.
- Búsqueda y cotización real HeiGIT: verificadas en API y navegador tras guardar la clave correcta.
