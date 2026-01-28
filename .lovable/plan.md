
# Plan: Separación de Costos en el Flujo de Compras

## Resumen Ejecutivo

Rediseño del manejo de costos para separar claramente tres etapas: **Costo OC (Esperado)**, **Costo Recepción (Provisional)** y **Costo Final (Conciliado)**. El costo del producto solo se actualizará al momento de la conciliación, no durante la recepción.

---

## Diagrama del Flujo Propuesto

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO DE COSTOS                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. OC CREADA                2. RECEPCIÓN                 3. CONCILIACIÓN    │
│  ─────────────              ─────────────                 ───────────────    │
│  precio_unitario_compra      precio_compra (lote)         Costo Final        │
│  (solo referencia)           = Costo OC                   = Factura/Manual   │
│                              Status: "por_conciliar"                         │
│                                                                              │
│  NO actualiza:               NO actualiza:                SÍ actualiza:      │
│  - productos                 - ultimo_costo_compra        - ultimo_costo     │
│  - inventario                - costo_promedio             - costo_promedio   │
│                                                           - inventario_lotes │
│                                                                              │
│  ┌─────────┐               ┌─────────────────┐           ┌────────────────┐  │
│  │         │               │                 │           │                │  │
│  │   OC    │──────────────▶│   Recepción     │──────────▶│  Conciliación  │  │
│  │         │               │                 │           │                │  │
│  └─────────┘               └─────────────────┘           └────────────────┘  │
│                                    │                             │           │
│                                    ▼                             ▼           │
│                            Status: "por_conciliar"       Status: "conciliada"│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Cambios en Base de Datos

### 1. Nueva columna en `ordenes_compra_entregas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status_conciliacion` | TEXT | Estados: 'pendiente', 'por_conciliar', 'conciliada' |
| `conciliado_por` | UUID | Usuario que concilió |
| `conciliado_en` | TIMESTAMP | Fecha/hora de conciliación |

### 2. Nueva columna en `inventario_lotes`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `precio_compra_provisional` | NUMERIC | Costo de la OC (provisional) |
| `precio_compra` | NUMERIC | Costo final conciliado (se actualiza en conciliación) |
| `conciliado` | BOOLEAN | Indica si el costo ya fue conciliado |

### 3. Nueva columna en `ordenes_compra`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status_conciliacion` | TEXT | 'pendiente', 'parcial', 'conciliada' |

---

## Cambios en Estados

### Estados de OC (Sin cambios)
- `creada` → `enviada` → `confirmada` → `parcial`/`completa`

### Estados de Recepción/Entrega (Nuevo campo)
El campo `status` existente permanece igual. Se agrega `status_conciliacion`:
- `pendiente` → No ha llegado mercancía
- `por_conciliar` → Mercancía recibida, costo provisional aplicado
- `conciliada` → Costo final confirmado (factura registrada)

### Estados de Pago (Sin cambios)
- `pendiente` → `parcial` → `pagado`

---

## Cambios en Código

### Archivo: `AlmacenRecepcionSheet.tsx`
**Líneas afectadas: 898-904**

**Antes:**
```typescript
// Solo actualizar último costo de compra
await supabase
  .from("productos")
  .update({ ultimo_costo_compra: precioCompra })
  .eq("id", producto.producto_id);
```

**Después:**
```typescript
// NO actualizar ultimo_costo_compra aquí
// El costo se actualiza solo en la conciliación
// Marcar entrega como "por_conciliar"
```

Además, al crear el lote de inventario:
```typescript
// Guardar el costo OC como provisional
await supabase.from("inventario_lotes").insert({
  ...datosLote,
  precio_compra: precioCompra,           // Provisional
  precio_compra_provisional: precioCompra,
  conciliado: false
});

// Marcar entrega como pendiente de conciliación
await supabase
  .from("ordenes_compra_entregas")
  .update({ status_conciliacion: 'por_conciliar' })
  .eq("id", entrega.id);
```

### Archivo: `ConciliarFacturaDialog.tsx` (Existente)
**Mejoras:**
- Al conciliar, actualizar `ultimo_costo_compra` del producto
- Marcar lotes como `conciliado = true`
- Cambiar `status_conciliacion` de entregas a 'conciliada'

### Archivo: `ProcesarPagoOCDialog.tsx`
**Mejoras:**
- Mostrar advertencia si hay entregas "por_conciliar"
- Permitir conciliar desde el flujo de pago si no hay factura

### Nuevo: Componente de Conciliación Rápida
Para OCs sin factura formal, permitir confirmar el costo de la OC como final:
- Botón "Confirmar Costos" en detalle de OC
- Actualiza todos los lotes como conciliados
- Actualiza `ultimo_costo_compra` de productos

---

## UI: Indicadores Visuales

### En Tabla de OCs
- Badge "Por Conciliar" (naranja) si hay entregas pendientes
- Badge "Conciliada" (verde) cuando todo está verificado

### En Detalle de Recepción
- Columna "Costo OC" (gris, referencia)
- Columna "Costo Final" (editable en conciliación)
- Estado de conciliación visible

### En Lista de Precios (/precios)
- El `ultimo_costo_compra` solo cambiará cuando se concilie

---

## Flujo Actualizado Paso a Paso

### Paso 1: Crear OC
1. Usuario crea OC con productos y precios
2. Se guarda `precio_unitario_compra` en `ordenes_compra_detalles`
3. **NO se modifica ningún costo de producto**

### Paso 2: Recepción de Mercancía
1. Almacén recibe productos
2. Se crea lote en `inventario_lotes` con:
   - `precio_compra` = Costo de la OC (provisional)
   - `precio_compra_provisional` = Costo de la OC
   - `conciliado` = false
3. Se actualiza stock del producto (trigger existente)
4. Se calcula WAC provisional (trigger existente)
5. **NO se actualiza `ultimo_costo_compra`**
6. Entrega marcada con `status_conciliacion` = 'por_conciliar'

### Paso 3: Conciliación (Factura o Manual)
1. Usuario abre diálogo de conciliación
2. Captura costo real por producto (puede ser diferente al OC)
3. Al confirmar:
   - Actualiza `precio_compra` en lotes de inventario
   - Recalcula WAC del producto
   - **SÍ actualiza `ultimo_costo_compra`**
   - Marca lotes como `conciliado = true`
   - Cambia `status_conciliacion` a 'conciliada'
4. Registra en historial de costos

### Paso 4: Pago
1. Usuario procesa pago
2. **NO modifica costos** (ya conciliados)
3. Solo cierra cuenta por pagar

---

## Migración de Datos Existentes

Para datos históricos donde el costo ya se actualizó en recepción:
```sql
-- Marcar lotes existentes como conciliados
UPDATE inventario_lotes
SET conciliado = true,
    precio_compra_provisional = precio_compra
WHERE precio_compra > 0;

-- Marcar entregas recibidas como conciliadas
UPDATE ordenes_compra_entregas
SET status_conciliacion = 'conciliada'
WHERE status = 'recibida';
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `AlmacenRecepcionSheet.tsx` | Remover actualización de `ultimo_costo_compra`, agregar estado por_conciliar |
| `ConciliarFacturaDialog.tsx` | Agregar actualización de `ultimo_costo_compra` y marcar conciliado |
| `ProcesarPagoOCDialog.tsx` | Advertencia de conciliación pendiente |
| `OrdenesCompraTab.tsx` | Badge de estado de conciliación |
| `RecepcionDetalleDialog.tsx` | Mostrar estado de conciliación por producto |
| Nueva migración SQL | Agregar columnas y migrar datos |

---

## Beneficios

1. **Precisión de costos**: El catálogo de productos solo refleja costos confirmados
2. **Trazabilidad**: Clara separación entre costo esperado vs real
3. **Control financiero**: Permite detectar variaciones OC vs Factura
4. **Auditoría**: Historial completo de cambios de costos con fuente

---

## Resumen de Estados Finales

```text
OC Estados:        creada → enviada → confirmada → parcial/completa
Entrega Status:    programada → en_camino → recibida
Conciliación:      pendiente → por_conciliar → conciliada
Pago:              pendiente → parcial → pagado
```
