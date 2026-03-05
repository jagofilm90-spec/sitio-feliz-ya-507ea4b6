

# Analisis: Proceso Completo Vendedor → Secretaria

## Flujo Actual (10 pasos)

```text
VENDEDOR                    SECRETARIA                 ALMACÉN                    CHOFER                     SECRETARIA (día sig.)
─────────                   ──────────                 ───────                    ──────                     ─────────────────────
1. Crea pedido              2. Autoriza pedido         6. Carga interactiva       9. Entrega con firma       10. Concilia papeles
   → status: pendiente/        → status: pendiente        → checklist, fotos,        → QR scan                  → Registra devoluciones
     por_autorizar                                          firma chofer+almacen      → status: entregado         → Recalcula totales
   → PDF 4 pags             3. Envía email vendedor                                                              → Envía PDF final (por_cobrar)
   → Notifica secretaría                               7. Enviar a Ruta
   → Notifica cliente                                     → syncCargaToPedidos
                             4. Crea OC si aplica          → status: en_ruta
                                                           → Notifica cliente
                             5. Asigna ruta                → Notifica chofer
                                (admin/secretaría)
                                                        8. Monitoreo en tiempo real
```

## Problemas Detectados

### BUG CRITICO 1: IVA/IEPS se pierde en syncCargaToPedidos

En `AlmacenCargaRutasTab.tsx` líneas 434-439:
```typescript
const newTotal = allDetalles.reduce((s, d) => s + (d.subtotal || 0), 0);
await supabase.from("pedidos").update({
  subtotal: newTotal,
  total: newTotal,  // ← BUG: total = subtotal, ignora impuestos
}).eq("id", pedidoId);
```

El pedido original tiene `total = subtotal + impuestos`. Después de la sync, los impuestos desaparecen. Un pedido de $10,000 + $1,600 IVA = $11,600 pasaría a mostrar $10,000 como total.

**Mismo bug** existe en `CargaRutaInlineFlow.tsx` (tiene su propia copia de syncCargaToPedidos).

### BUG CRITICO 2: Conciliación secretaria hardcodea IVA 16%

En `ConciliacionDetalleDialog.tsx` línea 162:
```typescript
const nuevoIva = nuevoSubtotal * 0.16; // ← Ignora aplica_iva por producto, ignora IEPS
```

El sistema tiene productos que no aplican IVA y productos con IEPS. Este cálculo es incorrecto para ambos casos.

### BUG 3: No hay historial de cambios del pedido

Cuando el almacén o la secretaria modifican cantidades, no se guarda un registro de qué cambió, quién lo cambió, y cuándo. Solo se sobrescriben los valores. El campo `notas_internas` se sobrescribe con texto genérico.

### BUG 4: saldo_pendiente no se actualiza en sync

`syncCargaToPedidos` actualiza `total` pero no `saldo_pendiente`, que es el campo que usa el módulo de cobranza. Esto causa que el vendedor vea un saldo incorrecto en "Por Cobrar".

### Observación: El PDF actualizado no se genera en syncCargaToPedidos

Se mencionó en el plan anterior que se generaría un PDF actualizado al despachar con cambios, pero el código actual de `handleEnviarARuta` solo envía las `modificaciones` como texto al email. No genera ni adjunta un PDF con las cantidades corregidas.

## Plan de Corrección

### 1. Corregir syncCargaToPedidos (ambos archivos)

Recalcular impuestos correctamente usando la función `calcularDesgloseImpuestos` existente. Necesita consultar `aplica_iva` y `aplica_ieps` de cada producto para calcular IVA e IEPS línea por línea. Actualizar `subtotal`, `impuestos` y `total` correctamente. También actualizar `saldo_pendiente`.

### 2. Corregir ConciliacionDetalleDialog

Reemplazar el cálculo hardcodeado de IVA. Consultar `aplica_iva` y `aplica_ieps` de cada producto y usar `calcularDesgloseImpuestos` para recalcular correctamente.

### 3. Agregar tabla de historial de cambios al pedido (migración DB)

Crear tabla `pedidos_historial_cambios` para auditoría:
- `pedido_id`, `tipo_cambio` (almacen_carga, conciliacion_secretaria), `cambios` (JSONB), `usuario_id`, `created_at`

Registrar cada modificación de cantidad/total en ambos flujos.

### 4. Generar PDF actualizado en handleEnviarARuta

Si hay modificaciones detectadas, generar el PDF de remisión con cantidades actualizadas y enviarlo como adjunto en la notificación `en_ruta`.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/almacen/AlmacenCargaRutasTab.tsx` | Corregir cálculo de impuestos en syncCargaToPedidos, actualizar saldo_pendiente, registrar historial |
| `src/components/almacen/CargaRutaInlineFlow.tsx` | Mismo fix de impuestos (tiene copia de syncCargaToPedidos) |
| `src/components/secretaria/ConciliacionDetalleDialog.tsx` | Usar calcularDesgloseImpuestos por producto en vez de hardcodear 16% |
| Migración SQL | Crear tabla `pedidos_historial_cambios` |

