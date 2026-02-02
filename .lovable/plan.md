
# Plan: Optimización Móvil Completa para Administrador

## Contexto
Ya optimizamos las vistas de Secretaria (Pedidos, Inventario) pero como administrador eres quien más usará la app. Necesitamos optimizar:

1. **Dashboard Ejecutivo** - Muchos paneles que no caben bien en móvil
2. **Lista de Precios Admin** - Tabla de 11 columnas con scroll horizontal
3. **Módulo de Pedidos** - Ya tiene `PedidosPorAutorizarTab` pero hay más tabs

## Componentes a Optimizar

### 1. Dashboard Ejecutivo (`Dashboard.tsx`)

**Problema actual:**
- Grid de 8 KPIs en 4 columnas → requiere scroll en móvil
- 4 paneles de "Estado de Operaciones" en row → no caben
- Gráfico de ventas + Cobranza crítica lado a lado

**Solución móvil:**
- KPIs en 2x4 grid (ya funciona)
- Estado de Operaciones en carrusel horizontal deslizable
- Cobranza Crítica y Ventas en stack vertical
- Ocultar paneles menos críticos (Usuarios Conectados, Mapa) en móvil

### 2. Lista de Precios Admin (`AdminListaPreciosTab.tsx`)

**Problema actual:**
```
| Código | Producto | Marca | Costo | Precio | Dto | Margen | Piso | Espacio | Estado | Acciones |
```
11 columnas = scroll horizontal obligatorio

**Solución móvil:**
Cards con información crítica visible:
```
┌─────────────────────────────────────┐
│ [Crítico] AZUCAR ESTANDAR 50kg      │
│ Marca: Zucarmex                     │
│ ──────────────────────────────────  │
│ Costo: $450    Precio: $520         │
│ Margen: 13.4%  Piso: $480           │
│                                     │
│ [Simular]  [Editar]                 │
└─────────────────────────────────────┘
```

### 3. Pedidos (resto de tabs)

Las tabs principales que faltan:
- Historial de pedidos → Cards como las de Secretaria
- Calendario → Ya es responsive (usa date-picker)

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/components/admin/ProductoPrecioCardMobile.tsx` | Card de producto con margen y acciones |
| `src/components/dashboard/KPICardsMobile.tsx` | Grid optimizado de KPIs |
| `src/components/dashboard/EstadoOperacionesMobile.tsx` | Carrusel horizontal de operaciones |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/Dashboard.tsx` | Agregar `useIsMobile()` y layout condicional |
| `src/components/admin/AdminListaPreciosTab.tsx` | Renderizar cards en móvil |
| `src/components/dashboard/KPICards.tsx` | Ajustar grid para móvil |
| `src/components/dashboard/EstadoOperacionesPanel.tsx` | Carrusel en móvil |

---

## Detalle Técnico

### Dashboard Móvil
```tsx
const isMobile = useIsMobile();

// En móvil: ocultar paneles secundarios
{!isMobile && <MapaRutasWidget />}
{!isMobile && isAdmin && <UsuariosConectadosPanel />}

// Operaciones en carrusel deslizable
{isMobile ? (
  <EstadoOperacionesMobile />
) : (
  <EstadoOperacionesPanel />
)}
```

### Lista de Precios Móvil
```tsx
if (isMobile) {
  return (
    <div className="space-y-3 p-4">
      {/* Filtros */}
      <Input placeholder="Buscar..." />
      <ScrollArea horizontal>
        <Badge onClick={filterByEstado}>Pérdida: 5</Badge>
        <Badge onClick={filterByEstado}>Crítico: 12</Badge>
        ...
      </ScrollArea>
      
      {/* Cards de productos */}
      {productos.map(p => (
        <ProductoPrecioCardMobile 
          producto={p}
          onSimular={openSimulador}
          onEditar={openEditor}
        />
      ))}
    </div>
  );
}
```

---

## Beneficios

1. **Sin scroll horizontal** - Todo visible en pantalla
2. **Información priorizada** - Lo crítico arriba
3. **Acciones rápidas** - Editar/Simular precios desde el celular
4. **Consistencia** - Mismo patrón que las otras vistas móviles

## Lo Que NO Cambia

- Vistas desktop/iPad permanecen exactamente igual
- Toda la lógica de negocio (simulador de precios, etc.)
- Diálogos y sheets funcionan igual
- Los módulos ya optimizados (Correos, Lista Precios Vendedor)
