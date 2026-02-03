

# Plan: Actualizar Fecha de Entrega de OC-202601-0004

## Situación Actual

| Campo | Valor Actual |
|-------|--------------|
| Folio | OC-202601-0004 |
| ID | d1188120-4403-4cd2-8f43-04c38f571d53 |
| Fecha programada | 2026-01-30 |
| Status | enviada |

La orden está programada para el **30 de enero de 2026** (fecha pasada), por lo que debe reprogramarse al primer día hábil disponible: **hoy, 3 de febrero de 2026**.

## Acción a Realizar

Ejecutar una actualización en la base de datos para cambiar `fecha_entrega_programada` de `2026-01-30` a `2026-02-03`, agregando una nota de reprogramación manual.

## Comando SQL

```sql
UPDATE ordenes_compra 
SET 
  fecha_entrega_programada = '2026-02-03',
  notas = COALESCE(notas || E'\n', '') || '[MANUAL 2026-02-03] Reprogramada de 2026-01-30 a 2026-02-03'
WHERE folio = 'OC-202601-0004';
```

## Resultado Esperado

- La orden aparecerá en el calendario de entregas para hoy (3 de febrero)
- Se agregará una nota indicando la reprogramación manual
- El almacén podrá ver la entrega pendiente para recepción

