
# Plan: Detección Automática de Reposición y Excedentes en Recepción

## Contexto del Problema

Actualmente el sistema:
- Limita el input de cantidad recibida a `max={faltante}` (no permite ingresar más de lo esperado)
- Solo detecta cuando llega MENOS de lo ordenado
- NO detecta cuando llega MÁS (posible reposición o error del proveedor)

### Escenario Real Mencionado
El proveedor dice que debía 2 bultos de azúcar de una entrega anterior, entonces manda 1202 en lugar de 1200. Al momento de checar, NO había ningún faltante pendiente registrado - el proveedor estaba equivocado, y se terminaron pagando 1202 bultos.

---

## Solución Propuesta

### Flujo de Detección

```text
Almacenista ingresa cantidad recibida (ej: 1202)
              │
              ▼
¿Es mayor a lo esperado (1200)?
              │
     ┌────────┴────────┐
     │ NO              │ SÍ
     ▼                 ▼
Flujo normal    ¿Hay crédito de reposición
                esperada para este producto
                y proveedor?
                       │
              ┌────────┴────────┐
              │ SÍ              │ NO
              ▼                 ▼
Mostrar diálogo:        Mostrar ALERTA:
"Llegaron 2 extra.      "⚠️ El proveedor envió
¿Es la reposición de    2 extra pero NO hay
OC-XXXX?"               ningún crédito pendiente
                        registrado"
   │                           │
   ├─ [Sí, confirmar]          ├─ [Aceptar y pagar]
   │   → Marcar crédito        │   → Registrar los 1202
   │     como "repuesto"       │   → Alertar para revisión
   │                           │
   └─ [No, es otra cosa]       └─ [Rechazar excedente]
       → Preguntar qué hacer       → Solo registrar 1200
```

---

## Cambios Técnicos

### 1. Remover Límite de Input (línea ~1645)

**Antes:**
```tsx
<Input
  type="number"
  min={0}
  max={faltante}  // ← Limita a lo esperado
  value={...}
/>
```

**Después:**
```tsx
<Input
  type="number"
  min={0}
  // Sin max - permitir ingresar cualquier cantidad
  value={...}
/>
```

### 2. Nuevo Estado para Detectar Excedentes

```typescript
// Créditos de reposición esperada del proveedor
const [creditosReposicionEsperada, setCreditosReposicionEsperada] = useState<CreditoReposicion[]>([]);

// Diálogo de confirmación de excedente
const [showExcedenteDialog, setShowExcedenteDialog] = useState(false);
const [productoConExcedente, setProductoConExcedente] = useState<{
  producto: ProductoEntrega;
  cantidadRecibida: number;
  cantidadEsperada: number;
  diferencia: number;
  creditosPosibles: CreditoReposicion[];
} | null>(null);

interface CreditoReposicion {
  id: string;
  producto_nombre: string;
  cantidad: number;
  monto_total: number;
  oc_origen_folio: string;
  motivo: string;
  status: string;
}
```

### 3. Cargar Créditos de Reposición al Abrir Sheet

En `loadProductos()`, después de cargar los productos:

```typescript
// Cargar créditos de reposición esperada para este proveedor
const proveedorId = entrega.orden_compra?.proveedor?.id;
if (proveedorId) {
  const { data: creditosData } = await supabase
    .from("proveedor_creditos_pendientes")
    .select(`
      id, producto_id, producto_nombre, cantidad, monto_total, motivo, status,
      ordenes_compra:orden_compra_origen_id (folio)
    `)
    .eq("proveedor_id", proveedorId)
    .in("status", ["pendiente", "reposicion_esperada"]);
  
  const creditos = (creditosData || []).map(c => ({
    ...c,
    oc_origen_folio: c.ordenes_compra?.folio || "Desconocido"
  }));
  setCreditosReposicionEsperada(creditos);
}
```

### 4. Detectar Excedente en UI

En el render del producto, detectar si hay excedente:

```tsx
const tieneExcedente = cantidadActual > faltante;

{/* Sección de EXCEDENTE (llegó MÁS de lo esperado) */}
{tieneExcedente && (
  <div className="space-y-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm font-medium">
      <Package className="w-4 h-4" />
      Excedente de {cantidadActual - faltante} unidades
    </div>
    
    {/* Verificar si hay crédito de reposición para este producto */}
    {(() => {
      const creditoParaProducto = creditosReposicionEsperada.find(
        c => c.producto_id === producto.producto_id && 
             (c.status === 'reposicion_esperada' || c.status === 'pendiente')
      );
      
      if (creditoParaProducto) {
        return (
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded text-sm">
            <p className="text-green-700 dark:text-green-400 font-medium">
              ✓ Posible reposición de faltante
            </p>
            <p className="text-green-600 dark:text-green-500 text-xs">
              De {creditoParaProducto.oc_origen_folio}: {creditoParaProducto.cantidad} bulto(s) ({creditoParaProducto.motivo})
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 border-green-500 text-green-700"
              onClick={() => handleConfirmarReposicion(producto, creditoParaProducto)}
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Confirmar como reposición
            </Button>
          </div>
        );
      } else {
        return (
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-700 dark:text-amber-400 font-medium">
                  Sin crédito pendiente registrado
                </p>
                <p className="text-amber-600 dark:text-amber-500 text-xs">
                  El proveedor envió {cantidadActual - faltante} extra pero no hay faltante previo. 
                  Si aceptas, se pagarán {cantidadActual} unidades.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-green-500 text-green-700"
                onClick={() => handleAceptarExcedenteYPagar(producto.id, cantidadActual)}
              >
                Aceptar y pagar extra
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-amber-500 text-amber-700"
                onClick={() => handleRechazarExcedente(producto.id, faltante)}
              >
                Solo recibir {faltante}
              </Button>
            </div>
          </div>
        );
      }
    })()}
  </div>
)}
```

### 5. Funciones de Manejo de Excedentes

```typescript
const handleConfirmarReposicion = async (producto: ProductoEntrega, credito: CreditoReposicion) => {
  // Marcar el crédito como "repuesto" en la base de datos
  await supabase
    .from("proveedor_creditos_pendientes")
    .update({
      status: "repuesto",
      resolucion_notas: `Repuesto en recepción de ${entrega.orden_compra.folio} entrega #${entrega.numero_entrega}`,
      fecha_aplicacion: new Date().toISOString()
    })
    .eq("id", credito.id);
  
  // Remover de la lista local
  setCreditosReposicionEsperada(prev => prev.filter(c => c.id !== credito.id));
  
  toast({
    title: "Reposición confirmada",
    description: `${credito.cantidad} bulto(s) de reposición registrados correctamente`
  });
};

const handleAceptarExcedenteYPagar = (detalleId: string, cantidad: number) => {
  // Mantener la cantidad ingresada - se pagará
  toast({
    title: "Excedente aceptado",
    description: `Se registrarán ${cantidad} unidades. Recuerda verificar con el proveedor.`,
    variant: "warning"
  });
  // Opcionalmente crear notificación/alerta para admin
};

const handleRechazarExcedente = (detalleId: string, cantidadEsperada: number) => {
  // Ajustar la cantidad al esperado
  setCantidadesRecibidas(prev => ({ ...prev, [detalleId]: cantidadEsperada }));
  toast({
    title: "Excedente rechazado",
    description: `Se registrarán solo ${cantidadEsperada} unidades esperadas`
  });
};
```

### 6. Validación Previa a Guardar

En `validarRecepcion()`, agregar validación para excedentes no confirmados:

```typescript
// Validar excedentes no confirmados
const productosConExcedenteNoConfirmado = productos.filter(p => {
  const cantidadActual = getCantidadNumerica(p.id);
  const faltante = p.cantidad_ordenada - p.cantidad_recibida;
  if (cantidadActual > faltante) {
    // Verificar si hay crédito de reposición para este producto
    const tieneCredito = creditosReposicionEsperada.some(
      c => c.producto_id === p.producto_id && c.status === 'reposicion_esperada'
    );
    // Si hay crédito pero no se ha confirmado, o si no hay crédito, alertar
    return !excedenteConfirmado[p.id];
  }
  return false;
});

if (productosConExcedenteNoConfirmado.length > 0) {
  toast({
    title: "Confirma los excedentes",
    description: "Hay productos con más unidades de las esperadas. Confirma si son reposición o acepta el excedente.",
    variant: "destructive"
  });
  return false;
}
```

---

## Diálogo Visual para Excedentes

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Excedente Detectado                                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Llegaron 2 bultos MÁS de lo esperado de:                         │
│   "Azúcar Estándar 50kg" (código: AZU-001)                         │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ ✓ Crédito de reposición encontrado                            │ │
│   │                                                               │ │
│   │ De OC-202601-0005 (motivo: faltante)                          │ │
│   │ 2 bultos × $400 = $800                                        │ │
│   │                                                               │ │
│   │ [✓ Confirmar como reposición]                                 │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   ─── O ───                                                         │
│                                                                     │
│   ┌───────────────────────────────────────────────────────────────┐ │
│   │ ⚠️ Sin crédito pendiente                                      │ │
│   │                                                               │ │
│   │ El proveedor dice que debía pero NO hay registro.             │ │
│   │ Si aceptas, pagarás 1202 en vez de 1200.                      │ │
│   │                                                               │ │
│   │ [Aceptar y pagar $800 extra]  [Rechazar excedente]            │ │
│   └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│                                              [Cancelar]             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `AlmacenRecepcionSheet.tsx` | Remover `max={faltante}` del input |
| `AlmacenRecepcionSheet.tsx` | Agregar estado para créditos de reposición |
| `AlmacenRecepcionSheet.tsx` | Cargar créditos al abrir sheet |
| `AlmacenRecepcionSheet.tsx` | Detectar y mostrar UI de excedente |
| `AlmacenRecepcionSheet.tsx` | Agregar funciones de confirmación/rechazo |
| `AlmacenRecepcionSheet.tsx` | Validar excedentes antes de guardar |

---

## Resumen del Flujo Completo

| Escenario | Detección | Acción |
|-----------|-----------|--------|
| Llegan 1200 (esperados 1200) | OK | Flujo normal |
| Llegan 1198 (esperados 1200) | Faltante | Pedir razón, crear crédito/entrega |
| Llegan 1202 + HAY crédito reposición | Excedente + Match | Preguntar si confirma reposición |
| Llegan 1202 + NO hay crédito | Excedente sin match | ALERTAR que proveedor está mal |

---

## Detalles Técnicos

### Status de Créditos
- `pendiente` - Faltante o devolución aún no resuelta
- `reposicion_esperada` - Usuario indicó que espera reposición física
- `aplicado` - Se aplicó como descuento en otra OC
- `repuesto` - Llegó la reposición física ✓
- `cancelado` - Anulado por cualquier razón

### Columnas a usar
- `proveedor_creditos_pendientes.producto_id` - Para hacer match con el producto que llega
- `proveedor_creditos_pendientes.status` - Para filtrar solo pendientes/esperados
- `proveedor_creditos_pendientes.cantidad` - Para verificar si coincide el excedente
- `proveedor_creditos_pendientes.orden_compra_origen_id` - Para mostrar de qué OC viene
