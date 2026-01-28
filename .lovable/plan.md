

# Plan: Maximizar Uso de Espacio en Tabla de Precios

## Problema Identificado

Mirando tu captura de pantalla, veo claramente que:
1. La tabla tiene espacio en blanco a la derecha que no se aprovecha
2. Las columnas tienen anchos fijos muy pequenos que no crecen
3. La columna "Producto" no se expande para llenar el espacio disponible

---

## Causa Raiz

El problema es que todas las columnas tienen anchos fijos (`w-[60px]`, `w-[70px]`, etc.) y la columna "Producto" solo tiene `min-w-[180px]` pero no tiene nada que le diga que debe **expandirse** para llenar el espacio restante.

---

## Solucion Propuesta

### Estrategia: Hacer que "Producto" sea columna flexible

1. Quitar `min-w-[180px]` de la columna Producto
2. Agregar clase `flex-1` equivalente para tablas: dejar la columna **sin ancho fijo** para que absorba todo el espacio disponible
3. Agregar `table-fixed` al contenedor para mejor control de anchos

---

## Resultado Visual Esperado

```text
ANTES (tu captura):
| Código | Producto | Marca | Costo | Precio | ... | Acciones | [espacio vacio] |

DESPUES:
| Código | Producto (se expande a llenar) | Marca | Costo | Precio | ... | Acciones |
```

---

## Seccion Tecnica

### Archivo: `src/components/admin/AdminListaPreciosTab.tsx`

**Cambio 1 - Linea 399**: Agregar `table-fixed` al componente Table:
```tsx
// ANTES:
<Table>

// DESPUES:
<Table className="table-fixed w-full">
```

**Cambio 2 - Linea 411-419**: Modificar columna Producto para que sea flexible:
```tsx
// ANTES:
<TableHead 
  className="min-w-[180px] py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50"
  onClick={() => handleSort('nombre')}
>

// DESPUES:
<TableHead 
  className="py-2 px-1.5 text-[10px] cursor-pointer hover:bg-muted/50"
  onClick={() => handleSort('nombre')}
>
```
(Sin ancho fijo, la columna tomara todo el espacio restante)

**Cambio 3**: Ajustar anchos de las demas columnas para que sean mas compactas:
```tsx
// Codigo: w-[55px] (era w-[60px])
// Marca: w-[65px] (era w-[70px])
// Costo: w-[65px] (era w-[70px])
// Precio: w-[65px] (era w-[70px])
// Dto Max: w-[55px] (era w-[60px])
// Margen: w-[50px] (era w-[55px])
// Piso: w-[55px] (era w-[60px])
// Espacio: w-[50px] (era w-[55px])
// Estado: w-[65px] (era w-[70px])
// Acciones: w-[55px] (era w-[60px])
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| AdminListaPreciosTab.tsx | Agregar `table-fixed`, quitar ancho de Producto, reducir anchos fijos |
| SecretariaListaPreciosTab.tsx | Mismos cambios para consistencia |
| VendedorListaPreciosTab.tsx | Mismos cambios para consistencia |

---

## Beneficio

La columna "Producto" ahora absorbera todo el espacio disponible, mostrando nombres completos y eliminando el espacio desperdiciado a la derecha de la tabla.

