
# Plan: Agregar Información de Entregas a la Card Móvil de OC

## Problema Identificado

El componente `OrdenCompraCardMobile.tsx` **no muestra las fechas de entrega** ni el estado de las entregas programadas. En desktop, la tabla usa `EntregasPopover` para mostrar esta información, pero en móvil esta columna **no existe**.

Para una OC como la de "Sanudo" con múltiples entregas, el usuario no puede ver:
- Cuántas entregas están programadas
- Las fechas de cada entrega
- El status de cada entrega (pendiente, recibida, etc.)

---

## Solución Propuesta

### Opción A: Agregar sección de entregas inline en la card (Recomendada)

Agregar una sección compacta dentro de `OrdenCompraCardMobile` que muestre:
- Resumen de entregas (ej: "2/3 programadas", "1/2 recibidas")
- Lista de fechas de entrega con status visual
- Badge indicador para cada entrega

### Cambios en `OrdenCompraCardMobile.tsx`

**1. Actualizar interface para recibir datos de entregas:**

```tsx
interface OrdenCompraCardMobileProps {
  orden: OrdenCompra;
  faltantesPendientes: number;
  entregas?: Array<{
    id: string;
    numero_entrega: number;
    cantidad_bultos: number;
    fecha_programada: string | null;
    status: string;
    recepcion_finalizada_en: string | null;
  }>;
  entregasStatus?: {
    total: number;
    programadas: number;
    recibidas: number;
  };
  onOpenAcciones: (orden: OrdenCompra) => void;
  onOpenFacturas: (orden: OrdenCompra) => void;
  onReenviar: (orden: OrdenCompra) => void;
  onEliminar: (orden: OrdenCompra) => void;
  onNavigatePago?: (ordenId: string) => void;
}
```

**2. Agregar sección de entregas entre "Estado de pago" y "Acciones":**

```tsx
{/* Sección de Entregas */}
{entregas && entregas.length > 0 && (
  <div className="pt-2 border-t space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs flex items-center gap-1">
        <Truck className="h-3 w-3" />
        Entregas:
      </span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
        {entregasStatus?.recibidas || 0}/{entregasStatus?.total || entregas.length}
      </Badge>
    </div>
    
    {/* Lista compacta de entregas */}
    <div className="space-y-1 max-h-32 overflow-y-auto">
      {entregas.map((entrega) => (
        <div 
          key={entrega.id}
          className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/50"
        >
          <div className="flex items-center gap-2">
            {/* Icono de status */}
            {entrega.status === "recibida" || entrega.recepcion_finalizada_en ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : entrega.fecha_programada ? (
              <CalendarCheck className="h-3 w-3 text-amber-500" />
            ) : (
              <CalendarX className="h-3 w-3 text-muted-foreground" />
            )}
            <span>#{entrega.numero_entrega}</span>
            <span className="text-muted-foreground">
              {entrega.cantidad_bultos} bultos
            </span>
          </div>
          <div className="flex items-center gap-1">
            {entrega.fecha_programada ? (
              <span className={cn(
                "font-medium",
                entrega.status === "recibida" && "text-green-600",
                entrega.status !== "recibida" && "text-amber-600"
              )}>
                {format(parseDateLocal(entrega.fecha_programada), "dd/MM")}
              </span>
            ) : (
              <span className="text-muted-foreground italic">Sin fecha</span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}
```

### Cambios en `OrdenesCompraTab.tsx`

**3. Pasar los datos de entregas a la card móvil (línea ~1682):**

```tsx
<OrdenCompraCardMobile
  key={orden.id}
  orden={orden}
  faltantesPendientes={(faltantesPorOC as Record<string, number>)[orden.id] || 0}
  entregas={todasEntregas.filter(e => e.orden_compra_id === orden.id)}
  entregasStatus={entregasStatusPorOrden[orden.id]}
  onOpenAcciones={(o) => {
    setOrdenSeleccionada(o);
    setAccionesDialogOpen(true);
  }}
  // ... rest of props
/>
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/OrdenCompraCardMobile.tsx` | Agregar props `entregas` y `entregasStatus`, nueva sección visual de entregas con fechas y status |
| `src/components/compras/OrdenesCompraTab.tsx` | Pasar `entregas` y `entregasStatus` a cada card móvil |

---

## Resultado Visual Esperado

```
┌─────────────────────────────────┐
│ OC-2025-0047          Enviada   │
│ Cárnico Sañudo                  │
│──────────────────────────────────│
│ Fecha: 03/02/2025  Total: $45K  │
│ Recepción: ████████░░ 80%       │
│──────────────────────────────────│
│ Pago: 🚚 Contra Entrega         │
│──────────────────────────────────│
│ 🚚 Entregas:              2/3   │
│ ┌─────────────────────────────┐ │
│ │ ✓ #1  10 bultos     03/02   │ │
│ │ ⏳ #2  8 bultos      05/02   │ │
│ │ ○ #3  12 bultos   Sin fecha │ │
│ └─────────────────────────────┘ │
│──────────────────────────────────│
│ [  Acciones  ] 📄 ✉️ 🗑️        │
└─────────────────────────────────┘
```

---

## Beneficios

- **Visibilidad completa**: Usuario puede ver todas las fechas de entrega en móvil
- **Status visual**: Iconos claros para entregas recibidas, programadas o sin fecha
- **Consistencia**: Misma información que en desktop, adaptada a móvil
- **No requiere popover**: Información visible directamente en la card
