# M04.5B.2 — Lista de Precios: conclusión del análisis

**Fecha**: 22 abril 2026
**Commits relacionados**: d26d4ed8, a4cb951f
**Blueprint origen**: v0.4 sección roadmap FASE 1

## Contexto

El Blueprint v0.4 proponía consolidar los 3 archivos de Lista de
Precios (Admin 636 + Secretaria 479 + Vendedor 419 = 1,534 líneas)
a un solo componente con prop mode, estimando ~600 líneas finales.

## Realidad después del análisis

Solo 2 piezas fueron genuinamente compartibles:
- PromocionBadge + ImpuestoBadges (M04.5B.2.1, commit a4cb951f)
- ListaPreciosPdfButton (M04.5B.2.2, commit d26d4ed8)

## Por qué no más

Los 3 archivos tienen divergencias legítimas, no duplicación:

| Elemento | Admin | Secretaria | Vendedor |
|---|---|---|---|
| Columnas | 11 (sortables) | 5 | 4-5 (condicional) |
| Row logic | Margin coloring + 6 metrics | Descuento simple | Last price per client |
| Mobile | Card dedicado con grid 2x2 | Inline flex row | Inline flex row |
| Acciones | 3 botones | 2 botones | 0 botones |

Un componente consolidado requeriría recibir configuración de
columnas como array (tipo library de tablas) y múltiples branches
condicionales — costo mayor al beneficio.

## La arquitectura ya era buena (no se vio inicialmente)

- 3 hooks shared ya existían: useListaPrecios, usePrecioEditor,
  usePrecioHistorial — centralizan toda la lógica de datos.
- 3 dialogs shared ya existían: PrecioHistorialDialog,
  RevisionesPrecioPanel, PdfExportDialog — centralizan UI pesada.
- Los 3 Tab components son shells de presentación por rol.

## Principio aplicado

"Don't DRY until it hurts" + principio #4 del Blueprint v0.4:
"cada rol su propio idioma, pero la lógica es una sola".

La lógica YA es una sola (en los hooks). Los shells visuales
SÍ son por rol — y está bien.

## Recomendación futura

NO intentar consolidar los 3 archivos a un componente con prop mode.
Si se detectan nuevas piezas idénticas emergentes, extraerlas
puntualmente como componentes shared. La arquitectura está OK.
