# Buscador oficial de Cali: implementación

Implementado el 14 de octubre de 2026 (hora del usuario).

## Catálogo descargado

Fuente: [Nomenclatura domiciliaria de la Alcaldía](https://datos.cali.gov.co/dataset/spt-nomenclatura-domiciliaria), capa WFS `dapm:pdt_nmc_nomenclatura_domiciliaria`. Metadatos de licencia CC BY conservados como referencia en el plan. Corte declarado por los registros: 2026-09-03.

Se descargaron 692.389 registros. Tras eliminar repeticiones exactas y separar formatos no interpretables, quedaron 638.636 entradas consultables, repartidas por 2.531 vías. Se apartaron 29.942 registros con formato no reconocido; no se intenta inventar su nomenclatura. Cero coordenadas fuera del rango geográfico amplio utilizado para validación.

Se descargaron además 11.304 registros de la capa oficial de nomenclatura vial. De los extremos compartidos se obtuvieron 1.677 parejas de vías con candidatos a cruce. No es cobertura completa de todas las esquinas de Cali y no certifica accesos, giros permitidos o situación física de un cruce. No se convierten cruces geométricos sin nodo compartido en intersecciones.

La dirección AV 14 OESTE # 8 OESTE - 18 está en Aguacatal; la fuente contiene dos puntos separados aproximadamente 15 metros, ambos catastrales por certificar. El buscador agrupa candidatos de texto idéntico dentro de 25 metros y conserva un punto de la fuente, sin calcular una puerta nueva ni fusionar vías distintas como 14 y 14 A. La interfaz avisa que es referencia catastral y ofrece ajustar el acceso.

El cruce CL 5/KR 39 aparece con nodo compartido en los ejes oficiales. La prueba real con ORS entre ambos ejemplos devolvió 6.622 m, 923 s y 13.244 COP a la tarifa vigente de 2.000 COP/km. Es una cotización aproximada, no una comprobación física del recorrido.

## Almacenamiento y costos

Catálogo de domicilios: 72.552.395 bytes de JSON, aproximadamente 69,2 MiB, más índices de cruces y manifiesto. Se publica como archivos estáticos en Cloudflare, junto con la aplicación. El Worker lee únicamente el archivo de la vía buscada; el navegador recibe hasta cinco resultados, nunca el catálogo completo.

Esta implementación no importa el catálogo a Supabase: mantiene libre el espacio de reservas y evita añadir un índice grande a la cuota gratuita. Continúan aplicando las cuotas existentes de Cloudflare y ORS; no se activó un plan de pago. La copia permite buscar sin consultar a la Alcaldía en cada pulsación, pero la aplicación sigue necesitando internet.

No se publican números prediales ni identificadores catastrales: solo dirección, barrio, estado y coordenadas de la fuente pública. Los domicilios personales de las reservas permanecen sujetos a sus permisos actuales.

## Flujo

`route-quote.js → /api/places → catálogo estático / ORS → lugar firmado → /api/quote → route_quotes → submit_quoted_booking → bookings → detalle y navegación`

- `address-search.js`: normalización, separación de componentes y reconocimiento de intersecciones.
- `worker.js`: catálogo oficial prioritario para Cali, rechazo de localidades/barrios y resultados de placa incompatible, firmas con procedencia y texto original.
- ORS se conserva para nombres de lugares y cobertura fuera de Cali. Si faltan resultados precisos, el formulario ofrece ayuda con GPS y mapa.
- `location-picker.js`: mapa Leaflet opcional, servido localmente, imágenes OSM con atribución, ubicación solo cuando se pulsa el botón. Permiso denegado no impide seleccionar direcciones del catálogo.
- La cotización rechaza ajustes a la carretera mayores de 150 m cuando ORS proporciona geometría y puntos de paso. El usuario puede corregir el acceso; no se cambia silenciosamente la recogida.
- Se conservan texto original, etiqueta elegida, coordenadas, fuente y tipo en origen, destino y paradas. Los puntos proceden de la cotización firmada, no de datos libres al guardar la reserva.
- Los detalles muestran el texto y lugar elegido y enlaces a Waze/Google Maps. Abrir Google Maps como navegación externa no utiliza una API de pago en DRAKO.
- Reservas antiguas con solo texto continúan mostrando ese texto; no reciben coordenadas inventadas.

## Reproducibilidad y actualización

`node scripts/import-cali.mjs` descarga por páginas ordenadas por `gid`, almacena las respuestas originales en `.private/cali` y genera el catálogo público y su manifiesto con conteos y SHA-256. Tiene reintentos limitados y comprueba conteos; la fuente no garantiza una transacción consistente durante toda la descarga.

Para una actualización nueva, usar un directorio de caché nuevo o archivar el anterior: el importador reutiliza las páginas ya descargadas para poder reanudar. No mezclar páginas viejas y nuevas en una actualización deliberada. Revisar diferencias, formatos apartados, cobertura y licencia antes de publicar. No hay actualización automática activada.

`npm run build` copia solo los fragmentos actuales y Leaflet con su licencia; los archivos originales y las claves no se publican. La versión previa de Cloudflare permite revertir código y catálogo juntos.

## Validación

- `node scripts/test-addresses.mjs`: direcciones oficiales, letras diferentes, cruces, exclusión de resultados genéricos, coordenadas alteradas, conservación en cotización y puntos manuales fuera de cobertura.
- Migración `202610150002_verify_location_persistence.sql`: reserva transaccional con recogida, parada y destino estructurados, comprobación del acceso invitado y rollback completo de las filas de prueba.
- Prueba real de los endpoints de búsqueda y cotización con los dos ejemplos, sin generar reservas.
- Comprobación en navegador de sugerencias, texto original preservado, cálculo de precio y mapa con imágenes cargadas.

No se promete reconocer todos los domicilios, localizar cada puerta o tener tráfico en vivo. La selección de un resultado no convierte un registro catastral en dirección certificada.
