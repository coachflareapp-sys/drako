Revisión de direcciones, cruces, selección en mapa y cotización
Fecha local: 7 de noviembre de 2026. Ejecución UTC: 8 de noviembre de 2026.

Alcance: integridad del catálogo publicado, interpretación de nomenclatura, búsquedas en el Worker, rechazo de resultados no relacionados, mapa móvil y cotización. No constituye verificación física de todas las entradas de Cali ni auditoría completa de los módulos de administración, pagos o notificaciones.

Hallazgos corregidos

1. La representación normalizada sin `#` pierde la frontera entre vía principal y placa cuando hay sufijos numéricos. Se hallaron 42.100 registros actuales donde interpretar esa cadena plana produce una vía distinta de la indicada por la dirección original. El índice de archivos, la comparación y la deduplicación ahora utilizan la dirección original, conservada en cada registro. Se reconstruyó toda la tabla de búsqueda y su versión de normalización es 3. Una regresión verifica que `C 53 B 1 N #8 BIS-05` no se confunda con una casa de `CL 53 B`. Esta dirección devuelve su punto catastral de Altos de Menga en producción.
2. Una búsqueda pendiente podía reutilizarse después de editar el campo y volver al mismo texto antes de que acabara la petición. Se descartan las peticiones anteriores al editar; solamente la secuencia vigente limpia su estado pendiente. La prueba del navegador retrasa deliberadamente la primera respuesta y comprueba que una segunda consulta recupera las sugerencias.

Integridad del catálogo reconstruido

| Comprobación | Resultado |
|---|---:|
| Registros públicos deduplicados recorridos | 510.849 |
| Registros bajo una vía diferente de su dirección original | 0 |
| Direcciones originales que no coinciden con su propio registro | 0 |
| Archivos por vía | 4.836 |
| Vías con una búsqueda de placa numérica completa ensayada | 3.575 |
| Fallos en esas búsquedas locales | 0 |
| Archivos sin placa numérica completa utilizable para ese ensayo | 1.261 |

Se excluyeron los archivos históricos con nombres codificados `%20`, que no se copian al paquete publicado. Contarlos habría inflado la auditoría. El manifiesto contiene 692.389 registros de origen, 689.034 con formato admitido y 3.355 sin formato admitido. El catálogo resultante contiene 510.849 registros deduplicados. Las cifras no representan puertas verificadas en campo. El reprocesamiento conserva los 320.502 registros certificados y deja fuera formatos catastrales que ya no se pueden interpretar como una vía numerada; no se sustituyen por una ubicación inventada.

Pruebas de cruces y API

- 18.496 pares de vías interpretados como cruces y como referencias de placas con vía transversal explícita: sin fallos.
- Muestra del Worker local por 334 etiquetas de barrio con cruces registrados: sin fallos.
- 30 direcciones de cinco zonas consultadas en producción: 30 encontraron un punto compatible con su registro de origen; 29 permitieron selección automática.
- 20 consultas difíciles independientes de la selección del catálogo: 13 con referencia compatible, una con sugerencia de lugar del sector, seis sin coincidencia suficiente y cero errores HTTP. La sugerencia sectorial no se cuenta como casa encontrada.
- Pasaron las regresiones de letras, sectores, nombres no relacionados, zonas rurales, firmas de coordenadas, manipulación de puntos y la imposibilidad de cotizar con una esquina de respaldo sin confirmar el punto manual.

Prueba en navegador publicado, pantalla 390×844

- Respuesta antigua retrasada artificialmente: la búsqueda actual se recupera.
- `Cra. 36 #48a-2`: ofrece su esquina de referencia y abre el mapa.
- El botón de confirmar empieza deshabilitado: hay que tocar el mapa o mover el marcador.
- Cancelar conserva el texto y permite reabrir el mapa.
- Confirmar el punto conserva la dirección original para el conductor.
- Diálogo y página caben en el ancho móvil probado.
- Destino seleccionado explícitamente entre las referencias de Calle 5 con Carrera 39: ruta calculada de 5,76 km, estimación de $11.530 COP.
- No se enviaron reservas, mensajes ni pagos. La cotización genera su registro temporal normal.

Los scripts iniciales del navegador tuvieron un error de selección del botón y agotaron el tiempo de espera. Se corrigió el script de prueba para seleccionar una sugerencia del destino, se recargó la página y la prueba completa pasó. No se confundieron esas ejecuciones incompletas con validaciones satisfactorias.

Límites pendientes

- La fuente municipal completa mantiene 100 trazados fuera del buscador numerado: 72 sin nombre y 28 con nombres no numerados. Hay 61 nombres de vías numeradas sin unión recuperada. El tratamiento exhaustivo de la fuente no certifica cobertura del 100% de las calles físicas, especialmente rurales.
- Las 1.261 vías sin una placa numérica completa de prueba no se presentan como búsquedas de casa aprobadas. Sus registros conservados sí pasaron la comprobación interna contra su texto de origen.
- La muestra de 30 direcciones usa los puntos de origen como referencia; no mide distancia a una puerta observada independientemente. La integridad interna de 510.849 registros tampoco demuestra precisión física de cada punto.
- Las direcciones complejas necesitan conservar separadores como `#`. Cuando no hay información para separar inequívocamente los componentes, no se garantiza interpretación correcta de una cadena de números sin separadores.
- La prueba móvil automatizada no acredita la precisión real del GPS de cada teléfono. Tampoco valida tráfico en tiempo real: la tarifa mostrada sigue siendo aproximada por carretera.

Reproducción local después de `npm run build`:

```powershell
npm test
node scripts/audit-address-integrity.mjs
node scripts/audit-street-lookups.mjs
node scripts/audit-addresses.mjs --live
node scripts/audit-complex-zones.mjs
```

Los últimos dos comandos acceden a la página pública, sin crear reservas. Los detalles de auditoría y la prueba del navegador quedan en `.private/`, fuera del paquete público y de Git.
