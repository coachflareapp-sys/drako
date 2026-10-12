# Publicación de DRAKO

## Cloudflare Pages

Conectar el repositorio de GitHub una vez que el código se haya subido.

- Framework: None.
- Comando de compilación: npm run build.
- Directorio de salida: dist.
- No hay dependencias npm externas.
- Alternativa: npm run build y subir dist mediante Direct Upload.

No publicar la raíz del repositorio: contiene scripts administrativos y migraciones. La compilación incluye únicamente la interfaz y la configuración pública anon. No contiene claves administrativas ni el token de Telegram.

## Supabase Auth

Authentication > URL Configuration:

- Site URL: https://drakotransport.app
- Redirect URLs: https://drakotransport.app/ y la URL exacta pages.dev del despliegue si se usa para pruebas.
- La interfaz utiliza el fragmento #restablecer para recuperación de contraseña.

Antes de ofrecer recuperación por correo, configurar SMTP propio en Authentication. La configuración predeterminada puede restringir destinatarios a integrantes del proyecto. No se han enviado mensajes durante la creación o verificación de cuentas.

## Cuentas

- Carlos: conservar su contraseña existente.
- Administración DRAKO y AITREZ: cuentas creadas con contraseñas aleatorias no compartidas. Establecer contraseña mediante recuperación cuando las URLs y SMTP estén configurados.
- Ningún aviso de viaje habilitado para administración técnica.

## Límites actuales

Autenticación, lectura de agenda y edición semanal de horarios conectadas. Cotización automática por ruta, confirmación de reservas, excepciones por fecha en la interfaz, reglas oficiales vigentes, pagos y Telegram aún pendientes. No habilitar reservas públicas antes de verificar esos flujos.
