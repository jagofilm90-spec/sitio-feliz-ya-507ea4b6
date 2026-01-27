
# Plan: Indicador de Porcentaje de Avance de Recepción en Tabla de OC

## Objetivo

Agregar una columna visual en la tabla de Órdenes de Compra que muestre el porcentaje de avance de recepción, permitiendo identificar rápidamente cuáles OC están parciales, completas o sin recepciones.

## Diseño Visual Propuesto

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Folio      │ Proveedor   │ Fecha     │ Total  │ Recepción    │ Estado  │ ...       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ OC-0005    │ Proveedor A │ 27/01     │ $5,000 │ ████████ 100%│ Complet │           │
│ OC-0004    │ Proveedor B │ 25/01     │ $3,200 │ ░░░░░░░░   0%│ Enviada │           │
│ OC-0003    │ Proveedor C │ 23/01     │ $8,500 │ █████░░░  62%│ Parcial │           │
│ OC-0002    │ Proveedor D │ 20/01     │ $1,800 │ ████████ 100%│ Complet │           │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Colores del Indicador

| Porcentaje | Color | Significado |
|------------|-------|-------------|
| 0% | Gris | Sin recepciones |
| 1-49% | Naranja | Recepción baja |
| 50-99% | Azul | Recepción parcial |
| 100% | Verde | Completa |

---

## Datos Disponibles

La query actual ya incluye `ordenes_compra_detalles` con:
- `cantidad_ordenada`: Unidades pedidas por producto
- `cantidad_recibida`: Unidades recibidas por producto

**Verificación de datos reales:**
```text
OC-202601-0005: 1200/1200 = 100% (completada)
OC-202601-0004: 0/400 = 0% (enviada)
OC-202601-0003: 600/600 = 100% (completada)
OC-202601-0002: 290/290 = 100% (completada)
```

---

## Cambios Técnicos

### Archivo: `src/components/compras/OrdenesCompraTab.tsx`

**Cambio 1: Agregar import del componente Progress**

En la sección de imports (línea 1-66):

```tsx
import { Progress } from "@/components/ui/progress";
```

**Cambio 2: Crear función helper para calcular el porcentaje**

Después de la función `getStatusBadge` (línea 1593):

```tsx
// Calcular porcentaje de recepción de una OC
const calcularPorcentajeRecepcion = (orden: any): number => {
  const detalles = orden.ordenes_compra_detalles || [];
  if (detalles.length === 0) return 0;
  
  const totalOrdenado = detalles.reduce((sum: number, d: any) => 
    sum + (d.cantidad_ordenada || 0), 0);
  const totalRecibido = detalles.reduce((sum: number, d: any) => 
    sum + (d.cantidad_recibida || 0), 0);
  
  if (totalOrdenado === 0) return 0;
  return Math.round((totalRecibido / totalOrdenado) * 100);
};

// Obtener color según porcentaje
const getProgressColor = (porcentaje: number): string => {
  if (porcentaje === 0) return "bg-gray-400";
  if (porcentaje < 50) return "bg-orange-500";
  if (porcentaje < 100) return "bg-blue-500";
  return "bg-green-500";
};
```

**Cambio 3: Agregar columna "Recepción" en el encabezado de la tabla**

Modificar el TableHeader (líneas 1638-1650), agregar después de "Total":

```tsx
<TableHeader>
  <TableRow>
    <TableHead>Folio</TableHead>
    <TableHead>Proveedor</TableHead>
    <TableHead>Fecha</TableHead>
    <TableHead>Total</TableHead>
    <TableHead className="w-32">Recepción</TableHead>  {/* NUEVA COLUMNA */}
    <TableHead>Estado</TableHead>
    <TableHead>Pago</TableHead>
    <TableHead>Confirmación</TableHead>
    <TableHead>Programación</TableHead>
    <TableHead>Acciones</TableHead>
  </TableRow>
</TableHeader>
```

**Cambio 4: Agregar celda con indicador visual en cada fila**

Dentro del mapeo de `filteredOrdenes` (después de línea 1679), agregar después de la celda de Total:

```tsx
{/* Indicador de Recepción */}
<TableCell>
  {(() => {
    const porcentaje = calcularPorcentajeRecepcion(orden);
    const colorClass = getProgressColor(porcentaje);
    
    return (
      <div className="flex items-center gap-2 min-w-[100px]">
        <div className="flex-1">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${colorClass}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
        </div>
        <span className={`text-xs font-medium min-w-[32px] text-right ${
          porcentaje === 100 
            ? 'text-green-600 dark:text-green-400' 
            : porcentaje > 0 
              ? 'text-blue-600 dark:text-blue-400' 
              : 'text-muted-foreground'
        }`}>
          {porcentaje}%
        </span>
      </div>
    );
  })()}
</TableCell>
```

**Cambio 5: Actualizar columna vacía en TableRow cuando no hay órdenes**

Modificar la celda vacía (línea 1654) para reflejar la nueva cantidad de columnas:

```tsx
<TableCell colSpan={10} className="text-center text-muted-foreground">
  No hay órdenes de compra registradas
</TableCell>
```

---

## Resultado Esperado

### OC con 100% de recepción:
```text
┌──────────────────────────┐
│ ██████████████████ 100%  │  (Verde)
└──────────────────────────┘
```

### OC con recepción parcial (62%):
```text
┌──────────────────────────┐
│ ████████████░░░░░░  62%  │  (Azul)
└──────────────────────────┘
```

### OC sin recepciones (0%):
```text
┌──────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░   0%  │  (Gris)
└──────────────────────────┘
```

---

## Archivo a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/OrdenesCompraTab.tsx` | 1. Import de Progress (opcional, usamos div) 2. Función `calcularPorcentajeRecepcion` 3. Función `getProgressColor` 4. Nueva columna "Recepción" en TableHeader 5. Nueva celda con barra de progreso en cada TableRow 6. Actualizar colSpan de fila vacía |

---

## Beneficios

1. **Visibilidad instantánea**: De un vistazo ves cuáles OC están parciales
2. **Sin cálculos mentales**: El porcentaje es claro y directo
3. **Código ligero**: Usa data que ya se carga en la query existente
4. **Consistencia visual**: Mismo estilo de barras de progreso que en RecepcionDetalleDialog
5. **Performance**: No requiere queries adicionales, solo cálculo en memoria

---

## Detalles Técnicos

### Cálculo del Porcentaje

```tsx
const totalOrdenado = detalles.reduce((sum, d) => sum + d.cantidad_ordenada, 0);
const totalRecibido = detalles.reduce((sum, d) => sum + d.cantidad_recibida, 0);
const porcentaje = Math.round((totalRecibido / totalOrdenado) * 100);
```

### Escala de Colores

| Rango | Clase CSS | Color |
|-------|-----------|-------|
| 0% | `bg-gray-400` | Gris neutro |
| 1-49% | `bg-orange-500` | Naranja (alerta) |
| 50-99% | `bg-blue-500` | Azul (en progreso) |
| 100% | `bg-green-500` | Verde (completo) |
