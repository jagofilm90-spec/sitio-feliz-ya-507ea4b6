

# Plan: Permitir Ajuste de Costo de Compra en OCs Ya Conciliadas

## Problema Identificado

Actualmente:
- El botón "Confirmar Costos" solo aparece cuando `status_conciliacion === 'por_conciliar'`
- Todas tus OCs ya están marcadas como `conciliada`
- El "Papel Blanco Revolución" tiene costo $550 y ya está conciliado
- **No hay forma de corregir el costo** una vez conciliado

---

## Solución Propuesta

Agregar un botón **"Ajustar Costos"** que esté disponible SIEMPRE en las OCs recibidas/completadas, independientemente de si ya fueron conciliadas. Esto permite:
- Corregir errores de captura
- Actualizar costos si el proveedor cambia el precio después
- Ajustar costos cuando llegue la factura real

---

## Cambios a Implementar

### 1. Crear `AjustarCostosOCDialog.tsx`
Un nuevo diálogo que permite editar los costos de cualquier OC recibida, mostrando:
- Lista de productos con costo actual editable
- Cálculo de diferencia vs costo original
- Actualización del costo promedio ponderado

### 2. Modificar `OrdenAccionesDialog.tsx`
- Agregar botón "Ajustar Costos" visible cuando la OC tenga status `recibida`, `parcial` o `completada`
- Este botón estará disponible **independientemente** del `status_conciliacion`
- Aparecerá en la sección "Otras Acciones"

---

## Lógica de Visibilidad

| Botón | Cuándo aparece |
|-------|----------------|
| **Confirmar Costos** (existente) | Solo cuando `status_conciliacion === 'por_conciliar'` |
| **Ajustar Costos** (nuevo) | Cuando OC tiene status `recibida`, `parcial` o `completada` |

---

## Flujo de Usuario

```text
1. Usuario abre OC-202601-0002 (completada, conciliada)
2. Ve botón "Ajustar Costos" en Otras Acciones
3. Click -> Se abre diálogo con productos
4. Cambia el costo del "Papel Blanco Revolución" de $550 a $500
5. Click "Guardar Cambios"
6. Sistema actualiza:
   - inventario_lotes.precio_compra → $500
   - ordenes_compra_detalles.precio_unitario_compra → $500
   - productos.ultimo_costo_compra → $500
   - productos.costo_promedio_ponderado → recalculado
   - productos_historial_costos → registro del cambio
```

---

## Sección Técnica

### Nuevo archivo: `src/components/compras/AjustarCostosOCDialog.tsx`

```text
Componente que:
1. Recibe ordenCompra (id, folio)
2. Carga productos de ordenes_compra_detalles con sus costos actuales
3. Permite editar precio_compra inline por producto
4. Al guardar:
   - Llama a ajustar_costos_oc() (función existente en BD)
   - Actualiza inventario_lotes
   - Recalcula costo_promedio_ponderado
   - Registra en productos_historial_costos
```

### Modificar: `src/components/compras/OrdenAccionesDialog.tsx`

```text
AGREGAR IMPORT:
+ import { AjustarCostosOCDialog } from "./AjustarCostosOCDialog";

AGREGAR ESTADO:
+ const [ajustarCostosOpen, setAjustarCostosOpen] = useState(false);

AGREGAR BOTÓN en "Otras Acciones":
+ {(orden?.status === 'recibida' || orden?.status === 'parcial' || orden?.status === 'completada') && (
+   <Button
+     variant="outline"
+     className="w-full justify-start"
+     onClick={() => setAjustarCostosOpen(true)}
+   >
+     <DollarSign className="mr-2 h-4 w-4" />
+     Ajustar Costos
+   </Button>
+ )}

AGREGAR DIÁLOGO:
+ <AjustarCostosOCDialog
+   open={ajustarCostosOpen}
+   onOpenChange={setAjustarCostosOpen}
+   ordenCompra={orden ? { id: orden.id, folio: orden.folio } : null}
+ />
```

---

## Diferencia con "Confirmar Costos"

| Característica | Confirmar Costos | Ajustar Costos |
|----------------|------------------|----------------|
| **Cuándo aparece** | Solo si `status_conciliacion = 'por_conciliar'` | Siempre en OCs recibidas |
| **Propósito** | Primera validación de costos | Corrección posterior |
| **Editable** | Solo confirma lo existente | Permite cambiar valores |
| **Cambia status_conciliacion** | Sí, a 'conciliada' | No |

---

## Resultado

Podrás:
1. Abrir OC-202601-0002
2. Click en "Ajustar Costos"
3. Cambiar el Papel Blanco Revolución de $550 a tu valor correcto
4. El sistema actualizará todos los campos relacionados automáticamente

