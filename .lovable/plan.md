

# Plan: Mejorar Información de Entregas Parciales en Calendario

## Problema Actual

Cuando haces clic en un día del calendario y ves una entrega (como la del día 23 para OC-202601-0002):

1. **No hay alerta indicando qué se recibió específicamente ese día** - Solo muestra los productos generales de la OC
2. **En "Ver Recepción"** - Muestra TODOS los productos de la OC con cantidades acumuladas, sin distinguir qué se recibió en cada entrega

### Datos actuales en BD

| Entrega | Fecha | Tipo | productos_faltantes |
|---------|-------|------|---------------------|
| #1 | 2026-01-23 | Original | null |
| #2 | 2026-01-26 | Faltante | `[{cantidad: 40, nombre: "Papel Blanco Revolución"}]` |

---

## Solución Propuesta

### Cambio 1: Alerta en Diálogo del Día (CalendarioEntregasTab.tsx)

Cuando una entrega tiene `origen_faltante = true` o `productos_faltantes`, mostrar una alerta naranja/amarilla con los productos específicos de esa entrega.

**Ubicación**: Diálogo de detalle del día (líneas 583-680)

**Agregar**:
```tsx
{/* Alerta para entregas de faltante */}
{entrega.esFaltante && entrega.productosFaltantes && entrega.productosFaltantes.length > 0 && (
  <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800">
    <AlertTriangle className="h-4 w-4 text-orange-600" />
    <AlertDescription>
      <span className="font-medium">Productos recibidos en esta entrega:</span>
      <ul className="mt-1 ml-4 list-disc">
        {entrega.productosFaltantes.map((p, idx) => (
          <li key={idx}>
            <span className="font-medium">{p.cantidad_faltante}</span> {p.nombre}
          </li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
)}
```

### Cambio 2: Actualizar Query de Entregas

Incluir el campo `productos_faltantes` en la query de `entregasProgramadas`:

**Ubicación**: Query principal (líneas 59-101)

**Agregar al SELECT**:
```tsx
productos_faltantes
```

### Cambio 3: Actualizar Interface de Entrega

Agregar la propiedad `productosFaltantes` al tipo de entrega:

```tsx
productosFaltantes?: Array<{
  producto_id: string;
  codigo: string;
  nombre: string;
  cantidad_faltante: number;
}>;
```

### Cambio 4: Mapear productos_faltantes en todasLasEntregas

En el useMemo de `todasLasEntregas` (líneas 162-219):

```tsx
productosFaltantes: entrega.productos_faltantes || null,
```

---

## Cambio 5: Mejorar RecepcionDetalleDialog

Cuando la entrega tiene `origen_faltante = true`, mostrar una sección destacada al inicio indicando:

**Ubicación**: Después del header info (línea 532)

```tsx
{/* Alerta de entrega de faltante */}
{esEntregaFaltante && (
  <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800">
    <AlertTriangle className="h-4 w-4 text-orange-600" />
    <AlertTitle className="text-orange-800 dark:text-orange-300">
      Entrega de Productos Faltantes
    </AlertTitle>
    <AlertDescription className="text-orange-700 dark:text-orange-400">
      Esta recepción corresponde a productos que no llegaron en entregas anteriores.
      {productosFaltantes && productosFaltantes.length > 0 && (
        <ul className="mt-2 list-disc ml-4">
          {productosFaltantes.map((p, idx) => (
            <li key={idx}>
              <span className="font-medium">{p.cantidad_faltante}</span> {p.nombre} ({p.codigo})
            </li>
          ))}
        </ul>
      )}
    </AlertDescription>
  </Alert>
)}
```

### Cambio 6: Actualizar Query en RecepcionDetalleDialog

Incluir `origen_faltante` y `productos_faltantes` en la query de entrega:

**Ubicación**: loadRecepcion (líneas 148-162)

**Agregar al SELECT**:
```tsx
origen_faltante, productos_faltantes
```

---

## Resumen de Cambios

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/CalendarioEntregasTab.tsx` | 1. Agregar `productos_faltantes` a query 2. Agregar `productosFaltantes` al mapeo 3. Mostrar alerta en diálogo del día |
| `src/components/compras/RecepcionDetalleDialog.tsx` | 1. Agregar campos a query 2. Mostrar alerta destacada cuando es faltante |

---

## Resultado Esperado

### Al hacer clic en el día 23 (Entrega original):
- Se ve la OC con badge "Recibida"
- Lista de productos ordenados (sin alerta especial)

### Al hacer clic en el día 26 (Entrega de faltante):
- Se ve la OC con badges "Recibida" + "Faltante"
- **Alerta naranja**: "Productos recibidos en esta entrega: 40x Papel Blanco Revolución"

### En "Ver Recepción" de la entrega del día 26:
- **Alerta naranja al inicio**: "Esta recepción corresponde a productos que no llegaron en entregas anteriores."
- Lista específica: "40 Papel Blanco Revolución (PAP-001)"
- La tabla de productos muestra todo el contexto de la OC para referencia

