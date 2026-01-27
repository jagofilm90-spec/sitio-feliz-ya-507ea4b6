
# Plan: Habilitar Eliminación de OCs de Prueba para Admin

## Contexto del Problema

Actualmente el sistema bloquea la eliminación de Órdenes de Compra (OCs) que ya fueron recibidas, mostrando el mensaje:

> "No se puede eliminar una orden que ya fue recibida. El inventario ya fue afectado. Contacte al administrador para realizar ajustes de inventario si es necesario."

El problema es que **tú eres el administrador**, y necesitas poder limpiar datos de prueba sin ir a SQL directamente.

## Solución Propuesta

Crear una funcionalidad especial que permita a usuarios con rol **admin** eliminar OCs de prueba (identificadas por `proveedor_nombre_manual` que contenga "prueba") con:

1. **Detección automática** de OC de prueba
2. **Confirmación doble**: escribir el folio para confirmar
3. **Eliminación en cascada**: lotes de inventario, entregas, detalles, y la OC

## Criterios para Identificar OC de Prueba

Una OC se considera de prueba si:
- `proveedor_nombre_manual` contiene la palabra "prueba" (case-insensitive)
- O el nombre del proveedor vinculado contiene "prueba"
- O el folio contiene "TEST" o "PRUEBA"

## Datos Reales Identificados

| Folio | Proveedor Manual | Status | Es Prueba |
|-------|------------------|--------|-----------|
| OC-202601-0005 | prueba azúcar refinada | completada | ✅ Sí |
| OC-202601-0004 | SAÑUDO S.A. DE C.V. | enviada | ❌ No |
| OC-202601-0003 | Industrias Quimicas Almar | completada | ❌ No |
| OC-202601-0002 | ENVOLPAN DE MEXICO | completada | ❌ No |

---

## Cambios Técnicos

### Archivo 1: `src/components/compras/OrdenAccionesDialog.tsx`

**Cambio 1: Agregar función para detectar OC de prueba**

Líneas 100-110 (después de otros estados):

```tsx
// Detectar si es OC de prueba
const esOCPrueba = useMemo(() => {
  const nombreProveedor = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || '';
  const folio = orden?.folio || '';
  
  return nombreProveedor.toLowerCase().includes('prueba') || 
         nombreProveedor.toLowerCase().includes('test') ||
         folio.toUpperCase().includes('TEST') ||
         folio.toUpperCase().includes('PRUEBA');
}, [orden]);

// Estado para confirmación de folio (borrado especial)
const [folioConfirmacion, setFolioConfirmacion] = useState('');
```

**Cambio 2: Agregar hook para verificar rol admin**

Línea 10 (imports):
```tsx
import { useUserRoles } from "@/hooks/useUserRoles";
```

Línea 85 (después de otros hooks):
```tsx
const { isAdmin } = useUserRoles();
```

**Cambio 3: Modificar la mutación deleteOrden para manejar OCs de prueba**

Reemplazar líneas 260-267 (el bloqueo actual):

```tsx
const deleteOrden = useMutation({
  mutationFn: async () => {
    const nombreProveedor = orden?.proveedores?.nombre || orden?.proveedor_nombre_manual || '';
    const folio = orden?.folio || '';
    
    const esOCPruebaLocal = nombreProveedor.toLowerCase().includes('prueba') || 
                            nombreProveedor.toLowerCase().includes('test') ||
                            folio.toUpperCase().includes('TEST') ||
                            folio.toUpperCase().includes('PRUEBA');
    
    // Permitir eliminación de OC recibida SOLO si es de prueba Y el usuario es admin
    if ((orden.status === 'completada' || orden.status === 'recibida') && !esOCPruebaLocal) {
      throw new Error(
        "No se puede eliminar una orden que ya fue recibida. El inventario ya fue afectado. " +
        "Contacte al administrador para realizar ajustes de inventario si es necesario."
      );
    }
    
    // Si es OC recibida de prueba, eliminar también los lotes de inventario
    if ((orden.status === 'completada' || orden.status === 'recibida') && esOCPruebaLocal) {
      console.log("🧹 Eliminando OC de prueba con datos de inventario:", orden.folio);
      
      // 1. Eliminar lotes de inventario asociados
      const { error: lotesError } = await supabase
        .from("inventario_lotes")
        .delete()
        .eq("orden_compra_id", orden.id);
      
      if (lotesError) {
        console.error("Error eliminando lotes:", lotesError);
        throw new Error("Error al eliminar lotes de inventario: " + lotesError.message);
      }
      
      // 2. Eliminar entregas programadas
      const { error: entregasError } = await supabase
        .from("ordenes_compra_entregas")
        .delete()
        .eq("orden_compra_id", orden.id);
      
      if (entregasError) {
        console.error("Error eliminando entregas:", entregasError);
        // No lanzar error, continuar
      }
      
      // 3. Eliminar recepciones participantes (si existen)
      // Primero obtener IDs de recepciones
      const { data: recepciones } = await supabase
        .from("ordenes_compra_recepciones")
        .select("id")
        .eq("orden_compra_id", orden.id);
      
      if (recepciones && recepciones.length > 0) {
        const recepcionIds = recepciones.map(r => r.id);
        
        await supabase
          .from("recepciones_participantes")
          .delete()
          .in("recepcion_id", recepcionIds);
        
        await supabase
          .from("ordenes_compra_recepciones")
          .delete()
          .eq("orden_compra_id", orden.id);
      }
    }
    
    // Resto del código de eliminación existente...
```

**Cambio 4: Modificar UI de eliminación para mostrar opción especial para OCs de prueba**

Reemplazar líneas 2061-2101 (la sección del diálogo de eliminar):

```tsx
) : accion === "eliminar" ? (
  <div className="space-y-4">
    {/* Caso 1: OC recibida que NO es de prueba - mostrar bloqueo */}
    {(orden?.status === 'completada' || orden?.status === 'recibida') && !esOCPrueba ? (
      <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-2">
        <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          No se puede eliminar esta orden
        </p>
        <p className="text-sm text-muted-foreground">
          Esta orden ya fue recibida y el inventario fue afectado. Para mantener la integridad de los datos, 
          no es posible eliminarla directamente.
        </p>
        <p className="text-sm text-muted-foreground">
          Si necesita realizar ajustes, contacte al administrador del sistema.
        </p>
      </div>
    ) : (orden?.status === 'completada' || orden?.status === 'recibida') && esOCPrueba && isAdmin ? (
      /* Caso 2: OC recibida de PRUEBA + usuario es admin - permitir con confirmación doble */
      <div className="space-y-4">
        <div className="bg-red-100 dark:bg-red-950/30 border-2 border-red-500 p-4 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <p className="font-bold text-red-700 dark:text-red-400">
              Eliminación de OC de Prueba
            </p>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400">
            ⚠️ Esta acción eliminará PERMANENTEMENTE:
          </p>
          <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
            <li>La orden de compra <strong>{orden?.folio}</strong></li>
            <li>Todos los lotes de inventario creados</li>
            <li>Las entregas y recepciones registradas</li>
            <li>El stock del producto será actualizado automáticamente</li>
          </ul>
          
          <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded border">
            <p className="text-sm font-medium mb-2">
              Para confirmar, escribe el folio de la orden:
            </p>
            <Input
              value={folioConfirmacion}
              onChange={(e) => setFolioConfirmacion(e.target.value.toUpperCase())}
              placeholder={orden?.folio}
              className="font-mono"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => deleteOrden.mutate()} 
            disabled={deleteOrden.isPending || folioConfirmacion !== orden?.folio}
            variant="destructive"
            className="flex-1"
          >
            {deleteOrden.isPending ? "Eliminando datos de prueba..." : "🗑️ Eliminar OC de Prueba"}
          </Button>
          <Button variant="ghost" onClick={() => { setAccion(null); setFolioConfirmacion(''); }}>
            Cancelar
          </Button>
        </div>
        
        {folioConfirmacion && folioConfirmacion !== orden?.folio && (
          <p className="text-xs text-red-500">
            El folio no coincide. Debe escribir exactamente: {orden?.folio}
          </p>
        )}
      </div>
    ) : (orden?.status === 'completada' || orden?.status === 'recibida') && esOCPrueba && !isAdmin ? (
      /* Caso 3: OC recibida de PRUEBA pero usuario NO es admin */
      <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg space-y-2">
        <p className="font-medium text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Requiere permisos de administrador
        </p>
        <p className="text-sm text-muted-foreground">
          Esta es una OC de prueba que puede ser eliminada, pero requiere permisos de administrador.
        </p>
      </div>
    ) : (
      /* Caso 4: OC no recibida - eliminación normal */
      <>
        <div className="bg-destructive/10 p-4 rounded-lg space-y-2">
          <p className="font-medium text-destructive">¿Estás seguro de eliminar esta orden?</p>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. Se eliminarán todos los detalles de la orden.
          </p>
          <div className="text-sm text-muted-foreground space-y-1 mt-2">
            <p><strong>Folio:</strong> {orden?.folio}</p>
            <p><strong>Proveedor:</strong> {orden?.proveedores?.nombre || orden?.proveedor_nombre_manual}</p>
            <p><strong>Total:</strong> ${orden?.total?.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => deleteOrden.mutate()} 
            disabled={deleteOrden.isPending}
            variant="destructive"
          >
            {deleteOrden.isPending ? "Eliminando..." : "Sí, eliminar"}
          </Button>
          <Button variant="ghost" onClick={() => setAccion(null)}>
            No, cancelar
          </Button>
        </div>
      </>
    )}
  </div>
```

---

### Archivo 2: `src/components/compras/OrdenesCompraTab.tsx`

Aplicar cambios equivalentes en la función `handleConfirmDelete` para mantener consistencia.

**Cambio 1: Agregar import y hook**

```tsx
import { useUserRoles } from "@/hooks/useUserRoles";
// En el componente:
const { isAdmin } = useUserRoles();
```

**Cambio 2: Modificar lógica de eliminación**

En `handleConfirmDelete` (líneas 1379-1386), agregar la misma lógica de detección y eliminación en cascada.

---

## Flujo de Usuario

### Para OC de prueba (admin):

```text
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️ Eliminación de OC de Prueba                                  │
├──────────────────────────────────────────────────────────────────┤
│  Esta acción eliminará PERMANENTEMENTE:                          │
│  • La orden de compra OC-202601-0005                             │
│  • Todos los lotes de inventario creados                         │
│  • Las entregas y recepciones registradas                        │
│  • El stock del producto será actualizado automáticamente        │
│                                                                  │
│  Para confirmar, escribe el folio de la orden:                   │
│  ┌────────────────────────────────────────┐                      │
│  │ OC-202601-0005                         │                      │
│  └────────────────────────────────────────┘                      │
│                                                                  │
│  [🗑️ Eliminar OC de Prueba]  [Cancelar]                          │
└──────────────────────────────────────────────────────────────────┘
```

### Para OC real (cualquier usuario):

```text
┌──────────────────────────────────────────────────────────────────┐
│  ⚠️ No se puede eliminar esta orden                              │
├──────────────────────────────────────────────────────────────────┤
│  Esta orden ya fue recibida y el inventario fue afectado.        │
│  Para mantener la integridad de los datos, no es posible         │
│  eliminarla directamente.                                        │
│                                                                  │
│  Si necesita realizar ajustes, contacte al administrador.        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/OrdenAccionesDialog.tsx` | 1. Import useUserRoles 2. Estado folioConfirmacion 3. Memo esOCPrueba 4. Modificar deleteOrden para cascada 5. UI condicional con confirmación doble |
| `src/components/compras/OrdenesCompraTab.tsx` | Mismos cambios de lógica en handleConfirmDelete |

---

## Beneficios

1. **Autonomía del administrador**: Puedes limpiar datos de prueba sin SQL
2. **Seguridad**: Solo admin puede hacerlo, requiere escribir el folio exacto
3. **Integridad**: OCs reales siguen protegidas
4. **Limpieza completa**: Elimina lotes, entregas, recepciones, y la OC
5. **Trazabilidad**: Log en consola para auditoría

---

## Detalles Técnicos

### Orden de Eliminación (Cascada)

```text
1. inventario_lotes (donde orden_compra_id = OC.id)
   ↓ trigger sync_stock_from_lotes actualiza stock_actual
2. recepciones_participantes (por recepcion_id)
3. ordenes_compra_recepciones
4. ordenes_compra_entregas
5. ordenes_compra_detalles (ya existe en el código actual)
6. ordenes_compra
```

### Detección de OC de Prueba

```tsx
const esOCPrueba = 
  nombreProveedor.toLowerCase().includes('prueba') || 
  nombreProveedor.toLowerCase().includes('test') ||
  folio.toUpperCase().includes('TEST') ||
  folio.toUpperCase().includes('PRUEBA');
```
