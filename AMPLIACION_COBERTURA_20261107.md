Ampliación de referencias para huecos de cobertura — 7 de noviembre de 2026

Resultado publicado

| Medida | Antes | Después |
|---|---:|---:|
| Nombres de vías numeradas de la fuente municipal sin referencia de conexión | 61 | 1 |
| Pares de nombres de vías representados | 18.496 | 19.793 |
| Puntos de cruce o referencia | 20.107 | 21.613 |
| Consultas difíciles sin coincidencia suficiente, de una muestra fija de 20 | 6 | 5 |

Se añadieron 1.506 referencias de extremo de vía a segmento de otra vía. Esto no significa que se hayan verificado físicamente 1.506 intersecciones ni que toda Cali tenga cobertura: son ayudas para que el pasajero coloque su entrada en el mapa.

Método y controles

Se examinaron los 11.304 trazados municipales completos. En la mayoría de las vías pendientes, un extremo de una calle toca un segmento de otra, pero la segunda no tiene un vértice en ese lugar. El importador anterior solo unía vértices o extremos entre sí. El nuevo módulo `junction-references.js` también detecta esos encuentros.

- Se conserva la coordenada original del extremo municipal, sin fabricar números de casa ni desplazarla hacia una intersección calculada.
- Límite de separación: 3 metros. Si hay separación superior a 2 cm, las direcciones de los segmentos deben formar al menos 20 grados para descartar carriles casi paralelos.
- No se generan uniones por cruces entre dos interiores de segmentos: podrían ser puentes o pasos a distinto nivel.
- No se duplican referencias situadas a menos de 25 metros del mismo par de vías.
- Estas referencias no llevan firma para cotizar. La respuesta exige abrir el mapa, tocar la entrada o mover el marcador y confirmar el punto. Solo entonces `/api/location` firma la ubicación seleccionada.
- Si en un resultado se mezclan referencias nuevas y existentes, se pide confirmación en mapa para toda esa selección.

Referencia cercana de una casa o lugar conocido

Cuando no existe la dirección exacta ni una esquina utilizable, `nearby-address.js` busca un registro de la misma vía y el mismo componente de vía transversal. Solo admite placas simples de dos componentes numéricos; respeta letras y sectores y rechaza tipos de vía transversal explícitos incompatibles. La diferencia máxima entre los números de puerta es 75: es un filtro de nomenclatura, no una medición garantizada en metros.

Los candidatos provienen del catálogo municipal domiciliario o de referencias públicas municipales ya importadas. No se añade ningún proveedor de pago. Se muestran hasta tres puntos, identificados por su dirección real, con advertencia de que no son la casa solicitada. No se seleccionan automáticamente y tampoco llevan firma de cotización. Carlos conserva el texto que escribió el cliente al confirmar el punto en el mapa.

Ejemplo recuperado: `Calle 11 Oeste Av 42-07, Montebello, Cali` ofrece una referencia pública del 42-12 para situar el mapa cerca y marcar la entrada. No se presenta ese 42-12 como si fuera el 42-07.

Validaciones

- Interpretación y respaldo de placa con vía transversal explícita para los 19.793 pares del catálogo: sin fallos.
- Muestra local del Worker para 335 etiquetas de barrio con cruces registrados: sin fallos. La capa original tiene 336 etiquetas; no se presenta esa cifra como cobertura completa de barrios oficiales.
- Pruebas de límites de distancia, segmentos paralelos, cruces interiores/puentes, preservación de letras, sectores y números, y rechazo de cotización directa con una referencia sin confirmar: aprobadas.
- 30 búsquedas geográficas en producción: 30 con punto compatible con su registro de origen.
- Muestra fija de 20 consultas difíciles: 13 referencias sin el nuevo paso de mapa, una referencia cercana que requiere mapa, una sugerencia de lugar del sector y cinco sin coincidencia suficiente. Cero errores HTTP. Estas categorías no se cuentan como direcciones exactas verificadas.
- Navegador móvil publicado a 390×844: `CL 21 A NORTE con AV 10` requirió confirmar el mapa y cotizó hasta Calle 5 con Carrera 39: 5,90 km, $11.802 COP. El caso de Montebello requirió el mismo paso y cotizó 10,51 km, $21.014 COP. Se conservaron los textos originales. Son recorridos aproximados, sin tráfico en tiempo real.
- No se enviaron reservas, mensajes ni pagos. Las cotizaciones usan los registros temporales normales del sistema.

Contraste adicional y límites

La única vía numerada que queda sin conexión recuperada en esa fuente es `KR 150`. Sus extremos municipales quedan aproximadamente a 3,17 m de Calle 36 y a 6,13 m de Calle 48, por fuera del límite de 3 m. No se aumentó el límite para forzar el contador a cero.

Se descargó una extracción de 496 vías con nombre de OpenStreetMap para Pance y los sectores occidentales pendientes. No incluyó una vía nombrada Carrera 150 ni las vías rurales numeradas necesarias para resolver por completo los otros casos. Eso no demuestra que no existan; solo que esa extracción no corrobora la nomenclatura necesaria. La extracción se conserva en caché privada y no se incorporó al catálogo publicado. Overpass no participa en las búsquedas de clientes. Referencias de acceso: https://wiki.openstreetmap.org/wiki/Overpass_API y https://www.openstreetmap.org/copyright.

Siguen fuera del buscador numerado los 100 trazados de la fuente sin nombre o con nombres no numerados: 72 y 28 respectivamente. Tampoco se certifica que el inventario municipal contenga todas las calles actuales o que cada encuentro permita acceso de vehículos. No se cambiaron letras o tipos de vía para hacer aparecer las consultas restantes.

Reproducir después de disponer de la caché municipal completa:

```powershell
$env:CALI_ROADS_CACHE='.private/cali-roads-refresh'
node scripts/import-cali-crossings.mjs
node scripts/audit-cali-network.mjs
npm run build
npm test
node scripts/audit-addresses.mjs --live
node scripts/audit-complex-zones.mjs
```

`scripts/inspect-road-gaps.mjs` produce candidatos para investigar las vías que sigan pendientes. Los candidatos no se publican automáticamente. `scripts/download-gap-osm.mjs` hace una extracción de contraste bajo demanda y reutiliza su caché privada.
