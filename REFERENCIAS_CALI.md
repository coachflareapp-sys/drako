# Ampliación de referencias y direcciones de Cali

La segunda ampliación del mismo día está en [MEJORA_DIRECCIONES_20261107.md](MEJORA_DIRECCIONES_20261107.md): 13 consultas con referencia compatible, una con sugerencias de sector y seis sin resultados, sobre la misma muestra de 20.

Revisión del 7 de noviembre de 2026. Se conserva la búsqueda de nomenclatura existente y ORS para rutas. No se contrataron proveedores ni se añadió Google.

## Qué cambió

- Las sugerencias complementarias deben coincidir con los términos del nombre y la zona solicitada. No basta compartir “escuela”, “Carlos” o “crucero”. Las referencias a Montebello, Golondrinas, Aguacatal y municipios vecinos no se omiten al filtrar.
- Se incorporaron 3.742 referencias de establecimientos y equipamientos municipales y 11.725 referencias de predios de la cobertura descargada. Son 15.467 entradas de fuentes, no 15.467 domicilios nuevos ni entradas físicamente certificadas.
- Los predios incluyen 1.377 entradas interpretables de estratificación rural y 10.348 de terrenos catastrales de Aguacatal y su entorno. Los domicilios rurales meramente genéricos o sin nomenclatura suficiente no reciben una coordenada arbitraria.
- Los establecimientos se buscan por nombre, dirección o alias documentado. Los predios se consultan por vía mediante 337 archivos pequeños; no se descarga el conjunto completo al teléfono ni se recorre entero por cada pulsación.
- Cuando una sede educativa coincide por nombre completo entre la capa educativa y un equipamiento POT antiguo, se conserva la ubicación de Educación. Se retiraron nueve duplicados, incluido un punto antiguo de Andrés Joaquín Lenis que discrepaba del de Educación.
- Se reconocen las placas con tipo de vía que cruza, como `CL 11 OESTE # AV 11 OESTE - 63`, y la escritura tipográfica `5ª` del documento del colegio como `5A`. Tipos de vía explícitos incompatibles no se igualan.
- Las nuevas referencias exigen selección. El formulario avisa que son referencias municipales y que la entrada puede variar. Los puntos interiores de polígonos no se presentan como puertas ni se autoseleccionan como direcciones exactas.

## Fuentes

Descarga por WFS público de IDESC, con salida EPSG:4326:

- `educacion:esf_establecimiento_educativo`: sedes educativas, nombres, direcciones y puntos.
- `cultura:pbic_inc_bibliotecas`: bibliotecas; conserva el nombre de sede y su zona.
- `pot_2014:eqp_equipamiento_rural_colectivo`: equipamientos rurales.
- `pot_2014:eqp_uba_seguridad_ciudadana`, `eqp_uco_salud`, `eqp_uco_educacion`: establecimientos y polígonos de referencia.
- `bienestar_social:oapi_oeppi_privados`, `salud:ads_ips_capacidad_reps`: nombres, direcciones y ubicaciones públicas; se eliminan repeticiones de servicios del mismo establecimiento.
- `dapm:pdt_est_estrato_rural`: se solicitan solo identificador para paginación privada, dirección, corregimiento y geometría. Se exportan únicamente direcciones interpretables y puntos de referencia.
- `catastro:cat_bas_terrenos`: descarga acotada al entorno de Aguacatal; se omiten del catálogo público números prediales, identificadores, propietarios, avalúos, contactos y demás atributos.

Los registros de estudiantes, contactos, estratos e identificadores catastrales no forman parte de los archivos públicos. `references-manifest.json` conserva conteos, procedencia, atribución, términos de origen y hash del índice de establecimientos. La generación de este índice no actualiza la fecha de levantamiento de las capas municipales.

El catálogo municipal de [equipamientos rurales](https://datos.cali.gov.co/dataset/pot-equipamientos-rurales) declara Creative Commons Attribution Share-Alike. Se conservan las condiciones de las fuentes para sus datos derivados; el código de la aplicación es independiente. La interfaz atribuye Alcaldía de Cali/IDESC.

Dos referencias se complementaron con documentación institucional, sin inventar coordenadas:

- La dirección de IPS Montebello procede del Manual del Proceso de Atención al Usuario de Salud de Ladera, actualizado 01/09/2025: Avenida 42 Oeste #11-18. El punto procede de la capa municipal de equipamientos rurales. No se agregó la variante “Carrera 42” de otro documento como si fuera equivalente.
- La denominación Academia Nacional de Bomberos y Aguacatal se corroboró con [Bomberos Cali](https://bomberoscali.org/academia-nacional-de-bomberos-de-colombia/); la geometría y Avenida 15 Oeste #10-40 proceden de la capa de seguridad ciudadana.

## Resultado frente a la misma muestra independiente

| Zona | Consultas | Antes: coincidencias útiles | Después: coincidencias útiles |
| --- | ---: | ---: | ---: |
| Aguacatal | 6 | 1 | 4 |
| Montebello | 9 | 0 | 6 |
| Referencias rurales Los Mangos | 5 | 0 | 0 |
| Total | 20 | 1 | 10 |

Las 20 son consultas, no inmuebles distintos: incluyen una variante del colegio y tres referencias de sector sin placa. La medición no estima cobertura de toda Cali ni verifica puertas sobre el terreno. Los resultados ajenos de las consultas de San Carlos Borromeo y Crucero Alto de los Mangos desaparecieron: ahora indican que falta una coincidencia suficiente.

Se mantuvieron las pruebas anteriores: 30 direcciones del catálogo, 17 variantes de los ejemplos del usuario y 25 comprobaciones de registros recuperados. Esas pruebas técnicas no sustituyen la muestra independiente.

## Cotizaciones reales, sin reservas

Desde cada origen hasta Calle 5 con Carrera 39:

| Origen | Metros por carretera | COP aproximados |
| --- | ---: | ---: |
| Bomberos, Avenida 15 Oeste #10-40 | 7.237 | 14.474 |
| Colegio Montebello, Avenida 43 Oeste #5A-49 | 11.121 | 22.242 |
| Biblioteca, Calle 11 Oeste #42-12 | 10.506 | 21.012 |
| IPS Montebello, Avenida 42 Oeste #11-18 | 10.415 | 20.830 |
| Calle 9 Oeste #41A-40, Montebello | 10.721 | 21.442 |

Las cinco respuestas de cotización fueron HTTP 200. En el navegador, la del colegio se completó sin abrir mapa y mostró el aviso de referencia municipal. Se conservó el texto ingresado; no se enviaron reservas, mensajes ni pagos. Los precios no son certificación de acceso físico ni incluyen tráfico en vivo.

## Pendientes concretos

- Diagonal 15 Oeste #110-14, Aguacatal.
- Cruce Avenida 12 Oeste/Calle 11 Oeste, Aguacatal: el índice de intersecciones actual no lo resuelve. No se añadió una intersección geométrica sin corroborar el acceso.
- Carrera 42 Oeste #11-18, Montebello: discrepancia con el manual de salud que indica Avenida.
- Calle 11 Oeste Av42-07 y Avenida 42 Oeste #10C-46, Montebello.
- Escuela San Carlos Borromeo de Golondrinas Los Mangos y su variante de consulta. Las coordenadas del directorio electoral no se adoptaron como puerta sin corroboración territorial.
- Vereda Los Mangos, Crucero Alto de los Mangos y “Los Mangos, Montebello”: las referencias de área solas no determinan una vivienda. No se cotizan hasta obtener un lugar específico suficiente.

La cobertura rural nueva está acotada a los rectángulos documentados en el importador; no cubre todos los predios del municipio. Las capas originales tienen antigüedades distintas. Ningún resultado aproximado permite afirmar precisión puerta a puerta.

## Reproducibilidad

`node scripts/import-cali-references.mjs` descarga campos limitados, pagina con orden explícito y guarda originales en `.private/cali-references`. Reutiliza esa caché para reanudar. Para una actualización deliberada debe emplearse una caché nueva, sin mezclar páginas de fechas diferentes. Los archivos públicos se regeneran con selección de campos, deduplicación e índices por vía/término. Para polígonos se obtiene un punto interior respetando huecos; no una entrada calculada por metros desde otra casa.

`npm run check`, `npm run build` y `npm test` verifican el paquete y sus pruebas. `node scripts/audit-complex-zones.mjs` repite las 20 consultas publicadas y guarda el detalle en `.private/complex-address-after.json`. `node scripts/verify-address-variants.mjs --live` comprueba las variantes previas.
