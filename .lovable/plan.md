

# Plan: Optimización de Vista Móvil para ALMASA ERP

## Contexto
Tu app está funcionando en iOS, pero la experiencia móvil necesita optimización. Actualmente las tablas usan scroll horizontal que es incómodo en pantallas pequeñas.

## Enfoque
Crear una **experiencia móvil enfocada en consumo de información** - ideal para cuando estás en reuniones y necesitas:
- Recibir y actuar sobre notificaciones de autorización
- Ver correos (✅ ya está optimizado)
- Consultar lista de precios (✅ ya está optimizado)  
- Ver inventario rápidamente
- Aprobar/rechazar pedidos de vendedores

## Cambios Propuestos

### 1. Nueva Vista "Pedidos por Autorizar" Optimizada para Móvil
Actualmente la tabla de autorización tiene 8 columnas que requieren scroll. Se creará una vista de **cards apiladas** para móvil:

```
┌─────────────────────────────────┐
│ 🔶 PED-2024-0412                │
│ Cliente: Lecaroz Sucursal Norte │
│ 📦 12 productos • 2,450 kg      │
│ 💰 $45,200.00                   │
│ ──────────────────────────────  │
│ [Revisar Precios]               │
└─────────────────────────────────┘
```

### 2. Panel de Autorización Rápida
Diálogo optimizado para móvil donde puedas:
- Ver resumen del pedido (productos principales)
- Ajustar precios si es necesario
- **Autorizar** o **Rechazar** con un solo toque
- Navegar al siguiente pedido pendiente

### 3. Vista de Inventario Móvil
Cambiar de tabla a lista vertical simple:

```
┌─────────────────────────────────┐
│ AZUCAR ESTANDAR 50kg            │
│ Stock: 245 | Mínimo: 100     ✅ │
├─────────────────────────────────┤
│ LINAZA DORADA 10kg              │
│ Stock: 12 | Mínimo: 50       ⚠️ │
└─────────────────────────────────┘
```

### 4. Vista de Pedidos Recientes Móvil
Cards compactas mostrando:
- Folio + Cliente
- Status (badge colorido)
- Total
- Acción rápida (ver detalle)

### 5. Centro de Notificaciones Mejorado
Hacer que las notificaciones de autorización sean más prominentes y permitan actuar directamente desde la notificación.

---

## Implementación Técnica

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/pedidos/PedidosPorAutorizarTab.tsx` | Agregar vista de cards para `isMobile` |
| `src/components/secretaria/SecretariaPedidosTab.tsx` | Agregar vista de cards para móvil |
| `src/components/secretaria/SecretariaInventarioTab.tsx` | Agregar vista de lista vertical para móvil |
| `src/hooks/use-mobile.tsx` | Ya existe - se reutilizará |

### Nuevos Componentes a Crear

| Componente | Propósito |
|------------|-----------|
| `PedidoCardMobile.tsx` | Card compacta para lista de pedidos |
| `AutorizacionRapidaSheet.tsx` | Sheet de autorización optimizado para móvil |
| `InventarioItemMobile.tsx` | Row de inventario para vista móvil |

### Patrón de Implementación
Cada componente usará el patrón ya establecido en `EmailListView.tsx`:

```typescript
const isMobile = useIsMobile();

if (isMobile) {
  return <VistaMobilOptimizada />;
}

// Vista desktop existente (sin cambios)
return <TablaActual />;
```

---

## Beneficios

1. **Sin scroll horizontal** en las vistas principales
2. **Acciones rápidas** - autorizar/rechazar desde el celular
3. **Información priorizada** - solo lo esencial en móvil
4. **Consistencia visual** - mismo patrón que Correos y Precios
5. **Navegación fluida** - mantiene la navegación inferior existente

## Lo Que NO Cambia

- Vistas de desktop/tablet permanecen igual
- Funcionalidades completas siguen disponibles
- Correos y Lista de Precios (ya optimizados) no se tocan
- Sistema de notificaciones push sigue funcionando

