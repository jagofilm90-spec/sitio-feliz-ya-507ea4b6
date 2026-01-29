
# Plan: Mejorar Visibilidad de Pestañas en Módulo de Compras

## Problema Identificado

El módulo de Compras tiene **8 pestañas** en un layout `grid-cols-8` que causa problemas de visibilidad:
- En pantallas pequeñas o medianas, las pestañas se superponen o truncan
- La pestaña "Adeudos" (posición 7) y "Analytics" (posición 8) pueden no ser visibles
- El texto largo "Órdenes de Compra" agrava el problema de espacio

## Solución Propuesta

Cambiar el layout de pestañas a un diseño **responsivo con scroll horizontal** que funcione en todos los tamaños de pantalla.

## Cambios en el Código

### Archivo: `src/pages/Compras.tsx`

**Cambio en TabsList (línea 131):**

De:
```typescript
<TabsList className="grid w-full grid-cols-8">
```

A:
```typescript
<TabsList className="flex w-full overflow-x-auto">
```

**Cambios adicionales en cada TabsTrigger:**
- Agregar `flex-shrink-0` para evitar que se compriman
- Usar texto abreviado en móvil con clases responsivas

### Resultado Visual Esperado

```text
Escritorio (pantalla amplia):
[Proveedores] [Órdenes de Compra] [Calendario] [Devoluciones] [Historial] [Faltantes] [Adeudos] [Analytics]

Tablet/Móvil (con scroll):
[Proveedores] [OC] [Calendario] [Devoluc.] [Historial] [Faltantes] [Adeudos] ←→ scroll
```

## Beneficios

1. Todas las 8 pestañas visibles sin superposición
2. Scroll horizontal intuitivo en pantallas pequeñas
3. Mantiene la funcionalidad completa en todos los dispositivos
4. Consistente con el patrón usado en `SecretariaComprasTab`
