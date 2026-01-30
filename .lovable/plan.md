

# Plan: Mostrar Entregas Locales (sin guardar) en el Calendario de Ocupación

## Problema Identificado

Cuando programas entregas en el wizard y seleccionas "04 feb", la fecha aparece en la lista de entregas pero el calendario **no muestra el puntito** porque:

1. El `CalendarioOcupacion` solo consulta entregas **guardadas en la base de datos**
2. Las fechas que estás asignando están en **estado local** del wizard (aún no guardadas)
3. Por eso ves "04 feb" en la lista pero no el indicador visual en el calendario

## Solución

Agregar una prop `entregasLocales` al componente `CalendarioOcupacion` para que pueda mostrar tanto las entregas de la BD como las que estás programando en ese momento.

---

## Flujo Visual Mejorado

```text
ANTES (problema actual):
┌─────────────────────────────────────────┐
│  Calendario                   Lista     │
│  ┌───────────────────┐   ┌──────────┐  │
│  │ 3   4   5   6     │   │ #1: 04feb│  │
│  │         ← sin     │   │ #2: 06feb│  │
│  │            punto  │   │ #3: --   │  │
│  └───────────────────┘   └──────────┘  │
└─────────────────────────────────────────┘

DESPUÉS (solución):
┌─────────────────────────────────────────┐
│  Calendario                   Lista     │
│  ┌───────────────────┐   ┌──────────┐  │
│  │ 3   4●  5   6●    │   │ #1: 04feb│  │
│  │     ↑      ↑      │   │ #2: 06feb│  │
│  │   puntitos        │   │ #3: --   │  │
│  │   visibles!       │   └──────────┘  │
│  └───────────────────┘                  │
│  ● = Tu nueva OC (verde claro)          │
│  ● = Otras OCs existentes               │
└─────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Modificar `CalendarioOcupacion.tsx`

Agregar prop para recibir entregas locales:

```typescript
// Nueva interface para entregas locales
interface EntregaLocal {
  numero_entrega: number;
  cantidad_bultos: number;
  fecha_programada: string;
}

interface CalendarioOcupacionProps {
  selectedDate?: Date;
  onDateSelect: (date: Date) => void;
  initialMonth?: Date;
  className?: string;
  // NUEVO: Entregas que se están programando (no guardadas aún)
  entregasLocales?: EntregaLocal[];
  proveedorNombre?: string; // Para mostrar en tooltip
}
```

Combinar entregas de BD con entregas locales:

```typescript
const ocupacionPorFecha = useMemo(() => {
  const mapa: Record<string, OcupacionDia> = {};
  
  // Entregas de la base de datos
  for (const entrega of entregasProgramadasDB) {
    if (!entrega.fecha_programada) continue;
    const key = entrega.fecha_programada;
    if (!mapa[key]) {
      mapa[key] = { count: 0, entregas: [], entregasLocales: 0 };
    }
    mapa[key].count++;
    mapa[key].entregas.push(entrega);
  }
  
  // NUEVO: Agregar entregas locales (la OC que se está creando)
  for (const entrega of entregasLocales) {
    if (!entrega.fecha_programada) continue;
    const key = entrega.fecha_programada;
    if (!mapa[key]) {
      mapa[key] = { count: 0, entregas: [], entregasLocales: 0 };
    }
    mapa[key].count++;
    mapa[key].entregasLocales++;
  }
  
  return mapa;
}, [entregasProgramadasDB, entregasLocales]);
```

Actualizar el badge para diferenciar visualmente:

```typescript
{/* Badge con indicador de entregas locales */}
{ocupacion && ocupacion.count > 0 && (
  <span
    className={cn(
      "absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center",
      // Si incluye entregas locales, usar borde punteado o color diferente
      ocupacion.entregasLocales > 0 
        ? "bg-blue-500 ring-2 ring-blue-200" // Tu OC actual
        : getOccupancyColor(ocupacion.count)
    )}
  >
    {ocupacion.count}
  </span>
)}
```

### 2. Modificar `CrearOrdenCompraWizard.tsx`

Pasar las entregas locales al calendario:

```typescript
<CalendarioOcupacion
  selectedDate={...}
  onDateSelect={(date) => {...}}
  // NUEVO: Pasar entregas que se están programando
  entregasLocales={entregasProgramadas}
  proveedorNombre={proveedorSeleccionado?.nombre}
/>
```

---

## Diferenciación Visual

| Tipo | Color del Badge | Significado |
|------|-----------------|-------------|
| Solo BD (1-2) | Verde | Ocupación baja |
| Solo BD (3-4) | Ámbar | Ocupación media |
| Solo BD (5+) | Rojo | Ocupación alta |
| Incluye tu OC | Azul con ring | Tu programación actual |

El tooltip también mostrará:
- "Esta OC: 2 entregas"
- "+ 3 entregas de otras OCs"

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/CalendarioOcupacion.tsx` | Agregar prop `entregasLocales`, combinar en ocupación, estilo diferenciado |
| `src/components/compras/CrearOrdenCompraWizard.tsx` | Pasar `entregasProgramadas` como prop al calendario |

---

## Resultado Esperado

1. Creas OC con 3 tráilers
2. Seleccionas Tráiler 1 → click en 04 Feb → **aparece puntito azul en 04**
3. Seleccionas Tráiler 2 → click en 06 Feb → **aparece puntito azul en 06**
4. El calendario muestra en tiempo real las fechas que vas eligiendo
5. Si ya había entregas de otras OCs ese día, el número suma (ej: "3" = 2 existentes + 1 tuya)

