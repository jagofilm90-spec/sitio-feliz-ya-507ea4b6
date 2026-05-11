# LA CORONA — SEMANA 2 Almacén Tablet + Flujo Surtido Completo

**Fecha:** 11 de Mayo 2026  
**Estado:** Flujo surtido almacenista → hoja salida automática  
**Próximo:** SEMANA 3 (geo-fence real, push notifications, integración chofer panel)

---

## Qué se construyó

### Migration: Columnas surtido

**Archivo:** `supabase/migrations/20260511030000_surtido_almacen_columns.sql`

| Tabla | Columnas nuevas |
|-------|----------------|
| `pedidos` | estado_surtido, surtido_inicio_at, surtido_fin_at, surtido_por |
| `pedidos_detalles` | estado_surtido, cantidad_surtida_real, producto_sustituto_id, surtido_at, surtido_por, foto_evidencia_url, notas_surtido |

### Página SurtirPedido (tablet touch-friendly)

**Archivo:** `src/pages/almacen/SurtirPedido.tsx`
**Ruta:** `/almacen-tablet/surtir/:pedidoId`

Diseño optimizado para tablet (SAP EWM / Pillir pattern):
- Header sticky: cliente + folio + barra progreso
- Productos como tarjetas grandes con imagen 64x64
- Cantidad pedida en texto grande (font-mono 2xl crimson)
- 4 botones touch por producto (h-14):
  - Completo (verde)
  - Parcial (amber → modal input cantidad)
  - Sin stock (rojo)
  - Sustituir (azul)
- Footer sticky con botón "Terminar y asignar cuadrilla"
- Auto-inicia surtido al entrar
- Deshabilitado hasta marcar todos los productos

### AsignarCuadrillaDialog

**Archivo:** `src/components/almacen-surtido/AsignarCuadrillaDialog.tsx`

- Select chofer (busca por puesto)
- Multi-select ayudantes sin límite (badges removibles)
- Botón "Generar Hoja de Salida"
- Al generar → preview PDF en iframe
- Botón "Imprimir" + "Despachar y volver"

### Hooks: useAlmacenSurtido

**Archivo:** `src/hooks/useAlmacenSurtido.ts`

| Hook | Propósito |
|------|-----------|
| `usePedidosSurtido` | Lista pedidos pendientes/en_surtido |
| `usePedidosSurtidos` | Pedidos ya surtidos |
| `usePedidoSurtido` | Detalle con líneas para surtir |
| `useEntregaDePedido` | Busca entrega vinculada al pedido |
| `useMarcarLineaSurtida` | Marca línea: completo/parcial/sin_stock/sustituido |
| `useIniciarSurtido` | Cambia estado_surtido a en_surtido |
| `useTerminarSurtido` | Marca surtido + genera hoja salida |
| `useEmpleadosPorPuesto` | Lista empleados filtrados por puesto |

---

## Flujo completo

```
1. Almacenista abre tablet → /almacen-tablet
2. Ve lista pedidos pendientes surtido
3. Click pedido → /almacen-tablet/surtir/:id
4. Auto-marca "en_surtido" al entrar
5. Por cada producto: toca Completo/Parcial/Sin stock/Sustituir
6. Barra progreso avanza
7. Cuando todos marcados → botón "Terminar" se activa
8. Click → AsignarCuadrillaDialog
9. Selecciona chofer + ayudantes
10. Click "Generar Hoja de Salida"
11. Edge function genera PDF + inserts BD
12. Preview PDF en iframe
13. Imprime hoja → entrega al chofer
14. Chofer sale con hoja + mercancía
```

---

## ⚠️ MIGRATION PENDIENTE

```
supabase/migrations/20260511030000_surtido_almacen_columns.sql
```

Solo ALTER TABLE ADD COLUMN (idempotente con IF NOT EXISTS).

---

## Archivos creados/modificados

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/20260511030000_surtido_almacen_columns.sql` | CREADO — columnas surtido |
| `src/hooks/useAlmacenSurtido.ts` | CREADO — 8 hooks |
| `src/pages/almacen/SurtirPedido.tsx` | CREADO — página tablet touch |
| `src/components/almacen-surtido/AsignarCuadrillaDialog.tsx` | CREADO — cuadrilla + generar hoja |
| `src/App.tsx` | MODIFICADO — ruta surtir |

---

*LA CORONA SEMANA 2 — Almacenista marca en tablet, sistema genera hoja automática*
