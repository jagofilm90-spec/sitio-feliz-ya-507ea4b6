
# Plan: Agregar Botón "Confirmar Costos" en Menú de Acciones de OC

## Objetivo
Agregar un botón directo de "Confirmar Costos" en el diálogo de acciones de cada Orden de Compra (`OrdenAccionesDialog`) para poder conciliar los costos sin necesidad de registrar una factura formal.

---

## Cambios a Implementar

### Archivo: `src/components/compras/OrdenAccionesDialog.tsx`

#### 1. Importar el Componente de Conciliación Rápida
Agregar el import del componente `ConciliacionRapidaDialog` que ya existe y funciona correctamente.

#### 2. Agregar Estado para el Diálogo
Crear un nuevo estado `conciliacionRapidaOpen` para controlar la apertura/cierre del diálogo.

#### 3. Agregar Botón en Sección "Otras Acciones"
Insertar un nuevo botón en la sección "Otras Acciones" que:
- Solo se muestre cuando `status_conciliacion === 'por_conciliar'`
- Tenga estilo destacado (color ámbar) para indicar acción pendiente
- Incluya el icono `FileCheck` (consistente con otros indicadores de conciliación)
- Abra el diálogo `ConciliacionRapidaDialog` al hacer clic

#### 4. Renderizar el Diálogo
Agregar el componente `ConciliacionRapidaDialog` al final del componente, después de los otros diálogos existentes.

---

## Lógica de Visibilidad del Botón

El botón "Confirmar Costos" será visible cuando:

| Condición | Descripción |
|-----------|-------------|
| `status_conciliacion === 'por_conciliar'` | La OC tiene entregas recibidas pendientes de verificar costos |

El botón NO se muestra cuando:
- La OC aún no ha sido recibida (`status_conciliacion === 'pendiente'`)
- La OC ya está conciliada (`status_conciliacion === 'conciliada'`)

---

## Resultado Visual Esperado

En la sección **"Otras Acciones"** del diálogo, aparecerá un nuevo botón:

```text
┌──────────────────────────────────────────┐
│ Otras Acciones                           │
├──────────────────────────────────────────┤
│ ✓ Confirmar Costos     [Por Conciliar]   │  ← NUEVO (solo si aplica)
│ 📷 Ver Evidencias Fotográficas           │
│ 📜 Historial de Correos Enviados         │
└──────────────────────────────────────────┘
```

El botón tendrá:
- Icono `FileCheck` (✓ con documento)
- Texto "Confirmar Costos"
- Borde ámbar para destacar la acción pendiente
- Badge "Por Conciliar" para reforzar visualmente el estado

---

## Sección Técnica

### Cambios de Código

```text
Archivo: src/components/compras/OrdenAccionesDialog.tsx

AGREGAR IMPORT (línea ~47):
+ import { ConciliacionRapidaDialog } from "./ConciliacionRapidaDialog";
+ import { FileCheck } from "lucide-react"; // Si no está importado

AGREGAR ESTADO (después de línea ~93):
+ const [conciliacionRapidaOpen, setConciliacionRapidaOpen] = useState(false);

AGREGAR BOTÓN en sección "Otras Acciones" (después de línea ~1918):
+ {/* Botón de Confirmar Costos - visible cuando hay conciliación pendiente */}
+ {(orden as any)?.status_conciliacion === 'por_conciliar' && (
+   <Button
+     variant="outline"
+     className="w-full justify-start text-amber-600 hover:text-amber-700 border-amber-300"
+     onClick={() => setConciliacionRapidaOpen(true)}
+   >
+     <FileCheck className="mr-2 h-4 w-4" />
+     Confirmar Costos
+     <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700">
+       Por Conciliar
+     </Badge>
+   </Button>
+ )}

AGREGAR DIÁLOGO (después de línea ~2280):
+ <ConciliacionRapidaDialog
+   open={conciliacionRapidaOpen}
+   onOpenChange={setConciliacionRapidaOpen}
+   ordenCompra={orden ? { id: orden.id, folio: orden.folio } : null}
+ />
```

### Flujo de Usuario

```text
1. Usuario abre OC que tiene status_conciliacion = 'por_conciliar'
2. En el menú de acciones ve el botón "Confirmar Costos" destacado en ámbar
3. Hace clic en el botón
4. Se abre ConciliacionRapidaDialog mostrando los productos y costos
5. Usuario puede editar los costos si es necesario
6. Hace clic en "Confirmar Costos"
7. Sistema actualiza:
   - ultimo_costo_compra en productos
   - Marca lotes como conciliados
   - Cambia status_conciliacion a 'conciliada'
8. El badge 'Por Conciliar' desaparece de la tabla principal
```

---

## Beneficios

1. **Acceso Directo**: No es necesario ir a Facturas → Registrar Factura → Conciliar
2. **Flujo Simplificado**: Un solo clic para conciliar OCs sin factura formal
3. **Visibilidad Clara**: El botón solo aparece cuando hay algo pendiente
4. **Consistencia**: Usa el mismo diálogo `ConciliacionRapidaDialog` que ya está probado
