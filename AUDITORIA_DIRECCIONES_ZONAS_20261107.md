# Prueba independiente de zonas difíciles — 7 de noviembre de 2026

Este documento conserva la medición inicial. La ampliación posterior y la comparación con 10 de 20 consultas resueltas están en [REFERENCIAS_CALI.md](REFERENCIAS_CALI.md).

Se probaron 20 consultas en https://drakotransport.app/api/places. Las referencias se buscaron en publicaciones externas al catálogo de DRAKO. No se enviaron reservas ni notificaciones. Se conservaron consultas sin coincidencia y resultados erróneos, sin modificar el buscador durante la medición.

## Resultado

| Zona | Consultas | Coincidencia textual compatible | Sin coincidencia útil |
| --- | ---: | ---: | ---: |
| Aguacatal | 6 | 1 | 5 |
| Montebello | 9 | 0 | 9 |
| Referencias rurales Los Mangos | 5 | 0 | 5 |
| Total | 20 | 1 | 19 |

Son consultas, no 20 inmuebles distintos: incluyen variantes documentales y búsquedas por nombre/sector sin placa. Esta muestra se concentra deliberadamente en casos difíciles y no estima la cobertura de toda Cali. Coincidencia textual no certifica la puerta física.

## Consultas y respuestas

| Zona | Consulta | Resultado |
| --- | --- | --- |
| Aguacatal | Avenida 15 Oeste #10-40, Aguacatal, Cali | Sin resultados |
| Aguacatal | Avenida 9 Oeste #19C1-100, Aguacatal, Cali | Coincidencia compatible, una sugerencia; selección manual |
| Aguacatal | Calle 11 Oeste #11-63, Aguacatal, Cali | Sin resultados |
| Aguacatal | Diagonal 15 Oeste #110-14, Aguacatal, Cali | Sin resultados |
| Aguacatal | Avenida 12 Oeste con Calle 11 Oeste, Aguacatal, Cali | Sin resultados |
| Aguacatal | Avenida 4 Oeste #12-05, Cali | Sin resultados |
| Montebello | Avenida 43 Oeste #5A-49, Montebello, Cali | Sin resultados |
| Montebello | Avenida 43 oeste Nº 5ª 49, Montebello, Cali | Sin resultados |
| Montebello | Avenida 42 Oeste #11-18, Montebello, Cali | Sin resultados |
| Montebello | Carrera 42 Oeste #11-18, Montebello, Cali | Sin resultados |
| Montebello | Calle 11 Oeste #42-12, Montebello, Cali | Sin resultados |
| Montebello | Calle 12 Oeste #42-67, Montebello, Cali | Sin resultados |
| Montebello | Calle 9 Oeste #41A-40, Montebello, Cali | Sin resultados |
| Montebello | Calle 11 Oeste Av 42-07, Montebello, Cali | Sin resultados |
| Montebello | Avenida 42 Oeste #10C-46, Montebello, Cali | Sin resultados |
| Los Mangos rural | Escuela San Carlos Borromeo, Golondrinas, Cali | Resultados de otros lugares: Escuela Carlos Alberto Sardi Garcés, Santiago de Cali, VC, Colombia; Parroquia San Carlos Borromeo, VC, Colombia |
| Los Mangos rural | IE San Carlos Borromeo, Los Mangos, Cali | Resultados de otros lugares: I.E. Politécnico Municipal - Sede Central, Santiago de Cali, VC, Colombia; I.E. Politécnico Municipal - Sede General Santander, Santiago de Cali, VC, Colombia |
| Los Mangos rural | Vereda Los Mangos, Golondrinas, Cali | Sin resultados |
| Los Mangos rural | Crucero Alto de los Mangos, Cali | Resultados de otros lugares: Crucero Turismo Centro, Santiago de Cali, VC, Colombia; Crucero Turismo Norte, Santiago de Cali, VC, Colombia |
| Los Mangos rural | Los Mangos, Montebello, Cali | Sin resultados |

## Cotización comprobada

Avenida 9 Oeste #19C1-100 (colegio Santa Isabel de Hungría) → Calle 5 con Carrera 39: API HTTP 200, 7.540 metros y 15.080 COP aproximados. El origen se obtuvo del proveedor complementario ORS/OSM; no del catálogo municipal. Se guardó únicamente la cotización temporal que necesita la aplicación, sin crear reserva.

## Diagnóstico comprobado

- En los 692.389 registros originales descargados: 7.886 llevan Aguacatal en el barrio; ninguno contiene Montebello o Mangos en ese campo. Tampoco se interpretó ninguna vía AV 42 OESTE o AV 43 OESTE. Esto demuestra una carencia de esa copia para estos ejemplos, no la inexistencia de las direcciones.
- La dirección de Bomberos Avenida 15 Oeste #10-40 está publicada por Bomberos Cali y no fue localizada.
- La IE Montebello publica Avenida 43 Oeste #5A-49 y la biblioteca publica Calle 11 Oeste #42-12. Ninguna se localizó.
- Para Escuela San Carlos Borromeo se ofrecieron otras escuelas y una parroquia; para Crucero Alto de los Mangos aparecieron agencias de turismo y una ferretería. No se consideran aciertos por tener una palabra parecida.
- Hay varios lugares llamados Los Mangos. La estación policial de Marroquín no se usó como sustituto de una referencia rural de Golondrinas/Montebello.
- Dos documentos de Salud de Ladera difieren entre Avenida y Carrera 42 Oeste para la IPS. Se probaron ambas formas y ambas fallaron. Esa discrepancia requiere corroboración antes de incorporar un punto.
- Los directorios de 2014/2015 permiten probar escritura publicada, pero no garantizan nomenclatura vigente. Los casos de colegios, Bomberos y el manual de salud cuentan también con publicaciones institucionales más recientes.

## Fuentes de las consultas

- Bomberos Cali: https://bomberoscali.org/academia-nacional-de-bomberos-de-colombia/ — Avenida 15 Oeste No. 10-40.
- Registraduría: https://www.registraduria.gov.co/IMG/pdf/20230626_inscripcion-ciudadanos_puestos-votacion_5-13_julio.pdf — colegio Santa Isabel de Hungría Aguacatal, Avenida 9 Oeste #19C1-100.
- Directorio municipal histórico: https://web1.cali.gov.co/publicaciones/descargar.php?id=31543 — Calle 11 Oeste #11-63 y Diagonal 15 Oeste #110-14, Urbanización Aguacatal. No se copiaron nombres ni contactos personales.
- Inventario municipal de zonas verdes: https://web1.cali.gov.co/publicaciones/descargar.php?id=30891 — Calle 11 Oeste/Avenida 12 Oeste.
- IE Isaías Gamboa: https://www.ieisaiasgamboacali.edu.co/ — Avenida 4 Oeste #12-05.
- IE Montebello: https://iemontebellocali.edu.co/wp-content/uploads/2024/08/CIRCULAR-INFORMATIVA-INSCRIPCION-ESTUDIANTE-NUEVOS-2024.pdf — Avenida 43 Oeste Nº5ª-49.
- Red de Salud de Ladera, Manual del Proceso de Atención al Usuario, actualización 01/09/2025: https://www.saludladera.gov.co/docs/Transparencia%20y%20Acceso%20Informacion%20Publica/6.%20Participa/6.2.1%20diagnostico_e_identificacion_de_problemas/caja%20de%20herramientas/Manual%20del%20Proceso%20de%20Atenci%C3%B3n%20al%20Usuario.pdf — Avenida 42 Oeste #11-18.
- Red de Salud de Ladera, PIGA: https://www.saludladera.gov.co/docs/Transparencia%20y%20Acceso%20Informacion%20Publica/1.%20Informacion%20de%20la%20entidad/1.21%20gestion%20ambiental/plan%20institucional%20de%20gestion%20ambiental.pdf — variante Carrera 42 Oeste #11-18.
- Alcaldía, Activamente: https://www.cali.gov.co/deportes/publicaciones/154134/activamente/ — Biblioteca Rumenigue Perea Padilla, Calle 11 Oeste #42-12.
- Directorio policial municipal histórico: https://web1.cali.gov.co/publicaciones/salud_hace_llamado_a_entidades_para_tener_en_cuenta_en_el_dia_de_los_ninos_pub — Montebello, Calle 12 Oeste #42-67.
- INVIMA, establecimientos 2025: https://www.invima.gov.co/sites/default/files/alimentos-y-bebidas-alcoholicas/entidades-territoriales/censo-establecimientos-vehiculos/2025.01tri.ets_establecimientos.pdf — Calle 9 Oeste #41A-40, Calle 11 Oeste Av42-07 y Avenida 42 Oeste #10C-46.
- Registraduría 2026: https://www.registraduria.gov.co/IMG/pdf/divipole_definitiva_2026.pdf — referencia IE San Carlos Borromeo, Golondrinas Los Mangos. Sus coordenadas publicadas no se adoptaron como puerta certificada.
- IDESC, códigos postales: https://idesc.cali.gov.co/download/codigo_postal/codigos_postales_cali.pdf — centro poblado Crucero Alto de los Mangos. Es referencia de área, no domicilio exacto.

## Conclusión

La búsqueda no está resuelta para las zonas solicitadas. Se necesita ampliar cobertura rural y de lugares institucionales con fuentes corroboradas, además de filtrar las sugerencias por identidad y zona. Ampliar solo abreviaturas no resolverá los domicilios ausentes. El catálogo propio y ORS pueden conservarse; no se justifica afirmar éxito general con las anteriores pruebas basadas en direcciones presentes en el catálogo.
