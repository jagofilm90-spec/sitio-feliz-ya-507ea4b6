

# Plan: Sistema Completo de Días Festivos Mexicanos con Advertencias en UI

## Resumen

Implementar un sistema robusto de días festivos mexicanos que:
1. Calcule automáticamente **todos los días festivos oficiales** para cualquier año, incluyendo Semana Santa (que se basa en la fecha de Pascua)
2. Muestre **advertencias en la UI** cuando se intente programar entregas en días festivos
3. **Marque visualmente los días festivos** en el calendario de entregas

---

## Días Festivos Oficiales de México (Según la LFT)

| Fecha | Día Festivo | Tipo |
|-------|-------------|------|
| 1 de enero | Año Nuevo | Fijo |
| Primer lunes de febrero | Día de la Constitución | Calculado |
| Tercer lunes de marzo | Natalicio de Benito Juárez | Calculado |
| Jueves anterior a Pascua | Jueves Santo | Calculado (Pascua) |
| Viernes anterior a Pascua | Viernes Santo | Calculado (Pascua) |
| 1 de mayo | Día del Trabajo | Fijo |
| 16 de septiembre | Día de la Independencia | Fijo |
| Tercer lunes de noviembre | Día de la Revolución | Calculado |
| 25 de diciembre | Navidad | Fijo |

---

## Cambios Técnicos

### 1. Crear utilidad compartida de días festivos mexicanos

**Nuevo archivo: `src/lib/mexicanHolidays.ts`**

Esta utilidad será reutilizable tanto en el frontend como en las edge functions:

```typescript
// Algoritmo de Computus para calcular Pascua
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Calcular el N-ésimo lunes de un mes
function getNthMonday(year: number, month: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : (dayOfWeek === 1 ? 0 : 8 - dayOfWeek);
  const firstMonday = new Date(year, month, 1 + daysUntilMonday);
  firstMonday.setDate(firstMonday.getDate() + (n - 1) * 7);
  return firstMonday;
}

export interface MexicanHoliday {
  date: string;       // "2026-02-02"
  name: string;       // "Día de la Constitución"
  shortName: string;  // "Constitución"
}

export function getMexicanHolidays(year: number): MexicanHoliday[] {
  const holidays: MexicanHoliday[] = [];
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Fijos
  holidays.push({ date: `${year}-01-01`, name: "Año Nuevo", shortName: "Año Nuevo" });
  holidays.push({ date: `${year}-05-01`, name: "Día del Trabajo", shortName: "Trabajo" });
  holidays.push({ date: `${year}-09-16`, name: "Día de la Independencia", shortName: "Independencia" });
  holidays.push({ date: `${year}-12-25`, name: "Navidad", shortName: "Navidad" });

  // Primer lunes de febrero (Constitución)
  const constitutionDay = getNthMonday(year, 1, 1);
  holidays.push({ 
    date: formatDate(constitutionDay), 
    name: "Día de la Constitución", 
    shortName: "Constitución" 
  });

  // Tercer lunes de marzo (Benito Juárez)
  const juarezDay = getNthMonday(year, 2, 3);
  holidays.push({ 
    date: formatDate(juarezDay), 
    name: "Natalicio de Benito Juárez", 
    shortName: "B. Juárez" 
  });

  // Tercer lunes de noviembre (Revolución)
  const revolutionDay = getNthMonday(year, 10, 3);
  holidays.push({ 
    date: formatDate(revolutionDay), 
    name: "Día de la Revolución Mexicana", 
    shortName: "Revolución" 
  });

  // Semana Santa (basado en Pascua)
  const easter = calculateEaster(year);
  
  // Jueves Santo (3 días antes de Pascua)
  const holyThursday = new Date(easter);
  holyThursday.setDate(easter.getDate() - 3);
  holidays.push({ 
    date: formatDate(holyThursday), 
    name: "Jueves Santo", 
    shortName: "Jue. Santo" 
  });

  // Viernes Santo (2 días antes de Pascua)
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  holidays.push({ 
    date: formatDate(goodFriday), 
    name: "Viernes Santo", 
    shortName: "Vie. Santo" 
  });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

// Helper para verificar si una fecha es festivo
export function isHoliday(dateStr: string): MexicanHoliday | null {
  const year = parseInt(dateStr.split('-')[0]);
  const holidays = getMexicanHolidays(year);
  return holidays.find(h => h.date === dateStr) || null;
}
```

---

### 2. Actualizar Edge Function `auto-reschedule-deliveries`

**Archivo: `supabase/functions/auto-reschedule-deliveries/index.ts`**

- Agregar la función `calculateEaster()` para calcular Semana Santa
- Agregar Jueves y Viernes Santo a la lista de días festivos
- El código ya tiene la lógica correcta de `getNextBusinessDayInclusive()`

---

### 3. Agregar advertencia en `ProgramarEntregasDialog`

**Archivo: `src/components/compras/ProgramarEntregasDialog.tsx`**

Cuando el usuario seleccione una fecha que sea día festivo, mostrar un Alert de advertencia:

```text
Diagrama del flujo de UX:

Usuario selecciona fecha
        │
        ▼
┌──────────────────────────┐
│ isHoliday(fecha) ?       │
└─────────┬────────────────┘
          │
     SI   │   NO
    ┌─────┴─────┐
    ▼           ▼
┌──────────┐ ┌──────────┐
│ Mostrar  │ │ Guardar  │
│ Alert    │ │ normal   │
│ "Es día  │ └──────────┘
│ festivo" │
└────┬─────┘
     │
     ▼
┌─────────────────────────────┐
│ Botón: "Sí, programar"      │
│ Botón: "Cambiar fecha"      │
└─────────────────────────────┘
```

- Importar `isHoliday` desde `@/lib/mexicanHolidays`
- Agregar estado `advertenciaFestivo` para rastrear si hay advertencia
- Mostrar un `Alert` con estilo amarillo cuando la fecha sea festivo
- Permitir que el usuario confirme si realmente quiere programar en ese día

---

### 4. Marcar días festivos en `CalendarioEntregasTab`

**Archivo: `src/components/compras/CalendarioEntregasTab.tsx`**

- Resaltar los días festivos con un color distintivo (rojo suave o gris)
- Mostrar un tooltip o badge con el nombre del día festivo
- Agregar a la leyenda del calendario

```typescript
// En el renderizado de cada día:
const holiday = isHoliday(format(dia, "yyyy-MM-dd"));

// Agregar clase visual para días festivos
className={cn(
  // ... clases existentes ...
  holiday && "bg-red-50 dark:bg-red-950/20"
)}

// Mostrar nombre del festivo
{holiday && (
  <span className="text-[10px] text-red-500 truncate">
    {holiday.shortName}
  </span>
)}
```

---

## Archivos a Modificar/Crear

| Archivo | Acción | Cambio |
|---------|--------|--------|
| `src/lib/mexicanHolidays.ts` | **Crear** | Utilidad compartida con algoritmo de Pascua y días festivos |
| `supabase/functions/auto-reschedule-deliveries/index.ts` | **Modificar** | Agregar Semana Santa al cálculo de festivos |
| `src/components/compras/ProgramarEntregasDialog.tsx` | **Modificar** | Agregar advertencia al programar en día festivo |
| `src/components/compras/CalendarioEntregasTab.tsx` | **Modificar** | Marcar visualmente los días festivos en el calendario |

---

## Validación de Días Festivos 2026

Para verificar que el sistema funcione correctamente, los días festivos calculados para 2026 serán:

| Fecha | Día Festivo |
|-------|-------------|
| 2026-01-01 | Año Nuevo |
| 2026-02-02 | Día de la Constitución |
| 2026-03-16 | Natalicio de Benito Juárez |
| 2026-04-02 | Jueves Santo |
| 2026-04-03 | Viernes Santo |
| 2026-05-01 | Día del Trabajo |
| 2026-09-16 | Día de la Independencia |
| 2026-11-16 | Día de la Revolución |
| 2026-12-25 | Navidad |

---

## Consideraciones Adicionales

1. **Semana Santa variable**: Pascua cae en diferentes fechas cada año (entre marzo 22 y abril 25), por lo que el algoritmo de Computus garantiza el cálculo correcto para cualquier año.

2. **Años futuros**: El sistema funcionará automáticamente para 2027, 2028, etc. sin necesidad de actualización manual.

3. **Días opcionales no incluidos**: 2 de noviembre (Día de Muertos), 12 de diciembre (Virgen de Guadalupe) no son días de descanso obligatorio según la LFT, pero podrían agregarse si la empresa lo requiere.

