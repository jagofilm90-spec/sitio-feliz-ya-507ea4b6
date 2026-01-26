

# Plan: Soporte para Pagos Parciales por Factura del Proveedor

## El Escenario

```text
OC-XXXX de ENVOLPAN
├── Producto 1: Papel Bala Rojo     → Entrega #1 (recibida)
│                                    → Factura A (monto: $X) ← PAGAR HOY
│
├── Producto 2: Blanco Revolucionario → Entrega #2 (recibida) 
│                                      → Factura B (monto: $Y) ← PAGAR MAÑANA
│
└── Status OC: "completada" (todo recibido)
    Status Pago: ??? (parcialmente pagado)
```

## Lo que ya existe

El sistema ya tiene la infraestructura necesaria:
- Tabla `proveedor_facturas` para múltiples facturas por OC
- Tabla `proveedor_factura_entregas` para enlazar facturas con entregas específicas
- Flujo para marcar cada factura como pagada individualmente en `ProveedorFacturasDialog`

## Lo que falta

1. **Estado de pago parcial en la OC**: Actualmente solo hay "pendiente" o "pagado", falta "parcial"
2. **Sincronización automática**: Cuando se paga una factura, actualizar el estado de la OC
3. **Visibilidad clara**: Mostrar cuánto se ha pagado vs cuánto falta
4. **Enlace desde el flujo de pago**: Conectar `ProcesarPagoOCDialog` con las facturas del proveedor

---

## Cambios Propuestos

### 1. Nuevo estado de pago: "parcial"

Actualizar el campo `status_pago` en `ordenes_compra` para soportar:
- `pendiente`: No se ha pagado nada
- `parcial`: Se han pagado algunas facturas pero no todas
- `pagado`: Todas las facturas están pagadas

### 2. Sincronización automática del estado de pago

Cuando se registra un pago en una factura (`proveedor_facturas.status_pago = 'pagado'`), el sistema debe:

```text
┌─────────────────────────────────────────────────────────────┐
│ Al pagar una factura del proveedor:                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Sumar total de facturas pagadas de la OC                │
│ 2. Sumar total de todas las facturas de la OC              │
│ 3. Actualizar OC:                                          │
│    - Si pagado == total → status_pago = "pagado"           │
│    - Si pagado > 0 pero < total → status_pago = "parcial"  │
│    - Si pagado == 0 → status_pago = "pendiente"            │
│ 4. Actualizar monto_pagado en la OC                        │
└─────────────────────────────────────────────────────────────┘
```

### 3. Modificar flujo en `ProveedorFacturasDialog`

Al marcar una factura como pagada (líneas 278-323), agregar:

```typescript
// Después de registrar el pago de la factura...
const { error } = await supabase
  .from("proveedor_facturas")
  .update({ status_pago: "pagado", ... })
  .eq("id", facturaId);

// NUEVO: Actualizar estado de pago de la OC
await actualizarEstadoPagoOC(ordenCompra.id);

async function actualizarEstadoPagoOC(ocId: string) {
  // Obtener todas las facturas de la OC
  const { data: facturas } = await supabase
    .from("proveedor_facturas")
    .select("monto_total, status_pago")
    .eq("orden_compra_id", ocId);
  
  const totalFacturado = facturas.reduce((s, f) => s + f.monto_total, 0);
  const totalPagado = facturas
    .filter(f => f.status_pago === "pagado")
    .reduce((s, f) => s + f.monto_total, 0);
  
  let nuevoStatus = "pendiente";
  if (totalPagado >= totalFacturado && totalFacturado > 0) {
    nuevoStatus = "pagado";
  } else if (totalPagado > 0) {
    nuevoStatus = "parcial";
  }
  
  await supabase
    .from("ordenes_compra")
    .update({ 
      status_pago: nuevoStatus,
      monto_pagado: totalPagado 
    })
    .eq("id", ocId);
}
```

### 4. Modificar `ProcesarPagoOCDialog` para redirigir a facturas

Cuando hay facturas pendientes, mostrar mensaje:

```text
┌────────────────────────────────────────────────────────────┐
│  PROCESAR PAGO - OC-202601-0003                            │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ Esta OC tiene facturas del proveedor registradas       │
│                                                             │
│  Para manejar pagos parciales, registra el pago            │
│  directamente en cada factura.                             │
│                                                             │
│  Facturas:                                                  │
│  ├── FAC-001: $15,000 (Papel Bala Rojo) - Pendiente        │
│  └── FAC-002: $12,000 (Blanco Revolucionario) - Pendiente  │
│                                                             │
│           [Ir a Gestionar Facturas]                        │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 5. Visual en lista de OCs

Actualizar el badge de estado de pago para mostrar:

```text
┌──────────────────────────────────────────────────────────────────┐
│ OC-202601-0003 | ENVOLPAN | $27,000                              │
│                                                                   │
│ [Completada]  [🟡 Pago Parcial: $15,000 / $27,000]              │
│               └── Click para ver detalle de facturas            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Flujo del Usuario (Tu Escenario)

```text
DÍA 1: Recepción Papel Bala Rojo
────────────────────────────────
1. Almacén recibe entrega #1 (Papel Bala Rojo)
2. Proveedor envía factura FAC-001 por $15,000
3. Secretaria registra factura en OC → Vincula a entrega #1

DÍA 2: Recepción Blanco Revolucionario  
────────────────────────────────────────
1. Almacén recibe entrega #2 (Blanco Revolucionario)
2. OC se marca como "completada"
3. (Proveedor aún no envía factura #2)

HOY: Pagar Factura #1
────────────────────
1. Compras abre OC-XXXX
2. Click en "Facturas" → Ve FAC-001 pendiente
3. Click "Registrar Pago" en FAC-001
4. Sube comprobante, ingresa referencia
5. Confirma pago

→ Sistema actualiza:
   - FAC-001: status_pago = "pagado"
   - OC: status_pago = "parcial", monto_pagado = $15,000

MAÑANA: Pagar Factura #2
────────────────────────
1. Proveedor envía FAC-002 por $12,000
2. Secretaria registra factura → Vincula a entrega #2
3. Click "Registrar Pago" en FAC-002
4. Confirma pago

→ Sistema actualiza:
   - FAC-002: status_pago = "pagado"
   - OC: status_pago = "pagado", monto_pagado = $27,000
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/ProveedorFacturasDialog.tsx` | Agregar sincronización automática del estado de pago de la OC |
| `src/components/compras/ProcesarPagoOCDialog.tsx` | Detectar si hay facturas y redirigir al flujo de facturas |
| `src/components/compras/OrdenesCompraTab.tsx` | Actualizar badge para mostrar "Pago Parcial" con progreso |

---

## Migración de Base de Datos

Agregar "parcial" como valor válido para `status_pago` en `ordenes_compra`:

```sql
-- Actualizar constraint para permitir 'parcial'
ALTER TABLE ordenes_compra 
DROP CONSTRAINT IF EXISTS ordenes_compra_status_pago_check;

ALTER TABLE ordenes_compra 
ADD CONSTRAINT ordenes_compra_status_pago_check 
CHECK (status_pago IN ('pendiente', 'parcial', 'pagado'));
```

---

## Beneficios

1. **Flexibilidad**: Cada factura se paga independientemente
2. **Trazabilidad**: Registro claro de qué se pagó y cuándo
3. **Visibilidad**: Badge muestra progreso de pago ($15,000 / $27,000)
4. **Conciliación**: El total pagado cuadra con la suma de facturas pagadas
5. **Sin cambios drásticos**: Aprovecha la infraestructura existente de `proveedor_facturas`

