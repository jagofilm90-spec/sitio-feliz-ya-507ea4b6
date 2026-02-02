
# Plan: Optimizar Diálogo de Recepción para Móvil

## Problema Identificado

El diálogo `RecepcionDetalleDialog` ya tiene la clase `w-[calc(100vw-2rem)]` en el contenedor, pero el **contenido interno** tiene múltiples elementos que causan scroll horizontal en móvil:

- Tablas con columnas fijas que no se adaptan
- Grids de 2-3 columnas sin breakpoints móviles
- Botones de acción en línea que se desbordan

---

## Cambios Necesarios

### 1. Grid de Información de Recepción (línea 730)
```tsx
// Antes
<div className="grid grid-cols-2 gap-4">

// Después  
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### 2. Grid de Datos de Llegada (línea 753)
```tsx
// Antes
<div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">

// Después
<div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
```

### 3. Tabla de Productos Esta Entrega (líneas 823-843)
Convertir a tarjetas en móvil o usar tabla responsive con scroll controlado:
```tsx
// Antes: Tabla con 3 columnas fijas
<table className="w-full text-sm">
  <thead>...</thead>

// Después: Contenedor scrollable o tarjetas móviles
<div className="overflow-x-auto">
  <table className="w-full text-sm min-w-[400px] sm:min-w-0">
    ...
  </table>
</div>
```

### 4. Tabla Resumen OC Colapsible (líneas 862-905)
Similar - 5 columnas son demasiadas para móvil:
```tsx
// Agregar scroll horizontal controlado
<div className="overflow-x-auto">
  <table className="w-full text-sm min-w-[500px] sm:min-w-0">
```

### 5. Grid de Firmas (línea 962)
```tsx
// Antes
<div className="grid grid-cols-2 gap-4">

// Después
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### 6. Botones de Acción (líneas 989-1029)
Convertir a stack vertical en móvil:
```tsx
// Antes
<div className="flex justify-end gap-2 pt-4 border-t">
  <Button>Vista Previa</Button>
  <Button>Descargar PDF</Button>
  <Button>Reenviar a Proveedor</Button>
</div>

// Después
<div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4 border-t">
  <Button className="w-full sm:w-auto">Reenviar a Proveedor</Button>
  <Button className="w-full sm:w-auto">Descargar PDF</Button>
  <Button className="w-full sm:w-auto">Vista Previa</Button>
</div>
```

---

## Archivo a Modificar

| Archivo | Líneas | Cambio |
|---------|--------|--------|
| `RecepcionDetalleDialog.tsx` | 730 | Grid 1 col móvil |
| | 753 | Grid 1 col móvil |
| | 822 | Tabla con overflow-x-auto |
| | 858 | Tabla colapsible con overflow-x-auto |
| | 962 | Grid firmas 1 col móvil |
| | 989-1029 | Botones stack vertical |

---

## Resultado Esperado

### Móvil (después):
```
┌─────────────────────────────────┐
│ 📦 Detalle de Recepción      ✕ │
├─────────────────────────────────┤
│ OC-2025-001                     │
│ Entrega #1  [recibida]          │
│                                 │
│ Proveedor XYZ                   │
│ 15 Enero 2025                   │
├─────────────────────────────────┤
│ 📊 Resumen de la OC             │
│ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ 5/6 │ │  1  │ │ 83% │        │
│ │Comp.│ │Pend.│ │Avanc│        │
│ └─────┘ └─────┘ └─────┘        │
├─────────────────────────────────┤
│ Recibido por:                   │
│ Juan Pérez                      │
│                                 │
│ Bultos recibidos:               │
│ 45 bultos                       │
├─────────────────────────────────┤
│ 📦 Productos Esta Entrega       │
│ ← scroll horizontal →           │
│ ┌─────────────────────────────┐ │
│ │Código │Producto│  Cantidad  │ │
│ │AZUC01 │Azúcar  │    100     │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 📷 Evidencias (4)               │
│ [img] [img]                     │
│ [img] [img]                     │
├─────────────────────────────────┤
│ ✍️ Firmas                       │
│ ┌─────────────────────────────┐ │
│ │ [Firma Almacenista]         │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [Firma Chofer]              │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ [Reenviar a Proveedor      ]   │
│ [Descargar PDF             ]   │
│ [Vista Previa              ]   │
└─────────────────────────────────┘
```

### Beneficios:
- Sin scroll horizontal
- Información apilada verticalmente
- Botones táctiles de ancho completo
- Tablas con scroll controlado solo cuando necesario
- Firmas una debajo de otra para mejor visibilidad

---

## Lo que NO cambia

- Funcionalidad de carga de datos
- Lógica de generación de PDF
- Envío de correo al proveedor
- Estructura general del diálogo
