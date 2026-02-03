
# Auditoría de Problemas Móviles en Diálogos y Pantallas

## Resumen del Análisis

Revisé **91 archivos** con `grid-cols-2`, **45 archivos** con `grid-cols-3`, **28 archivos** con `grid-cols-4`, **89 diálogos** con `DialogContent`, y **20 archivos** con botones de acción `flex justify-end gap`.

---

## Problemas Identificados

### 🔴 CRÍTICOS (Afectan usabilidad móvil)

| # | Componente | Problema | Línea |
|---|-----------|----------|-------|
| 1 | `AutorizacionOCDialog.tsx` | Grid 2 cols sin breakpoint móvil + tabla sin overflow | 208, 248 |
| 2 | `AutorizacionCotizacionDialog.tsx` | Grid 2 cols sin breakpoint móvil + tabla sin overflow | 210, 255 |
| 3 | `RegistrarRecepcionDialog.tsx` | Grid 2 cols, grid 4 cols sin breakpoints | 565, 634, 690 |
| 4 | `SucursalFormSheet.tsx` | Grid 3 cols sin breakpoint móvil | 255 |
| 5 | `MigracionProductosDialog.tsx` | Grid 3 cols en información muy densa | 314, 332, 473, 493 |
| 6 | `NuevoPedidoDialog.tsx` | Botones acción en línea sin stack móvil | 801 |
| 7 | `DisponibilidadPersonalTab.tsx` | Grid 4 cols sin breakpoint móvil | 312 |
| 8 | `SugerirRutasAIDialog.tsx` | Grid 4 cols stats sin breakpoint | 452 |

### 🟡 MODERADOS (Funcionan pero podrían mejorar)

| # | Componente | Problema | Línea |
|---|-----------|----------|-------|
| 9 | `VehiculosTab.tsx` | Grid 4 cols en dimensiones + grid 3 cols | 937, 1003, 1083 |
| 10 | `AlmacenFumigacionesTab.tsx` | TabsList grid 4 cols muy apretado | 308 |
| 11 | `OrdenAccionesDialog.tsx` | Dashboard grid 4 cols contador | 1710 |

---

## Detalle de Cambios por Archivo

### 1. `AutorizacionOCDialog.tsx`
```tsx
// Línea 208 - Grid de información
<div className="grid grid-cols-2 gap-4 mb-4">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

// Línea 247-248 - Tabla de productos
<div className="border rounded-lg overflow-hidden">
  <table className="w-full text-sm">
// Cambiar a:
<div className="border rounded-lg overflow-x-auto">
  <table className="w-full text-sm min-w-[400px] sm:min-w-0">
```

### 2. `AutorizacionCotizacionDialog.tsx`
```tsx
// Línea 210 - Grid de información
<div className="grid grid-cols-2 gap-4 mb-4">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

// Línea 254-255 - Tabla de productos
<div className="border rounded-lg overflow-hidden">
  <table className="w-full text-sm">
// Cambiar a:
<div className="border rounded-lg overflow-x-auto">
  <table className="w-full text-sm min-w-[400px] sm:min-w-0">
```

### 3. `RegistrarRecepcionDialog.tsx`
```tsx
// Línea 565 - Grid control recepción
<div className="grid grid-cols-2 gap-4">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

// Línea 634 - Grid proveedor/estado
<div className="grid grid-cols-2 gap-4 mb-4">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

// Línea 690 - Grid cantidades producto
<div className="grid grid-cols-4 gap-2 text-sm mt-3">
// Cambiar a:
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm mt-3">
```

### 4. `SucursalFormSheet.tsx`
```tsx
// Línea 255 - Grid código/nombre/CL
<div className="grid grid-cols-3 gap-3">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
```

### 5. `MigracionProductosDialog.tsx`
```tsx
// Líneas 314, 332, 473, 493 - Grids de datos
<div className="grid grid-cols-3 gap-2">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
```

### 6. `NuevoPedidoDialog.tsx`
```tsx
// Línea 801 - Botones acción
<div className="flex justify-end gap-3">
// Cambiar a:
<div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
  <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
    Cancelar
  </Button>
  <Button onClick={handleCrearPedido} disabled={loading} className="w-full sm:w-auto">
    {loading ? "Creando..." : "Crear Pedido"}
  </Button>
</div>
```

### 7. `DisponibilidadPersonalTab.tsx`
```tsx
// Línea 312 - Grid stats
<div className="grid grid-cols-4 gap-4">
// Cambiar a:
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```

### 8. `SugerirRutasAIDialog.tsx`
```tsx
// Línea 452 - Grid summary stats
<div className="grid grid-cols-4 gap-3 flex-shrink-0">
// Cambiar a:
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
```

### 9. `VehiculosTab.tsx`
```tsx
// Líneas 937, 1003 - Grid 3 cols
<div className="grid grid-cols-3 gap-4">
// Cambiar a:
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

// Línea 1083 - Grid 4 cols dimensiones
<div className="grid grid-cols-4 gap-4">
// Cambiar a:
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
```

---

## Archivos a Modificar (Resumen)

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/AutorizacionOCDialog.tsx` | 2 grids + 2 tablas |
| `src/components/cotizaciones/AutorizacionCotizacionDialog.tsx` | 2 grids + 1 tabla |
| `src/components/compras/RegistrarRecepcionDialog.tsx` | 3 grids |
| `src/components/clientes/SucursalFormSheet.tsx` | 1 grid |
| `src/components/secretaria/MigracionProductosDialog.tsx` | 4 grids |
| `src/components/pedidos/NuevoPedidoDialog.tsx` | 1 flex buttons |
| `src/components/rutas/DisponibilidadPersonalTab.tsx` | 1 grid |
| `src/components/rutas/SugerirRutasAIDialog.tsx` | 1 grid |
| `src/components/rutas/VehiculosTab.tsx` | 3 grids |

**Total: 9 archivos, ~20 cambios**

---

## Patrones Correctos ya Existentes (Referencia)

Estos archivos **ya están optimizados** y sirven como referencia:

✅ `RecepcionDetalleDialog.tsx` - Grids con `grid-cols-1 sm:grid-cols-2`
✅ `MonitoreoRutasTab.tsx` - Stats con `grid-cols-2 md:grid-cols-4`
✅ `AsignacionesDelDiaTab.tsx` - Stats con `grid-cols-2 md:grid-cols-4`
✅ `VendedorMisVentasTab.tsx` - KPIs con `grid-cols-2 lg:grid-cols-4`

---

## Prioridad de Implementación

1. **Alta**: Diálogos de autorización (OC y Cotización) - Se usan frecuentemente desde móvil
2. **Alta**: RegistrarRecepcionDialog - Almacenistas usan tablets/móvil
3. **Media**: SucursalFormSheet - Formulario de uso común
4. **Media**: NuevoPedidoDialog - Botones críticos
5. **Baja**: Tabs de rutas y vehículos - Menos uso móvil

---

## Resultado Esperado

Después de aplicar estos cambios:

- **0 scroll horizontal** en diálogos móviles
- **Información legible** en pantallas pequeñas
- **Botones táctiles** de ancho completo
- **Consistencia** con el patrón establecido en otros módulos
