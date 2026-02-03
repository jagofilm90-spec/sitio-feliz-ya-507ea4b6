

# Plan: Corregir Lógica de Reprogramación Automática con Días Festivos de México

## Problema Identificado

La función `auto-reschedule-deliveries` tiene dos deficiencias críticas:

1. **Bug en el cálculo de días hábiles**: La nota de la OC-202601-0004 muestra que se reprogramó del 30/01 directamente al 02/02 (domingo), saltándose incorrectamente el sábado 31/01 que es día laboral.

2. **No considera días festivos oficiales de México**: El lunes 03/02/2026 es "Día de la Constitución" (festivo nacional), pero la función no lo considera.

## Solución Propuesta

### Cambio 1: Agregar calendario de días festivos de México 2026

Crear una función que calcule los días festivos oficiales de México, incluyendo:
- **1 de enero**: Año Nuevo
- **Primer lunes de febrero**: Día de la Constitución
- **Tercer lunes de marzo**: Natalicio de Benito Juárez
- **1 de mayo**: Día del Trabajo
- **16 de septiembre**: Día de la Independencia
- **Tercer lunes de noviembre**: Revolución Mexicana
- **25 de diciembre**: Navidad

```typescript
function getMexicanHolidays(year: number): string[] {
  const holidays: string[] = [];
  
  // Fijos
  holidays.push(`${year}-01-01`); // Año Nuevo
  holidays.push(`${year}-05-01`); // Día del Trabajo
  holidays.push(`${year}-09-16`); // Independencia
  holidays.push(`${year}-12-25`); // Navidad
  
  // Primer lunes de febrero (Constitución)
  const feb1 = new Date(year, 1, 1);
  const firstMondayFeb = new Date(year, 1, 1 + (8 - feb1.getDay()) % 7);
  holidays.push(firstMondayFeb.toISOString().split('T')[0]);
  
  // Tercer lunes de marzo (Benito Juárez)
  const mar1 = new Date(year, 2, 1);
  const firstMondayMar = new Date(year, 2, 1 + (8 - mar1.getDay()) % 7);
  const thirdMondayMar = new Date(firstMondayMar);
  thirdMondayMar.setDate(firstMondayMar.getDate() + 14);
  holidays.push(thirdMondayMar.toISOString().split('T')[0]);
  
  // Tercer lunes de noviembre (Revolución)
  const nov1 = new Date(year, 10, 1);
  const firstMondayNov = new Date(year, 10, 1 + (8 - nov1.getDay()) % 7);
  const thirdMondayNov = new Date(firstMondayNov);
  thirdMondayNov.setDate(firstMondayNov.getDate() + 14);
  holidays.push(thirdMondayNov.toISOString().split('T')[0]);
  
  return holidays;
}
```

### Cambio 2: Mejorar `getNextBusinessDay()` para considerar festivos

```typescript
function getNextBusinessDay(date: Date, holidays: string[]): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  
  // Iterar hasta encontrar un día hábil
  while (true) {
    const dayOfWeek = next.getDay();
    const dateStr = next.toISOString().split('T')[0];
    
    // Saltar domingos (0) y días festivos
    if (dayOfWeek === 0 || holidays.includes(dateStr)) {
      next.setDate(next.getDate() + 1);
      continue;
    }
    
    break;
  }
  
  return next;
}
```

### Cambio 3: Actualizar la invocación en el flujo principal

```typescript
// En el handler principal
const currentYear = today.getFullYear();
const holidays = getMexicanHolidays(currentYear);
// También agregar el siguiente año por si estamos en diciembre
if (today.getMonth() === 11) {
  holidays.push(...getMexicanHolidays(currentYear + 1));
}

const nextBusinessDay = getNextBusinessDay(today, holidays);
```

## Ejemplo con OC-202601-0004

Con la lógica corregida, la secuencia correcta sería:

| Cron ejecutado | Fecha vencida | Siguiente día hábil calculado |
|----------------|---------------|-------------------------------|
| 31/01 (Viernes) | 30/01 | **31/01** (Sábado es laboral) |
| 01/02 (Sábado) | 31/01 | **03/02** (Lunes, pero es festivo → **04/02**) |

Pero como el cron corre a las 6am, si el sábado 01/02 corrió pero 03/02 era festivo, debería haber saltado al 04/02 directamente.

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `supabase/functions/auto-reschedule-deliveries/index.ts` | Agregar función de días festivos y mejorar `getNextBusinessDay()` |

## Consideraciones Adicionales

1. **Días festivos opcionales**: ¿Quieren incluir también días como Jueves y Viernes Santo, 2 de noviembre, 12 de diciembre? Estos son opcionales pero muchas empresas no operan.

2. **Configuración dinámica**: Opcionalmente, los días festivos podrían almacenarse en una tabla `dias_festivos` para poder agregar días de cierre extraordinario (inventarios, etc.)

## Diagrama del Flujo Mejorado

```text
Cron ejecuta a las 6am
        │
        ▼
┌───────────────────┐
│ Obtener día festivos│
│  del año actual    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ Buscar entregas   │
│ con fecha < hoy   │
│ status=programada │
└─────────┬─────────┘
          │
          ▼
┌───────────────────────────┐
│ Calcular siguiente día   │
│ hábil (skip dom + festivos)│
└─────────┬─────────────────┘
          │
          ▼
┌───────────────────┐
│ Actualizar fecha  │
│ + crear notif.    │
│ + enviar email    │
└───────────────────┘
```

