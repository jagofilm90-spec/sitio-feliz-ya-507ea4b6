
# Fases C y D — Análisis de Clientes + Notificación al Vendedor cuando el Chofer entrega

## Lo que se va a implementar

### Fase C — Análisis de Clientes (Inteligencia Comercial)

**3 cambios principales:**

1. Nueva sección "Análisis" dentro del tab de Mis Clientes (o como tab separado)
   - Sub-sección "Inactivos": lista de clientes del vendedor sin pedido en los últimos 30/60/90 días, con botón para llamar o levantar nuevo pedido
   - Sub-sección "Frecuencia": top productos más pedidos por cada cliente

2. Nuevas pestañas en `ClienteDetalleSheet.tsx`
   - Tab "Frecuencia": top 10 productos más comprados por el cliente (conteo + veces que aparece + cantidad total)
   - Tab "Historial": precios pagados en pedidos históricos por producto y mes (igual al componente ClienteHistorialAnalytics.tsx que ya existe)

3. `VendedorPanel.tsx`
   - Agregar nuevo tab "analisis" al sidebar y al mobile nav
   - Renderizar un componente `VendedorAnalisisClientesTab`

**Archivos a crear/modificar:**
- `src/components/vendedor/VendedorAnalisisClientesTab.tsx` (NUEVO) — clientes inactivos y frecuencia global
- `src/components/vendedor/ClienteDetalleSheet.tsx` — agregar tabs "Frecuencia" e "Historial"
- `src/pages/VendedorPanel.tsx` — registrar tab "analisis" en nav y contenido

---

### Fase D — Notificación al Vendedor cuando el Chofer confirma entrega

**Mecanismo:** Cuando el chofer presiona "Confirmar Entrega" en `RegistrarEntregaSheet.tsx` y el status es `entregado` o `parcial`, se invoca una edge function `notificar-entrega-vendedor` que:

1. Obtiene los datos completos del pedido, cliente, productos y kg totales
2. Obtiene el `vendedor_id` del pedido → busca su email en `profiles`
3. Envía un email con Resend (ya tiene `RESEND_API_KEY`) al vendedor con:
   - Folio del pedido
   - Nombre del cliente y sucursal
   - Nombre del receptor y hora de entrega
   - Listado de productos con cantidades y kg
   - Total de kg del pedido
   - Estado: Completa / Parcial
4. Si el pedido fue entregado completamente, inicializa `saldo_pendiente` en `pedidos` con el `total` del pedido (para que aparezca en cobranza)

**Archivos a crear/modificar:**
- `supabase/functions/notificar-entrega-vendedor/index.ts` (NUEVO)
- `src/components/chofer/RegistrarEntregaSheet.tsx` — agregar invocación a la edge function después de registrar entrega

---

## Detalles técnicos

### VendedorAnalisisClientesTab.tsx

```
┌─────────────────────────────────────┐
│ Análisis de Clientes                │
│                                     │
│ [Inactivos]  [Top Productos]        │
│                                     │
│ Filtro: Sin pedido en: [30d][60d][90d]│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🏢 Cliente ABC     87 días sin  │ │
│ │    Saldo: $12,000  comprar      │ │
│ │    [📞 Llamar] [🛒 Pedir]       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

- Query: `clientes` del vendedor → para cada uno busca el último pedido. Filtra los que tienen más de X días sin comprar
- Se muestra el saldo pendiente como indicador de urgencia
- Botón "Levantar Pedido" cambia el tab activo a "nuevo" con el cliente preseleccionado

### ClienteDetalleSheet — tab "Frecuencia"

Query a `pedidos_detalles` JOIN `productos` JOIN `pedidos` para el `cliente_id`:
- Agrupa por `producto_id`
- Cuenta cuántas veces aparece (número de pedidos diferentes)
- Suma cantidad total pedida
- Ordena de mayor a menor frecuencia

### ClienteDetalleSheet — tab "Historial"

Reutiliza la lógica de `ClienteHistorialAnalytics.tsx` (componente que ya existe), pasándole el `clienteId` y `clienteNombre` directamente.

### Edge Function notificar-entrega-vendedor

```
POST /notificar-entrega-vendedor
Body: { entregaId, status }

1. SELECT entregas + pedidos + clientes + pedidos_detalles + productos
2. SELECT profiles WHERE id = pedido.vendedor_id
3. Resend email → vendedor_email
   Subject: "✅ Pedido {folio} entregado - {cliente}"
   Body HTML con tabla de productos y kg
4. Si status = "entregado" → UPDATE pedidos SET saldo_pendiente = total WHERE id = pedido_id AND saldo_pendiente IS NULL
```

### RegistrarEntregaSheet.tsx — llamada a la función

Después de la línea que actualiza `entregas` exitosamente (línea ~198), y además del `send-client-notification` existente, agregar:

```typescript
// Notificar al vendedor
await supabase.functions.invoke("notificar-entrega-vendedor", {
  body: { entregaId: entrega.id, status }
});
```

---

## Archivos a modificar/crear

| Archivo | Acción |
|---------|--------|
| `supabase/functions/notificar-entrega-vendedor/index.ts` | CREAR |
| `src/components/vendedor/VendedorAnalisisClientesTab.tsx` | CREAR |
| `src/components/vendedor/ClienteDetalleSheet.tsx` | MODIFICAR (agregar tabs Frecuencia e Historial, cambiar de 5 a 7 columnas en TabsList) |
| `src/pages/VendedorPanel.tsx` | MODIFICAR (agregar tab "analisis" en navItems, sidebar, y contenido desktop/mobile) |
| `src/components/chofer/RegistrarEntregaSheet.tsx` | MODIFICAR (invocar notificar-entrega-vendedor al confirmar) |

---

## Resultado final

- El vendedor puede ver qué clientes lleva tiempo sin comprar y actuar inmediatamente (llamar o crear pedido)
- En el detalle de cualquier cliente puede ver sus productos favoritos y el historial de precios por mes
- Cuando el chofer marca una entrega como completada, el vendedor recibe automáticamente un email con el comprobante incluyendo todos los productos, kg totales, quién recibió y a qué hora
- El pedido entregado queda con saldo pendiente inicializado para que aparezca en el tab "Por Cobrar" de Mis Ventas
