

## Plan: Payment Registration & Tracking System Overhaul

This touches 6 areas across ~10 files. No new database tables needed — all tables (`pagos_cliente`, `pagos_cliente_detalle`, `facturas`) already exist with the right columns.

### Infrastructure: Storage Bucket

Create `comprobantes-pagos` storage bucket via migration with RLS policies for authenticated users to upload/read.

---

### FIX 1 — Improve RegistrarPagoDialog

**File: `src/components/vendedor/RegistrarPagoDialog.tsx`**

1. **Real saldo calculation**: When fetching facturas, also query `pagos_cliente_detalle` grouped by `factura_id` to get `SUM(monto_aplicado)`. Calculate `saldo_real = factura.total - sum_pagos`.

2. **Add fecha_pago on factura update**: Change `.update({ pagada: true })` → `.update({ pagada: true, fecha_pago: new Date().toISOString() })`.

3. **Auto-set requiere_validacion based on forma_pago**: Remove the manual checkbox. Set automatically: `transferencia`/`deposito` → `requiere_validacion: true, status: "pendiente"`. `efectivo`/`cheque` → `requiere_validacion: false, status: "validado"`.

4. **Cheque-specific fields**: When `formaPago === "cheque"`, show additional "Número de cheque" and "Fecha del cheque" (date input) fields. Store cheque number in `referencia` field and date in `notas` or a structured format.

5. **Comprobante upload**: Add file input for image/PDF. On submit, upload to `comprobantes-pagos` bucket via `supabase.storage`, save returned URL in `pagos_cliente.comprobante_url`.

6. **Better referencia labels**: "Número de referencia bancaria" for transferencia/deposito, "Número de cheque" for cheque.

---

### FIX 2 — Add "Registrar cobro" button in VendedorCobranzaTab

**File: `src/components/vendedor/VendedorCobranzaTab.tsx`**

1. Import `RegistrarPagoDialog` and `DollarSign`.
2. Add state for dialog open + selected client.
3. In each pedido card, add a third button "Registrar cobro" (DollarSign icon) next to Llamar/WhatsApp.
4. Add a new KPI card "Cobros de hoy": query `pagos_cliente` WHERE `fecha_registro::date = today` AND `registrado_por = user.id` AND `status != 'rechazado'`, sum `monto_total`.

---

### FIX 3 — Client payment semaphore in PasoCliente

**File: `src/components/vendedor/pedido-wizard/PasoCliente.tsx`**

1. When `selectedClienteId` changes, query `facturas` for that client:
   - Count where `pagada = false AND fecha_vencimiento < today` → RED
   - Count where `pagada = false AND fecha_vencimiento BETWEEN today AND today+7` → YELLOW
   - Otherwise → GREEN
2. Also fetch `saldo_pendiente` and `limite_credito` from `clientes` table.
3. Show colored badge below client name with status text.
4. Show saldo pendiente and crédito disponible.
5. If RED: show warning message (non-blocking).
6. Update `Cliente` type in `types.ts` to include `saldo_pendiente` and `limite_credito`.

---

### FIX 4 — Payment validation tab for Secretaría

**New file: `src/components/secretaria/SecretariaPagosValidarTab.tsx`**

- Query `pagos_cliente` WHERE `status = 'pendiente' AND requiere_validacion = true`, join with `clientes` for name and `profiles` for registrado_por name.
- Show list: client name, amount, forma_pago, referencia, fecha_registro, who registered it, comprobante link.
- "Validar" button → update `status = 'validado'`, `validado_por = user.id`, `fecha_validacion = now()`. Then update related facturas as paid.
- "Rechazar" button → update `status = 'rechazado'` with toast.
- On validate, send push notification to vendedor via existing notification system.

**Edit: `src/pages/SecretariaPanel.tsx`**
- Add `pagos_validar` tab with badge counter.
- Add to `renderTabContent` switch.

**Edit: `src/components/secretaria/SecretariaSidebar.tsx`**
- Add nav item `{ id: "pagos_validar", label: "Pagos", icon: CreditCard, badge: counters.pagosValidar }`.

**Edit: `src/components/secretaria/SecretariaMobileNav.tsx`**
- Add pagos_validar to mobile nav items.

---

### FIX 5 — Payment history in ClienteDetalleSheet

**File: `src/components/vendedor/ClienteDetalleSheet.tsx`**

- Add a "Historial de Pagos" tab.
- Query `pagos_cliente` for the client, join `profiles` for registrado_por name.
- Show table: fecha, forma_pago, referencia, monto, registrado por, status badge.
- Calculate total paid historically.
- Calculate avg days to pay: `AVG(fecha_pago - fecha_vencimiento)` from `facturas` WHERE `pagada = true`.
- Show classification badge: 🥇 Puntual (<=0d), 👍 Bien (1-7d), ⚠️ Tarde (8-30d), 🚨 Mal pagador (>30d or has overdue).

---

### FIX 6 — Dashboard KPIs for payments

**File: `src/components/dashboard/useDashboardData.ts`**
- Add queries: `cobros_hoy` (sum pagos_cliente.monto_total today, status != rechazado), `pagos_por_validar` (count pending validation).
- Add to KPIs interface and return data.

**File: `src/components/dashboard/KPICards.tsx`**
- Add "Cobros de hoy" card in Money row with green CheckCircle icon.

**File: `src/components/dashboard/AlertasUrgentes.tsx`**
- Add alert for `pagos_por_validar > 0` with button navigating to `/secretaria` (pagos tab).

---

### Technical Summary

**Files created (1):**
- `src/components/secretaria/SecretariaPagosValidarTab.tsx`

**Files modified (9):**
- `src/components/vendedor/RegistrarPagoDialog.tsx`
- `src/components/vendedor/VendedorCobranzaTab.tsx`
- `src/components/vendedor/pedido-wizard/PasoCliente.tsx`
- `src/components/vendedor/pedido-wizard/types.ts`
- `src/components/vendedor/ClienteDetalleSheet.tsx`
- `src/pages/SecretariaPanel.tsx`
- `src/components/secretaria/SecretariaSidebar.tsx`
- `src/components/secretaria/SecretariaMobileNav.tsx`
- `src/components/dashboard/useDashboardData.ts`
- `src/components/dashboard/KPICards.tsx`
- `src/components/dashboard/AlertasUrgentes.tsx`

**DB migration (1):** Create `comprobantes-pagos` storage bucket with RLS.

