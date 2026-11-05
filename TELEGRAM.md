# Avisos gratuitos de DRAKO

Preparado el 4 de noviembre de 2026. Sustituye la preparación de WhatsApp Business automático por decisión del usuario.

## Flujo

- El pasajero reserva en la web y recibe allí referencia única, estado y enlace privado; puede descargar su confirmación como texto.
- El conductor asignado recibe avisos por Telegram de solicitud, confirmación, cambio de horario, cancelación, rechazo y finalización. El mensaje incluye nombre, móvil, puntos, paradas, pasajeros, mascotas, equipaje, fechas y valor, y abre su agenda autenticada.
- WhatsApp queda como botón que abre una conversación revisable por el usuario. No se llama a Meta ni se envían mensajes automáticos por WhatsApp.
- No se exige Telegram al pasajero. Las notificaciones push de navegador para pasajeros no forman parte de esta primera modalidad; consultar el enlace privado sigue funcionando sin permisos de notificación.

## Único secreto pendiente

En Telegram abrir **@BotFather** (el oficial), enviar `/newbot`, elegir nombre y usuario del bot. La clave entregada por BotFather es privada.

En la terminal, dentro de `D:\Proyectos\drako`:

```powershell
npx --yes wrangler secret put TELEGRAM_BOT_TOKEN
```

Pegar la clave únicamente cuando la terminal la solicite. No ponerla en el repositorio, frontend, capturas ni conversaciones.

## Activación y vinculación

1. Abrir `https://drakotransport.app/#administracion` con la cuenta autorizada.
2. En **Avisos por Telegram**, pulsar **Activar bot de Telegram**. El servidor consulta el usuario del bot y configura su webhook protegido. No hace falta introducir un chat ID ni configurar una URL manualmente.
3. El conductor abre su portal en el celular y pulsa **Conectar Telegram**. También puede hacerlo el administrador seleccionando al conductor y compartiéndole únicamente el enlace privado generado.
4. Pulsar **Abrir Telegram y vincular** y después **Iniciar** dentro de Telegram. El enlace vence en diez minutos y no admite vincular otro chat después de usarse.
5. Volver al panel y pulsar **Comprobar vinculación**. Debe mostrar **Telegram vinculado**.
6. Crear una reserva de prueba y comprobar la recepción real en el celular. Esta prueba con un bot real todavía no se hizo: no se dispone de su clave.

Si Carlos bloquea el bot, el envío rechazado con 403 marca el chat como desconectado. Debe desbloquearlo y generar otro enlace desde su portal. Si desactiva sonidos o notificaciones de Telegram en el teléfono, la API puede aceptar el mensaje sin que el teléfono suene.

## Seguridad y operación

- Clave del bot solo en Cloudflare; sin credenciales de WhatsApp necesarias.
- Webhook `/api/telegram/webhook` protegido con el encabezado secreto de Telegram. Se deriva de los secretos del servidor y se registra automáticamente durante activación. Si se rotan esos secretos, activar el bot otra vez.
- Enlaces con códigos aleatorios, solo su hash en Supabase, vencimiento, consumo y vinculación a un conductor autorizado. Crear/desconectar requiere sesión; reclamar avisos y completar la vinculación requiere el rol de servidor.
- Solo se vinculan chats privados. Se impide que el mismo chat se asocie a dos conductores.
- La administración técnica no recibe carreras: los destinatarios son conductores con `notify_trips` habilitado.
- Cola transaccional con bloqueo, hasta ocho intentos y reintentos cada minuto. El cron no reclama mensajes si falta la clave ni para un conductor sin chat vinculado.
- Pendientes de más de 48 horas no se envían automáticamente para evitar avisos antiguos; revisar esos casos en el panel. Los mensajes del antiguo canal WhatsApp se desactivan y los avisos de conductor futuros pendientes se migran a Telegram cuando corresponde.
- Se registra aceptación por Telegram, no entrega, lectura ni sonido en el celular. Si se pierde una respuesta después de que el proveedor aceptó el mensaje, un reintento podría duplicar el aviso; la referencia permite identificar que es la misma reserva.
- No se usa difusión pagada ni se habilitan Telegram Stars. Continúan aplicando las cuotas gratuitas de Cloudflare y Supabase y la necesidad de internet.

## Verificación realizada sin el bot real

- `npm test`: mensaje con los datos del cliente primero, tamaño máximo, rechazo de webhook sin secreto, exclusión de grupos, configuración del webhook, respuesta de vinculación, aceptación del proveedor, reintentos por 429, desconexión por 403 y ausencia de llamadas al proveedor de pago.
- Migraciones con pruebas transaccionales revertidas: anonimato rechazado, códigos vencidos, hashes, uso por otro chat, vinculación idempotente, cola Telegram sin WhatsApp, datos de equipaje y cese de reclamaciones después de desconectar.
- No se enviaron mensajes reales ni se crearon reservas de prueba persistentes durante esta preparación.
