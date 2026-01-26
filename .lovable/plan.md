

# Plan: Sincronizar Vista de Recepción para Entregas de Faltantes

## Problema Principal

Cuando el almacenista recibe una entrega de faltante (`origen_faltante = true`), la interfaz muestra **todos los productos de la OC** en lugar de solo los productos que faltaron. Esto es confuso y puede causar errores en la recepción.

**Ejemplo actual (incorrecto):**
- OC-202601-0002 tuvo faltante de 40 unidades de "Papel Blanco Revolución"
- Cuando el almacenista abre la entrega #2 (faltante), ve:
  - Papel Bala Rojo: 250 (ya recibido)
  - Papel Blanco Revolución: 40 (el faltante)
- Debería ver SOLO:
  - Papel Blanco Revolución: 40

---

## Cambios a Realizar

### 1. Guardar `producto_id` al crear entregas de faltantes

**Archivo:** `src/components/almacen/AlmacenRecepcionSheet.tsx`

Actualmente (línea 932-942):
```typescript
productos_faltantes: productosFaltantesData
```

El array `productosFaltantesData` NO incluye el `producto_id`. Hay que modificar la generación de este array para incluirlo:

```typescript
// Antes
const productosFaltantesData = [{ nombre, cantidad_faltante }];

// Después  
const productosFaltantesData = [{ 
  producto_id: producto.producto_id,  // <-- AGREGAR
  nombre, 
  cantidad_faltante,
  codigo: producto.producto?.codigo   // <-- AGREGAR para referencia
}];
```

### 2. Mostrar solo productos faltantes en la lista de entregas

**Archivo:** `src/components/almacen/AlmacenRecepcionTab.tsx`

En el componente `ProductosEntregaList`, verificar si la entrega tiene `origen_faltante` y usar `productos_faltantes` en lugar de los productos de la OC:

```typescript
// Si es entrega de faltante, usar productos_faltantes
if (entrega.origen_faltante && entrega.productos_faltantes) {
  return entrega.productos_faltantes.map(pf => ({
    nombre: pf.nombre,
    cantidad: pf.cantidad_faltante
  }));
}
// Si no, usar productos de la OC
return entrega.productos;
```

### 3. Filtrar productos en `AlmacenRecepcionSheet` para entregas de faltantes

**Archivo:** `src/components/almacen/AlmacenRecepcionSheet.tsx`

En la función `loadProductos()`, agregar lógica para filtrar:

```typescript
const loadProductos = async () => {
  // ... código existente ...
  
  // Si es entrega de faltante, filtrar solo los productos que faltaron
  if (entrega.origen_faltante && entrega.productos_faltantes) {
    const productosFaltantesIds = entrega.productos_faltantes
      .map(pf => pf.producto_id)
      .filter(Boolean);
    
    // Filtrar solo los productos que están en la lista de faltantes
    productosData = productosData.filter(p => 
      productosFaltantesIds.includes(p.producto_id) ||
      // Fallback: buscar por nombre si no hay producto_id
      entrega.productos_faltantes.some(pf => 
        pf.nombre === p.producto?.nombre
      )
    );
    
    // Ajustar cantidades esperadas según los faltantes
    productosData = productosData.map(p => {
      const faltante = entrega.productos_faltantes.find(
        pf => pf.producto_id === p.producto_id || pf.nombre === p.producto?.nombre
      );
      return {
        ...p,
        // Sobreescribir cantidad ordenada con cantidad faltante
        cantidad_ordenada: faltante?.cantidad_faltante || p.cantidad_ordenada,
        cantidad_recibida: 0 // Resetear para esta entrega
      };
    });
  }
  
  setProductos(productosData);
};
```

### 4. Incluir campos de faltantes en las queries

**Archivo:** `src/components/almacen/AlmacenRecepcionTab.tsx`

Agregar `origen_faltante` y `productos_faltantes` a la query de entregas (línea 119-145):

```typescript
.select(`
  id,
  numero_entrega,
  cantidad_bultos,
  fecha_programada,
  fecha_entrega_real,
  status,
  notas,
  origen_faltante,        // <-- AGREGAR
  productos_faltantes,     // <-- AGREGAR
  llegada_registrada_en,
  ...
`)
```

### 5. Actualizar interface `EntregaCompra`

En ambos archivos, actualizar la interface para incluir los nuevos campos:

```typescript
interface EntregaCompra {
  // ... campos existentes ...
  origen_faltante?: boolean;
  productos_faltantes?: Array<{
    producto_id?: string;
    nombre: string;
    cantidad_faltante: number;
    codigo?: string;
  }>;
}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/almacen/AlmacenRecepcionTab.tsx` | Agregar campos a query, mostrar productos faltantes específicos |
| `src/components/almacen/AlmacenRecepcionSheet.tsx` | Guardar `producto_id` en faltantes, filtrar productos en recepción |

---

## Corrección de Datos Existentes

Ejecutar migración SQL para agregar `producto_id` a los faltantes existentes (basándose en el nombre del producto):

```sql
-- Actualizar productos_faltantes existentes para incluir producto_id
UPDATE ordenes_compra_entregas e
SET productos_faltantes = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'producto_id', p.id,
      'nombre', pf->>'nombre',
      'cantidad_faltante', (pf->>'cantidad_faltante')::int,
      'codigo', p.codigo
    )
  )
  FROM jsonb_array_elements(e.productos_faltantes) pf
  LEFT JOIN productos p ON p.nombre = pf->>'nombre'
)
WHERE e.origen_faltante = true
AND e.productos_faltantes IS NOT NULL;
```

---

## Resultado Esperado

Después de estos cambios:

1. Al crear una entrega de faltante, se guardará el `producto_id` correctamente
2. En la lista de entregas pendientes, el almacenista verá solo los productos que faltan
3. Al completar la recepción de un faltante, solo aparecerán los productos faltantes para registrar
4. Las cantidades esperadas serán las correctas (solo lo que faltó)

```text
┌──────────────────────────────────────────────────────────────────────┐
│  VISTA CORREGIDA - Entrega de Faltante                              │
├──────────────────────────────────────────────────────────────────────┤
│  OC-202601-0002 - ENVOLPAN                                          │
│  Entrega #2 (Faltante)                                              │
│  ────────────────────────────────                                   │
│  📦 Productos (1):                                                  │
│    • Papel Blanco Revolución ................ 40 unidades          │
│                                                                      │
│  [Registrar Llegada]                                                │
└──────────────────────────────────────────────────────────────────────┘
```

