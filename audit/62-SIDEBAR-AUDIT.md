# Auditoría Sidebar — 11 Mayo 2026

## Estructura actual (9 secciones, 29 items)

```
Principal (3)
├── Dashboard          /dashboard
├── Ejecutivo          /dashboard-ejecutivo
└── JOSAN IA           /josan

Catálogos (5)
├── Productos          /productos
├── Modo de cobro      /productos/modo-cobro
├── Historial precios  /productos/historial-precios
├── Lista de Precios   /precios
└── Fumigaciones       /fumigaciones

Operaciones (4)
├── Clientes           /clientes
├── Pedidos            /pedidos
├── Compras            /compras
└── Inventario         /inventario

Lecaroz (2)
├── Cotizaciones       /lecaroz/cotizaciones
└── Bandeja            /lecaroz/bandeja

Logística (4)
├── Rutas y Entregas   /rutas
├── Cartas Porte       /cartas-porte
├── LA CORONA          /la-corona
└── Conteos Ciegos     /conteos-ciegos

Finanzas (5)
├── Facturas           /facturas
├── Notas de Crédito   /notas-credito
├── Complementos Pago  /complementos-pago
├── Cobranza           /cobranza
└── Rentabilidad       /rentabilidad

RRHH (3)
├── Empleados          /empleados
├── Asistencia         /asistencia
└── Vehículos          /vehiculos

Comunicación (1)
└── Chat               /chat

Sistema (2)
├── Configuración      /configuracion
└── Almacén Tablet     /almacen-tablet
```

## Estado

| Métrica | Valor |
|---------|-------|
| Total items sidebar | 29 |
| Items huérfanos (sin ruta) | **0** |
| Rutas sin sidebar (intencional) | 32 (detail pages, auth, public, role panels) |
| Items apuntando a rutas eliminadas | **0** (limpiado en FASE 3.2B) |
| Duplicados | **0** |

## Problemas detectados

1. **Vehículos en RRHH** — debería estar en Logística (son vehículos de reparto)
2. **Almacén Tablet en Sistema** — debería estar en Logística u Operaciones
3. **Correos no aparece en sidebar** — solo accesible vía navegación directa
4. **Respaldos no aparece en sidebar** — admin-only, podría ir en Sistema
5. **Permisos no aparece en sidebar** — admin-only, podría ir en Sistema
6. **Secretaria/Vendedor/Chofer panels** no en sidebar — acceso vía redirect post-login (correcto)

## Items por rol visible

| Rol | Items aprox | Secciones |
|-----|------------|-----------|
| admin | 29 (todo) | 9 |
| secretaria | ~18 | Principal, Catálogos, Operaciones, Lecaroz, Logística, Finanzas, RRHH, Comunicación |
| contadora | ~12 | Principal, Catálogos parcial, Finanzas, RRHH, Comunicación |
| vendedor | ~8 | Principal parcial, Precios, Clientes, Pedidos, Lecaroz, Comunicación |
| almacen | ~4 | Inventario, Fumigaciones, Conteos, Almacén Tablet |
| gerente_almacen | ~6 | Inventario, Fumigaciones, Conteos, Almacén Tablet, Vehículos, Configuración |
| chofer | ~1 | Chat (panel chofer es landing separado) |
| cliente | 0 (portal separado) | — |

## Propuesta reorganización (para fase futura)

```
Principal (3) — sin cambios
Catálogos (5) — sin cambios
Operaciones (4) — sin cambios  
Lecaroz (2) — sin cambios
Logística (6) — agregar Vehículos + Almacén Tablet
├── Rutas y Entregas
├── Cartas Porte
├── Vehículos        ← mover de RRHH
├── Almacén Tablet   ← mover de Sistema
├── LA CORONA
└── Conteos Ciegos
Finanzas (5) — sin cambios
RRHH (2) — quitar Vehículos
├── Empleados
└── Asistencia
Comunicación (2) — agregar Correos
├── Chat
└── Correos          ← agregar
Sistema (3) — agregar Respaldos + Permisos
├── Configuración
├── Respaldos        ← agregar
└── Permisos         ← agregar
```

---

*29 items, 0 huérfanos, 0 duplicados. Sidebar limpio.*
