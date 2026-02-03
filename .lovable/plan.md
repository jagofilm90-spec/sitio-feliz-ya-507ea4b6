
# Plan: Optimizar Headers y Contenido de Pestañas de Compras para Móvil

## Problemas Identificados

Revisé los 3 componentes principales dentro de las pestañas de Compras y encontré estos issues:

| Componente | Problema | Línea |
|------------|----------|-------|
| `OrdenesCompraTab.tsx` | Header con botón "Nueva Orden de Compra" se sale de pantalla móvil | 1616-1629 |
| `CalendarioEntregasTab.tsx` | Header "Calendario de Entregas" + botones no apilan en móvil | 536-565 |
| `OrdenesCompraTab.tsx` | Barra de búsqueda + switch no apilan en móvil | 1643-1669 |
| `ProveedoresTab.tsx` | Form grid 2 cols sin breakpoint móvil | 978 |

---

## Cambios Propuestos

### 1. `OrdenesCompraTab.tsx` - Header Principal (línea 1616-1629)

**Antes:**
```tsx
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-2xl font-bold">Órdenes de Compra</h2>
    ...
  </div>
  <Button onClick={handleNewOrder}>
    <Plus /> Nueva Orden de Compra
  </Button>
</div>
```

**Después:**
```tsx
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
  <div>
    <div className="flex items-center gap-2 sm:gap-3 mb-1">
      <h2 className="text-xl sm:text-2xl font-bold">Órdenes de Compra</h2>
      <LiveIndicator />
    </div>
    <p className="text-muted-foreground text-sm">
      Gestiona tus órdenes de compra y recepciones
    </p>
  </div>
  <Button onClick={handleNewOrder} className="w-full sm:w-auto">
    <Plus className="mr-2 h-4 w-4" />
    <span className="hidden sm:inline">Nueva Orden de Compra</span>
    <span className="sm:hidden">Nueva OC</span>
  </Button>
</div>
```

### 2. `OrdenesCompraTab.tsx` - Barra de Búsqueda (línea 1643-1669)

**Antes:**
```tsx
<div className="flex items-center gap-4 mb-4">
  <div className="relative flex-1">
    <Input ... />
  </div>
  <div className="flex items-center gap-2">
    <Switch ... />
    <Label ... className="whitespace-nowrap">Mostrar archivadas</Label>
  </div>
</div>
```

**Después:**
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
  <div className="relative w-full sm:flex-1">
    <Input ... />
  </div>
  <div className="flex items-center gap-2 w-full sm:w-auto">
    <Switch ... />
    <Label ... className="text-sm whitespace-nowrap cursor-pointer">
      <span className="hidden sm:inline">Mostrar archivadas</span>
      <span className="sm:hidden">Archivadas</span>
    </Label>
    ...
  </div>
</div>
```

### 3. `CalendarioEntregasTab.tsx` - Header (línea 536-565)

**Antes:**
```tsx
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-3">
    <CalendarIcon className="h-6 w-6" />
    <h2 className="text-2xl font-bold">Calendario de Entregas</h2>
    <LiveIndicator />
  </div>
  <div className="flex gap-2">
    <Button>Calendario</Button>
    <Button>Lista</Button>
  </div>
</div>
```

**Después:**
```tsx
<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
  <div className="flex items-center gap-2 sm:gap-3">
    <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6" />
    <h2 className="text-xl sm:text-2xl font-bold">Calendario de Entregas</h2>
    <LiveIndicator />
  </div>
  <div className="flex gap-2 w-full sm:w-auto">
    <Button className="flex-1 sm:flex-initial" size="sm">
      <CalendarIcon className="h-4 w-4 mr-1" />
      <span className="hidden sm:inline">Calendario</span>
      <span className="sm:hidden">Cal</span>
    </Button>
    <Button className="flex-1 sm:flex-initial" size="sm">
      <List className="h-4 w-4 mr-1" />
      <span className="hidden sm:inline">Lista</span>
      <span className="sm:hidden">Lista</span>
    </Button>
  </div>
</div>
```

### 4. `ProveedoresTab.tsx` - Form Grid (línea 978)

**Antes:**
```tsx
<div className="grid grid-cols-2 gap-4">
```

**Después:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

---

## Archivos a Modificar

| Archivo | Líneas | Cambios |
|---------|--------|---------|
| `src/components/compras/OrdenesCompraTab.tsx` | 1616-1629 | Header con stack móvil, botón con texto corto |
| `src/components/compras/OrdenesCompraTab.tsx` | 1643-1669 | Barra búsqueda con stack móvil |
| `src/components/compras/CalendarioEntregasTab.tsx` | 536-565 | Header con stack móvil, botones responsive |
| `src/components/compras/ProveedoresTab.tsx` | 978 | Grid form 1 col en móvil |

---

## Resultado Esperado

### Móvil (después):
```
┌─────────────────────────────┐
│ Órdenes de Compra     🔴    │
│ Gestiona tus órdenes...     │
│ [    Nueva OC          ]    │
│ [🔍 Buscar...          ]    │
│ 🔘 Archivadas (3)           │
└─────────────────────────────┘
```

- Títulos más pequeños (`text-xl` vs `text-2xl`)
- Botones ancho completo en móvil
- Textos abreviados en móvil ("Nueva OC" vs "Nueva Orden de Compra")
- Elementos apilados verticalmente
- Sin scroll horizontal
