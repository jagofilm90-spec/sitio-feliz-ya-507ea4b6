

# Plan: Corregir Costos Faltantes en Productos

## Problema Identificado

Los productos **Papel Bala Rojo (PAP-002)** y **Papel Blanco Revolución (PAP-001)** tienen:
- `ultimo_costo_compra` = **$0.00** (incorrecto)
- `costo_promedio_ponderado` = **$856.00** y **$550.00** (correcto)
- Lotes de inventario con `precio_compra` = **$856** y **$550** (correcto)

El update del `ultimo_costo_compra` no se ejecutó durante la recepción original.

---

## Solución

### Opción A: Corrección Inmediata (Recomendada)
Ejecutar un UPDATE directo para sincronizar `ultimo_costo_compra` con el precio registrado en los lotes de inventario:

```sql
-- Actualizar ultimo_costo_compra basándose en el precio del lote más reciente
UPDATE productos p
SET ultimo_costo_compra = (
  SELECT il.precio_compra 
  FROM inventario_lotes il 
  WHERE il.producto_id = p.id 
  ORDER BY il.created_at DESC 
  LIMIT 1
)
WHERE p.codigo IN ('PAP-001', 'PAP-002')
  AND (p.ultimo_costo_compra IS NULL OR p.ultimo_costo_compra = 0);
```

### Opción B: Corrección Masiva (Preventiva)
Corregir TODOS los productos que tengan lotes pero `ultimo_costo_compra` en $0:

```sql
-- Corregir todos los productos con costo faltante
UPDATE productos p
SET ultimo_costo_compra = (
  SELECT il.precio_compra 
  FROM inventario_lotes il 
  WHERE il.producto_id = p.id 
    AND il.precio_compra > 0
  ORDER BY il.created_at DESC 
  LIMIT 1
)
WHERE (p.ultimo_costo_compra IS NULL OR p.ultimo_costo_compra = 0)
  AND EXISTS (
    SELECT 1 FROM inventario_lotes il2 
    WHERE il2.producto_id = p.id 
      AND il2.precio_compra > 0
  );
```

---

## Resultado Esperado

| Producto | Antes | Después |
|----------|-------|---------|
| PAP-002 (Papel Bala Rojo) | $0.00 | **$856.00** |
| PAP-001 (Papel Blanco Revolución) | $0.00 | **$550.00** |

---

## Pasos de Implementación

1. Ejecutar SQL en Backend para corregir datos existentes
2. El código de recepción ya tiene la lógica correcta para futuras OCs (líneas 899-904)
3. Verificar que futuros productos se actualicen automáticamente

---

## Prevención Futura

El código actual (AlmacenRecepcionSheet.tsx líneas 899-904) ya incluye la actualización:

```typescript
// Solo actualizar último costo de compra (el stock lo actualiza el trigger)
await supabase
  .from("productos")
  .update({ ultimo_costo_compra: precioCompra })
  .eq("id", producto.producto_id);
```

Esto debería funcionar para todas las recepciones nuevas. El problema solo afecta a datos históricos.

