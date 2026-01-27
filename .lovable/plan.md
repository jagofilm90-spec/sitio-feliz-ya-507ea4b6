

# Plan: Corregir Calendario de Entregas para Mostrar Entregas Parciales/Faltantes

## El Problema Identificado

Tu OC-202601-0002 tiene estos datos en la base de datos:

| # Entrega | Fecha Programada | Fecha Real | Status | Origen Faltante | Productos |
|-----------|------------------|------------|--------|-----------------|-----------|
| 1 | 2026-01-22 | 2026-01-23 | recibida | false | Entrega original |
| 2 | 2026-01-26 | 2026-01-26 | recibida | **true** | 40x Papel Blanco Revolucion |

**Pero la OC tiene `entregas_multiples = false`**, lo cual causa que el calendario la ignore incorrectamente.

### Causa Raiz del Bug

El calendario tiene **dos queries separadas**:

1. **Query 1** (`entregasProgramadas`): Solo obtiene entregas de OCs con `entregas_multiples = true`
2. **Query 2** (`ordenesSimples`): Obtiene OCs con `entregas_multiples = false`, pero solo considera la **primera** entrega (`ordenes_compra_entregas?.[0]`)

Cuando se crea automáticamente una entrega de faltante (Entrega #2), esta queda "invisible" porque:
- La OC sigue marcada como `entregas_multiples = false`
- El código solo lee la primera entrega de la lista

---

## Solucion Propuesta

### Cambio 1: Modificar la Query de Entregas Multiples

Actualmente filtra por `entregas_multiples = true`. Necesitamos **también incluir entregas con `origen_faltante = true`**, sin importar el flag de la OC.

```tsx
// ANTES (linea 95):
.eq("ordenes_compra.entregas_multiples", true)

// DESPUES:
// Sin filtro - traer TODAS las entregas de ordenes_compra_entregas
// El filtro se aplica en el cliente para mostrar correctamente
```

### Cambio 2: Excluir de ordenesSimples las OC que ya tienen entregas en la otra query

Para evitar duplicados, las OCs que aparecen en `entregasProgramadas` no deben aparecer tambien en `ordenesSimples`.

### Cambio 3: Ajustar la logica de "esCompletada" para entregas individuales

Una entrega de faltante puede estar pendiente aunque la OC este "completada". La logica debe basarse en el status de la entrega individual, no de la OC.

---

## Estructura Visual Esperada

Despues del cambio, el calendario deberia mostrar:

```text
┌──────────────────────────────────────────────────────────────┐
│                    ENERO 2026                                │
├──────────────────────────────────────────────────────────────┤
│  ...  │  22  │  23  │  24  │  25  │  26  │  27  │           │
│       │      │ [*]  │      │      │ [*]  │      │           │
│       │      │ OC-2 │      │      │ OC-2 │      │           │
│       │      │ #1   │      │      │ #2   │      │           │
│       │      │recib │      │      │(falt)│      │           │
└──────────────────────────────────────────────────────────────┘

[*] = punto verde (recibida)
```

Dia 23: Entrega #1 de OC-202601-0002 (recibida)
Dia 26: Entrega #2 de OC-202601-0002 - FALTANTE (recibida)

---

## Cambios en Codigo

### Archivo: `src/components/compras/CalendarioEntregasTab.tsx`

**Cambio A - Query `entregasProgramadas` (lineas 59-101):**
- Quitar el filtro `.eq("ordenes_compra.entregas_multiples", true)`
- Esto traera TODAS las entregas individuales de la tabla `ordenes_compra_entregas`

**Cambio B - Query `ordenesSimples` (lineas 105-135):**
- Agregar filtro para excluir OCs que ya estan en `ordenes_compra_entregas`
- O usar un enfoque mas simple: solo mostrar OCs que NO tienen registros en la tabla de entregas

**Cambio C - Mapeo `todasLasEntregas` (lineas 162-212):**
- Para entregas multiples: mantener logica actual pero usar fecha_entrega_real cuando existe
- Para entregas simples: solo incluir OCs que realmente no tienen entregas en la otra tabla
- Agregar indicador visual para entregas de faltantes (`origen_faltante = true`)

**Cambio D - Agregar badge "Faltante" en la UI:**
- Mostrar un badge naranja/amarillo cuando `origen_faltante = true`
- Esto ayuda a identificar rapidamente las entregas de seguimiento

---

## Beneficio para el Usuario

1. **Visibilidad completa**: Cada entrega aparece en su fecha correcta (programada o real)
2. **Sin duplicados**: Cada OC/entrega aparece una sola vez
3. **Trazabilidad**: Puedes ver el historial completo de una OC con multiples entregas
4. **Identificacion clara**: Badge "Faltante" indica que es una entrega de seguimiento

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/CalendarioEntregasTab.tsx` | Modificar queries y logica de mapeo |

