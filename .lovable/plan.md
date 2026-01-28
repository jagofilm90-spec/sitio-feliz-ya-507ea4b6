

# Plan: Agregar Columna de Marca en Lista de Precios

## Objetivo
Agregar una columna dedicada "Marca" en las tres vistas de Lista de Precios para facilitar la identificación de productos con el mismo nombre pero de diferentes marcas.

---

## Componentes a Modificar

### 1. AdminListaPreciosTab.tsx
**Cambios en tabla (Desktop):**
- Agregar columna "Marca" entre "Producto" y "Costo"
- Ancho: ~80px
- Mostrar marca con texto azul distintivo
- Si no tiene marca: mostrar "—"

### 2. SecretariaListaPreciosTab.tsx
**Cambios en tabla (Desktop):**
- Agregar columna "Marca" entre "Producto" y "Precio"
- Mantener consistencia visual con Admin
- Actualizar colspan de separadores de categoría (de 5 a 6)

### 3. VendedorListaPreciosTab.tsx
**Cambios en tabla (Desktop):**
- Agregar columna "Marca" entre "Producto" y "Precio"
- Solo lectura, estilo visual consistente
- Actualizar colspan de separadores de categoría (de 4 a 5)

---

## Vista Móvil
En las vistas móviles, la marca ya se muestra como subtexto debajo del nombre del producto. Este comportamiento se mantiene porque en móvil agregar columnas adicionales no es práctico.

---

## Resultado Visual (Desktop)

### Admin:
```text
| Código | Producto         | Marca      | Costo  | Precio | Dto Max | Margen | Piso | Espacio | Estado | Acciones |
|--------|------------------|------------|--------|--------|---------|--------|------|---------|--------|----------|
| AZU001 | Azúcar refinada  | Potrero    | $520   | $680   | $50     | 24%    | $550 | $130    | OK     | 🔧       |
| AZU002 | Azúcar refinada  | Zulka      | $540   | $700   | $40     | 23%    | $560 | $140    | OK     | 🔧       |
```

### Secretaria:
```text
| Código | Producto         | Marca      | Precio  | Descuento | Acciones |
|--------|------------------|------------|---------|-----------|----------|
| AZU001 | Azúcar refinada  | Potrero    | $680.00 | -$50→$630 | ✏️ 📜    |
| AZU002 | Azúcar refinada  | Zulka      | $700.00 | -$40→$660 | ✏️ 📜    |
```

### Vendedor (solo lectura):
```text
| Código | Producto         | Marca      | Precio  | Descuento |
|--------|------------------|------------|---------|-----------|
| AZU001 | Azúcar refinada  | Potrero    | $680.00 | -$50→$630 |
| AZU002 | Azúcar refinada  | Zulka      | $700.00 | -$40→$660 |
```

---

## Sección Técnica

### AdminListaPreciosTab.tsx

**Línea ~411-417 - Agregar TableHead para Marca:**
```tsx
<TableHead 
  className="py-2 px-2 text-[10px] cursor-pointer hover:bg-muted/50"
  onClick={() => handleSort('nombre')}
>
  ...Producto
</TableHead>
// AGREGAR AQUÍ:
<TableHead className="w-[80px] py-2 px-2 text-[10px]">
  Marca
</TableHead>
<TableHead 
  className="w-[80px] py-2 px-2 text-[10px] text-right cursor-pointer hover:bg-muted/50"
  onClick={() => handleSort('costo')}
>
  ...Costo
</TableHead>
```

**Línea ~483-493 - Agregar TableCell para Marca:**
```tsx
<TableCell className="py-1 px-2">
  <span className="text-xs line-clamp-1">
    {producto.nombre}
    {producto.especificaciones && (
      <span className="text-purple-600 dark:text-purple-400 ml-1">
        {producto.especificaciones}
      </span>
    )}
  </span>
</TableCell>
// AGREGAR AQUÍ:
<TableCell className="py-1 px-2">
  {producto.marca ? (
    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
      {producto.marca}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  )}
</TableCell>
```

---

### SecretariaListaPreciosTab.tsx

**Líneas ~431-436 - Agregar TableHead:**
```tsx
<TableHead className="py-2 px-2 text-[10px]">Producto</TableHead>
// AGREGAR:
<TableHead className="w-[100px] py-2 px-2 text-[10px]">Marca</TableHead>
<TableHead className="w-[90px] py-2 px-2 text-[10px] text-right">Precio</TableHead>
```

**Línea ~443 - Actualizar colspan:**
```tsx
// ANTES:
<TableCell colSpan={5} ...>
// DESPUÉS:
<TableCell colSpan={6} ...>
```

**Líneas ~453-472 - Agregar TableCell (después de Producto):**
```tsx
// Después de la celda de Producto, agregar:
<TableCell className="py-1 px-2">
  {producto.marca ? (
    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
      {producto.marca}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  )}
</TableCell>
```

---

### VendedorListaPreciosTab.tsx

**Líneas ~143-147 - Agregar TableHead:**
```tsx
<TableHead className="py-2 px-2 text-[10px]">Producto</TableHead>
// AGREGAR:
<TableHead className="w-[100px] py-2 px-2 text-[10px]">Marca</TableHead>
<TableHead className="w-[80px] py-2 px-2 text-[10px] text-right">Precio</TableHead>
```

**Línea ~154 - Actualizar colspan:**
```tsx
// ANTES:
<TableCell colSpan={4} ...>
// DESPUÉS:
<TableCell colSpan={5} ...>
```

**Líneas ~164-206 - Agregar TableCell (después de Producto):**
```tsx
// Después de la celda de Producto (línea ~206), agregar:
<TableCell className="py-1 px-2">
  {producto.marca ? (
    <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
      {producto.marca}
    </span>
  ) : (
    <span className="text-xs text-muted-foreground">—</span>
  )}
</TableCell>
```

---

## Beneficios

| Antes | Después |
|-------|---------|
| Marca como subtexto en Producto | Columna dedicada "Marca" |
| Difícil escanear visualmente | Fácil comparar productos por marca |
| Inconsistente entre vistas | Consistente en Admin, Secretaria y Vendedor |
| Solo visible en vista móvil | Visible en desktop y móvil |

---

## Notas
- La búsqueda por marca ya funciona en los tres componentes
- El estilo azul para marca mantiene consistencia con el diseño actual
- Las vistas móviles mantienen su diseño compacto actual donde la marca ya aparece

