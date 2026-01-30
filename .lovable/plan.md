

# Plan: Corregir el Conteo Incremental en Calendario de Ocupación

## Problema Identificado

Cuando asignas 3 entregas al mismo día haciendo click repetido, el calendario muestra "1 1 1" separados (o el número no incrementa visualmente) en lugar de acumular "1 → 2 → 3" en el mismo badge.

**Causa raíz:** El `onDateSelect` usa `entregasProgramadas` del closure (estado anterior), no el estado actualizado después de `setEntregasProgramadas`. Entonces el cálculo de "siguiente sin fecha" se hace con datos obsoletos.

## Flujo Actual (con bug)

```text
Estado inicial: [#1: --, #2: --, #3: --]
entregaEnEdicion = 0

Click día 5:
  → updateFechaEntrega(0, "2026-02-05")  ✓ funciona
  → entregasProgramadas.findIndex(...) ← USA EL ESTADO VIEJO [#1:--, #2:--, #3:--]
  → Encuentra #1 (index 0) como "sin fecha" porque React aún no actualizó
  → setEntregaEnEdicion(0) ← SE QUEDA EN EL MISMO

Resultado: Siempre edita la misma entrega
```

## Solución

Usar una función callback en el `findIndex` que tome en cuenta la actualización que acabamos de hacer, o mover la lógica de auto-avance a un `useEffect` que observe cambios en `entregasProgramadas`.

---

## Cambios Técnicos

### Modificar `CrearOrdenCompraWizard.tsx`

**Opción A (más limpia): Calcular el siguiente índice excluyendo el actual**

```typescript
onDateSelect={(date) => {
  if (entregaEnEdicion !== null) {
    const fechaStr = format(date, "yyyy-MM-dd");
    updateFechaEntrega(entregaEnEdicion, fechaStr);
    
    // Auto-avance: buscar el siguiente SIN fecha, EXCLUYENDO el que acabamos de asignar
    // Usamos el estado actual pero ignoramos el índice que acabamos de editar
    const siguienteSinFecha = entregasProgramadas.findIndex(
      (e, i) => i !== entregaEnEdicion && i > entregaEnEdicion && !e.fecha_programada
    );
    
    if (siguienteSinFecha >= 0) {
      setEntregaEnEdicion(siguienteSinFecha);
    } else {
      // Buscar cualquier otro sin fecha (antes del actual)
      const cualquierOtroSinFecha = entregasProgramadas.findIndex(
        (e, i) => i !== entregaEnEdicion && !e.fecha_programada
      );
      setEntregaEnEdicion(cualquierOtroSinFecha >= 0 ? cualquierOtroSinFecha : null);
    }
  }
}}
```

**Opción B (más robusta): Usar useEffect para el auto-avance**

```typescript
// Agregar useEffect que observe cambios en entregasProgramadas
useEffect(() => {
  // Si hay una entrega en edición que YA tiene fecha, buscar la siguiente sin fecha
  if (entregaEnEdicion !== null && entregasProgramadas[entregaEnEdicion]?.fecha_programada) {
    const siguienteSinFecha = entregasProgramadas.findIndex(
      (e, i) => i > entregaEnEdicion && !e.fecha_programada
    );
    
    if (siguienteSinFecha >= 0) {
      setEntregaEnEdicion(siguienteSinFecha);
    } else {
      const cualquierOtroSinFecha = entregasProgramadas.findIndex(e => !e.fecha_programada);
      setEntregaEnEdicion(cualquierOtroSinFecha >= 0 ? cualquierOtroSinFecha : null);
    }
  }
}, [entregasProgramadas]); // Se ejecuta cuando cambia el estado

// onDateSelect simplificado:
onDateSelect={(date) => {
  if (entregaEnEdicion !== null) {
    updateFechaEntrega(entregaEnEdicion, format(date, "yyyy-MM-dd"));
    // El useEffect se encarga del auto-avance
  }
}}
```

**Recomiendo Opción B** porque:
- Separa responsabilidades (asignar vs avanzar)
- Siempre usa el estado actualizado
- Más fácil de debuguear

---

## Resultado Esperado

```text
Estado inicial: [#1: --, #2: --, #3: --]
entregaEnEdicion = 0

Click día 5:
  → #1 = "2026-02-05"
  → useEffect detecta que #1 ya tiene fecha
  → Avanza a #2 (entregaEnEdicion = 1)
  → Calendario muestra "1" en día 5

Click día 5 otra vez:
  → #2 = "2026-02-05"
  → useEffect detecta que #2 ya tiene fecha
  → Avanza a #3 (entregaEnEdicion = 2)
  → Calendario muestra "2" en día 5

Click día 5 otra vez:
  → #3 = "2026-02-05"
  → useEffect detecta que #3 ya tiene fecha
  → No hay más sin fecha, entregaEnEdicion = null
  → Calendario muestra "3" en día 5 ✓
```

---

## Archivo a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/compras/CrearOrdenCompraWizard.tsx` | Agregar `useEffect` para auto-avance y simplificar `onDateSelect` |

