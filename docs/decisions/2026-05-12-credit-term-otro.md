# Decisión · plazo "Otro" en credit_term

**Fecha:** 12 mayo 2026
**Estado:** Pendiente — se decide en Sprint 3
**Sprint:** 3 (Clientes — segmentación)

## Contexto

El Blueprint v0.5 requiere que los pedidos puedan tener plazo de pago "Otro"
(libre en días). El enum actual `credit_term` tiene 5 valores: contado, 8_dias,
15_dias, 30_dias, 60_dias.

## Opciones

**Y. ALTER TYPE ADD VALUE 'otro' + columna `plazo_personalizado_dias INT`**
- Pro: cambio mínimo, mantiene typing fuerte
- Contra: agregar valor a enum no es transaccional en Postgres; rollback complejo si la migración falla

**Z. Migrar `termino_credito` de enum a TEXT + validar en app layer**
- Pro: más flexible a largo plazo, fácil agregar nuevos valores
- Contra: pierde validación a nivel DB, requiere migración de 2 pasos

## Recomendación tentativa

Opción Y para mantener disciplina de tipos. Validar en Sprint 3 con datos reales.

## Acción

Decidir al iniciar Sprint 3 (9 junio 2026).
