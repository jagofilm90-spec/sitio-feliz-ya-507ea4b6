

# Plan: Toggle Exclusivo de Archivadas

## Cambio Requerido

Modificar la lógica del filtro para que cuando el switch esté activo, muestre **únicamente** las archivadas (no todas).

## Archivo a Modificar

`src/components/compras/OrdenesCompraTab.tsx`

## Cambio de Lógica

**Líneas 1561-1562** - Cambiar de:

```typescript
// Filtro de archivadas
if (!mostrarArchivadas && esOCArchivada(orden)) return false;
```

**A:**

```typescript
// Filtro de archivadas (exclusivo)
if (mostrarArchivadas) {
  // Si el switch está ON, solo mostrar archivadas
  return esOCArchivada(orden);
} else {
  // Si el switch está OFF, solo mostrar activas
  return !esOCArchivada(orden);
}
```

## Comportamiento Resultante

| Switch | Se muestra |
|--------|------------|
| OFF (default) | Solo OCs activas (en proceso) |
| ON | Solo OCs archivadas (cerradas/pagadas/canceladas) |

## Resultado Visual

```text
Toggle OFF:                          Toggle ON:
┌────────────────────────┐          ┌────────────────────────┐
│ OC-0005 │ Enviada      │          │ OC-0003 │ Cerrada      │
│ OC-0002 │ Parcial      │          │ OC-0001 │ Completada   │
│ OC-0004 │ Recibida     │          │         │ + Pagado     │
└────────────────────────┘          └────────────────────────┘
  3 activas                           2 archivadas
```

Este es el mismo comportamiento que implementamos en la pestaña de **Adeudos** donde el toggle cambia entre "Pendientes" y "Pagadas" de forma exclusiva.

