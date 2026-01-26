
# Plan: Vista Unificada de Análisis Costo-Precio-Margen para Admin

## Problema Identificado

Como administrador/dueño, necesitas ver en un solo lugar:
1. **Costo** (ultimo costo y costo promedio ponderado)
2. **Precio de venta** y descuento maximo
3. **Analisis de margen** (porcentaje, piso minimo, espacio de negociacion)
4. **Estado del margen** (perdida, critico, bajo, saludable)
5. **Simulador** para responder "hasta donde puedo bajar?"

Actualmente la pagina `/precios` muestra la misma vista para Admin y Secretaria, pero el Admin deberia ver la informacion completa de analisis.

---

## Solucion Propuesta

### Opcion A: Mejorar la pagina `/precios` para Admin (RECOMENDADA)

Modificar la pagina para que cuando el usuario sea **Admin**, muestre una version enriquecida con:
- Columnas adicionales: Costo Prom., Margen %, Piso Min., Espacio, Estado
- Simulador de precio integrado
- Indicadores visuales de salud del margen

```text
┌────────────────────────────────────────────────────────────────────────────────────┐
│  LISTA DE PRECIOS - VISTA ADMIN                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  Codigo │ Producto          │ Costo  │ Precio │ Dto Max │ Margen  │ Piso  │ Estado │
│  ───────┼───────────────────┼────────┼────────┼─────────┼─────────┼───────┼────────│
│  AZ001  │ Azucar Estandar   │ $48.50 │ $58.00 │ $5.00   │ 16.4%   │$53.00 │ ✅ OK  │
│  AR002  │ Arroz Morelos     │ $42.00 │ $52.00 │ $8.00   │ 19.2%   │$44.00 │ ✅ OK  │
│  AL003  │ Alpiste 25kg      │ $310   │ $325   │ $15.00  │ 4.6%    │$310   │ ⚠ Crit │
│  FE004  │ Fecula Maiz       │ $95.00 │ $90.00 │ $0.00   │ -5.3%   │$90.00 │ ❌ Perd│
└────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Cambios a Realizar

### Archivo: `src/pages/Precios.tsx`

**Cambio principal:** Mostrar una vista diferente para Admin que incluya el analisis de margen.

```typescript
// Antes
const puedeEditar = isAdmin || isSecretaria;
// Mostrar SecretariaListaPreciosTab o VendedorListaPreciosTab

// Despues
if (isAdmin) {
  // Vista completa con analisis de margen (AdminListaPreciosTab)
} else if (isSecretaria) {
  // Vista editable sin analisis profundo (SecretariaListaPreciosTab)
} else {
  // Vista solo lectura (VendedorListaPreciosTab)
}
```

### Nuevo Componente: `src/components/admin/AdminListaPreciosTab.tsx`

Crear un nuevo componente que combine:
1. La tabla de `SecretariaListaPreciosTab` (edicion de precios)
2. Las columnas de analisis de `SecretariaCostosTab` (margen, piso, estado)
3. El simulador de precios integrado

**Columnas del componente:**
| Columna | Descripcion |
|---------|-------------|
| Codigo | Codigo interno del producto |
| Producto | Nombre + especificaciones + marca |
| Costo Prom. | `costo_promedio_ponderado` (WAC) |
| Ult. Costo | `ultimo_costo_compra` |
| Precio Venta | `precio_venta` (editable) |
| Dto Maximo | `descuento_maximo` (editable) |
| Margen % | Calculado con `analizarMargen()` |
| Piso Minimo | `precio_venta - descuento_maximo` |
| Espacio | Piso Minimo - Costo |
| Estado | Badge visual (perdida/critico/bajo/OK) |
| Acciones | Editar, Simular, Historial |

**Funcionalidades:**
- Clic en Simular: Abre dialog con `simularPrecioPropuesto()`
- Indicadores de color en filas segun estado del margen
- Filtro por categoria
- Ordenamiento por margen (detectar problematicos)

---

## Flujo de Decision de Precios

El sistema ya tiene toda la logica matematica en `src/lib/calculos.ts`:

1. **`analizarMargen()`**: Calcula margen_bruto, margen_porcentaje, piso_minimo, espacio_negociacion, estado
2. **`calcularPrecioSugerido()`**: Dado un costo y utilidad deseada, sugiere precio
3. **`simularPrecioPropuesto()`**: Simula que pasa si se propone un precio diferente

Solo falta exponerlo visualmente al Admin en la interfaz.

---

## Archivos a Modificar/Crear

| Archivo | Accion |
|---------|--------|
| `src/pages/Precios.tsx` | Modificar para mostrar vista diferente segun rol |
| `src/components/admin/AdminListaPreciosTab.tsx` | CREAR - Vista completa con analisis de margen |

---

## Resultado Esperado

Como Admin, al entrar a `/precios`:

1. Veras TODAS las columnas de analisis de margen
2. Podras identificar rapidamente productos en "perdida" o "critico"
3. Tendras simulador para responder "si le bajo $X, cuanto me queda?"
4. Podras editar precios y descuentos directamente
5. El historial de cambios quedara registrado

---

## Beneficio Directo

**Responde tu pregunta central**: "Cuanto costo, a cuanto lo vendo, y hasta donde puedo bajar?"

Todo visible en una sola pantalla, con indicadores de alerta para productos problematicos.

---

## Notas Tecnicas

- El calculo de `costo_promedio_ponderado` se actualiza automaticamente cuando entra mercancia
- El trigger `sync_stock_from_lotes` ya maneja esto
- La funcion `analizarMargen()` prioriza el costo promedio sobre el ultimo costo
- Si el producto es nuevo (sin lotes), usara `ultimo_costo_compra`
