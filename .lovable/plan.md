
# Plan: Generación Automática de Créditos al Completar OC de Pago Anticipado

## Problema Detectado

Actualmente cuando una OC de **Pago Anticipado** se completa (todas las entregas recibidas), el sistema:
- ✅ Marca la OC como `status: "completada"`
- ❌ NO verifica si el total pagado cuadra con lo recibido
- ❌ NO genera créditos automáticos por la diferencia

### Ejemplo del Usuario
- Se pagan 6000 bultos anticipadamente ($2,400,000)
- Se reciben en total 5990 bultos (por faltantes o devoluciones)
- El proveedor nos debe 10 bultos × $400 = **$4,000**
- El sistema debe registrar automáticamente este crédito pendiente

---

## Solución: Verificación de Balance al Completar OC

### Dónde Agregar la Lógica

En `AlmacenRecepcionSheet.tsx`, cuando se detecta que **no hay entregas pendientes** y se marca la OC como `"completada"`:

```text
Líneas 1148-1156 actuales:
if (!entregasPendientes || entregasPendientes.length === 0) {
  await supabase
    .from("ordenes_compra")
    .update({ status: "completada", ... })
    .eq("id", entrega.orden_compra.id);
}

↓ Después de esto ↓

// Si es OC anticipada, verificar balance final
if (entrega.orden_compra.tipo_pago === 'anticipado') {
  // Calcular: total ordenado vs total recibido
  // Si hay diferencia, generar créditos automáticos
}
```

---

## Flujo de la Nueva Lógica

```text
OC Anticipada se completa (todas las entregas recibidas)
                │
                ▼
Calcular diferencia = Σ(cantidad_ordenada) - Σ(cantidad_recibida)
                │
                ▼
¿diferencia > 0?
        │
   ┌────┴────┐
   │ NO      │ SÍ
   ▼         ▼
Fin      Por cada producto con diferencia:
         - Crear registro en proveedor_creditos_pendientes
         - Motivo: "saldo_oc_anticipada"
         - Enviar email al proveedor con resumen
```

---

## Cambios en AlmacenRecepcionSheet.tsx

### 1. Agregar Verificación de Balance Final

Después de marcar la OC como completada (línea ~1156):

```typescript
// === NUEVO: Verificación de balance para OC anticipadas ===
if (entrega.orden_compra.tipo_pago === 'anticipado') {
  // Obtener todos los detalles de la OC
  const { data: detallesOC } = await supabase
    .from("ordenes_compra_detalles")
    .select("producto_id, cantidad_ordenada, cantidad_recibida, precio_unitario_compra")
    .eq("orden_compra_id", entrega.orden_compra.id);

  // Calcular diferencias por producto
  const productosConSaldo = (detallesOC || []).filter(d => 
    d.cantidad_ordenada > d.cantidad_recibida
  );

  if (productosConSaldo.length > 0) {
    // Obtener nombres de productos
    const productIds = productosConSaldo.map(p => p.producto_id);
    const { data: productosInfo } = await supabase
      .from("productos")
      .select("id, nombre, codigo")
      .in("id", productIds);
    
    const productosMap = new Map(
      (productosInfo || []).map(p => [p.id, p])
    );

    // Crear créditos para cada producto con saldo
    const creditosACrear = productosConSaldo.map(detalle => {
      const diferencia = detalle.cantidad_ordenada - detalle.cantidad_recibida;
      const productoInfo = productosMap.get(detalle.producto_id);
      return {
        proveedor_id: entrega.orden_compra.proveedor?.id || null,
        proveedor_nombre_manual: entrega.orden_compra.proveedor_nombre_manual || null,
        orden_compra_origen_id: entrega.orden_compra.id,
        entrega_id: entrega.id, // Última entrega
        producto_id: detalle.producto_id,
        producto_nombre: productoInfo?.nombre || "Producto",
        cantidad: diferencia,
        precio_unitario: detalle.precio_unitario_compra,
        monto_total: diferencia * detalle.precio_unitario_compra,
        motivo: "saldo_oc_anticipada",
        status: "pendiente",
        notas: `Saldo automático al completar ${entrega.orden_compra.folio}`
      };
    });

    // Insertar créditos
    if (creditosACrear.length > 0) {
      await supabase
        .from("proveedor_creditos_pendientes")
        .insert(creditosACrear);

      // Calcular total de créditos generados
      const totalCredito = creditosACrear.reduce((sum, c) => sum + c.monto_total, 0);

      // Notificar por email al proveedor
      await supabase.functions.invoke("notificar-faltante-anticipado", {
        body: {
          orden_compra_id: entrega.orden_compra.id,
          faltantes: creditosACrear.map(c => ({
            producto_id: c.producto_id,
            producto_nombre: c.producto_nombre,
            cantidad_faltante: c.cantidad,
            precio_unitario: c.precio_unitario,
            monto_total: c.monto_total,
            motivo: "saldo_final"
          })),
          entrega_id: entrega.id
        }
      });

      // Mostrar notificación al usuario
      toast({
        title: "Saldo registrado",
        description: `Se registró crédito pendiente por ${creditosACrear.length} producto(s) 
                       con valor de ${formatCurrency(totalCredito)}`,
        variant: "warning"
      });
    }
  }
}
```

### 2. También Manejar Devoluciones (roto/rechazado) en Anticipadas

Las devoluciones ya ajustan `monto_devoluciones`, pero para OC anticipadas también deben generar crédito porque ya se pagó.

En `DevolucionProveedorDialog.tsx`, después de llamar a `agregar_devolucion_a_oc`:

```typescript
// Si es OC anticipada, también crear crédito pendiente
const { data: oc } = await supabase
  .from("ordenes_compra")
  .select("tipo_pago, folio")
  .eq("id", ordenCompraId)
  .single();

if (oc?.tipo_pago === 'anticipado') {
  for (const producto of productosDevolucion) {
    const montoDevolucion = producto.cantidadDevuelta * precioUnitario;
    
    await supabase.from("proveedor_creditos_pendientes").insert({
      proveedor_id: proveedorId,
      orden_compra_origen_id: ordenCompraId,
      devolucion_id: devolucion.id,
      entrega_id: entregaId,
      producto_id: producto.productoId,
      producto_nombre: producto.nombre,
      cantidad: producto.cantidadDevuelta,
      precio_unitario: precioUnitario,
      monto_total: montoDevolucion,
      motivo: producto.razon, // "roto" o "rechazado_calidad"
      status: "pendiente",
      notas: `Devolución en OC anticipada ${oc.folio}`
    });
  }
}
```

---

## Actualización del Panel de Créditos

### Nuevo Motivo: "saldo_oc_anticipada"

En `CreditosPendientesPanel.tsx`, actualizar la función de etiquetas:

```typescript
const getMotivoLabel = (motivo: string) => {
  switch (motivo) {
    case "faltante": return "No llegó";
    case "roto": return "Dañado";
    case "rechazado_calidad": return "Rechazado";
    case "devolucion": return "Devolución";
    case "saldo_oc_anticipada": return "Saldo OC Anticipada";
    case "saldo_final": return "Saldo Final";
    default: return motivo;
  }
};
```

---

## Resumen Visual del Flujo Completo

```text
┌──────────────────────────────────────────────────────────────────────┐
│                    OC PAGO ANTICIPADO                                │
│                    6000 bultos × $400 = $2,400,000 PAGADO            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ENTREGAS:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Entrega #1: Esperados 2000, Recibidos 1998 (2 rotos)        │     │
│  │             → Devolución registrada + Crédito creado ($800) │     │
│  └─────────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Entrega #2: Esperados 2000, Recibidos 1995 (5 no llegaron)  │     │
│  │             → Nueva entrega programada                       │     │
│  └─────────────────────────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ Entrega #3: Esperados 2005, Recibidos 1997 (3 rechazados)   │     │
│  │             → Devolución + Crédito creado ($1,200)           │     │
│  │             → 5 faltantes de entrega #2 no llegaron          │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  CIERRE AUTOMÁTICO:                                                  │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ ✓ Todas las entregas recibidas                              │     │
│  │ ✓ OC marcada como "completada"                              │     │
│  │                                                             │     │
│  │ BALANCE FINAL:                                              │     │
│  │ • Pagado: 6000 bultos                                       │     │
│  │ • Recibido: 5990 bultos                                     │     │
│  │ • Devoluciones ya registradas: 5 bultos ($2,000)            │     │
│  │ • Faltantes finales: 5 bultos                               │     │
│  │                                                             │     │
│  │ → Sistema genera crédito: 5 × $400 = $2,000                 │     │
│  │ → Email automático al proveedor                             │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  CRÉDITOS TOTALES PENDIENTES: $4,000                                │
│  (5 rotos/rechazados + 5 faltantes finales)                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `AlmacenRecepcionSheet.tsx` | Agregar verificación de balance al completar OC anticipada |
| `DevolucionProveedorDialog.tsx` | Crear crédito cuando devolución es en OC anticipada |
| `CreditosPendientesPanel.tsx` | Agregar etiqueta para motivo "saldo_oc_anticipada" |

---

## Consideraciones Importantes

### Evitar Duplicados
- Solo generar crédito de "saldo_final" al completar la OC
- Las devoluciones ya generan su crédito individual al momento
- El cálculo final debe considerar: `ordenado - recibido - (ya_creditado_por_devoluciones)`

### Los 3 Escenarios de Resolución (Ya Implementados)

1. **Depósito bancario** → En panel de créditos: "Marcar como Reembolsado"
2. **Reposición física** → Se detecta al recibir excedente (implementado en flujo anterior)  
3. **Descuento en próxima OC** → Wizard de creación de OC permite seleccionar créditos

---

## Flujo de Email Automático

El edge function `notificar-faltante-anticipado` ya existe y:
- Envía email al proveedor con tabla de productos faltantes
- Incluye las 3 opciones de resolución
- Registra en `correos_enviados` para trazabilidad

Solo falta **llamarlo correctamente** cuando se complete la OC.
