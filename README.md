# DRAKO Transport

Aplicación en español, optimizada para celulares y desplegada con Cloudflare Workers y Static Assets. Ejecutar `npm run build` y desplegar con Wrangler. Portales autenticados en Supabase y cotización de rutas en servidor. Ver RUTAS_Y_TAXIMETRO.md para el estado actual: el proveedor está rechazando la clave configurada con HTTP 403; la cotización real permanece bloqueada.

## Estado

- Bienvenida, formulario, cotizador de referencia y portales de acceso.
- Precio de referencia: 2.000 COP/km; mínimo y adicionales pendientes de definir.
- Horarios iniciales y vehículo IZN897 documentados.
- La sesión autenticada se conserva en sessionStorage; no se guardan borradores de datos del pasajero.
- Cuentas, perfiles, conductor y horario inicial configurados en Supabase.
- Agenda conectada y edición semanal de horarios protegida contra conflictos.
- Antes de producción: rutas reales, políticas definitivas, autenticación, confirmación transaccional, restricciones vigentes y notificaciones con reintentos.

## Supabase

Migraciones inicial y de cuentas aplicadas al proyecto. Las claves de servidor nunca se incluyen en la interfaz. Los invitados reservarán mediante una función de servidor con validación de ruta, tarifa y disponibilidad; no tendrán permisos de escritura directa. Ver `CLOUDFLARE.md` para publicación y configuración de recuperación de contraseñas.

## Próximas integraciones

1. Aplicar y validar esquema de Supabase en entorno de prueba.
2. Crear mediante invitaciones las cuentas de conductor, administrador del negocio y administrador técnico.
3. Integrar proveedor de rutas y cotización en servidor.
4. Añadir operación transaccional para reserva, modificación y bloqueo de horarios, con cálculo de traslado entre servicios.
5. Enviar Telegram mediante cola transaccional; configurar recordatorios.
6. Verificar conflictos simultáneos, aislamiento de datos, turnos nocturnos y reportes.
