
# Plan: Mejoras de Sincronización OC-Calendario

## Resumen Ejecutivo

Este plan implementa tres mejoras críticas para el flujo de Órdenes de Compra:

1. **Badge de Faltantes Pendientes**: Indicador visual en la tabla de OC para identificar rápidamente órdenes con entregas de faltantes sin recibir
2. **Cron Automático de Reprogramación**: Configurar ejecución diaria de `auto-reschedule-deliveries` 
3. **Validación de Entregas antes de Pago Completo**: Advertencia/bloqueo al intentar marcar pago completo con entregas pendientes

---

## Cambios Técnicos

### 1. Badge de Faltantes Pendientes en Tabla OC

**Archivo:** `src/components/compras/OrdenesCompraTab.tsx`

**Objetivo:** Mostrar badge naranja "⏳ Faltante pendiente" junto al estado de la OC cuando existen entregas con `origen_faltante = true` y `status IN ('programada', 'pendiente')`.

**Cambio 1.1: Query adicional para contar faltantes pendientes por OC**

Agregar después de línea ~490 (donde están los otros queries):

```tsx
// Fetch count of pending faltantes per OC
const { data: faltantesPorOC = {} } = useQuery({
  queryKey: ["faltantes-pendientes-por-oc"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("ordenes_compra_entregas")
      .select("orden_compra_id")
      .eq("origen_faltante", true)
      .in("status", ["programada", "pendiente"]);
    
    if (error) throw error;
    
    // Agrupar por orden_compra_id y contar
    const conteo: Record<string, number> = {};
    (data || []).forEach((item: any) => {
      conteo[item.orden_compra_id] = (conteo[item.orden_compra_id] || 0) + 1;
    });
    return conteo;
  },
  refetchInterval: 60000, // Actualizar cada minuto
});
```

**Cambio 1.2: Modificar renderizado de columna Estado**

En línea ~1790, modificar la celda de estado:

```tsx
<TableCell>
  <div className="flex items-center gap-1 flex-wrap">
    {getStatusBadge(orden.status)}
    {/* Badge de faltantes pendientes */}
    {faltantesPorOC[orden.id] > 0 && (
      <Badge 
        variant="outline" 
        className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800 text-xs"
        title={`${faltantesPorOC[orden.id]} entrega(s) de faltantes pendientes`}
      >
        <PackageX className="h-3 w-3 mr-1" />
        Faltante
      </Badge>
    )}
  </div>
</TableCell>
```

**Cambio 1.3: Agregar import de PackageX**

En línea ~45, agregar `PackageX` a los imports de lucide-react.

---

### 2. Configurar Cron de Reprogramación Automática

**Objetivo:** Ejecutar `auto-reschedule-deliveries` automáticamente cada día a las 6:00 AM (hora de México) para reprogramar entregas vencidas al siguiente día hábil.

**Acción SQL a ejecutar (via Cloud View > Run SQL):**

```sql
-- Habilitar extensiones necesarias (si no están activas)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Programar ejecución diaria a las 6:00 AM (12:00 UTC para CST)
SELECT cron.schedule(
  'auto-reschedule-deliveries-daily',
  '0 12 * * *',  -- 12:00 UTC = 6:00 AM CST
  $$
  SELECT net.http_post(
    url := 'https://vrcyjmfpteoccqdmdmqn.supabase.co/functions/v1/auto-reschedule-deliveries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZyY3lqbWZwdGVvY2NxZG1kbXFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwOTg1NjMsImV4cCI6MjA3OTY3NDU2M30.x-p-zAWlkBIhjrmYosIIhLURA0UKJ1f9DI14tGQ9D08'
    ),
    body := jsonb_build_object('triggered_by', 'cron')
  ) AS request_id;
  $$
);
```

**Verificación del cron:**

```sql
-- Ver cron jobs programados
SELECT * FROM cron.job;

-- Ver historial de ejecuciones
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

### 3. Validación de Entregas Pendientes antes de Pago Completo

**Archivo:** `src/components/compras/ProcesarPagoOCDialog.tsx`

**Objetivo:** Mostrar alerta cuando el usuario intenta marcar pago completo pero existen entregas pendientes (especialmente faltantes) sin recibir.

**Cambio 3.1: Query para verificar entregas pendientes**

Agregar después de línea ~185:

```tsx
// Query para verificar entregas pendientes de esta OC
const { data: entregasPendientes = [] } = useQuery({
  queryKey: ["entregas-pendientes-pago", orden?.id],
  queryFn: async () => {
    if (!orden?.id) return [];
    
    const { data, error } = await supabase
      .from("ordenes_compra_entregas")
      .select("id, numero_entrega, fecha_programada, origen_faltante, status, productos_faltantes")
      .eq("orden_compra_id", orden.id)
      .in("status", ["programada", "pendiente", "en_descarga"]);
    
    if (error) throw error;
    return data || [];
  },
  enabled: !!orden?.id && open,
});

const tieneEntregasPendientes = entregasPendientes.length > 0;
const tieneFaltantesPendientes = entregasPendientes.some(e => e.origen_faltante);
```

**Cambio 3.2: Alerta visual antes de confirmar pago**

Agregar después de línea ~590 (antes del botón de confirmar):

```tsx
{/* Alerta si hay entregas pendientes */}
{tieneEntregasPendientes && isPagoCompleto && (
  <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950/30">
    <AlertTriangle className="h-4 w-4 text-orange-600" />
    <AlertTitle className="text-orange-800 dark:text-orange-300">
      Entregas pendientes de recepción
    </AlertTitle>
    <AlertDescription className="text-orange-700 dark:text-orange-400">
      <p className="mb-2">
        Esta OC tiene {entregasPendientes.length} entrega(s) sin recibir
        {tieneFaltantesPendientes && " (incluye faltantes programados)"}.
      </p>
      <ul className="list-disc ml-5 text-sm space-y-1">
        {entregasPendientes.slice(0, 3).map((e: any) => (
          <li key={e.id}>
            Entrega #{e.numero_entrega} - {format(new Date(e.fecha_programada), "dd/MM/yyyy")}
            {e.origen_faltante && <Badge variant="outline" className="ml-2 text-xs">Faltante</Badge>}
          </li>
        ))}
        {entregasPendientes.length > 3 && (
          <li className="text-muted-foreground">
            y {entregasPendientes.length - 3} más...
          </li>
        )}
      </ul>
      <p className="mt-2 text-sm font-medium">
        ¿Desea continuar con el pago de los productos ya recibidos?
      </p>
    </AlertDescription>
  </Alert>
)}
```

**Cambio 3.3: Modificar texto del botón según contexto**

En la sección del botón de confirmar pago (~línea 890):

```tsx
<Button
  onClick={() => confirmarPagoMutation.mutate()}
  disabled={
    confirmarPagoMutation.isPending || 
    uploading || 
    calcularTotalesSeleccionados.cantidadProductos === 0
  }
  className="flex-1"
>
  {confirmarPagoMutation.isPending || uploading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Procesando...
    </>
  ) : (
    <>
      <CheckCircle2 className="mr-2 h-4 w-4" />
      {tieneEntregasPendientes && isPagoCompleto
        ? "Confirmar Pago Parcial (mercancía recibida)"
        : isPagoCompleto 
          ? "Confirmar Pago Completo" 
          : `Pagar ${calcularTotalesSeleccionados.cantidadProductos} producto(s)`
      }
    </>
  )}
</Button>
```

---

## Flujo Visual Resultante

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    TABLA DE ÓRDENES DE COMPRA                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Folio          │ Proveedor  │ Estado                    │ ...          │
├────────────────┼────────────┼───────────────────────────┼──────────────┤
│ OC-202601-0003 │ Almar      │ [Recep. Parcial] [📦 Faltante] │ ...     │
│ OC-202601-0004 │ Sañudo     │ [Enviada]                  │ ...         │
│ OC-202601-0002 │ Envolpan   │ [Completada]               │ ...         │
└─────────────────────────────────────────────────────────────────────────┘

Cuando hay faltantes pendientes, se muestra badge naranja junto al estado.
```

```text
┌─────────────────────────────────────────────────────────────────────────┐
│              PROCESAR PAGO - OC-202601-0003                             │
├─────────────────────────────────────────────────────────────────────────┤
│  ⚠️ Entregas pendientes de recepción                                   │
│  Esta OC tiene 2 entrega(s) sin recibir (incluye faltantes).           │
│  • Entrega #2 - 30/01/2026 [Faltante]                                  │
│  • Entrega #3 - 02/02/2026                                             │
│                                                                         │
│  ¿Desea continuar con el pago de los productos ya recibidos?           │
├─────────────────────────────────────────────────────────────────────────┤
│           [Confirmar Pago Parcial (mercancía recibida)]                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/OrdenesCompraTab.tsx` | Query faltantes, badge en tabla, import PackageX |
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Query entregas pendientes, alerta visual, texto botón |
| (SQL via Cloud View) | Configurar pg_cron para ejecutar auto-reschedule diariamente |

---

## Sincronización de Estados

La lógica garantiza que:

1. **OC con entregas pendientes** (incluye faltantes) → Badge "Faltante" visible
2. **Cron diario (6 AM)** → Reprograma entregas vencidas al siguiente día hábil
3. **Al procesar pago** → Alerta si hay entregas sin recibir
4. **Calendario** → Muestra entregas de faltantes con badge "Faltante" (ya existente)

```text
        ┌──────────────┐
        │  Recepción   │
        │  Parcial     │
        └──────┬───────┘
               │
    ┌──────────▼──────────┐
    │  origen_faltante=   │
    │  true generado      │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐      ┌─────────────────┐
    │  Badge "Faltante"   │◄────►│   Calendario    │
    │  en tabla OC        │      │   (badge naranja)│
    └──────────┬──────────┘      └─────────────────┘
               │
    ┌──────────▼──────────┐
    │  Cron 6AM reprograma│
    │  si no llega        │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  Al pagar, alerta   │
    │  si hay pendientes  │
    └─────────────────────┘
```

---

## Beneficios

1. **Visibilidad inmediata**: El admin identifica de un vistazo qué OCs tienen faltantes pendientes
2. **Automatización**: No hay que reprogramar manualmente entregas que no llegaron
3. **Control de pagos**: Evita marcar como "pagado" una OC que aún tiene mercancía por recibir
4. **Consistencia**: Tabla OC y Calendario muestran la misma información
5. **Notificaciones**: El cron envía emails automáticos a proveedores sobre reprogramaciones
