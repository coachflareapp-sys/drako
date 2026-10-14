# Estado de rutas, taxímetro y calificaciones

## Implementado

- Selector de 245 países/territorios e indicativos, con banderas SVG y Colombia predeterminado. Admite pegar números internacionales con +.
- Cotización en servidor con direcciones seleccionadas de las sugerencias, paradas en orden y recorrido en automóvil. Coordenadas firmadas; el navegador no determina precio, distancia ni duración.
- Cotización temporal guardada en Supabase, precio por kilómetro según versión de tarifa; pasajeros y mascotas sin adicional.
- Solicitud normal pendiente de confirmación, sin etiquetas de prueba ni campos manuales de kilómetros/minutos.
- Inicio del servicio exclusivamente por conductor asignado, con permiso GPS. Medición de distancia, cálculo acumulado y finalización en servidor.
- Consulta privada del pasajero actualiza estado y medición. Calificación 1–5 y comentario después de finalizar; visibles al conductor/admin.

## Bloqueo actual

HeiGIT está rechazando la clave ORS_API_KEY configurada con HTTP 403. No se ha validado la búsqueda de direcciones ni una cotización real; el formulario informa el fallo y no guarda una distancia inventada. Revisar clave activa y cuotas en account.heigit.org y volver a guardarla mediante `npx --yes wrangler secret put ORS_API_KEY`.

Las credenciales ORS_API_KEY y SUPABASE_SERVICE_KEY se mantienen en secretos del Worker, no en la interfaz ni en Git.

## Alcance del medidor

Medición GPS aproximada por segmentos, filtrando precisión y saltos imposibles. La web debe permanecer abierta en el teléfono del conductor. Una interrupción de más de dos minutos no se extrapola ni se cobra; se muestra aviso. No es un taxímetro certificado ni seguimiento garantizado en segundo plano. No se han realizado pruebas de conducción física. No hay cobro por tiempo/espera configurado.

La tarifa mínima aún no tiene un importe acordado: no se inventa un valor. Antes de operación comercial se necesitan validación de campo, reglas oficiales de circulación vigentes, capacidad confirmada del vehículo, condiciones finales de cobro y protección/recuperación de intervalos de agenda ante retrasos. Telegram permanece pendiente.

## Verificado

- Sintaxis de todos los módulos y compilación.
- Navegador: selector internacional, cambio a Estados Unidos (+1 y bandera), campos manuales y avisos de prueba retirados.
- Migración transaccional 202610130003: cotización de fixture confiable, privacidad hasta confirmación, teléfono internacional, inicio del conductor, cálculo GPS con posiciones sintéticas, finalización y calificación; todos los registros se revirtieron al terminar.
- Búsqueda real HeiGIT: HTTP 403; pendiente de corregir credencial/cuota.
