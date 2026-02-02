
# Plan: Optimización Móvil 100% - Fase Final del ERP ALMASA

## Estado Actual: 85% → Objetivo: 100%

Se completarán los 4 módulos restantes con vista móvil para alcanzar la optimización total.

---

## COMPONENTES A CREAR

### 1. VehiculoCardMobile.tsx
Reemplaza la tabla de 11 columnas en el módulo de Vehículos.

```
┌─────────────────────────────────────┐
│ 🚚 Camioneta NP300           [Disp.]│
│ Placa: ABC-123  •  Nissan 2022      │
│ ──────────────────────────────────  │
│ 👤 Pedro Ramírez (Chofer)           │
│ ⚖️ Local: 7,800 kg  •  Foránea: 7,000│
│ ──────────────────────────────────  │
│ 📋 Tarjeta: 15/Dic/2024             │
│ 🛡️ Póliza: 01/Mar/2025              │
│ ──────────────────────────────────  │
│ [Editar]  [Ver Docs]  [Eliminar]    │
└─────────────────────────────────────┘
```

### 2. UsuarioCardMobile.tsx
Reemplaza la tabla de usuarios en Configuración.

```
┌─────────────────────────────────────┐
│ 👤 Carlos Girón Martínez            │
│ 📧 carlos@almasa.com.mx             │
│ ──────────────────────────────────  │
│ 📱 55-1234-5678                     │
│ ──────────────────────────────────  │
│ [Admin] [Vendedor]                  │
│ ──────────────────────────────────  │
│ [Editar] [Contraseña] [Eliminar]    │
└─────────────────────────────────────┘
```

### 3. RentabilidadCardMobile.tsx
Reemplaza la tabla de 9 columnas de análisis de rentabilidad.

```
┌─────────────────────────────────────┐
│ AZ-001 AZÚCAR ESTÁNDAR 50KG         │
│ Marca: Zucarmex                     │
│ ──────────────────────────────────  │
│ 💰 Compra: $480  →  Venta: $650     │
│ 📈 Margen: $170 (+35.4%)  [🟢 Alto] │
│ ──────────────────────────────────  │
│ 📦 Stock: 245  •  Valor: $117,600   │
└─────────────────────────────────────┘
```

### 4. FumigacionCardMobile.tsx
Reemplaza la tabla de 9 columnas en el módulo de Fumigaciones.

```
┌─────────────────────────────────────┐
│ AZ-001 AZÚCAR ESTÁNDAR 50KG         │
│ Zucarmex  •  50 kg  •  Stock: 245   │
│ ──────────────────────────────────  │
│ 📅 Última: 15/Nov/2024              │
│ ⏰ Próxima: 15/May/2025             │
│ ⏱️ Faltan 45 días                   │
│ ──────────────────────────────────  │
│ [🟢 Vigente]         [✏️ Editar]    │
└─────────────────────────────────────┘
```

---

## ARCHIVOS A CREAR

| Archivo | Líneas Est. |
|---------|-------------|
| `src/components/rutas/VehiculoCardMobile.tsx` | ~140 |
| `src/components/configuracion/UsuarioCardMobile.tsx` | ~120 |
| `src/components/rentabilidad/RentabilidadCardMobile.tsx` | ~90 |
| `src/components/fumigaciones/FumigacionCardMobile.tsx` | ~110 |

## ARCHIVOS A MODIFICAR

| Archivo | Cambio |
|---------|--------|
| `src/components/rutas/VehiculosTab.tsx` | Agregar `useIsMobile()` + renderizado condicional con VehiculoCardMobile |
| `src/components/configuracion/UsuariosContent.tsx` | Agregar `useIsMobile()` + UsuarioCardMobile + header responsive + tabs scrollables |
| `src/pages/Rentabilidad.tsx` | Agregar `useIsMobile()` + RentabilidadCardMobile + header responsive |
| `src/pages/Fumigaciones.tsx` | Agregar `useIsMobile()` + FumigacionCardMobile + tabs scrollables + header responsive |

---

## DETALLE TÉCNICO

### VehiculoCardMobile.tsx
- Props: `vehiculo`, `choferName`, `onEdit`, `onDelete`
- Muestra alertas de documentos por vencer (tarjeta, póliza)
- Badge de estado (Disponible/En Ruta/Mantenimiento)
- Acciones: Editar, Eliminar

### UsuarioCardMobile.tsx
- Props: `user`, `onEdit`, `onDelete`, `onResetPassword`, `getRoleBadge`
- Muestra roles como badges múltiples
- Acciones: Editar, Cambiar contraseña, Eliminar

### RentabilidadCardMobile.tsx
- Props: `producto`, `getMargenBadge`
- Visualización clara de margen (monto + porcentaje)
- Badge de nivel (Alto/Medio/Bajo)

### FumigacionCardMobile.tsx
- Props: `producto`, `onEditDate`, `getEstadoBadge`
- Edición inline de fecha (como existe actualmente)
- Indicador visual de días restantes con colores

---

## OPTIMIZACIONES ADICIONALES

### Headers Responsive
Se aplicará el patrón ya establecido:
```tsx
const isMobile = useIsMobile();

<h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>
  Título
</h1>
```

### Tabs Scrollables
En UsuariosContent (8 tabs por rol) y Fumigaciones (4 tabs por estado):
```tsx
<div className="overflow-x-auto -mx-4 px-4 pb-2 scrollbar-hide">
  <TabsList className="inline-flex w-max gap-1">
    ...
  </TabsList>
</div>
```

### Búsqueda y Filtros
Stack vertical en móvil:
```tsx
<div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
  <Input placeholder="Buscar..." />
  <Select>...</Select>
</div>
```

---

## RESUMEN DE IMPLEMENTACIÓN

| Tarea | Descripción |
|-------|-------------|
| 1 | Crear `VehiculoCardMobile.tsx` |
| 2 | Modificar `VehiculosTab.tsx` - agregar móvil |
| 3 | Crear `UsuarioCardMobile.tsx` |
| 4 | Modificar `UsuariosContent.tsx` - agregar móvil + tabs scrollables |
| 5 | Crear `RentabilidadCardMobile.tsx` |
| 6 | Modificar `Rentabilidad.tsx` - agregar móvil + header responsive |
| 7 | Crear `FumigacionCardMobile.tsx` |
| 8 | Modificar `Fumigaciones.tsx` - agregar móvil + tabs scrollables |
| 9 | Actualizar `.lovable/plan.md` - marcar 100% completado |

---

## RESULTADO FINAL

| Categoría | Antes | Después |
|-----------|-------|---------|
| Módulos optimizados | 21 | 25 |
| Porcentaje móvil | 85% | **100%** |

### Módulos Completos (25/25)
- Auth, Chofer, Vendedor, Secretaria, Almacén, Portal Cliente
- Dashboard, Correos, Clientes, Pedidos, Órdenes Compra
- Lista Precios, Rutas, Inventario, Productos, Facturas
- Configuración, Empleados, Cotizaciones, Proveedores
- **Vehículos** (nuevo), **Usuarios** (nuevo), **Rentabilidad** (nuevo), **Fumigaciones** (nuevo)
- Layout Principal

---

## LO QUE NO CAMBIA

- Toda la lógica de negocio existente
- Formularios y diálogos (ya son responsive por defecto)
- Queries y mutaciones de datos
- Sistema de permisos y autenticación
- Vistas de tablet/desktop
