

# Plan: Folio Diario Consecutivo para Pedidos

## Problema actual
Los folios se generan con timestamps (`PED-V-123456`) o secuencias mensuales (`PED-202603-0001`). No hay forma de saber cuántos pedidos salieron en un día ni detectar faltantes al juntar las hojas firmadas.

## Solución

Agregar un campo `numero_dia` (integer) a la tabla `pedidos` que se auto-incrementa por día, empezando en 1 cada día. Este número aparecerá prominente en las hojas de carga.

### 1. Migración de base de datos

- Agregar columna `numero_dia` (integer, nullable) a `pedidos`
- Crear función `asignar_numero_dia()` como trigger BEFORE INSERT que:
  - Cuenta cuántos pedidos existen para la misma `fecha_pedido::date` (excluyendo borradores)
  - Asigna `numero_dia = count + 1`
  - Solo lo asigna si el status NO es `borrador`
- Crear trigger en `pedidos` BEFORE INSERT que ejecute la función

```sql
-- Pseudológica del trigger:
IF NEW.status != 'borrador' THEN
  SELECT COALESCE(MAX(numero_dia), 0) + 1 INTO NEW.numero_dia
  FROM pedidos
  WHERE fecha_pedido::date = NEW.fecha_pedido::date
    AND status != 'borrador'
    AND numero_dia IS NOT NULL;
END IF;
```

### 2. Actualizar folio a incluir número del día

Cambiar el formato del folio en los 5 lugares donde se genera:
- `VendedorNuevoPedidoTab.tsx` (vendedor crea pedido)
- `ProcesarPedidoDialog.tsx` (correos)
- `PedidosAcumulativosManager.tsx` (acumulativos, 2 lugares)
- `CotizacionDetalleDialog.tsx` (cotización → pedido)
- `NuevoPedidoDialog.tsx` (secretaria)
- `ClienteNuevoPedido.tsx` (cliente)

El folio **mantiene** el formato actual (`PED-YYYYMM-XXXX`) para identificación única. El `numero_dia` es un dato **adicional** que se muestra en las hojas.

### 3. Mostrar número del día en hojas de carga

En `HojaCargaUnificadaTemplate.tsx`, mostrar prominente:
```
NOTA #3
```
Usando el campo `numero_dia` del pedido. Se mostrará grande y visible en el header de la hoja para fácil identificación al juntar las hojas firmadas.

### 4. Mostrar en el template de pedido (PedidoPrintTemplate)

También agregar el número del día en `PedidoPrintTemplate.tsx` para la vista previa del vendedor.

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| **Migración SQL** | Agregar `numero_dia`, función trigger, trigger |
| `HojaCargaUnificadaTemplate.tsx` | Mostrar `NOTA #X` prominente en header |
| `PedidoPrintTemplate.tsx` | Mostrar número del día |
| `PedidoPDFPreviewDialog.tsx` | Pasar `numero_dia` a los datos |
| `VendedorNuevoPedidoTab.tsx` | Leer `numero_dia` del pedido creado para mostrar |
| Interfaces de datos print | Agregar campo `numeroDia` opcional |

## Ventajas sobre el foliador físico
- Se asigna automáticamente, sin error humano
- Si se cancela un pedido, el número queda registrado (se puede ver el hueco)
- Se puede consultar digitalmente cuántos pedidos salieron por día

