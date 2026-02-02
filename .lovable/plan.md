
# Plan: Corregir Diálogo "Ver Recepción" para Móvil

## Problema Detectado

El diálogo `RecepcionDetalleDialog` que se abre al hacer clic en **"Ver recepción"** desde las tarjetas de lotes en móvil **no tiene las clases CSS correctas para adaptarse a pantallas pequeñas**.

**Código actual (línea 572):**
```tsx
<DialogContent className="max-w-3xl max-h-[90vh]">
```

**Problema:** Sin `w-[calc(100vw-2rem)]`, el diálogo mantiene un ancho fijo de `max-w-3xl` (768px) que es mayor que la pantalla del iPhone, causando que el diálogo aparezca fuera del viewport o completamente invisible.

---

## Solución

### Cambio en RecepcionDetalleDialog.tsx

**Archivo:** `src/components/compras/RecepcionDetalleDialog.tsx` (línea 572)

```tsx
// Antes
<DialogContent className="max-w-3xl max-h-[90vh]">

// Después
<DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[90vh] overflow-x-hidden">
```

**Explicación de las clases:**
- `w-[calc(100vw-2rem)]` → En móvil, usa el ancho completo menos 1rem de margen a cada lado
- `sm:max-w-3xl` → En pantallas >= 640px, limita al máximo de 768px
- `overflow-x-hidden` → Previene scroll horizontal si algún contenido interno es muy ancho

### Adaptaciones Adicionales del Contenido Interno

El contenido interno también tiene grids que podrían causar problemas en móvil:

**Grid de cabecera (línea 590):**
```tsx
// Antes
<div className="grid grid-cols-2 gap-4">

// Después  
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

**Grid del resumen OC (línea 645):**
```tsx
// Antes
<div className="grid grid-cols-3 gap-4 mb-4">

// Después
<div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 text-xs sm:text-base">
```

---

## Archivo a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/compras/RecepcionDetalleDialog.tsx` | DialogContent con ancho móvil + grids responsivos |

---

## Resultado Esperado

### Móvil (antes):
- Diálogo invisible o parcialmente visible
- Usuario no puede ver el contenido de recepción

### Móvil (después):
```
┌─────────────────────────────────┐
│ 📦 Detalle de Recepción      ✕ │
├─────────────────────────────────┤
│ OC-2025-001                     │
│ Entrega #1                      │
│ Proveedor XYZ                   │
├─────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐        │
│ │ 5/6 │ │  1  │ │ 83% │        │
│ │Comp.│ │Pend.│ │Avanc│        │
│ └─────┘ └─────┘ └─────┘        │
│ ▓▓▓▓▓▓▓▓▓▓▓░░░ 83%             │
├─────────────────────────────────┤
│ Productos en esta entrega:      │
│ • AZUCAR01 - 100 kg             │
│ • HARINA02 - 50 kg              │
├─────────────────────────────────┤
│ Evidencias: 📷 📷               │
│ Firmas: ✓ Chofer ✓ Almacén     │
├─────────────────────────────────┤
│ [Descargar PDF] [Reenviar ✉️]   │
└─────────────────────────────────┘
```

---

## Lo que NO cambia

- Lógica de carga de datos de la recepción
- Funcionalidad de descargar PDF
- Funcionalidad de reenviar correo
- Estructura del diálogo (solo clases CSS)
