

# Plan: Corregir Lógica de Reprogramación para Usar el Día Hábil Más Próximo

## Problema Identificado

La lógica actual siempre reprograma entregas vencidas a `today + 1`, pero esto es incorrecto. Si una entrega venció ayer (02/02 que era festivo), debería reprogramarse a **HOY** (03/02) si hoy es día hábil, no a mañana (04/02).

**Ejemplo del bug actual:**
- Entrega original: 30/01/2026
- Día festivo: 02/02/2026 (Día de la Constitución)
- Cron ejecuta: 03/02/2026
- Sistema reprograma a: 04/02/2026 ❌
- Debería reprogramar a: 03/02/2026 ✓ (hoy, que es día hábil)

## Solución Propuesta

Cambiar la lógica para que reprograme al **primer día hábil a partir de la fecha actual** en lugar de siempre sumar +1.

### Cambio en `getNextBusinessDay()`

```typescript
// ANTES (bug):
function getNextBusinessDay(date: Date, holidays: string[]): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)  // <-- Siempre suma +1
  // ...
}

// DESPUÉS (correcto):
function getNextBusinessDayInclusive(date: Date, holidays: string[]): Date {
  const current = new Date(date)
  
  while (true) {
    const dayOfWeek = current.getDay()
    const dateStr = current.toISOString().split('T')[0]
    
    // Si es día hábil (no domingo, no festivo), retornamos este día
    if (dayOfWeek !== 0 && !holidays.includes(dateStr)) {
      return current
    }
    
    // Si no, avanzamos al siguiente día
    current.setDate(current.getDate() + 1)
  }
}
```

### Cambio en el flujo principal

La fecha de reprogramación debe ser `getNextBusinessDayInclusive(today)` en lugar de `getNextBusinessDay(today)`. Esto significa:
- Si hoy es día hábil → reprogramar a hoy
- Si hoy es domingo o festivo → reprogramar al siguiente día hábil

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/auto-reschedule-deliveries/index.ts` | Renombrar función a `getNextBusinessDayInclusive()` y cambiar lógica para incluir el día actual como posible resultado |

## Resultado Esperado

Con esta corrección, el sistema se comportará así:

| Fecha vencida | Cron ejecuta | Día de hoy | Es hábil? | Reprograma a |
|--------------|--------------|------------|-----------|--------------|
| 02/02 (festivo) | 03/02 | Martes | ✓ Sí | **03/02** (hoy) |
| 01/02 | 02/02 | Lunes festivo | ✗ No | **03/02** (siguiente hábil) |
| 31/01 | 01/02 | Domingo | ✗ No | **02/02** (lunes... pero es festivo → **03/02**) |

## Nota Adicional

El calendario de días festivos mexicanos ya está correctamente implementado. El sistema ya calcula correctamente que el 02/02/2026 es el "Día de la Constitución" (primer lunes de febrero). El único problema era la lógica de siempre sumar +1 día.

