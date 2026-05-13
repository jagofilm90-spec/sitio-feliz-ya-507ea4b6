# Decisión · Jerarquía cliente

**Fecha:** 12 mayo 2026
**Estado:** Resuelta
**Sprint:** 3 (Clientes — segmentación)

## Contexto

El 12 de mayo 2026 se intentó implementar jerarquía cliente con `parent_cliente_id`
en la tabla `clientes`. Fue duplicada (migraciones 054655 y 100000) y se hizo
rollback completo el mismo día.

## Hallazgo clave

Lecaroz ya vive modelado correctamente en `cliente_sucursales` (82 razones
sociales + 354 sucursales) desde la migración `20260406140000_seed_lecaroz.sql`.
Crear `parent_cliente_id` duplicaría el modelo y causaría inconsistencia de datos.

## Decisión

**NO crear `parent_cliente_id` en `clientes`.** Para Sprint 3, lo que sí
construimos:

1. Capa de **crédito consolidado** encima de `cliente_sucursales` (consolidar
   saldo de cobro a nivel grupo)
2. **Reporting consolidado** por grupo (Lecaroz como entidad agregada en
   dashboards)
3. **Segmentación** (`top_5` / `cola_larga` / `mercados` / `mostrador`) como
   campo nuevo en `clientes`

## Archivos eliminados en Sprint 0

- `src/components/clientes/ClienteHierarchyTab.tsx`
- `src/hooks/useClienteHierarchy.ts`
- Referencias comentadas en `src/pages/clientes/DetalleCliente.tsx`
