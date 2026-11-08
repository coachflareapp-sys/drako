Auditoría de la red municipal completa de Cali — 7 de noviembre de 2026

Actualización posterior: [ampliación de referencias y reducción de huecos](AMPLIACION_COBERTURA_20261107.md). Las cifras siguientes describen la auditoría anterior a esa ampliación.

Se descargó nuevamente la capa completa `dapm:pdt_nmc_nomenclatura_vial` desde https://ws-idesc.cali.gov.co/geoserver/dapm/ows. El servicio WFS declaró 11.304 registros y se descargaron los 11.304, ordenados por gid, sin limitar barrios ni usar un rectángulo geográfico. La igualdad de cantidades comprueba integridad de la descarga, no integridad física de las calles de la ciudad.

Resultado integrado con los cruces existentes:

- 18.496 pares de nombres de vías.
- 20.107 puntos de cruce/referencia (un par puede tener varias ramas o ubicaciones).
- 2.187 nombres de vías numeradas interpretados en la fuente.
- 336 etiquetas de barrio en la fuente; 334 representadas por muestras de consultas de cruces.
- 11.204 trazados con nomenclatura numerada interpretable.
- 100 sin soporte en este buscador numerado: 72 sin nombre y 28 con nombres no numerados (incluidos pasajes/viaducto).
- 61 nombres de vías numeradas sin unión recuperada; listado privado de auditoría disponible en `.private/cali-network-audit.json`.

Los puntos se obtienen de vértices compartidos de vías municipales (tolerancia 2 cm) y extremos separados hasta 3 m. No se intersectan segmentos interiores para inventar conexiones en puentes. Se conserva cada ubicación distinta aunque el par de nombres ya exista en otra zona. El buscador combina ambos catálogos en lugar de ocultar referencias cuando existe un resultado anterior con los mismos nombres.

Se incorporaron sufijos numéricos y alfabéticos completos, por ejemplo Calle 72F3 y Carrera 26I8. Las direcciones con `#` conservan la vía completa antes del numeral; el cruce de respaldo conserva el componente completo antes del guion. La letra Y dentro de una nomenclatura ya no se confunde con el conector entre vías. Sin tipo explícito, no se inventa la vía transversal de diagonales o transversales ambiguas.

Validación: los 18.496 pares se interpretaron correctamente como cruces y como respaldo de una placa con vía transversal explícita. Se consultó el Worker local con una muestra por cada una de las 334 etiquetas de barrio representadas en los cruces. Esto verifica interpretación e integración, no certificación independiente de cada entrada. También pasó la batería de regresión de direcciones y cotizaciones.

Para una casa ausente, el cliente debe abrir el mapa y marcar su entrada; la referencia de esquina no lleva firma para cotizar. Los datos firmados se obtienen después de confirmar el punto manual. No se crean reservas durante las pruebas.

Límite: se procesó toda la capa municipal publicada, no se certificó que contenga cada calle actual ni cada cruce físico de Cali. La cobertura rural y los nombres sin numeración siguen requiriendo fuentes complementarias. No se garantiza acceso vehicular en cada unión de geometrías.

Reproducción:

```powershell
node scripts/refresh-cali-roads.mjs
$env:CALI_ROADS_CACHE='.private/cali-roads-refresh'
node scripts/import-cali-crossings.mjs
node scripts/audit-cali-network.mjs
npm run build
npm test
```

Resumen público sin datos personales: `catalogue/cali/network-coverage.json`. La fuente municipal cruda permanece fuera del paquete público.
