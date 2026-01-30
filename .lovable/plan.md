
# Plan: Calendario Visual con Ocupación para Programar Entregas en OC

## Problema

Al crear una OC con múltiples entregas (ej: 3 tráilers de sal cisne a Sañudo), el usuario no puede ver qué días ya tienen entregas programadas. El calendario de la pestaña "Calendario" existe pero no está disponible dentro del wizard de creación.

## Solución Propuesta

Integrar un mini-calendario visual dentro del Paso 3 del Wizard que muestre:
- Días con entregas ya programadas (indicador de ocupación)
- Click en un día para asignar cada entrega
- Entregas sin fecha = "pendiente" (funcionalidad actual preservada)

---

## Flujo de Usuario Mejorado

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Paso 3: ¿Cuándo te llega?                                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📦 3 tráilers × 1,200 bultos = 3,600 bultos totales               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ENERO 2026                              ◄  ►                 │   │
│  │  ─────────────────────────────────────────────────────────   │   │
│  │  L   M   M   J   V   S   D                                   │   │
│  │                  1   2   3   4                               │   │
│  │  5   6   7   8   9   10  11                                  │   │
│  │  12  13  14  15● 16● 17  18                                  │   │
│  │  19  20● 21  22  23● 24  25                                  │   │
│  │  26  27  28  29  30  31                                      │   │
│  │                                                               │   │
│  │  ● = Día con entregas programadas                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Haz click en un día para asignar cada entrega:                    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Tráiler 1/3  │ 1,200 bultos │ 📅 15 Ene 2026  [✓]           │   │
│  │ Tráiler 2/3  │ 1,200 bultos │ 📅 20 Ene 2026  [✓]           │   │
│  │ Tráiler 3/3  │ 1,200 bultos │ 📅 Sin fecha     [Pendiente]   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ⚠️ La entrega 3/3 quedará pendiente de programar                 │
│                                                                     │
│                                    [← Atrás]  [Revisar →]          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Crear componente `CalendarioOcupacion.tsx`

Componente reutilizable que muestra un calendario mensual con indicadores de ocupación:

```typescript
// src/components/compras/CalendarioOcupacion.tsx

interface CalendarioOcupacionProps {
  // Día actualmente seleccionado (para asignar)
  selectedDate?: Date;
  // Callback cuando el usuario selecciona un día
  onDateSelect: (date: Date) => void;
  // Fechas ya ocupadas (para mostrar indicadores)
  fechasOcupadas: { fecha: string; count: number; entregas: any[] }[];
  // Mes inicial a mostrar
  initialMonth?: Date;
}

// El componente:
// 1. Muestra calendario mensual con navegación
// 2. Días con entregas muestran badge con cantidad (ej: "3" si hay 3 tráilers ese día)
// 3. Hover en día ocupado muestra tooltip con detalle de entregas
// 4. Click en día dispara onDateSelect
```

### 2. Crear hook `useEntregasProgramadasCalendario`

Hook que carga las entregas existentes para mostrar ocupación:

```typescript
// Consulta existente de CalendarioEntregasTab adaptada
const { data: entregasProgramadas = [] } = useQuery({
  queryKey: ["entregas-ocupacion-calendario"],
  queryFn: async () => {
    const { data } = await supabase
      .from("ordenes_compra_entregas")
      .select(`
        id, fecha_programada, cantidad_bultos, numero_entrega,
        ordenes_compra!inner (folio, proveedor_id, proveedores(nombre))
      `)
      .in("status", ["programada", "pendiente", "en_descarga"])
      .gte("fecha_programada", format(startOfMonth(new Date()), "yyyy-MM-dd"));
    
    return data;
  }
});

// Agrupa por fecha para mostrar ocupación
const ocupacionPorFecha = useMemo(() => {
  const mapa: Record<string, { count: number, entregas: any[] }> = {};
  entregasProgramadas.forEach(e => {
    const key = e.fecha_programada;
    if (!mapa[key]) mapa[key] = { count: 0, entregas: [] };
    mapa[key].count++;
    mapa[key].entregas.push(e);
  });
  return mapa;
}, [entregasProgramadas]);
```

### 3. Modificar `CrearOrdenCompraWizard.tsx` - Paso 3

Reemplazar los inputs `type="date"` por el calendario visual:

**Estado adicional:**
```typescript
const [entregaEnEdicion, setEntregaEnEdicion] = useState<number | null>(null);
const [mesCalendario, setMesCalendario] = useState(new Date());
```

**Nuevo UI para múltiples entregas:**
```tsx
{tipoEntrega === 'multiple' && entregasProgramadas.length > 0 && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    {/* Columna izquierda: Calendario con ocupación */}
    <div className="border rounded-lg p-4">
      <CalendarioOcupacion
        selectedDate={entregaEnEdicion !== null 
          ? entregasProgramadas[entregaEnEdicion]?.fecha_programada 
          : undefined}
        onDateSelect={(date) => {
          if (entregaEnEdicion !== null) {
            updateFechaEntrega(entregaEnEdicion, format(date, "yyyy-MM-dd"));
            // Avanzar a siguiente entrega sin fecha
            const siguienteSinFecha = entregasProgramadas.findIndex(
              (e, i) => i > entregaEnEdicion && !e.fecha_programada
            );
            setEntregaEnEdicion(siguienteSinFecha >= 0 ? siguienteSinFecha : null);
          }
        }}
        fechasOcupadas={ocupacionPorFecha}
        initialMonth={mesCalendario}
      />
    </div>
    
    {/* Columna derecha: Lista de entregas a programar */}
    <div className="space-y-2">
      <Label>Asigna fechas haciendo click en el calendario:</Label>
      {entregasProgramadas.map((entrega, index) => (
        <div 
          key={index}
          onClick={() => setEntregaEnEdicion(index)}
          className={cn(
            "flex items-center justify-between p-3 rounded-lg border cursor-pointer",
            entregaEnEdicion === index ? "border-primary bg-primary/10" : "border-border",
            entrega.fecha_programada ? "bg-green-50" : "bg-amber-50"
          )}
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline">#{entrega.numero_entrega}</Badge>
            <span>{entrega.cantidad_bultos.toLocaleString()} bultos</span>
          </div>
          {entrega.fecha_programada ? (
            <span className="font-medium text-green-700">
              {format(new Date(entrega.fecha_programada + "T12:00:00"), "dd MMM", { locale: es })}
            </span>
          ) : (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              Sin fecha
            </Badge>
          )}
        </div>
      ))}
      
      {/* Contador de pendientes */}
      {entregasProgramadas.filter(e => !e.fecha_programada).length > 0 && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertDescription className="text-amber-700 text-sm">
            {entregasProgramadas.filter(e => !e.fecha_programada).length} entrega(s) 
            quedarán pendientes de programar
          </AlertDescription>
        </Alert>
      )}
    </div>
  </div>
)}
```

### 4. Indicadores de Ocupación en el Calendario

Dentro del componente `CalendarioOcupacion`, cada día muestra:

```tsx
// Día normal
<div className="relative">
  <span>15</span>
</div>

// Día con entregas (ocupado)
<div className="relative">
  <span>15</span>
  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[10px] text-white flex items-center justify-center">
    3
  </div>
  {/* Tooltip en hover: "3 entregas: Sañudo (OC-001), Zuleta (OC-003)..." */}
</div>
```

**Código de colores para ocupación:**
- Sin entregas: Normal
- 1-2 entregas: Indicador verde (bajo)
- 3-4 entregas: Indicador amarillo (medio)
- 5+ entregas: Indicador rojo (alto - evitar)

---

## Archivos a Crear/Modificar

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/components/compras/CalendarioOcupacion.tsx` | **Crear** | Componente de calendario con indicadores de ocupación |
| `src/components/compras/CrearOrdenCompraWizard.tsx` | **Modificar** | Integrar calendario visual en Paso 3 |

---

## Comportamiento Esperado

1. **Usuario crea OC con 3 tráilers de Sañudo**
2. **En Paso 3**: Ve calendario con días ocupados marcados
3. **Click en Tráiler 1/3**: Se resalta, listo para asignar fecha
4. **Click en día 15 Ene**: Tráiler 1/3 asignado, automáticamente selecciona Tráiler 2/3
5. **Click en día 20 Ene**: Tráiler 2/3 asignado
6. **Usuario no asigna Tráiler 3/3**: Queda como "pendiente"
7. **Continúa a Paso 4**: Revisión muestra 2 programadas + 1 pendiente
8. **Crea OC**: Las entregas pendientes se manejan igual que ahora

---

## Compatibilidad

- **Una sola entrega**: Se mantiene el Popover con Calendar actual (sin cambios)
- **Múltiples entregas**: Se muestra el nuevo calendario con ocupación
- **Entrega única programada al vuelo**: El calendario visual aparece solo si hay > 1 entrega

---

## Consideraciones

### Performance
- Se carga la ocupación solo de los próximos 3 meses (no histórico)
- Cache con React Query para evitar re-fetches constantes

### Mobile
- En pantallas pequeñas, el calendario se muestra arriba y la lista abajo (stack vertical)

### Validación
- Permitir días con alta ocupación pero mostrar warning: "Este día ya tiene 5 entregas"
