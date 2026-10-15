# Plan de direcciones de DRAKO

Estado: base del plan implementada; véase DIRECCIONES_CALI.md para resultados, alcance y limitaciones comprobadas. Se eligió un catálogo estático por vía en Cloudflare en lugar de importarlo a Supabase.
Fecha de revisión: 14 de octubre de 2026.

## Resultado para el pasajero

Escribir una dirección, ver opciones con barrio y seleccionar una. El mapa y el GPS serán ayudas opcionales. Una ciudad o un barrio nunca se considerarán un domicilio exacto. Una esquina se buscará como intersección, sin sustituirla por un predio vecino.

Restricción: sin Google de pago ni nuevas suscripciones. No se promete disponibilidad ilimitada de los servicios gratuitos. El cliente no descarga la base completa en el teléfono.

## Evidencia comprobada

- El CSV de 2019 tiene columnas `id_nomen;direc_abr;direc_vis;estado`, sin coordenadas. Su catálogo declara CC BY-SA. No es la fuente principal propuesta.
- La capa oficial `dapm:pdt_nmc_nomenclatura_domiciliaria` entrega GeoJSON por WFS, con geometría Point y opción EPSG:4326. Catálogo: https://datos.cali.gov.co/dataset/spt-nomenclatura-domiciliaria
- Metadatos de la capa: https://datos.cali.gov.co/api/3/action/package_show?id=spt-nomenclatura-domiciliaria . La licencia declarada es CC BY. Guardar los metadatos y atribuir la fuente en cada versión importada.
- La consulta devolvió 692.389 registros. Es una cifra del servicio durante la revisión, no una garantía de cobertura de todos los domicilios.
- Muestra de 5.000: 4.923 textos distintos y 4.934 combinaciones distintas de texto/coordenadas. 3.885 registros certificados, 1.113 por certificar y 2 lotes. Ninguno sin dirección o fuera del rango geográfico amplio usado para comprobar Cali. Muestra no aleatoria: no extrapolar porcentajes de calidad a toda la ciudad.
- Una proyección JSON mínima de esa muestra ocupó 712.748 bytes: aproximadamente 99 MB si se extrapola sin deduplicación. No equivale al tamaño real en PostgreSQL: faltan filas internas, índices, normalización y crecimiento.
- Los registros muestreados indican corte `2026-09-03`. La fecha de corte no demuestra la fecha de verificación física de cada entrada.
- Se encontraron varios registros de `AV 14 OESTE # 8 OESTE - 18 (Dirección Catastral)`, Aguacatal, por certificar, con puntos cercanos. También hay resultados diferentes para AV 14 A OESTE: no fusionarlos.
- La fuente tiene domicilios CL 5 con placa 39, pero eso no demuestra que contenga la intersección exacta de CL 5 con KR 39.
- Supabase Free publica 500 MB de base de datos: https://supabase.com/pricing . Las tablas de DRAKO actuales son pequeñas según inspección, pero el tamaño libre real se debe medir antes de importar.

## Arquitectura elegida

1. Copia local de los datos oficiales en una tabla de búsqueda, si supera la prueba de capacidad.
2. Normalizador de nomenclatura colombiana; conserva siempre la entrada original.
3. Buscador oficial para domicilios en Cali; ORS para lugares por nombre y fuera de cobertura, sin aceptar resultados de ciudad como puntos exactos.
4. Mapa opcional con marcador y ubicación actual. No exige habilitar GPS para reservar.
5. ORS sigue calculando ruta, distancia y valor aproximado.
6. Carlos recibe texto original, dirección seleccionada, barrio, referencias y enlace a cada punto.

Geoapify/LocationIQ no son dependencias iniciales. Solo se reconsideran con pruebas que demuestren una mejora concreta en nombres de lugares o cobertura fuera de Cali.

## Etapa 1: preparar y medir los datos

- Crear un importador reproducible fuera de la aplicación pública. Descargar por lotes pequeños, con timeout, reintentos limitados, pausa y paginación estable por identificador verificado. Si el servicio no permite una lectura consistente, preferir una exportación completa oficial.
- Guardar fecha, URL, licencia, conteo y checksum del archivo descargado. No descargar masivamente desde la aplicación ni consultar WFS en cada pulsación.
- Mantener solo identificador de fuente, dirección, barrio, estado, latitud y longitud. Excluir números prediales, conexiones catastrales y demás datos innecesarios.
- Verificar coordenadas, datos vacíos, formatos y cobertura. Separar certificados, por certificar y lotes; no confundir procedencia oficial con exactitud garantizada.
- Deduplicar coincidencias de texto y punto; mantener alternativas cuando el mismo texto apunte a lugares distintos. No fusionar letras, sectores ni entradas diferentes por proximidad solamente.
- Cargar una muestra de 10.000–20.000 en una base local de prueba y medir tabla más índices con `pg_total_relation_size`. Revisar espacio real del proyecto remoto sin escribir en él.
- Presupuesto de diseño: intentar mantener el índice de direcciones completo por debajo de 200 MB y dejar margen al proyecto bajo el límite de 500 MB. Son criterios de aceptación, no tamaños medidos.
- Si no cabe, reducir columnas/índices y deduplicar; si sigue sin caber, evaluar un catálogo estático particionado servido por Cloudflare y medir límites de archivos, tamaño y búsquedas. No contratar un plan ni reducir cobertura silenciosamente.

## Etapa 2: interpretar y buscar

- Admitir Calle/Cl, Carrera/Cra/Kr, Avenida/Av, Diagonal/Dg y Transversal/Tv, espacios, #, guiones, letras, Bis y sectores.
- Separar tipo, número, letra y sector de la vía principal, placa y complementos. No inferir Oeste/Norte en otra vía sin evidencia; contemplar variantes como candidatos explícitos.
- Reconocer `con`, `esquina` y cruces como otra categoría. No convertirlos en una placa domiciliaria.
- Empezar con índices compactos de coincidencia exacta/prefijo; usar búsquedas tolerantes solo cuando sea necesario y midiendo su costo. Una coincidencia aproximada no se selecciona automáticamente.
- Ordenar por igualdad de componentes, municipio, estado y barrio; mostrar dirección y barrio en botones grandes. Desduplicar resultados repetidos.
- Presentar hasta cinco opciones relevantes. Si no hay coincidencias suficientes, explicar que se necesita una referencia o ayuda con la ubicación, sin sustituirla por Cali.
- Limitar consultas por longitud, frecuencia e IP. El endpoint de búsqueda solo expone los campos necesarios, no acceso general a la base.

## Etapa 3: intersecciones

- Verificar primero una capa oficial de ejes viales; como alternativa, un extracto OSM de Cali con licencia y fecha documentadas.
- Piloto con CL 5/KR 39: identificar los dos ejes y su conexión vial real. Cruces geométricos pueden ser puentes sin conexión, calzadas separadas o varios ramales.
- Crear un índice compacto de cruces comprobados y variantes de nombres. No cargar toda la red vial en Supabase sin medirla.
- Si falta un cruce, pedir confirmación opcional sobre mapa o revisión del conductor; no inventar un domicilio cercano.
- La interpolación por número de placa queda para después. No prometer que avanzar N metros desde un cruce produce la puerta exacta.

## Etapa 4: formulario, reserva y navegación

- El flujo principal sigue siendo escribir y tocar una dirección con barrio. Mantener el orden cliente primero y los campos obligatorios existentes.
- Mapa opcional con Leaflet local y proveedor de imágenes configurable; cumplir atribución, caché y política OSM. Configurar CSP para imágenes necesarias. Evitar precargar mapas que no se han abierto.
- GPS solo al pulsar el botón: mostrar precisión y permitir corregir; contemplar permiso denegado, falta de señal y ubicación antigua.
- Firmar en el servidor dirección, coordenadas, fuente, identificador, modo de selección y vencimiento. La firma evita alteraciones posteriores; no demuestra que un punto manual sea correcto.
- Conservar separadamente texto escrito y lugar elegido; invalidar la selección cuando se modifica el campo. Hacerlo también en paradas.
- Hoy `submit_quoted_booking` convierte los lugares a etiquetas y `submit_test_booking` guarda objetos con `address`, perdiendo coordenadas. Modificar el RPC para persistir origen, destino y paradas estructurados desde la cotización confiable, sin confiar en coordenadas enviadas libremente al reservar.
- Adaptar los portales para enlaces de navegación y detalle. Comprobar compatibilidad con reservas antiguas que solo tienen texto; no inventar coordenadas para ellas.
- Mantener los puntos de domicilio y favoritos de pasajeros privados; no publicarlos como sugerencias globales. Separar catálogo público y datos personales.
- Revisar la privacidad para identificar las fuentes y proveedores efectivamente usados.

## Etapa 5: ruta y precio

- Mantener ORS, su tarifa por km y sus firmas/expiraciones actuales.
- Reemplazar el radio uniforme actual de 1.000 m por un ajuste medido a la vía. Calcular distancia entre el punto confirmado y el punto utilizado por el motor; alertar si el ajuste es excesivo en vez de moverlo silenciosamente.
- Definir umbrales con pruebas de casas, aeropuerto, centros comerciales y vías de acceso. No imponer un radio rígido que haga imposible seleccionar entradas alejadas del eje vial.
- Conservar los puntos originales y los usados para ruta, y explicar el acceso cuando sea necesario.
- Si no existe ruta, conservar el formulario y ofrecer corrección; no asignar precio 0, ni distancia en línea recta como recorrido vial.
- Una solicitud sin cotización requiere otro flujo explícito y cambios de agenda: hoy distancia/duración son obligatorias. No habilitarla silenciosamente ni inventar duración para bloquear la agenda.

## Pruebas de aceptación

- Dirección de Carlos: reconocer abreviaturas y ausencia de signos; mostrar Aguacatal, distinguir 14 de 14 A y resolver alternativas con confirmación de Carlos.
- CL 5 con KR 39: identificar esquina, sin devolver #39-71 como sustituto automático.
- Al menos 20 casos verificados: letras, Bis, Oeste/Norte, barrio repetido, número inexistente, vía sin placa, aeropuerto, Palmira, lugar por nombre, varias paradas y modificación de un punto ya seleccionado.
- Confirmar cobertura: la capa municipal de Cali no resuelve por sí sola Palmira ni el aeropuerto ubicado fuera de Cali.
- Teléfono de gama baja: no descarga masiva; botones legibles, teclado usable y datos preservados ante fallos.
- Casos de GPS denegado/impreciso y mapa sin conexión; ninguna dependencia del mapa para seleccionar direcciones oficiales ya encontradas.
- Revisar enlaces de Carlos, firmas alteradas, fuente caída, cuota de ORS agotada y reservas antiguas.
- Objetivo de búsqueda: menos de un segundo en condiciones habituales, medido sin contar el debounce. Verificar tamaño e índices, no prometer ese tiempo sin pruebas.
- No publicar hasta confirmar los dos ejemplos y que nunca se cotice usando el centro de una ciudad como sustituto.

## Publicación y mantenimiento

- Activación gradual por configuración, con buscador anterior como reversión controlada; incluso al volver atrás deben mantenerse bloqueados los resultados genéricos.
- Importación por versiones: preparar una versión, validar y activar de forma atómica. Nunca vaciar el catálogo activo para recargarlo.
- Conservar snapshot anterior fuera de la base de producción para ahorrar espacio y permitir recuperación.
- Comprobar actualizaciones oficiales mensualmente; actualizar solo cuando cambie la fuente, conservando procedencia y licencia.
- Registrar conteos, errores y latencia sin guardar búsquedas personales completas en logs públicos.
- Primer entregable de implementación: informe de capacidad real e importador validado. Segundo: búsqueda oficial con normalización. Tercero: cruces, mapa opcional y navegación. Después: prueba integral y despliegue.
