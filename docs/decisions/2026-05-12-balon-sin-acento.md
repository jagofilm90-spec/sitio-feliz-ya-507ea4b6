# Decisión · Valor canónico de "balón" en unit_type

**Fecha:** 12 mayo 2026
**Estado:** Resuelta — mantener "balón" con acento (legacy)
**Sprint:** 1.5

## Contexto

Durante Sprint 1 se agregó el valor `balon` (sin acento) al enum
`unit_type` sin saber que `balón` (con acento) ya existía en el enum
desde la migración `20251202032126_*`.

## Hallazgo

Postgres trata `balón` y `balon` como valores enum distintos. Tener
ambos vivos crearía deuda de datos: el mismo concepto (un balón de gas)
podría guardarse de dos maneras según qué desarrollador toque qué SKU.

## Decisión

**Mantener `balón` (con acento) como valor canónico** porque ya existía
en producción desde diciembre 2025 y probablemente algunos SKUs ya lo
usan.

**NO agregar `balon` sin acento.** Aunque la convención del resto del
enum es sin acento (`costal`, `bolsa`, `pieza`), normalizar `balón` →
`balon` requeriría un UPDATE en producción + actualizar la UI + manejar
el ALTER TYPE RENAME VALUE que es más complejo. No vale la pena en
Sprint 1.5.

## Si en el futuro se quiere normalizar

Pasos para una futura migración (NO ahora):

1. `UPDATE productos SET unidad = 'balon' WHERE unidad = 'balón'`
   (después de agregar `balon` al enum)
2. `ALTER TYPE unit_type RENAME VALUE 'balón' TO ...` no funciona si
   hay filas — habría que dropear el valor viejo después
3. Documentar para que CFDI use `balon` en `clave_unidad_sat = X4A`
   (Bote / barril)

Por ahora, el código en la app debe asumir `balón` con acento.

## Archivos relacionados

- `supabase/migrations/20260512250000_unit_type_balon_cubeta_bolsa.sql`
- `docs/decisions/2026-05-12-balon-sin-acento.md` (este archivo)
