
# Plan: Optimización Móvil Completa del ERP ALMASA

## Análisis de Estado Actual

### Módulos YA Optimizados ✅
| Módulo | Componentes Mobile |
|--------|-------------------|
| Correos | `EmailListView`, `EmailRowMobile`, `EmailAvatarMobile` |
| Pedidos (Por Autorizar) | `PedidoCardMobile`, `AutorizacionRapidaSheet` |
| Secretaria Pedidos | `PedidoCardMobileSecretaria` |
| Secretaria Inventario | `InventarioItemMobile` |
| Dashboard | `EstadoOperacionesMobile` |
| Lista Precios Admin | `ProductoPrecioCardMobile` |
| Panel Chofer | Ya diseñado móvil-first |
| Configuración | Tabs horizontales scrollables |

### Módulos que REQUIEREN Optimización 🔴

#### 1. Clientes (`Clientes.tsx`) - 1297 líneas
**Problema**: Tabla con 10+ columnas (Código, Nombre, RFC, Zona, Crédito, Límite, Vendedor, Sucursales, Acciones)

#### 2. Productos (`Productos.tsx`) - 1100 líneas
**Problema**: Tabla con 9 columnas (Código, Nombre, Marca, Categoría, Unidad, Stock, Precio, Estado, Acciones)

#### 3. Inventario (`Inventario.tsx`) - 1024 líneas
**Problema**: Dos tablas grandes (Lotes + Movimientos) con 8-9 columnas cada una

#### 4. Compras - Órdenes (`OrdenesCompraTab.tsx`) - 2901 líneas
**Problema**: Tabla con 12 columnas (Folio, Proveedor, Productos, Bultos, Peso, Total, Entregas, Status Pago, Estado, Fechas, Acciones)

#### 5. Compras - Proveedores (`ProveedoresTab.tsx`) - 1421 líneas
**Problema**: Tabla con 8 columnas (Nombre, Contacto, Email, Teléfono, RFC, País, Productos, Acciones)

#### 6. Rutas (`Rutas.tsx`) - 661 líneas
**Problema**: Tabla de historial con 10 columnas (Folio, Fecha, Tipo, Vehículo, Chofer, Peso, Km, Estado, Acciones)

#### 7. Facturas (`Facturas.tsx`) - 505 líneas
**Problema**: Tabla con 9 columnas (Folio, Cliente, RFC, Pedido, Fecha, Total, CFDI, Pago, Acciones)

#### 8. Pedidos - Historial (`Pedidos.tsx`) - 1006 líneas
**Problema**: Tabla principal de pedidos con 10+ columnas

---

## Estrategia de Implementación

### Patrón a Aplicar (Consistente)
```tsx
const isMobile = useIsMobile();

if (isMobile) {
  return <VistaCards datos={datos} />;
}
return <TablaDesktop datos={datos} />;
```

### Prioridad de Implementación
1. **Alta**: Clientes, Pedidos Historial, Compras OC (uso frecuente)
2. **Media**: Productos, Inventario, Facturas
3. **Baja**: Proveedores, Rutas historial

---

## Componentes Nuevos a Crear

### Fase 1: Alta Prioridad

| Componente | Descripción |
|------------|-------------|
| `ClienteCardMobile.tsx` | Card con nombre, RFC, vendedor, crédito disponible |
| `PedidoHistorialCardMobile.tsx` | Card del historial general de pedidos |
| `OrdenCompraCardMobile.tsx` | Card de OC con proveedor, total, status entregas |

### Fase 2: Media Prioridad

| Componente | Descripción |
|------------|-------------|
| `ProductoCardMobile.tsx` | Card con código, nombre, stock, precio |
| `LoteInventarioCardMobile.tsx` | Card de lote con producto, cantidad, caducidad |
| `MovimientoInventarioCardMobile.tsx` | Card de movimiento con tipo, cantidad, fecha |
| `FacturaCardMobile.tsx` | Card con folio, cliente, total, status CFDI |

### Fase 3: Baja Prioridad

| Componente | Descripción |
|------------|-------------|
| `ProveedorCardMobile.tsx` | Card con nombre, contacto, productos asociados |
| `RutaHistorialCardMobile.tsx` | Card con folio, fecha, chofer, status |

---

## Detalle Técnico por Módulo

### 1. ClienteCardMobile.tsx
```
┌─────────────────────────────────────┐
│ [👤] LECAROZ                        │
│ RFC: LEC850101AAA                   │
│ ──────────────────────────────────  │
│ 📍 Zona Norte  •  Carlos Giron      │
│ 💳 15 días  •  $50,000 límite       │
│ 🏪 5 sucursales                     │
│                                     │
│ [Historial] [Sucursales] [Editar]   │
└─────────────────────────────────────┘
```

### 2. OrdenCompraCardMobile.tsx
```
┌─────────────────────────────────────┐
│ 🟢 OC-2024-0156  [Enviada]          │
│ Proveedor: Zucarmex                 │
│ ──────────────────────────────────  │
│ 📦 120 bultos  •  6,000 kg          │
│ 💰 $98,500.00                       │
│ ──────────────────────────────────  │
│ Entregas: 2/3 recibidas             │
│ Pago: Pendiente                     │
│                                     │
│ [Detalle] [Recordar] [Acciones ▾]   │
└─────────────────────────────────────┘
```

### 3. ProductoCardMobile.tsx
```
┌─────────────────────────────────────┐
│ AZ-001                              │
│ AZÚCAR ESTÁNDAR 50kg                │
│ Zucarmex • Bulto                    │
│ ──────────────────────────────────  │
│ Stock: 245 ✅  (mín: 50)            │
│ Precio compra: $480.00              │
│                                     │
│ [Ver Lotes]  [Editar]               │
└─────────────────────────────────────┘
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Clientes.tsx` | Agregar `useIsMobile()` + renderizado condicional |
| `src/pages/Productos.tsx` | Agregar `useIsMobile()` + cards en móvil |
| `src/pages/Inventario.tsx` | Cards para lotes y movimientos en móvil |
| `src/pages/Pedidos.tsx` | Cards para historial de pedidos |
| `src/pages/Facturas.tsx` | Cards para lista de facturas |
| `src/components/compras/OrdenesCompraTab.tsx` | Cards para OCs |
| `src/components/compras/ProveedoresTab.tsx` | Cards para proveedores |
| `src/pages/Rutas.tsx` | Cards para tab "Rutas" (historial) |

---

## Flujo de Implementación

### Por cada módulo:

1. **Crear componente card móvil** con información esencial
2. **Agregar `useIsMobile()`** al componente padre
3. **Renderizar condicionalmente** cards vs tabla
4. **Mantener acciones** (editar, ver detalle, eliminar) como botones o menú contextual
5. **Agregar filtros scrollables horizontalmente** cuando aplique

### Ejemplo de modificación:
```tsx
// src/pages/Clientes.tsx
import { useIsMobile } from "@/hooks/use-mobile";
import { ClienteCardMobile } from "@/components/clientes/ClienteCardMobile";

const Clientes = () => {
  const isMobile = useIsMobile();
  // ... existing logic ...

  if (isMobile) {
    return (
      <Layout>
        <div className="p-4 space-y-4">
          {/* Header simplificado */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Clientes</h1>
            <Button size="icon" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Búsqueda */}
          <Input placeholder="Buscar cliente..." />
          
          {/* Cards */}
          <div className="space-y-3">
            {filteredClientes.map(cliente => (
              <ClienteCardMobile 
                key={cliente.id}
                cliente={cliente}
                onEdit={handleEdit}
                onViewSucursales={openSucursales}
                onViewHistorial={openHistorial}
              />
            ))}
          </div>
        </div>
        {/* Dialogs siguen igual */}
      </Layout>
    );
  }

  // Desktop view unchanged
  return (
    <Layout>
      {/* ... existing table code ... */}
    </Layout>
  );
};
```

---

## Beneficios

- **Sin scroll horizontal** en ningún módulo
- **Información priorizada** según rol (admin ve más detalles)
- **Acciones rápidas** accesibles desde cada card
- **Consistencia visual** con patrón ya implementado en Correos y Pedidos
- **Desktop sin cambios** - experiencia preservada

## Lo que NO cambia

- Toda la lógica de negocio existente
- Formularios y diálogos (se abren igual)
- Queries y mutaciones de datos
- Sistema de permisos
- Vistas de tablet/desktop

## Estimación

| Fase | Componentes | Tiempo estimado |
|------|-------------|-----------------|
| Fase 1 | 3 cards + 3 modificaciones | Actual mensaje |
| Fase 2 | 4 cards + 4 modificaciones | Siguiente iteración |
| Fase 3 | 2 cards + 2 modificaciones | Iteración final |

---

## Propuesta

Implementaré **Fase 1** (alta prioridad) en este mensaje:
1. `ClienteCardMobile.tsx`
2. `PedidoHistorialCardMobile.tsx` 
3. `OrdenCompraCardMobile.tsx`
4. Modificar `Clientes.tsx`, `Pedidos.tsx`, `OrdenesCompraTab.tsx`

¿Apruebas este plan para comenzar con la Fase 1?
