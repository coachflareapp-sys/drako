# Revisión de los requerimientos de Carlos

Fecha: 4 de noviembre de 2026. No requiere un nuevo documento del cliente.

## Incidencias encontradas y corregidas

- Supabase estaba `INACTIVE`: se solicitó su restauración con el acceso existente, sin contratar un plan, y volvió a `ACTIVE_HEALTHY`. Mientras estuvo pausado, autenticación, cotización y reservas no podían completarse aunque la página abriera.
- El buscador no toleraba bien el barrio/ciudad añadidos a una dirección ni algunas abreviaturas sin espacios. Se corrigió la normalización y se regeneraron los fragmentos afectados.
- El formulario exigía tocar una sugerencia incluso con una sola coincidencia completa. Ahora la elige automáticamente si es inequívoca y calcula el valor sin mapa. Una ambigüedad no se resuelve eligiendo otra casa.
- Un lugar grande puede tener su punto central lejos de la calle. Para lugares por nombre, el servidor distingue el acceso vial aproximado y lo informa; no aplica esta excepción silenciosamente a domicilios ni a puntos manuales.

## Relación con el documento

| Punto | Estado verificable |
| --- | --- |
| QR y dominio fijo | PNG generado, descargable desde administración; abre la bienvenida en `https://drakotransport.app/`. No se ha comprado ni trasladado un dominio `.co`/`.com.co`. El dominio actual es estable y propio. |
| Formulario y orden | Datos del cliente primero; nombre y móvil obligatorios, apellido opcional, recogida, llegada, paradas, pasajeros por defecto 1, mascotas, equipaje por tamaños/cantidades, fecha/hora y creación automática. |
| Aviso y recepción | Aviso configurable; página privada de recepción con referencia única y estado pendiente de conductor. |
| WhatsApp automático | Cola transaccional, consentimiento opcional del pasajero, proveedor de plantillas, reintentos y estado en administración implementados. NO activo: faltan cuenta Business, credenciales y plantillas aprobadas. La clave de mapas no activa WhatsApp. |
| Cálculo de costos | Ruta por carretera mediante ORS y tarifa versionada en servidor. Se conserva el acuerdo posterior: pasajeros y mascotas sin recargo. Equipaje sin tarifa extra inventada. |
| Agenda | Reserva ocupa agenda; horarios editables, bloques manuales con comprobación de conflictos, consulta previa de disponibilidad y alternativas próximas dentro de la ventana de reservas de 60 días. No se inventan horarios si todos están cerrados. |
| Pico y placa | Reglas del segundo semestre de 2026 con fuente oficial y fechas de vigencia, horarios y excepciones de festivos restantes del período. Panel para agregar reglas verificadas. La rotación de 2027 no se supone automáticamente. |
| Agenda por día | Agrupada por día y hora de Colombia; actualización de cambios cada 20 segundos cuando el panel está visible y no se están editando formularios. La lista principal consulta hasta 100 servicios; el reporte consulta por fechas y pagina los registros. |
| Pagos | Efectivo, Nequi y Daviplata. El conductor/administrador puede registrar un pago recibido tras completar el servicio. No se presenta como débito automático ni comprobación bancaria. |
| Panel y datos | Supabase con permisos por rol, agenda, horarios, tarifas, bloqueos y textos públicos editables. |
| Cancelar/modificar | Cancelación anticipada y cambio de fecha/hora desde el enlace privado; el cambio vuelve a pendiente del conductor y respeta los conflictos. Cambiar el recorrido completo desde ese enlace no forma parte del editor actual. |
| Estadísticas/reportes | Por período: solicitudes, finalizados, clientes por móvil, valor finalizado y pagos registrados. Exportación CSV compatible con Excel y vista imprimible para guardar PDF. No se afirma que CSV sea un archivo XLSX. |
| Varios conductores | Esquema con conductor, vehículo y agenda propios; al reservar se prioriza uno disponible. El alta e invitación de nuevos conductores no tiene todavía un asistente en el panel. |
| Experiencia móvil/contacto | Español, contacto descargable, acceso a WhatsApp iniciado por el usuario, mapa opcional y QR. No se afirma que un enlace wa.me sea una notificación automática. |
| Idiomas futuros | Español implementado; traducciones adicionales pendientes, sin prometer detección automática. |
| Bienvenida/marca | Se conserva el logo dorado existente; bienvenida y aviso editables. Sin rediseño de colores en esta revisión. |

## Validaciones

- 30 direcciones certificadas de la copia oficial, distribuidas en cinco zonas y barrios distintos, escritas con formato completo y barrio/ciudad: 30 encontradas; 29 con selección automática inequívoca, una con elección entre coincidencias. Se probó localmente y contra la web publicada. Esto no equivale a confirmar físicamente 30 puertas ni garantiza cobertura de todos los domicilios de Cali.
- En navegador, Avenida 14 Oeste #8-18, Aguacatal, Cali → Calle 5 con Carrera 39, esquina, Cali: 6,62 km y 13.244 COP aproximados, sin abrir mapa.
- Pruebas de base de datos dentro de transacción revertida: efectivo, tarifa, opt-in, cola de avisos sin envío real, idempotencia, bloqueo en conflicto, reprogramación, registro de pago, tarifa anterior conservada y textos editables.
- Panel administrativo comprobado con sesión temporal: secciones de bloqueos, tarifa, reportes, QR, textos, avisos y reglas. No se enviaron correos para abrir esa sesión.

## Activar WhatsApp: dependencia externa concreta

AITREZ necesita vincular una cuenta de WhatsApp Business Platform con un número habilitado y dos plantillas aprobadas. No se pueden obtener estas credenciales a partir del número de Carlos ni de su WhatsApp personal. Deben revisarse las condiciones y costos de Meta antes de activar el canal; no se contrató ningún servicio.

Guardar mediante Wrangler como secretos: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_DRIVER`, `WHATSAPP_TEMPLATE_CUSTOMER`, `WHATSAPP_API_VERSION`. Configurar también `WHATSAPP_TEMPLATE_LANGUAGE` si el idioma aprobado no es `es`.

Cada plantilla usa tres parámetros de cuerpo, en orden: referencia, evento y detalles del servicio. La cola no contiene enlaces privados de pasajeros en texto plano. El envío usa plantillas; un mensaje aceptado por la API se registra como aceptado por el proveedor, NO como entregado al celular. El webhook de comprobación de entrega/lectura no está implementado. Antes de activar revisar mensajes antiguos pendientes y la configuración del remitente.

Los avisos se intentan inmediatamente tras reservar y mediante un cron de reintentos cada minuto. Sin credenciales completas, el cron no reclama ni marca mensajes enviados. El panel muestra la falta de conexión. El pasajero solo entra en la cola si optó por recibir avisos por WhatsApp.

## Límites que no se deben ocultar

- El taxímetro web sigue dependiendo de la ubicación que entregue el navegador. No se convierte en una aplicación de GPS en segundo plano con esta revisión.
- Los planes gratuitos mantienen sus límites y condiciones. Se añadió un control diario de disponibilidad del servicio de reservas a las 12:00 UTC, con una consulta real de configuración y registro de fallos en Cloudflare. Reduce el riesgo de que una instancia sin uso quede abandonada, pero no constituye una garantía de disponibilidad ni elimina cambios futuros en las políticas del proveedor.
- Sin un resultado suficiente, no se puede calcular una ruta de domicilio exacta de manera honesta. Se ofrecen coincidencias y ayuda opcional; nunca se sustituye por el centro de Cali.
- La fuente oficial es una copia con su fecha de corte, no una verificación de campo ni un servicio de tráfico en tiempo real.
