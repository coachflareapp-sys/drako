# Segunda ampliación del buscador — 7 de noviembre de 2026

Se publicó en https://drakotransport.app/. Esta revisión amplía la implementación de REFERENCIAS_CALI.md y conserva sus fuentes y limitaciones.

## Resultado comprobado

Las mismas 20 consultas independientes se repitieron contra el despliegue:

| Zona | Consultas | Revisión anterior | Referencia compatible ahora |
| --- | ---: | ---: | ---: |
| Aguacatal | 6 | 4 | 5 |
| Montebello | 9 | 6 | 6 |
| Los Mangos rural | 5 | 0 | 2 |
| Total | 20 | 10 | 13 |

Hay además una consulta de sector que ofrece un lugar conocido, sin identificar una vivienda. Quedan seis consultas sin resultados y siete sin una dirección/lugar específico resuelto si se incluye esa consulta de sector. El número de respuestas no vacías es 14; no se presenta como 14 direcciones resueltas.

La muestra contiene variantes del mismo establecimiento y nombres de sectores sin placa. No estima la cobertura de toda Cali ni certifica puertas sobre el terreno. No se crearon reservas ni se enviaron avisos durante estas pruebas.

## Cruces próximos en la cartografía

Se procesaron los 11.304 registros de ejes viales municipales. Se añadieron 57 parejas de referencia cuyos extremos de líneas de vías distintas están separados como máximo tres metros. Los cruces exactos existentes mantienen su prioridad. No se convierten cruces geométricos interiores de líneas en intersecciones: podrían ser puentes o pasos a distinto nivel.

En Avenida 12 Oeste/Calle 11 Oeste, ambos extremos quedan a 2,36 metros en la fuente. El punto ofrecido conserva una coordenada original de un extremo; no se fabrica una dirección domiciliaria. Se marca `intersection_reference`, requiere selección y muestra que el acceso vehicular puede variar. No es una certificación de conectividad de la vía.

Artefactos: `intersection-references.json` y su manifiesto. `node scripts/import-cali-crossings.mjs` reproduce la generación desde la caché municipal completa y exige revisar cambios en el conteo de origen.

## San Carlos Borromeo y Los Mangos

La Registraduría publica el puesto 38 de zona 99 de Cali como Golondrinas Los Mangos / IE San Carlos Borromeo, en longitud -76.54286773775713 y latitud 3.457381530655042.

Se corroboró el contexto territorial: esa coordenada cae dentro de geometrías catastrales que describen Golondrinas, sector Los Mangos. El directorio escolar municipal también identifica San Carlos Borromeo en Altos de Normandía. Esa evidencia explica que esté próximo al área urbana: no se descartó por asumir que Golondrinas solo estaba cerca de su cabecera.

Se incorporó como **Sede San Carlos Borromeo (referencia electoral)**. No se afirma que continúe prestando actividad escolar ni que la coordenada sea una puerta verificada. La dirección histórica Avenida 7 Oeste #1-61 no se presenta como nomenclatura vigente. La parroquia homónima no es un sustituto.

La ficha curada y sus fuentes están en `catalogue/cali/curated-references.json`:

- [Divipole definitiva 2026 — Registraduría](https://www.registraduria.gov.co/IMG/pdf/divipole_definitiva_2026.pdf).
- [Directorio escolar municipal](https://web1.cali.gov.co/educacion/descargar.php?id=38318), fila de San Carlos Borromeo, Altos de Normandía. No se copiaron contactos ni nombres personales de ese documento.
- Capa `catastro:cat_bas_terrenos`, WFS público de IDESC. La corroboración es de sector, no identificación de una construcción o propietario.

## Ampliación de datos y control de precisión

- Se descargaron, con campos limitados, los 39.818 registros de la capa rural municipal publicada, ampliando el alcance antes acotado a dos rectángulos.
- El índice complementario contiene 22.867 entradas de fuentes: 3.743 de establecimientos/referencias y 19.124 de predios. Incluyen solapamientos con el catálogo urbano y no equivalen a esa cantidad de domicilios nuevos.
- Las referencias de predios se distribuyen en 371 archivos por vía. El navegador no recibe toda la base.
- Se excluyen polígonos de predios con extensión diagonal mayor a 250 metros: su punto interior puede quedar demasiado lejos de la casa o representar un gran predio matriz. Se descartaron 2.409 registros por ese criterio; no se presentan como viviendas ubicadas.
- Los textos rurales genéricos o sin nomenclatura suficiente no reciben coordenadas inventadas. Los números prediales, propietarios, contactos, estratos y datos de estudiantes no se publican.
- Se conservan atribuciones y condiciones de las fuentes; la ficha electoral identifica a la Registraduría como origen del punto.

## Escritura de direcciones

Los complementos `TO`, `BLQ`, depósitos o garajes, después de una placa completa, ya no impiden encontrar el inmueble. La entrada original del cliente se conserva para el conductor. Las etiquetas no sustituyen su unidad por la de otro registro del edificio. No se elimina una letra T de una vía o una placa como si fuera siempre una torre.

Se reconocen `Diag`, `Tr`, `Trv` y `Transv` como abreviaturas de sus vías. Campo Alegre/Campoalegre y Monte Bello/Montebello se normalizan al buscar referencias. Las cifras de unidades y las letras significativas no se comparan como prefijos numéricos: 1000 no equivale a 10001.

## Búsquedas que solo indican un sector

“Vereda Los Mangos, Golondrinas” puede mostrar un lugar conocido del sector. La respuesta se identifica como `area_suggestions`, requiere selección y aclara que el lugar solo debe elegirse si será la recogida o destino. Al elegirlo, el campo muestra el establecimiento concreto. No se convierte la vereda en una casa ni se cuenta esa sugerencia como dirección resuelta.

## Cotizaciones y navegador

Desde cada origen hasta Calle 5 con Carrera 39:

| Origen | Metros | COP aproximados |
| --- | ---: | ---: |
| San Carlos Borromeo, referencia electoral | 5.881 | 11.762 |
| Avenida 12 Oeste/Calle 11 Oeste | 7.047 | 14.094 |
| Avenida 12 Oeste #6 Oeste-153 | 6.564 | 13.128 |

Las tres cotizaciones respondieron HTTP 200. En navegador se comprobó San Carlos Borromeo sin abrir mapa, su aviso de referencia electoral, el enlace a Registraduría y la selección de un establecimiento concreto desde la consulta de vereda.

Pasaron `npm run check`, `npm run build`, `npm test`, la auditoría publicada de las 20 consultas y las 42 comprobaciones previas de variantes y registros recuperados. Hay pruebas de huecos en polígonos, límite espacial, extremos de vías, exclusión de cruces interiores, conservación de letras y separación entre sector y dirección.

## Pendientes

- Diagonal 15 Oeste #110-14, Aguacatal: no hay una correspondencia corroborada. No se cambió 110 por 11 Oeste.
- Carrera 42 Oeste #11-18, Montebello: sigue la discrepancia de tipo de vía frente al manual de salud que indica Avenida.
- Calle 11 Oeste Av42-07 y Avenida 42 Oeste #10C-46, Montebello.
- Crucero Alto de los Mangos y “Los Mangos, Montebello”: requieren identificar una referencia específica suficiente.
- “Vereda Los Mangos, Golondrinas” ofrece una referencia del sector, no una vivienda determinada.

El directorio nacional MEN consultado no incluye coordenadas. El servicio geográfico SISE del DANE no pudo consultarse por errores de conexión; no se declara integrado. El geocodificador municipal con CAPTCHA tampoco se automatizó. No se contrataron servicios de mapas ni se añadieron claves de pago.

