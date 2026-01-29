
# Plan: Adaptar Diálogo de Pago para OCs con Pago Anticipado

## Problemas Detectados

1. **Mensaje incorrecto**: El botón muestra "Confirmar Pago Parcial (mercancía recibida)" en pagos anticipados
2. **Alerta inapropiada**: "Entregas pendientes de recepción" aparece como advertencia cuando en anticipado es normal pagar antes de recibir
3. **Faltan datos logísticos**: No se muestran bultos totales ni peso total de la OC
4. **Lenguaje incorrecto**: "No hay productos recibidos" cuando son "productos a pagar"

## Archivos a Modificar

### 1. `src/components/compras/AdeudosProveedoresTab.tsx`
**Líneas 772-781** - Pasar `tipo_pago` al diálogo de pago:

```typescript
orden={{
  id: selectedOC.id,
  folio: selectedOC.folio,
  proveedor_id: selectedOC.proveedor_id,
  proveedor_nombre: selectedOC.proveedores?.nombre || selectedOC.proveedor_nombre_manual || "Sin proveedor",
  total: selectedOC.total,
  total_ajustado: selectedOC.total_ajustado,
  monto_pagado: selectedOC.monto_pagado,
  monto_devoluciones: 0,
  tipo_pago: selectedOC.tipo_pago,  // ← AGREGAR
}}
```

### 2. `src/components/compras/ProcesarPagoOCDialog.tsx`

#### 2.1 Actualizar interface (líneas 70-85)
Agregar `tipo_pago` a las props:

```typescript
interface ProcesarPagoOCDialogProps {
  orden: {
    // ... campos existentes ...
    tipo_pago?: string | null;  // ← AGREGAR
  } | null;
}
```

#### 2.2 Agregar consulta de productos con peso_kg (líneas 119-155)
Modificar el query para traer `peso_kg`:

```typescript
productos (codigo, nombre, aplica_iva, aplica_ieps, peso_kg)
```

Y mapear el peso en el resultado.

#### 2.3 Calcular totales logísticos (nuevo useMemo)
```typescript
const totalesLogisticos = useMemo(() => {
  const productosParaPagar = productosRecibidos.filter(
    p => productosSeleccionados.has(p.detalle_id) && !p.pagado
  );
  
  const totalBultos = productosParaPagar.reduce((sum, p) => sum + p.cantidad, 0);
  const totalPeso = productosParaPagar.reduce((sum, p) => sum + (p.cantidad * (p.peso_kg || 0)), 0);
  
  return { totalBultos, totalPeso };
}, [productosRecibidos, productosSeleccionados]);
```

#### 2.4 Condicionar alerta de entregas pendientes (líneas 645-674)
Solo mostrar como advertencia para pagos contra entrega, no para anticipado:

```typescript
{tieneEntregasPendientes && isPagoCompleto && orden?.tipo_pago !== 'anticipado' && (
  <Alert className="border-orange-300 bg-orange-50">
    {/* ... contenido actual ... */}
  </Alert>
)}
```

#### 2.5 Agregar resumen para pago anticipado
Nuevo bloque informativo para anticipado:

```typescript
{orden?.tipo_pago === 'anticipado' && (
  <Alert className="border-blue-300 bg-blue-50 dark:bg-blue-950/30">
    <Package className="h-4 w-4 text-blue-600" />
    <AlertTitle className="text-blue-800">Pago Anticipado</AlertTitle>
    <AlertDescription className="text-blue-700">
      <p>Este es un pago previo a la recepción de mercancía.</p>
      <div className="flex gap-6 mt-2 font-medium">
        <span>Total bultos: {totalesLogisticos.totalBultos}</span>
        <span>Peso total: {totalesLogisticos.totalPeso.toLocaleString('es-MX')} kg</span>
      </div>
    </AlertDescription>
  </Alert>
)}
```

#### 2.6 Corregir mensaje de tabla vacía (línea 711)
Cambiar lenguaje según tipo de pago:

```typescript
{productosRecibidos.length === 0 ? (
  <TableRow>
    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
      {orden?.tipo_pago === 'anticipado' 
        ? "No hay productos en la orden"
        : "No hay productos recibidos"
      }
    </TableCell>
  </TableRow>
)
```

#### 2.7 Corregir texto del botón (líneas 1028-1032)
Para anticipado, el mensaje debe reflejar que es pago previo a entrega:

```typescript
{tieneEntregasPendientes && isPagoCompleto
  ? orden?.tipo_pago === 'anticipado'
    ? "Confirmar Pago Anticipado (previo a entrega)"
    : "Confirmar Pago Parcial (mercancía recibida)"
  : isPagoCompleto 
    ? "Confirmar Pago Completo" 
    : `Pagar ${calcularTotalesSeleccionados.cantidadProductos} producto(s)`
}
```

#### 2.8 Mostrar resumen de totales con bultos y peso
Agregar en el header del proveedor o en la sección de totales:

```typescript
<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
  <div>
    <p className="text-sm text-muted-foreground">Proveedor</p>
    <p className="font-semibold">{orden?.proveedor_nombre}</p>
    {orden?.tipo_pago === 'anticipado' && (
      <p className="text-sm text-muted-foreground mt-1">
        <Package className="h-3 w-3 inline mr-1" />
        {totalesLogisticos.totalBultos} bultos • {totalesLogisticos.totalPeso.toLocaleString('es-MX')} kg
      </p>
    )}
  </div>
  {/* ... resto del header ... */}
</div>
```

## Resultado Visual para Pago Anticipado

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Procesar Pago - OC-202601-0005                                      │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ 💳 Pago Anticipado                                               │ │
│ │ Este es un pago previo a la recepción de mercancía.             │ │
│ │ Total bultos: 1,200    Peso total: 60,000 kg                    │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Proveedor: PRUEBA JOSAN DE MEXICO                                   │
│ 1,200 bultos • 60,000 kg                                            │
│                                                                     │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ☐ │ Código  │ Producto      │ Cant. │ Costo   │ Subtotal        │ │
│ │ ✓ │ AZU-EST │ Azúcar Est.   │ 1,200 │ $2,000  │ $2,400,000      │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ Subtotal: $2,068,965.52                                             │
│ IVA 16%: $331,034.48                                                │
│ Total a pagar: $2,400,000.00                                        │
│                                                                     │
│           [Cancelar]  [✓ Confirmar Pago Anticipado (previo a entrega)]│
└─────────────────────────────────────────────────────────────────────┘
```

## Flujo Completo Corregido

```text
OC Anticipado → [Adeudos: Pagar] 
                      │
                      ▼
          ┌───────────────────────┐
          │ Diálogo Pago Anticip. │
          │ • Total bultos        │
          │ • Total peso          │
          │ • Sin alertas rojas   │
          │ • Botón correcto      │
          └───────────────────────┘
                      │
                      ▼
               [Pago registrado]
                      │
                      ▼
     OC visible en pestaña OC (status: autorizada)
                      │
                      ▼
     Programar → Recibir → Completar → ARCHIVADA
```

## Resumen de Cambios

| Archivo | Cambio |
|---------|--------|
| `AdeudosProveedoresTab.tsx` | Pasar `tipo_pago` al diálogo |
| `ProcesarPagoOCDialog.tsx` | Agregar `tipo_pago` a props |
| `ProcesarPagoOCDialog.tsx` | Consultar `peso_kg` de productos |
| `ProcesarPagoOCDialog.tsx` | Calcular y mostrar bultos/peso |
| `ProcesarPagoOCDialog.tsx` | Condicionar alertas por tipo_pago |
| `ProcesarPagoOCDialog.tsx` | Agregar banner informativo para anticipado |
| `ProcesarPagoOCDialog.tsx` | Corregir textos del botón de confirmación |
