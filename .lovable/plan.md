

# Plan: Optimizar Layout de Lista de Precios

## Problema Detectado

Después de agregar la columna "Marca", hay dos problemas:

1. **Nombres truncados**: En la vista Admin, los nombres de producto se cortan (ej: "Almendrera" en vez del nombre completo) debido a `line-clamp-1`
2. **Espacio desperdiciado**: La tabla tiene anchos de columna fijos muy pequeños que no aprovechan pantallas grandes

---

## Solución Propuesta

### Cambio 1: Eliminar truncado de nombres

Quitar `line-clamp-1` de la columna "Producto" para que los nombres se muestren completos.

### Cambio 2: Optimizar anchos de columnas

Usar anchos proporcionales con `min-w-[X]` en vez de `w-[X]` fijos para que las columnas crezcan en pantallas grandes.

### Cambio 3: Reducir padding del contenedor

Actualmente hay `p-6` en el contenedor de `/precios`. Cambiarlo a `p-4` o `p-2` para maximizar espacio de tabla.

---

## Resultado Visual Esperado

```text
ANTES:
| Código | Producto       | Marca | Costo | Precio | ... |  <-- nombres truncados, mucho margen
| AZU001 | Almendrera...  | Zulka | $520  | $680   |     |

DESPUES:
| Código | Producto                          | Marca | Costo | Precio | Dto Max | Margen | ... |
| AZU001 | Almendrera garapiñada fileteada   | Zulka | $520  | $680   | $50     | 24%    |     |
```

---

## Sección Tecnica

### Archivo 1: `src/pages/Precios.tsx`

**Linea ~25-31** - Reducir padding del contenedor:

```tsx
// ANTES:
<div className="p-6">

// DESPUES:
<div className="p-2 sm:p-4">
```

---

### Archivo 2: `src/components/admin/AdminListaPreciosTab.tsx`

**Linea 488** - Eliminar line-clamp-1:

```tsx
// ANTES:
<span className="text-xs line-clamp-1">

// DESPUES:
<span className="text-xs">
```

**Lineas 402-470** - Optimizar anchos de columnas en TableHeader:

```tsx
// ANTES (ejemplo):
<TableHead className="w-[70px] py-2 px-2 text-[10px]">Codigo</TableHead>
<TableHead className="py-2 px-2 text-[10px]">Producto</TableHead>
<TableHead className="w-[80px] py-2 px-2 text-[10px]">Marca</TableHead>

// DESPUES:
<TableHead className="w-[60px] py-2 px-1.5 text-[10px]">Codigo</TableHead>
<TableHead className="min-w-[180px] py-2 px-1.5 text-[10px]">Producto</TableHead>
<TableHead className="w-[70px] py-2 px-1.5 text-[10px]">Marca</TableHead>
```

Cambios especificos por columna:
- Codigo: `w-[70px]` a `w-[60px]`
- Producto: sin ancho fijo, agregar `min-w-[180px]` para garantizar espacio minimo
- Marca: `w-[80px]` a `w-[70px]`
- Costo: `w-[80px]` a `w-[70px]`
- Precio: `w-[80px]` a `w-[70px]`
- Dto Max: `w-[70px]` a `w-[60px]`
- Margen: `w-[65px]` a `w-[55px]`
- Piso: `w-[70px]` a `w-[60px]`
- Espacio: `w-[65px]` a `w-[55px]`
- Estado: `w-[80px]` a `w-[70px]`
- Acciones: `w-[70px]` a `w-[60px]`

Reducir padding en celdas: `px-2` a `px-1.5`

---

### Archivo 3: `src/components/secretaria/SecretariaListaPreciosTab.tsx`

**Lineas 431-437** - Optimizar anchos:

```tsx
// ANTES:
<TableHead className="w-[70px]">Codigo</TableHead>
<TableHead>Producto</TableHead>
<TableHead className="w-[100px]">Marca</TableHead>
<TableHead className="w-[90px]">Precio</TableHead>
<TableHead className="w-[120px]">Descuento</TableHead>
<TableHead className="w-[60px]">Acciones</TableHead>

// DESPUES:
<TableHead className="w-[60px]">Codigo</TableHead>
<TableHead className="min-w-[200px]">Producto</TableHead>
<TableHead className="w-[80px]">Marca</TableHead>
<TableHead className="w-[80px]">Precio</TableHead>
<TableHead className="w-[100px]">Descuento</TableHead>
<TableHead className="w-[55px]">Acciones</TableHead>
```

---

### Archivo 4: `src/components/vendedor/VendedorListaPreciosTab.tsx`

**Lineas 143-148** - Optimizar anchos:

```tsx
// ANTES:
<TableHead className="w-[70px]">Codigo</TableHead>
<TableHead>Producto</TableHead>
<TableHead className="w-[100px]">Marca</TableHead>
<TableHead className="w-[80px]">Precio</TableHead>
<TableHead className="w-[100px]">Descuento</TableHead>

// DESPUES:
<TableHead className="w-[60px]">Codigo</TableHead>
<TableHead className="min-w-[200px]">Producto</TableHead>
<TableHead className="w-[80px]">Marca</TableHead>
<TableHead className="w-[70px]">Precio</TableHead>
<TableHead className="w-[90px]">Descuento</TableHead>
```

---

## Resumen de Cambios

| Componente | Cambio |
|------------|--------|
| Precios.tsx | Reducir padding de `p-6` a `p-2 sm:p-4` |
| AdminListaPreciosTab | Quitar `line-clamp-1`, reducir anchos fijos, agregar `min-w` a Producto |
| SecretariaListaPreciosTab | Reducir anchos fijos, agregar `min-w` a Producto |
| VendedorListaPreciosTab | Reducir anchos fijos, agregar `min-w` a Producto |

---

## Beneficios

1. Los nombres de productos se mostraran completos
2. La tabla aprovechara mejor el espacio disponible en pantallas grandes
3. Las columnas numericas mantendran su alineacion
4. El diseño seguira siendo compacto pero legible

