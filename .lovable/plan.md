
# Plan: Créditos Pendientes en Wizard de Creación de OC

## Resumen

Cuando se selecciona un proveedor (del catálogo o manual) que tiene créditos pendientes, mostrar una sección colapsable que permita:

1. **Opción 1 - Descuento en $**: Aplicar el crédito como descuento monetario en la nueva OC
2. **Opción 2 - Marcar como Reposición Pendiente**: El proveedor mandará los bultos físicos extra en alguna entrega de esta OC

El sistema registrará en `creditos_aplicados` y `creditos_aplicados_detalle` de la nueva OC los créditos usados.

---

## Flujo de Usuario

### En el Wizard (Step 1 - Proveedor)

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ¿A quién le compras?                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Proveedor: [JOSAN de México ▼]                                      │
│                                                                     │
│ ¿Cómo pagarás?   ○ Contra Entrega   ● Pago Anticipado              │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ⚠️ Este proveedor tiene créditos pendientes                     │ │
│ │                                                                 │ │
│ │ De OC-202601-0005:                                              │ │
│ │   • 2 bultos de Azúcar Estándar - $800 (faltante)               │ │
│ │     [  ] Aplicar como descuento ($800)                          │ │
│ │     [  ] Esperar reposición física (2 bultos)                   │ │
│ │                                                                 │ │
│ │ De OC-202601-0003:                                              │ │
│ │   • 1 bulto de Sal Refinada - $350 (dañado)                     │ │
│ │     [  ] Aplicar como descuento ($350)                          │ │
│ │     [  ] Esperar reposición física (1 bulto)                    │ │
│ │                                                                 │ │
│ │ Total seleccionado: $1,150 descuento + 0 bultos reposición      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ▼ Opciones avanzadas                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Estado en el Wizard

Agregar al `CrearOrdenCompraWizard.tsx`:

```typescript
// Créditos pendientes del proveedor
interface CreditoSeleccion {
  id: string;
  tipo: 'descuento' | 'reposicion' | null;
  monto: number;
  cantidad: number;
  producto_nombre: string;
  oc_origen_folio: string;
}

const [creditosPendientes, setCreditosPendientes] = useState<CreditoPendiente[]>([]);
const [creditosSeleccionados, setCreditosSeleccionados] = useState<Map<string, CreditoSeleccion>>(new Map());
```

### 2. Query para Créditos

Cuando se selecciona un proveedor, cargar sus créditos:

```typescript
useEffect(() => {
  const loadCreditos = async () => {
    if (!proveedorId && tipoProveedor !== 'manual') {
      setCreditosPendientes([]);
      return;
    }
    
    const { data } = await supabase
      .from("proveedor_creditos_pendientes")
      .select(`
        id, producto_id, producto_nombre, cantidad, precio_unitario, monto_total,
        motivo, orden_compra_origen_id,
        ordenes_compra:orden_compra_origen_id (folio)
      `)
      .eq("proveedor_id", proveedorId)
      .eq("status", "pendiente");
    
    setCreditosPendientes(data || []);
  };
  loadCreditos();
}, [proveedorId]);
```

### 3. UI de Selección de Créditos

Sección colapsable que aparece si `creditosPendientes.length > 0`:

```tsx
{creditosPendientes.length > 0 && (
  <div className="p-4 rounded-lg border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
    <div className="flex items-center gap-2 mb-3">
      <DollarSign className="h-5 w-5 text-amber-600" />
      <span className="font-medium">Créditos pendientes de este proveedor</span>
      <Badge variant="outline" className="text-amber-700 border-amber-400">
        {formatCurrency(totalCreditosPendientes)}
      </Badge>
    </div>
    
    <div className="space-y-3">
      {creditosPendientes.map((credito) => (
        <div key={credito.id} className="p-3 bg-white dark:bg-card rounded border">
          <div className="flex justify-between items-start mb-2">
            <div>
              <Badge variant="outline" className="font-mono text-xs">
                {credito.ordenes_compra?.folio}
              </Badge>
              <p className="font-medium mt-1">{credito.producto_nombre}</p>
              <p className="text-sm text-muted-foreground">
                {credito.cantidad} bulto{credito.cantidad !== 1 ? 's' : ''} × ${credito.precio_unitario} = 
                <span className="text-amber-600 font-bold ml-1">{formatCurrency(credito.monto_total)}</span>
              </p>
            </div>
            <Badge className={motivoColors[credito.motivo]}>
              {motivoLabels[credito.motivo]}
            </Badge>
          </div>
          
          <div className="flex gap-3 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`credito-${credito.id}`}
                checked={creditosSeleccionados.get(credito.id)?.tipo === 'descuento'}
                onChange={() => seleccionarCredito(credito, 'descuento')}
              />
              <span className="text-sm">
                Aplicar descuento ({formatCurrency(credito.monto_total)})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`credito-${credito.id}`}
                checked={creditosSeleccionados.get(credito.id)?.tipo === 'reposicion'}
                onChange={() => seleccionarCredito(credito, 'reposicion')}
              />
              <span className="text-sm">
                Esperar reposición ({credito.cantidad} bultos)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
              <input
                type="radio"
                name={`credito-${credito.id}`}
                checked={!creditosSeleccionados.has(credito.id) || creditosSeleccionados.get(credito.id)?.tipo === null}
                onChange={() => deseleccionarCredito(credito.id)}
              />
              <span className="text-sm">No aplicar</span>
            </label>
          </div>
        </div>
      ))}
    </div>
    
    {/* Resumen de selección */}
    {(totalDescuentoSeleccionado > 0 || totalReposicionBultos > 0) && (
      <div className="mt-3 pt-3 border-t border-amber-200">
        <div className="flex justify-between text-sm">
          <span>Descuento a aplicar:</span>
          <span className="font-bold text-green-600">-{formatCurrency(totalDescuentoSeleccionado)}</span>
        </div>
        {totalReposicionBultos > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span>Bultos pendientes de reposición:</span>
            <span className="font-bold text-blue-600">+{totalReposicionBultos} bultos</span>
          </div>
        )}
      </div>
    )}
  </div>
)}
```

### 4. Modificar Creación de OC

En `createOrden.mutate()`, después de crear la OC:

```typescript
// Aplicar créditos seleccionados
if (creditosSeleccionados.size > 0) {
  const creditosDescuento: any[] = [];
  const creditosReposicion: any[] = [];
  let totalDescuento = 0;
  
  for (const [creditoId, seleccion] of creditosSeleccionados) {
    if (seleccion.tipo === 'descuento') {
      creditosDescuento.push({
        credito_id: creditoId,
        monto: seleccion.monto,
        producto: seleccion.producto_nombre,
        oc_origen_folio: seleccion.oc_origen_folio
      });
      totalDescuento += seleccion.monto;
      
      // Marcar crédito como aplicado
      await supabase
        .from("proveedor_creditos_pendientes")
        .update({
          status: "aplicado",
          tipo_resolucion: "descuento_oc",
          orden_compra_aplicada_id: orden.id,
          fecha_aplicacion: new Date().toISOString(),
          resolucion_notas: `Aplicado como descuento en ${orden.folio}`
        })
        .eq("id", creditoId);
        
    } else if (seleccion.tipo === 'reposicion') {
      creditosReposicion.push({
        credito_id: creditoId,
        cantidad: seleccion.cantidad,
        producto: seleccion.producto_nombre,
        oc_origen_folio: seleccion.oc_origen_folio
      });
      
      // Marcar crédito como pendiente de reposición
      await supabase
        .from("proveedor_creditos_pendientes")
        .update({
          status: "reposicion_esperada",
          tipo_resolucion: "reposicion_producto",
          orden_compra_aplicada_id: orden.id,
          resolucion_notas: `Reposición esperada en entregas de ${orden.folio}`
        })
        .eq("id", creditoId);
    }
  }
  
  // Actualizar OC con créditos aplicados
  if (totalDescuento > 0 || creditosReposicion.length > 0) {
    await supabase
      .from("ordenes_compra")
      .update({
        creditos_aplicados: totalDescuento,
        creditos_aplicados_detalle: {
          descuentos: creditosDescuento,
          reposiciones: creditosReposicion
        },
        // Ajustar total si hay descuentos
        total_ajustado: total - totalDescuento
      })
      .eq("id", orden.id);
  }
}
```

### 5. Detección de Reposición en Recepción

En `AlmacenRecepcionSheet.tsx`, al registrar recepción, detectar si llegaron más bultos de los ordenados:

```typescript
// Si la cantidad recibida > cantidad ordenada, verificar si es reposición
if (cantidadRecibida > cantidadOrdenada) {
  const diferencia = cantidadRecibida - cantidadOrdenada;
  
  // Buscar créditos de reposición esperada para este proveedor/producto
  const { data: creditosReposicion } = await supabase
    .from("proveedor_creditos_pendientes")
    .select("*")
    .eq("producto_id", productoId)
    .eq("status", "reposicion_esperada")
    .order("created_at");
    
  if (creditosReposicion && creditosReposicion.length > 0) {
    // Mostrar diálogo: "Llegaron X bultos extra. ¿Es reposición del faltante de OC-XXXXX?"
    // Si confirma: marcar crédito como "repuesto"
    // Si no: registrar como diferencia normal
  }
}
```

### 6. Mostrar Créditos en Step 4 (Resumen)

Agregar en el resumen final:

```tsx
{creditosAplicados > 0 && (
  <div className="flex justify-between text-green-600">
    <span>Créditos aplicados:</span>
    <span>-{formatCurrency(creditosAplicados)}</span>
  </div>
)}
{reposicionesPendientes > 0 && (
  <div className="flex justify-between text-blue-600 text-sm">
    <span>Bultos esperados (reposición):</span>
    <span>+{reposicionesPendientes} bultos</span>
  </div>
)}
```

---

## Ejemplo Práctico

### Escenario: OC anterior de 6000 bultos, recibidos 5998 (2 faltantes)

**En la nueva OC (6000 bultos × $400 = $2,400,000):**

**Opción 1 - Descuento:**
- Usuario selecciona "Aplicar descuento ($800)"
- Total OC: $2,400,000 - $800 = **$2,399,200**
- Se paga $2,399,200
- Se esperan recibir 6000 bultos

**Opción 2 - Reposición:**
- Usuario selecciona "Esperar reposición (2 bultos)"
- Total OC: **$2,400,000** (sin cambio)
- Se esperan recibir **6002 bultos** (6000 + 2 de reposición)
- Al recibir trailer con 1202 bultos en vez de 1200, sistema pregunta si son los 2 de reposición

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `CrearOrdenCompraWizard.tsx` | Agregar estado, query y UI de créditos pendientes |
| `CrearOrdenCompraWizard.tsx` | Modificar mutation para aplicar créditos seleccionados |
| `ordenes_compra` (DB) | Ya tiene columnas `creditos_aplicados` y `creditos_aplicados_detalle` |
| `proveedor_creditos_pendientes` | Agregar status "reposicion_esperada" |
| `AlmacenRecepcionSheet.tsx` | (Futuro) Detectar reposiciones automáticamente |

---

## Migración de Base de Datos

Agregar status "reposicion_esperada" permitido:

```sql
-- No se requiere migración si status es TEXT sin constraint
-- Los valores posibles ahora son:
-- 'pendiente', 'aplicado', 'reposicion_esperada', 'repuesto', 'cancelado'
```

---

## Notas Adicionales

1. **Los créditos de proveedor manual**: Se buscan por `proveedor_nombre_manual` en lugar de `proveedor_id`

2. **El total_ajustado**: Se calcula como `total - creditos_aplicados` cuando hay descuentos

3. **PDF de la OC**: Debe mostrar línea de "Crédito aplicado" si corresponde

4. **Email al proveedor**: Incluir nota sobre créditos aplicados o reposiciones esperadas
