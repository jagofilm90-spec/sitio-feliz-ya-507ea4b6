

# Implementación: Optimización Móvil para ALMASA ERP

## Resumen
Voy a implementar vistas optimizadas para móvil que reemplazan las tablas con scroll horizontal por cards apiladas verticalmente. El cambio detecta automáticamente si estás en celular usando `useIsMobile()`.

## Archivos a Crear

### 1. `PedidoCardMobile.tsx`
Card compacta para mostrar pedidos sin scroll horizontal:
- Folio destacado con ícono de estado
- Nombre del cliente y sucursal
- Productos y peso en una línea
- Total prominente
- Botón de acción (Revisar/Ver detalle)

### 2. `AutorizacionRapidaSheet.tsx`  
Panel deslizable (Sheet) optimizado para autorizar pedidos desde el celular:
- Resumen del cliente y pedido
- Lista de productos con precios
- Botones grandes de **Autorizar** y **Rechazar**
- Navegación al siguiente pedido pendiente

### 3. `InventarioItemMobile.tsx`
Componente para mostrar un producto en la lista de inventario:
- Nombre del producto
- Stock actual vs mínimo
- Indicador visual (✅ OK / ⚠️ Bajo)

## Archivos a Modificar

### 4. `PedidosPorAutorizarTab.tsx`
Agregar detección móvil y renderizar cards en lugar de tabla:
```tsx
const isMobile = useIsMobile();

if (isMobile) {
  return <VistaMobileCards pedidos={pedidos} />;
}
// Tabla desktop sin cambios
```

### 5. `SecretariaPedidosTab.tsx`
Mismo patrón - cards para móvil, tabla para desktop

### 6. `SecretariaInventarioTab.tsx`
Lista vertical simple en móvil con indicadores de stock

## Estructura Visual Móvil

```
┌─────────────────────────────────┐
│ 🔶 PED-2024-0412               │
│ ─────────────────────────────  │
│ Cliente: Lecaroz Sucursal Norte│
│ 📦 12 productos • 2,450 kg     │
│ ─────────────────────────────  │
│ 💰 $45,200.00                  │
│                                │
│ [    Revisar Precios    ]      │
└─────────────────────────────────┘
```

## Lo Que NO Cambia
- Vistas de desktop/tablet permanecen exactamente igual
- Toda la lógica de negocio (autorización, rechazo, etc.)
- Sistema de notificaciones push
- Módulos ya optimizados (Correos, Lista de Precios)

## Beneficios
✅ Sin scroll horizontal en móvil  
✅ Información priorizada y legible  
✅ Acciones rápidas con un solo toque  
✅ Consistente con el diseño de Correos  
✅ Detección automática de dispositivo

